package com.starlight.sanctuary

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.webkit.*
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val NOTIFICATION_CHANNEL_ID = "kiro_notifications"
        private const val CHANNEL_WEATHER_ID = "kiro_weather_alerts"
        private const val CHANNEL_CALLS_ID = "kiro_incoming_calls"

        const val ACTION_RAIN_ACK = "com.starlight.sanctuary.ACTION_RAIN_ACK"
        const val ACTION_CALL_ANSWER = "com.starlight.sanctuary.ACTION_CALL_ANSWER"
        const val ACTION_CALL_DECLINE = "com.starlight.sanctuary.ACTION_CALL_DECLINE"
        const val EXTRA_CITY_NAME = "extra_city_name"
        const val EXTRA_ACTION_CHOICE = "extra_action_choice"

        const val NOTIFICATION_ID_RAIN = 7701
        const val NOTIFICATION_ID_CALL = 7702
    }

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var updateManager: KiroUpdateManager

    private var pendingApkToInstall: File? = null

    // ── v1.4.0: MediaProjection launcher for native system audio capture ────
    private val mediaProjectionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK && result.data != null) {
            val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val projection = projectionManager.getMediaProjection(result.resultCode, result.data!!)
            // Wire projection into the capture service
            val serviceIntent = Intent(this, KiroAudioCaptureService::class.java).apply {
                action = KiroAudioCaptureService.ACTION_START_CAPTURE
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            Log.i(TAG, "MediaProjection granted — native audio capture service starting.")
            runOnUiThread {
                webView.evaluateJavascript("window.KiroRTC && window.KiroRTC.onNativeCaptureStarted && window.KiroRTC.onNativeCaptureStarted();", null)
            }
        } else {
            Log.w(TAG, "MediaProjection permission denied.")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        updateManager = KiroUpdateManager(this)

        webView = WebView(this)
        setContentView(webView)

        createNotificationChannels()
        requestNotificationPermission()

        setupAssetLoader()
        makeWindowFullscreen()

        setupWebViewSettings()
        setupWebViewClients()
        setupBackNavigation()

        // Register the JavaScript-to-Native Bridge under "AndroidHost"
        webView.addJavascriptInterface(AndroidBridge(this), "AndroidHost")

        // Load via WebViewAssetLoader HTTPS domain or restore process state
        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState)
        } else {
            loadSanctuaryUrl()
        }

        // Handle possible launch intents (e.g. notification action buttons)
        handleIntentActions(intent)

        // Non-intrusive background check for OTA updates on launch
        performStartupUpdateCheck()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntentActions(intent)
    }

    private fun handleIntentActions(intent: Intent?) {
        if (intent == null) return
        when (intent.action) {
            ACTION_RAIN_ACK -> {
                val city = intent.getStringExtra(EXTRA_CITY_NAME) ?: "Sanctuary"
                val choice = intent.getStringExtra(EXTRA_ACTION_CHOICE) ?: "got_it"
                runOnUiThread {
                    webView.evaluateJavascript("window.handleRainFeedback && window.handleRainFeedback('$choice', '${city.replace("'", "\\'")}');", null)
                }
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID_RAIN)
            }
            ACTION_CALL_ANSWER -> {
                runOnUiThread {
                    webView.evaluateJavascript("window.KiroRTC && window.KiroRTC.answerCallFromNotification && window.KiroRTC.answerCallFromNotification();", null)
                }
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID_CALL)
            }
            ACTION_CALL_DECLINE -> {
                runOnUiThread {
                    webView.evaluateJavascript("window.KiroRTC && window.KiroRTC.declineCallFromNotification && window.KiroRTC.declineCallFromNotification();", null)
                }
                NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID_CALL)
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // General Kiro Care & Updates Channel
            val generalChannel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Kiro Sanctuary Updates",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Alerts about Kiro's wellbeing, OTA updates, and celestial transmissions."
            }

            // Weather & Rain Alerts Channel (High Priority with vibration)
            val weatherChannel = NotificationChannel(
                CHANNEL_WEATHER_ID,
                "Kiro Weather & Rain Radar",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Real-time rain radar reminders and umbrella alerts from Kiro."
                enableVibration(true)
            }

            // Incoming Calls Channel (High Priority with ringing)
            val callsChannel = NotificationChannel(
                CHANNEL_CALLS_ID,
                "Kiro Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming WebRTC audio and video calls on Kiro Starlight."
                enableVibration(true)
            }

            notificationManager.createNotificationChannels(listOf(generalChannel, weatherChannel, callsChannel))
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }
    }

    /**
     * Configures the WebViewAssetLoader to serve files from local internal OTA storage
     * if an update has been extracted, or falls back to pre-bundled APK assets.
     */
    private fun setupAssetLoader() {
        val localUpdatePath = updateManager.getLocalUpdatePath()
        val builder = WebViewAssetLoader.Builder()

        if (localUpdatePath != null) {
            Log.i(TAG, "Loading assets from OTA internal storage: $localUpdatePath")
            builder.addPathHandler(
                "/assets/",
                WebViewAssetLoader.InternalStoragePathHandler(this, File(localUpdatePath))
            )
        } else {
            Log.i(TAG, "Loading pre-bundled APK assets")
            builder.addPathHandler(
                "/assets/",
                WebViewAssetLoader.AssetsPathHandler(this)
            )
        }

        assetLoader = builder.build()
    }

    private fun loadSanctuaryUrl() {
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    /**
     * Checks for new updates silently in the background on startup.
     */
    private fun performStartupUpdateCheck() {
        updateManager.checkForUpdates(force = false) { state ->
            handleUpdateState(state, isStartup = true)
        }
    }

    private fun handleUpdateState(state: KiroUpdateManager.UpdateState, isStartup: Boolean = false) {
        val eventJson = JSONObject()

        when (state) {
            is KiroUpdateManager.UpdateState.Idle -> {
                eventJson.put("type", "IDLE")
            }
            is KiroUpdateManager.UpdateState.Checking -> {
                eventJson.put("type", "CHECKING")
            }
            is KiroUpdateManager.UpdateState.Available -> {
                eventJson.put("type", "AVAILABLE")
                eventJson.put("release", state.release.toJson())
                eventJson.put("isNewer", state.isNewer)

                if (isStartup && state.isNewer) {
                    sendSystemNotification(
                        "Celestial Update Available! ✨",
                        "Version ${state.release.tagName} is available. Tap to sync."
                    )
                }
            }
            is KiroUpdateManager.UpdateState.UpToDate -> {
                eventJson.put("type", "UP_TO_DATE")
                eventJson.put("currentVersion", state.currentVersion)
            }
            is KiroUpdateManager.UpdateState.Downloading -> {
                eventJson.put("type", "DOWNLOADING")
                eventJson.put("target", state.target)
                eventJson.put("progress", JSONObject().apply {
                    put("bytesRead", state.progress.bytesRead)
                    put("totalBytes", state.progress.totalBytes)
                    put("percent", state.progress.percent)
                    put("speedBytesPerSec", state.progress.speedBytesPerSec)
                })
            }
            is KiroUpdateManager.UpdateState.Extracting -> {
                eventJson.put("type", "EXTRACTING")
            }
            is KiroUpdateManager.UpdateState.OtaReady -> {
                eventJson.put("type", "OTA_READY")
                eventJson.put("version", state.version)
                eventJson.put("releaseNotes", state.releaseNotes)

                sendSystemNotification(
                    "Celestial Update Ready! ✨",
                    "Version ${state.version} is extracted and ready to reload."
                )
            }
            is KiroUpdateManager.UpdateState.ApkReady -> {
                eventJson.put("type", "APK_READY")
                eventJson.put("version", state.version)
                eventJson.put("apkPath", state.apkFile.absolutePath)

                promptInstallApk(state.apkFile)
            }
            is KiroUpdateManager.UpdateState.Error -> {
                eventJson.put("type", "ERROR")
                eventJson.put("code", state.code)
                eventJson.put("message", state.message)
            }
        }

        dispatchUpdateEventToWeb(eventJson.toString())
    }

    private fun dispatchUpdateEventToWeb(jsonString: String) {
        runOnUiThread {
            val escaped = jsonString.replace("\\", "\\\\").replace("'", "\\'")
            val js = """
                (function() {
                    try {
                        var data = JSON.parse('$escaped');
                        if (window.AppUpdater && typeof window.AppUpdater.onNativeEvent === 'function') {
                            window.AppUpdater.onNativeEvent(data);
                        }
                        if (window.dispatchEvent) {
                            window.dispatchEvent(new CustomEvent('app-update-event', { detail: data }));
                        }
                    } catch(e) {
                        console.error('Error dispatching update event:', e);
                    }
                })();
            """.trimIndent()
            webView.evaluateJavascript(js, null)
        }
    }

    private val installPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && packageManager.canRequestPackageInstalls()) {
            pendingApkToInstall?.let {
                promptInstallApk(it)
                pendingApkToInstall = null
            }
        } else {
            Toast.makeText(this, "Permission to install packages was denied", Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * Prompts the Android Package Installer for an APK binary via FileProvider.
     */
    fun promptInstallApk(apkFile: File) {
        runOnUiThread {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!packageManager.canRequestPackageInstalls()) {
                        pendingApkToInstall = apkFile
                        Toast.makeText(this, "Please allow permission to install updates", Toast.LENGTH_LONG).show()
                        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        installPermissionLauncher.launch(intent)
                        return@runOnUiThread
                    }
                }

                val apkUri = FileProvider.getUriForFile(
                    this,
                    "${applicationContext.packageName}.fileprovider",
                    apkFile
                )

                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(apkUri, "application/vnd.android.package-archive")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
                }
                startActivity(installIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch APK installer", e)
                Toast.makeText(this, "Install failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun makeWindowFullscreen() {
        try {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT

            window.decorView.post {
                try {
                    val controller = WindowCompat.getInsetsController(window, window.decorView)
                    controller?.let {
                        it.hide(WindowInsetsCompat.Type.statusBars() or WindowInsetsCompat.Type.navigationBars())
                        it.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Suppress("DEPRECATION")
    private fun setupWebViewSettings() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true

            // Security Hardening: Strict sandbox isolation (No local file bypasses)
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW

            mediaPlaybackRequiresUserGesture = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            useWideViewPort = true
            loadWithOverviewMode = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // Conditional debugging: Strictly enabled only in debug builds
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
    }

    private fun setupWebViewClients() {
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                return request?.url?.let { assetLoader.shouldInterceptRequest(it) }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                val isMainFrame = request?.isForMainFrame ?: true
                if (isMainFrame && (url.startsWith("http://") || url.startsWith("https://"))) {
                    if (!url.contains("appassets.androidplatform.net")) {
                        try {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            startActivity(intent)
                            return true
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                }
                return false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) {
                // Strict origin check: Only grant geolocation to secure virtual asset host
                if (origin != null && origin.startsWith("https://appassets.androidplatform.net")) {
                    callback?.invoke(origin, true, false)
                } else {
                    callback?.invoke(origin, false, false)
                }
            }
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.evaluateJavascript("javascript:if(window.appLifecycle && typeof window.appLifecycle.resumeGame === 'function') window.appLifecycle.resumeGame();", null)
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
        webView.evaluateJavascript("javascript:if(window.appLifecycle && typeof window.appLifecycle.pauseGame === 'function') window.appLifecycle.pauseGame();", null)
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        when (level) {
            ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> {
                Log.d(TAG, "Memory Trim: UI Hidden. Suspending WebGL and audio rendering.")
                webView.evaluateJavascript("javascript:if(window.appLifecycle && typeof window.appLifecycle.pauseGame === 'function') window.appLifecycle.pauseGame();", null)
            }
            ComponentCallbacks2.TRIM_MEMORY_BACKGROUND,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL,
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW,
            ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> {
                Log.d(TAG, "Memory Trim: Critical level $level. Flushing WebView caches and notifying WebGL engine.")
                webView.clearCache(false)
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('webviewlowmemory', { detail: { level: $level } }));", null)
            }
        }
    }

    /**
     * Dispatches a system notification with pending intent to open MainActivity.
     */
    fun sendSystemNotification(title: String, message: String) {
        try {
            val notificationId = (System.currentTimeMillis() % 10000).toInt()
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val builder = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)

            if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 33) {
                NotificationManagerCompat.from(this).notify(notificationId, builder.build())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post notification", e)
        }
    }
    /**
     * Dispatches a dedicated rain reminder notification with an interactive "Got it! ☔" reply action.
     */
    fun sendRainNotification(cityName: String, userName: String, message: String) {
        try {
            val tapIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val tapPendingIntent = PendingIntent.getActivity(
                this,
                10,
                tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // "Got it! ☔" Action PendingIntent
            val ackIntent = Intent(this, MainActivity::class.java).apply {
                action = ACTION_RAIN_ACK
                putExtra(EXTRA_CITY_NAME, cityName)
                putExtra(EXTRA_ACTION_CHOICE, "got_it")
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val ackPendingIntent = PendingIntent.getActivity(
                this,
                11,
                ackIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val displayTitle = if (cityName.isNotEmpty()) "🌧️ Rain in $cityName • Umbrella Alert!" else "🌧️ Rain Detected • Umbrella Alert!"
            val displayText = if (message.isNotEmpty()) message else "It's raining outside! Don't forget your umbrella $userName ☔ Tap 'Got it!' to let Kiro know."

            val builder = NotificationCompat.Builder(this, CHANNEL_WEATHER_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(displayTitle)
                .setContentText(displayText)
                .setStyle(NotificationCompat.BigTextStyle().bigText(displayText))
                .setContentIntent(tapPendingIntent)
                .addAction(R.mipmap.ic_launcher, "Got it! ☔", ackPendingIntent)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)

            if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 33) {
                NotificationManagerCompat.from(this).notify(NOTIFICATION_ID_RAIN, builder.build())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post rain notification", e)
        }
    }

    /**
     * Dispatches a high-priority incoming call heads-up notification with Answer and Decline actions.
     */
    fun sendCallNotification(callerName: String, isVideo: Boolean) {
        try {
            val tapIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val tapPendingIntent = PendingIntent.getActivity(
                this,
                20,
                tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val answerIntent = Intent(this, MainActivity::class.java).apply {
                action = ACTION_CALL_ANSWER
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val answerPendingIntent = PendingIntent.getActivity(
                this,
                21,
                answerIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val declineIntent = Intent(this, MainActivity::class.java).apply {
                action = ACTION_CALL_DECLINE
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val declinePendingIntent = PendingIntent.getActivity(
                this,
                22,
                declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val callTypeStr = if (isVideo) "Video Call" else "Audio Call"
            val builder = NotificationCompat.Builder(this, CHANNEL_CALLS_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("📞 Incoming $callTypeStr")
                .setContentText("$callerName is calling you on Kiro Starlight...")
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setFullScreenIntent(tapPendingIntent, true)
                .setContentIntent(tapPendingIntent)
                .addAction(R.mipmap.ic_launcher, "Answer 📞", answerPendingIntent)
                .addAction(R.mipmap.ic_launcher, "Decline ❌", declinePendingIntent)
                .setOngoing(true)
                .setAutoCancel(true)

            if (ActivityCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED || Build.VERSION.SDK_INT < 33) {
                NotificationManagerCompat.from(this).notify(NOTIFICATION_ID_CALL, builder.build())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to post call notification", e)
        }
    }

    /**
     * Cancels any active incoming call notification.
     */
    fun cancelCallNotification() {
        try {
            NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID_CALL)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel call notification", e)
        }
    }

    /**
     * JavaScript-to-Native Bridge registered as "AndroidHost"
     */
    inner class AndroidBridge(private val context: Context) {

        @JavascriptInterface
        fun sendNotification(title: String, message: String) {
            sendSystemNotification(title, message)
        }

        @JavascriptInterface
        fun sendRainNotification(cityName: String, userName: String, message: String) {
            this@MainActivity.sendRainNotification(cityName, userName, message)
        }

        @JavascriptInterface
        fun sendCallNotification(callerName: String, isVideo: Boolean) {
            this@MainActivity.sendCallNotification(callerName, isVideo)
        }

        @JavascriptInterface
        fun cancelCallNotification() {
            this@MainActivity.cancelCallNotification()
        }

        @JavascriptInterface
        fun getInstalledVersion(): String {
            return updateManager.getCurrentVersion()
        }

        @JavascriptInterface
        fun isUsingOtaUpdate(): Boolean {
            return updateManager.isUsingOta()
        }

        @JavascriptInterface
        fun getAppVersionInfo(): String {
            val obj = JSONObject().apply {
                put("currentVersion", updateManager.getCurrentVersion())
                put("nativeVersion", updateManager.getNativeApkVersion())
                put("isUsingOta", updateManager.isUsingOta())
                put("lastCheckTimestamp", updateManager.getLastCheckTime())
                put("defaultRepo", KiroUpdateManager.DEFAULT_REPO)
            }
            return obj.toString()
        }

        @JavascriptInterface
        fun getLatestReleaseInfo(): String {
            return updateManager.cachedRelease?.toJson()?.toString() ?: "{}"
        }

        @JavascriptInterface
        fun checkForUpdates(force: Boolean) {
            updateManager.checkForUpdates(force = force) { state ->
                handleUpdateState(state, isStartup = false)
            }
        }

        @JavascriptInterface
        fun startOtaUpdate() {
            val release = updateManager.cachedRelease
            if (release != null) {
                updateManager.downloadAndApplyOta(release) { state ->
                    handleUpdateState(state, isStartup = false)
                    if (state is KiroUpdateManager.UpdateState.OtaReady) {
                        runOnUiThread {
                            setupAssetLoader()
                            loadSanctuaryUrl()
                            Toast.makeText(context, "Updated to ${state.version}! ✨", Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } else {
                performDirectUpdate()
            }
        }

        @JavascriptInterface
        fun performDirectUpdate() {
            updateManager.checkForUpdates(force = true) { state ->
                handleUpdateState(state, isStartup = false)
                if (state is KiroUpdateManager.UpdateState.Available) {
                    updateManager.downloadAndApplyOta(state.release) { s ->
                        handleUpdateState(s, isStartup = false)
                        if (s is KiroUpdateManager.UpdateState.OtaReady) {
                            runOnUiThread {
                                setupAssetLoader()
                                loadSanctuaryUrl()
                                Toast.makeText(context, "Updated to ${s.version}! ✨", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                } else if (state is KiroUpdateManager.UpdateState.UpToDate) {
                    runOnUiThread {
                        Toast.makeText(context, "You are on the latest version (${state.currentVersion}) ✨", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        @JavascriptInterface
        fun startApkUpdate() {
            val release = updateManager.cachedRelease
            if (release != null && release.hasApk) {
                updateManager.downloadApk(release) { state ->
                    handleUpdateState(state, isStartup = false)
                }
            } else {
                updateManager.checkForUpdates(force = true) { state ->
                    handleUpdateState(state, isStartup = false)
                    if (state is KiroUpdateManager.UpdateState.Available && state.release.hasApk) {
                        updateManager.downloadApk(state.release) { s ->
                            handleUpdateState(s, isStartup = false)
                        }
                    }
                }
            }
        }

        @JavascriptInterface
        fun applyUpdateAndReload() {
            runOnUiThread {
                setupAssetLoader()
                loadSanctuaryUrl()
                Toast.makeText(context, "Sanctuary refreshed ✨", Toast.LENGTH_SHORT).show()
            }
        }

        @JavascriptInterface
        fun clearOtaUpdates() {
            updateManager.rollbackToBundled()
            runOnUiThread {
                setupAssetLoader()
                loadSanctuaryUrl()
                Toast.makeText(context, "Reverted to default APK assets", Toast.LENGTH_SHORT).show()
            }
        }

        // ── v1.4.0: Native Audio Capture Bridge methods ──────────────────────

        /**
         * Called by JS (kiroCallEngine.startScreenShare) to start the native audio capture
         * foreground service + request MediaProjection permission.
         */
        @JavascriptInterface
        fun startNativeCapture() {
            runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                        mediaProjectionLauncher.launch(projectionManager.createScreenCaptureIntent())
                    } else {
                        // API < 29: start mic-only capture directly
                        val serviceIntent = Intent(context, KiroAudioCaptureService::class.java).apply {
                            action = KiroAudioCaptureService.ACTION_START_CAPTURE
                        }
                        startService(serviceIntent)
                        Log.i(TAG, "Mic-only capture started (API < 29).")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start native capture: ${e.message}")
                }
            }
        }

        /**
         * Called by JS when screen share ends to stop the foreground capture service.
         */
        @JavascriptInterface
        fun stopNativeCapture() {
            runOnUiThread {
                try {
                    val serviceIntent = Intent(context, KiroAudioCaptureService::class.java).apply {
                        action = KiroAudioCaptureService.ACTION_STOP_CAPTURE
                    }
                    startService(serviceIntent)
                    Log.i(TAG, "Native audio capture service stopped.")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to stop native capture: ${e.message}")
                }
            }
        }

        /**
         * Called by JS to explicitly request MediaProjection permission.
         */
        @JavascriptInterface
        fun requestMediaProjectionPermission() {
            runOnUiThread {
                try {
                    val projectionManager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                    mediaProjectionLauncher.launch(projectionManager.createScreenCaptureIntent())
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch MediaProjection request: ${e.message}")
                }
            }
        }
    }
}
