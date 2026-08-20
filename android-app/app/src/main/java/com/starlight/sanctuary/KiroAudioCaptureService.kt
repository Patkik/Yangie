package com.starlight.sanctuary

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.*
import android.media.projection.MediaProjection
import android.os.Build
import android.os.IBinder
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import kotlin.math.max
import kotlin.math.min

/**
 * KiroAudioCaptureService — Starlight Native Audio Mixer (v1.4.0)
 * ──────────────────────────────────────────────────────────────────
 *
 * A foreground Service that simultaneously captures:
 *  1. System audio playback (AudioPlaybackCapture API, Android 10 / API 29+)
 *  2. Device microphone (AudioRecord at 48000 Hz, stereo, PCM_16BIT)
 *
 * It mixes both buffers sample-by-sample in native memory (soft-clipped int16),
 * encodes the unified stream with MediaCodec (audio/opus, 48000 Hz, stereo),
 * and delivers each encoded Opus chunk to the WebView via the AndroidHost bridge
 * as a Base64 string callback: window.KiroRTC.onOpusChunk(base64).
 *
 * Foreground notification: "📡 Starlight Transmission Active"
 * Requires minSdk 24, with AudioPlaybackCapture guarded behind API 29 check.
 *
 * Complies with Master Walkthrough Audit v1.2.1.
 */
class KiroAudioCaptureService : Service() {

    companion object {
        private const val TAG = "KiroAudioCaptureService"
        private const val CHANNEL_ID      = "kiro_audio_capture_channel"
        private const val NOTIFICATION_ID = 7713
        private const val SAMPLE_RATE     = 48000
        private const val CHANNEL_COUNT   = 2     // Stereo
        private const val AUDIO_FORMAT    = AudioFormat.ENCODING_PCM_16BIT
        private const val OPUS_MIME       = "audio/opus"
        private const val BIT_RATE        = 128_000 // 128 kbps Opus

        const val ACTION_START_CAPTURE = "com.starlight.sanctuary.ACTION_START_CAPTURE"
        const val ACTION_STOP_CAPTURE  = "com.starlight.sanctuary.ACTION_STOP_CAPTURE"
        const val EXTRA_CALLBACK_TOKEN = "callback_token"

        /** Static reference to the active WebView callback delegate */
        @Volatile
        var webViewCallback: ((String) -> Unit)? = null
    }

    // ─── State ──────────────────────────────────────────────────────────────
    private var isCapturing  = false
    private var captureThread: Thread? = null

    // ─── Audio recorders ────────────────────────────────────────────────────
    private var micRecorder:    AudioRecord? = null
    private var systemRecorder: AudioRecord? = null

    // ─── Opus encoder ───────────────────────────────────────────────────────
    private var opusEncoder: MediaCodec? = null

    // ─── MediaProjection (required for system audio capture on API 29+) ─────
    private var mediaProjection: MediaProjection? = null

    // ─── Service Lifecycle ───────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_CAPTURE -> {
                startForeground(NOTIFICATION_ID, buildNotification())
                if (!isCapturing) startCapture()
            }
            ACTION_STOP_CAPTURE -> {
                stopCapture()
                stopSelf()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopCapture()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ─── Capture Orchestration ───────────────────────────────────────────────

    private fun startCapture() {
        isCapturing = true

        // Buffer size for one chunk (~20ms @ 48 kHz stereo PCM16 = 3840 bytes)
        val bufSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_STEREO, AUDIO_FORMAT)
            .coerceAtLeast(3840)

        // ① Start microphone recorder
        micRecorder = createMicRecorder(bufSize)
        micRecorder?.startRecording()

        // ② Start system audio recorder (API 29+ only)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            systemRecorder = createSystemAudioRecorder(bufSize)
            systemRecorder?.startRecording()
        }

        // ③ Initialize Opus encoder
        opusEncoder = createOpusEncoder()
        opusEncoder?.start()

        // ④ Start mixing + encoding loop on background thread
        captureThread = Thread({ mixAndEncodeLoop(bufSize) }, "KiroAudioMixer").also { it.start() }
        Log.i(TAG, "Starlight Audio Capture started. 📡")
    }

    private fun stopCapture() {
        isCapturing = false
        captureThread?.interrupt()
        captureThread = null

        micRecorder?.stop()
        micRecorder?.release()
        micRecorder = null

        systemRecorder?.stop()
        systemRecorder?.release()
        systemRecorder = null

        opusEncoder?.stop()
        opusEncoder?.release()
        opusEncoder = null

        mediaProjection?.stop()
        mediaProjection = null

        Log.i(TAG, "Starlight Audio Capture stopped.")
    }

    // ─── Mixing + Encoding Loop ──────────────────────────────────────────────

    private fun mixAndEncodeLoop(bufSize: Int) {
        val micBuf    = ShortArray(bufSize / 2) // PCM16 shorts
        val sysBuf    = ShortArray(bufSize / 2)
        val mixedBuf  = ShortArray(bufSize / 2)
        val bytesBuf  = ByteArray(bufSize)

        while (isCapturing && !Thread.currentThread().isInterrupted) {
            try {
                // Read microphone PCM
                val micRead = micRecorder?.read(micBuf, 0, micBuf.size) ?: 0

                // Read system audio PCM (API 29+)
                val sysRead = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    systemRecorder?.read(sysBuf, 0, sysBuf.size) ?: 0
                } else { 0 }

                val samplesRead = if (micRead > 0) micRead else 0

                // Mix: sample-by-sample with soft clipping to prevent int16 overflow
                for (i in 0 until samplesRead) {
                    val mic = if (micRead > 0) micBuf[i].toInt() else 0
                    val sys = if (sysRead > 0 && i < sysRead) sysBuf[i].toInt() else 0
                    val mixed = mic + sys
                    // Soft clip to [-32768, 32767]
                    mixedBuf[i] = min(32767, max(-32768, mixed)).toShort()
                }

                // Convert short[] → byte[] (little-endian PCM16)
                for (i in 0 until samplesRead) {
                    val s = mixedBuf[i].toInt()
                    bytesBuf[i * 2]     = (s and 0xFF).toByte()
                    bytesBuf[i * 2 + 1] = ((s shr 8) and 0xFF).toByte()
                }

                if (samplesRead > 0) {
                    encodeAndDispatch(bytesBuf, samplesRead * 2)
                }
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            } catch (e: Exception) {
                Log.e(TAG, "Mix loop error: ${e.message}")
            }
        }
    }

    // ─── Opus Encoding ───────────────────────────────────────────────────────

    private fun encodeAndDispatch(pcmBytes: ByteArray, byteCount: Int) {
        val codec = opusEncoder ?: return

        try {
            // Feed PCM into encoder input
            val inputIndex = codec.dequeueInputBuffer(10_000L)
            if (inputIndex >= 0) {
                val inputBuffer = codec.getInputBuffer(inputIndex) ?: return
                inputBuffer.clear()
                inputBuffer.put(pcmBytes, 0, byteCount)
                codec.queueInputBuffer(inputIndex, 0, byteCount, System.nanoTime() / 1000, 0)
            }

            // Drain encoded Opus output
            val bufferInfo = MediaCodec.BufferInfo()
            var outputIndex = codec.dequeueOutputBuffer(bufferInfo, 0L)
            while (outputIndex >= 0) {
                val outputBuffer = codec.getOutputBuffer(outputIndex)
                if (outputBuffer != null && bufferInfo.size > 0) {
                    val opusChunk = ByteArray(bufferInfo.size)
                    outputBuffer.get(opusChunk)
                    val base64Chunk = Base64.encodeToString(opusChunk, Base64.NO_WRAP)
                    dispatchToWebView(base64Chunk)
                }
                codec.releaseOutputBuffer(outputIndex, false)
                outputIndex = codec.dequeueOutputBuffer(bufferInfo, 0L)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Opus encode error: ${e.message}")
        }
    }

    private fun dispatchToWebView(base64Chunk: String) {
        webViewCallback?.invoke(base64Chunk)
    }

    // ─── Audio Recorder Factory Methods ──────────────────────────────────────

    private fun createMicRecorder(bufSize: Int): AudioRecord? {
        return try {
            AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_STEREO,
                AUDIO_FORMAT,
                bufSize
            ).also {
                if (it.state != AudioRecord.STATE_INITIALIZED) {
                    Log.e(TAG, "Mic AudioRecord failed to initialize.")
                    return null
                }
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Mic permission denied: ${e.message}")
            null
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun createSystemAudioRecorder(bufSize: Int): AudioRecord? {
        val projection = mediaProjection ?: run {
            Log.w(TAG, "No MediaProjection — system audio capture unavailable.")
            return null
        }

        return try {
            val config = AudioPlaybackCaptureConfiguration.Builder(projection)
                .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
                .addMatchingUsage(AudioAttributes.USAGE_GAME)
                .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
                .build()

            AudioRecord.Builder()
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AUDIO_FORMAT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
                        .build()
                )
                .setBufferSizeInBytes(bufSize)
                .setAudioPlaybackCaptureConfig(config)
                .build()
                .also {
                    if (it.state != AudioRecord.STATE_INITIALIZED) {
                        Log.e(TAG, "System audio AudioRecord failed to initialize.")
                        return null
                    }
                    Log.i(TAG, "System audio capture initialized (API 29+). 🎙️")
                }
        } catch (e: Exception) {
            Log.e(TAG, "System audio capture setup failed: ${e.message}")
            null
        }
    }

    // ─── Opus Encoder Factory ────────────────────────────────────────────────

    private fun createOpusEncoder(): MediaCodec? {
        return try {
            val codec = MediaCodec.createEncoderByType(OPUS_MIME)
            val format = MediaFormat.createAudioFormat(OPUS_MIME, SAMPLE_RATE, CHANNEL_COUNT).apply {
                setInteger(MediaFormat.KEY_BIT_RATE, BIT_RATE)
                setInteger(MediaFormat.KEY_MAX_INPUT_SIZE, 65536)
            }
            codec.configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            codec
        } catch (e: Exception) {
            Log.e(TAG, "Opus encoder not available: ${e.message}. Falling back to no encoding.")
            null
        }
    }

    // ─── Foreground Notification ─────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Starlight Transmission",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active while Kiro's video call is broadcasting audio."
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle("📡 Starlight Transmission Active")
        .setContentText("Kiro is broadcasting your call. Tap to return.")
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setOngoing(true)
        .addAction(
            android.R.drawable.ic_delete,
            "Stop Broadcast",
            PendingIntent.getService(
                this, 0,
                Intent(this, KiroAudioCaptureService::class.java).apply {
                    action = ACTION_STOP_CAPTURE
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        )
        .build()

    // ─── Public API — called from MainActivity bridge ────────────────────────

    /**
     * Attach a MediaProjection token (from MediaProjectionManager.createScreenCaptureIntent result)
     * so that system audio capture can be initialized.
     */
    fun attachMediaProjection(projection: MediaProjection) {
        this.mediaProjection = projection
        Log.i(TAG, "MediaProjection attached for system audio capture.")
    }
}
