package com.starlight.sanctuary

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.zip.ZipInputStream

/**
 * Modern In-App GitHub Releases Updater for Android & WebView.
 *
 * Inspired by desktop/mobile updater architectures (Sparkle, Velopack, Tauri Updater).
 * Features:
 * - SemVer comparison engine (supports vX.Y.Z, pre-releases, multi-digit versions)
 * - Dual-tier update pipeline:
 *     1) Hot-swappable Web Asset OTA package (dist.zip / release zipball)
 *     2) Full Native Binary APK downloader & installer (FileProvider integration)
 * - Atomic rollout with staging extraction & Zip-Slip defense
 * - Real-time progress & bandwidth telemetry streaming to UI/JS bridge
 * - Safe rollback to bundled APK assets upon corruption or user request
 */
class KiroUpdateManager(private val context: Context) {

    companion object {
        private const val TAG = "KiroUpdateManager"
        const val DEFAULT_REPO = "Patkik/Yangie"

        private const val PREFS_NAME = "kiro_updater_prefs"
        private const val KEY_INSTALLED_OTA_VERSION = "installed_ota_version"
        private const val KEY_LAST_CHECK_TIMESTAMP = "last_check_timestamp"
        private const val KEY_LAST_RELEASE_JSON = "last_release_json"

        private const val DIR_OTA_ACTIVE = "kiro_ota_updates"
        private const val DIR_OTA_STAGING = "kiro_ota_staging"
        private const val DIR_APK_DOWNLOADS = "kiro_apk_downloads"

        private const val HTTP_TIMEOUT_MS = 20000
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val mainHandler = Handler(Looper.getMainLooper())
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    val updateDir: File = File(context.filesDir, DIR_OTA_ACTIVE)
    private val stagingDir: File = File(context.filesDir, DIR_OTA_STAGING)
    private val apkDir: File = File(context.cacheDir, DIR_APK_DOWNLOADS)

    // Cached metadata for the latest inspected release
    var cachedRelease: ReleaseInfo? = null
        private set

    init {
        loadCachedRelease()
    }

    // ==========================================
    // Data Structures & Models
    // ==========================================

    data class SemVer(
        val major: Int,
        val minor: Int,
        val patch: Int,
        val preRelease: String = "",
        val raw: String
    ) : Comparable<SemVer> {

        companion object {
            fun parse(versionStr: String?): SemVer {
                if (versionStr.isNullOrBlank()) {
                    return SemVer(0, 0, 0, "", "0.0.0")
                }
                val cleaned = versionStr.trim().removePrefix("v").removePrefix("V")
                val parts = cleaned.split("-", limit = 2)
                val core = parts[0]
                val pre = if (parts.size > 1) parts[1] else ""

                val numbers = core.split(".")
                val major = numbers.getOrNull(0)?.toIntOrNull() ?: 0
                val minor = numbers.getOrNull(1)?.toIntOrNull() ?: 0
                val patch = numbers.getOrNull(2)?.toIntOrNull() ?: 0

                return SemVer(major, minor, patch, pre, versionStr)
            }
        }

        override fun compareTo(other: SemVer): Int {
            if (this.major != other.major) return this.major.compareTo(other.major)
            if (this.minor != other.minor) return this.minor.compareTo(other.minor)
            if (this.patch != other.patch) return this.patch.compareTo(other.patch)
            // If one has pre-release and the other doesn't, release version is higher
            if (this.preRelease.isEmpty() && other.preRelease.isNotEmpty()) return 1
            if (this.preRelease.isNotEmpty() && other.preRelease.isEmpty()) return -1
            return this.preRelease.compareTo(other.preRelease)
        }
    }

    data class ReleaseInfo(
        val tagName: String,
        val versionName: String,
        val title: String,
        val releaseNotes: String,
        val publishedAt: String,
        val htmlUrl: String,
        val otaDownloadUrl: String?,
        val otaAssetSize: Long,
        val apkDownloadUrl: String?,
        val apkAssetSize: Long,
        val apkFileName: String?,
        val isPrerelease: Boolean,
        val rawJson: String
    ) {
        val semVer: SemVer get() = SemVer.parse(tagName)
        val hasApk: Boolean get() = !apkDownloadUrl.isNullOrEmpty()
        val hasOta: Boolean get() = !otaDownloadUrl.isNullOrEmpty()

        fun toJson(): JSONObject {
            return JSONObject().apply {
                put("tagName", tagName)
                put("versionName", versionName)
                put("title", title)
                put("releaseNotes", releaseNotes)
                put("publishedAt", publishedAt)
                put("htmlUrl", htmlUrl)
                put("otaDownloadUrl", otaDownloadUrl ?: "")
                put("otaAssetSize", otaAssetSize)
                put("apkDownloadUrl", apkDownloadUrl ?: "")
                put("apkAssetSize", apkAssetSize)
                put("apkFileName", apkFileName ?: "")
                put("isPrerelease", isPrerelease)
                put("hasApk", hasApk)
                put("hasOta", hasOta)
            }
        }
    }

    data class Progress(
        val bytesRead: Long,
        val totalBytes: Long,
        val percent: Int,
        val speedBytesPerSec: Long
    )

    sealed class UpdateState {
        object Idle : UpdateState()
        object Checking : UpdateState()
        data class Available(val release: ReleaseInfo, val isNewer: Boolean) : UpdateState()
        data class UpToDate(val currentVersion: String) : UpdateState()
        data class Downloading(val target: String, val progress: Progress) : UpdateState()
        object Extracting : UpdateState()
        data class OtaReady(val version: String, val releaseNotes: String) : UpdateState()
        data class ApkReady(val apkFile: File, val version: String) : UpdateState()
        data class Error(val code: String, val message: String, val cause: Throwable? = null) : UpdateState()
    }

    // ==========================================
    // Version Inspection & Storage
    // ==========================================

    /**
     * Returns the active running version.
     * Checks installed OTA folder first, then bundled version.json, then BuildConfig.VERSION_NAME.
     */
    fun getCurrentVersion(): String {
        val otaVersion = prefs.getString(KEY_INSTALLED_OTA_VERSION, null)
        if (!otaVersion.isNullOrEmpty() && hasValidLocalUpdate()) {
            return otaVersion
        }

        try {
            context.assets.open("version.json").use { stream ->
                val jsonStr = stream.bufferedReader().use { it.readText() }
                val json = JSONObject(jsonStr)
                val ver = json.optString("version", "")
                if (ver.isNotEmpty()) return ver
            }
        } catch (e: Exception) {
            Log.w(TAG, "Bundled version.json unreadable: ${e.message}")
        }

        return BuildConfig.VERSION_NAME
    }

    fun getNativeApkVersion(): String {
        return BuildConfig.VERSION_NAME
    }

    fun hasValidLocalUpdate(): Boolean {
        return updateDir.exists() && File(updateDir, "index.html").exists()
    }

    fun isUsingOta(): Boolean {
        return hasValidLocalUpdate() && !prefs.getString(KEY_INSTALLED_OTA_VERSION, null).isNullOrEmpty()
    }

    fun getLocalUpdatePath(): String? {
        return if (hasValidLocalUpdate()) updateDir.absolutePath else null
    }

    fun getLastCheckTime(): Long {
        return prefs.getLong(KEY_LAST_CHECK_TIMESTAMP, 0L)
    }

    private fun loadCachedRelease() {
        val jsonStr = prefs.getString(KEY_LAST_RELEASE_JSON, null) ?: return
        try {
            val json = JSONObject(jsonStr)
            cachedRelease = parseReleaseJson(json)
        } catch (e: Exception) {
            Log.w(TAG, "Failed parsing cached release JSON", e)
        }
    }

    // ==========================================
    // Update Checking & GitHub Releases API
    // ==========================================

    /**
     * Checks GitHub Releases API for the latest published tag/release.
     */
    fun checkForUpdates(
        repo: String = DEFAULT_REPO,
        force: Boolean = false,
        onStateChange: (UpdateState) -> Unit
    ) {
        postState(UpdateState.Checking, onStateChange)

        executor.execute {
            try {
                val apiUrl = "https://api.github.com/repos/$repo/releases/latest"
                Log.d(TAG, "Querying GitHub release endpoint: $apiUrl")

                val conn = (URL(apiUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("User-Agent", "Yangie-AndroidUpdater/${BuildConfig.VERSION_NAME}")
                    setRequestProperty("Accept", "application/vnd.github.v3+json")
                    connectTimeout = HTTP_TIMEOUT_MS
                    readTimeout = HTTP_TIMEOUT_MS
                }

                val responseCode = conn.responseCode
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    val errMsg = "GitHub Releases endpoint error (HTTP $responseCode)"
                    Log.w(TAG, errMsg)
                    postState(UpdateState.Error("HTTP_$responseCode", errMsg), onStateChange)
                    return@execute
                }

                val body = conn.inputStream.bufferedReader().use { it.readText() }
                val releaseJson = JSONObject(body)
                val releaseInfo = parseReleaseJson(releaseJson)

                cachedRelease = releaseInfo
                prefs.edit()
                    .putLong(KEY_LAST_CHECK_TIMESTAMP, System.currentTimeMillis())
                    .putString(KEY_LAST_RELEASE_JSON, body)
                    .apply()

                val currentVer = getCurrentVersion()
                val currentSemVer = SemVer.parse(currentVer)
                val latestSemVer = releaseInfo.semVer

                val isNewer = latestSemVer > currentSemVer
                Log.i(TAG, "Version check: Current=$currentVer ($currentSemVer) | Latest=${releaseInfo.tagName} ($latestSemVer) | Newer=$isNewer")

                if (isNewer || force) {
                    postState(UpdateState.Available(releaseInfo, isNewer), onStateChange)
                } else {
                    postState(UpdateState.UpToDate(currentVer), onStateChange)
                }

            } catch (e: Exception) {
                Log.e(TAG, "Update check failed", e)
                postState(UpdateState.Error("NETWORK_ERROR", e.message ?: "Update check network error", e), onStateChange)
            }
        }
    }

    private fun parseReleaseJson(json: JSONObject): ReleaseInfo {
        val tagName = json.optString("tag_name", "").trim()
        val title = json.optString("name", tagName)
        val body = json.optString("body", "Updated celestial sanctuary assets and improvements.")
        val publishedAt = json.optString("published_at", "")
        val htmlUrl = json.optString("html_url", "")
        val isPrerelease = json.optBoolean("prerelease", false)

        var otaUrl: String? = null
        var otaSize: Long = 0L
        var apkUrl: String? = null
        var apkSize: Long = 0L
        var apkFileName: String? = null

        val assets = json.optJSONArray("assets")
        if (assets != null) {
            for (i in 0 until assets.length()) {
                val asset = assets.optJSONObject(i) ?: continue
                val name = asset.optString("name", "")
                val downloadUrl = asset.optString("browser_download_url", "")
                val size = asset.optLong("size", 0L)

                // Match APK asset
                if (name.endsWith(".apk", ignoreCase = true)) {
                    apkUrl = downloadUrl
                    apkSize = size
                    apkFileName = name
                }

                // Match OTA web assets (dist.zip, web.zip, sanctuary.zip, etc.)
                if (name.equals("dist.zip", ignoreCase = true) ||
                    name.contains("assets", ignoreCase = true) && name.endsWith(".zip", ignoreCase = true)
                ) {
                    otaUrl = downloadUrl
                    otaSize = size
                }
            }
        }

        // Fallback for OTA URL: zipball of the release archive
        if (otaUrl == null) {
            otaUrl = json.optString("zipball_url", "").ifEmpty {
                "https://github.com/$DEFAULT_REPO/archive/refs/tags/$tagName.zip"
            }
        }

        return ReleaseInfo(
            tagName = tagName,
            versionName = tagName.removePrefix("v").removePrefix("V"),
            title = title,
            releaseNotes = body,
            publishedAt = publishedAt,
            htmlUrl = htmlUrl,
            otaDownloadUrl = otaUrl,
            otaAssetSize = otaSize,
            apkDownloadUrl = apkUrl,
            apkAssetSize = apkSize,
            apkFileName = apkFileName,
            isPrerelease = isPrerelease,
            rawJson = json.toString()
        )
    }

    // ==========================================
    // OTA Asset Download & Atomic Rollout
    // ==========================================

    /**
     * Downloads OTA package, extracts with Zip Slip protection to staging,
     * verifies index.html, and atomically commits into updateDir.
     */
    fun downloadAndApplyOta(
        release: ReleaseInfo,
        onStateChange: (UpdateState) -> Unit
    ) {
        val downloadUrl = release.otaDownloadUrl
        if (downloadUrl.isNullOrEmpty()) {
            postState(UpdateState.Error("NO_OTA_SOURCE", "No OTA download source available for release"), onStateChange)
            return
        }

        executor.execute {
            try {
                Log.d(TAG, "Starting OTA package download from: $downloadUrl")

                if (stagingDir.exists()) stagingDir.deleteRecursively()
                stagingDir.mkdirs()

                val conn = (URL(downloadUrl).openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "Yangie-AndroidUpdater")
                    setRequestProperty("Accept", "application/octet-stream, application/zip, */*")
                    connectTimeout = HTTP_TIMEOUT_MS
                    readTimeout = HTTP_TIMEOUT_MS
                }

                val totalLength = conn.contentLengthLong
                var bytesReadTotal = 0L
                val startTime = System.currentTimeMillis()
                var lastProgressUpdate = 0L

                val canonicalStagingPath = stagingDir.canonicalPath

                conn.inputStream.buffered().use { inStream ->
                    ZipInputStream(inStream).use { zis ->
                        var entry = zis.nextEntry
                        val buffer = ByteArray(8192)

                        while (entry != null) {
                            val newFile = File(stagingDir, entry.name)
                            val canonicalDest = newFile.canonicalPath

                            // Zip-Slip Path Traversal Protection
                            if (!canonicalDest.startsWith(canonicalStagingPath + File.separator) &&
                                canonicalDest != canonicalStagingPath
                            ) {
                                throw SecurityException("Blocked malicious zip traversal entry: ${entry.name}")
                            }

                            if (entry.isDirectory) {
                                newFile.mkdirs()
                            } else {
                                newFile.parentFile?.mkdirs()
                                FileOutputStream(newFile).use { fos ->
                                    var count: Int
                                    while (zis.read(buffer).also { count = it } != -1) {
                                        fos.write(buffer, 0, count)
                                        bytesReadTotal += count

                                        val now = System.currentTimeMillis()
                                        if (now - lastProgressUpdate > 100) {
                                            lastProgressUpdate = now
                                            val elapsedSec = (now - startTime) / 1000.0
                                            val speed = if (elapsedSec > 0) (bytesReadTotal / elapsedSec).toLong() else 0L
                                            val percent = if (totalLength > 0) ((bytesReadTotal * 100) / totalLength).toInt() else -1
                                            postState(
                                                UpdateState.Downloading("OTA Web Package", Progress(bytesReadTotal, totalLength, percent, speed)),
                                                onStateChange
                                            )
                                        }
                                    }
                                }
                            }
                            zis.closeEntry()
                            entry = zis.nextEntry
                        }
                    }
                }

                postState(UpdateState.Extracting, onStateChange)

                // Verify staging contents
                val indexFile = stagingDir.walkTopDown().firstOrNull { it.name == "index.html" && it.isFile }
                if (indexFile == null || indexFile.parentFile == null) {
                    throw IllegalStateException("Extracted update missing required index.html entry point.")
                }

                val sourceDir = indexFile.parentFile!!

                // Atomic Replacement
                if (updateDir.exists()) updateDir.deleteRecursively()
                updateDir.mkdirs()
                sourceDir.copyRecursively(updateDir, overwrite = true)
                stagingDir.deleteRecursively()

                // Save installed version tag
                prefs.edit()
                    .putString(KEY_INSTALLED_OTA_VERSION, release.tagName)
                    .apply()

                Log.i(TAG, "OTA Update successfully installed: ${release.tagName}")
                postState(UpdateState.OtaReady(release.tagName, release.releaseNotes), onStateChange)

            } catch (e: Exception) {
                Log.e(TAG, "OTA Download/Extract failed", e)
                stagingDir.deleteRecursively()
                postState(UpdateState.Error("OTA_EXTRACTION_FAILED", e.message ?: "OTA download or extraction failed", e), onStateChange)
            }
        }
    }

    // ==========================================
    // Native APK Binary Downloader
    // ==========================================

    /**
     * Downloads APK binary to cache directory with live progress.
     */
    fun downloadApk(
        release: ReleaseInfo,
        onStateChange: (UpdateState) -> Unit
    ) {
        val apkUrl = release.apkDownloadUrl
        if (apkUrl.isNullOrEmpty()) {
            postState(UpdateState.Error("NO_APK_ASSET", "This release does not include a pre-built APK binary asset."), onStateChange)
            return
        }

        executor.execute {
            try {
                if (!apkDir.exists()) apkDir.mkdirs()
                val targetFileName = release.apkFileName ?: "yangie-${release.versionName}.apk"
                val destinationFile = File(apkDir, targetFileName)

                Log.d(TAG, "Starting APK download: $apkUrl -> ${destinationFile.absolutePath}")

                val conn = (URL(apkUrl).openConnection() as HttpURLConnection).apply {
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "Yangie-AndroidUpdater")
                    connectTimeout = HTTP_TIMEOUT_MS
                    readTimeout = HTTP_TIMEOUT_MS
                }

                val totalLength = conn.contentLengthLong
                var bytesReadTotal = 0L
                val startTime = System.currentTimeMillis()
                var lastProgressUpdate = 0L

                val buffer = ByteArray(16384)
                conn.inputStream.buffered().use { input ->
                    FileOutputStream(destinationFile).use { output ->
                        var count: Int
                        while (input.read(buffer).also { count = it } != -1) {
                            output.write(buffer, 0, count)
                            bytesReadTotal += count

                            val now = System.currentTimeMillis()
                            if (now - lastProgressUpdate > 100) {
                                lastProgressUpdate = now
                                val elapsedSec = (now - startTime) / 1000.0
                                val speed = if (elapsedSec > 0) (bytesReadTotal / elapsedSec).toLong() else 0L
                                val percent = if (totalLength > 0) ((bytesReadTotal * 100) / totalLength).toInt() else -1
                                postState(
                                    UpdateState.Downloading("Android APK ($targetFileName)", Progress(bytesReadTotal, totalLength, percent, speed)),
                                    onStateChange
                                )
                            }
                        }
                    }
                }

                if (destinationFile.length() <= 0) {
                    throw IllegalStateException("Downloaded APK file is empty.")
                }

                Log.i(TAG, "APK download complete: ${destinationFile.absolutePath} (${destinationFile.length()} bytes)")
                postState(UpdateState.ApkReady(destinationFile, release.tagName), onStateChange)

            } catch (e: Exception) {
                Log.e(TAG, "APK download failed", e)
                postState(UpdateState.Error("APK_DOWNLOAD_FAILED", e.message ?: "APK binary download failed", e), onStateChange)
            }
        }
    }

    // ==========================================
    // Rollback & Reset
    // ==========================================

    /**
     * Wipes any downloaded OTA updates and reverts to bundled APK assets.
     */
    fun rollbackToBundled() {
        try {
            if (updateDir.exists()) updateDir.deleteRecursively()
            if (stagingDir.exists()) stagingDir.deleteRecursively()
            if (apkDir.exists()) apkDir.deleteRecursively()
            prefs.edit().remove(KEY_INSTALLED_OTA_VERSION).apply()
            Log.i(TAG, "Rollback successful: reverted to bundled assets.")
        } catch (e: Exception) {
            Log.e(TAG, "Rollback failed", e)
        }
    }

    // ==========================================
    // Helpers
    // ==========================================

    private fun postState(state: UpdateState, callback: (UpdateState) -> Unit) {
        mainHandler.post { callback(state) }
    }
}
