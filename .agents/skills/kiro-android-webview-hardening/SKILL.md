---
name: kiro-android-webview-hardening
description: Android WebView sandbox security hardening, WebViewAssetLoader virtual HTTPS serving, ComponentCallbacks2 memory trimming, dual OTA/APK update pipelines, and system notifications with PendingIntent.
---

# Skill 4: Android WebView & Memory Management

**Target Tech Stack**: Kotlin (Android 14 to 17), AndroidX WebView, Firebase Firestore  
**Scope**: Managing the app lifecycle shell, securing the WebView container, voluntary cache trimming, and preventing process death.

## 1. Engineering Directives

### A. CORS & Virtual HTTPS Asset Mapping
- **Banish raw `file:///` URLs**: Serve local files through `WebViewAssetLoader` mapped to a virtual, secure HTTPS address (`https://appassets.androidplatform.net/assets/`).
- If an extracted OTA update exists in `context.filesDir/kiro_ota_updates/`, mount it via `InternalStoragePathHandler`; otherwise serve pre-bundled APK assets via `AssetsPathHandler`.

### B. WebView Security Remediation
- Explicitly disable `allowFileAccess = false` and `allowContentAccess = false` to keep the local filesystem sandbox secure.
- Set `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW` to prevent unencrypted HTTP traffic from bypassing sandbox boundaries.
- Ensure USB inspection is disabled in release builds by wrapping `if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)`.

### C. Voluntary Cache Trimming (`ComponentCallbacks2`)
To prevent the Android Low Memory Killer (LMK) from terminating the app process in background or low-RAM scenarios, implement `ComponentCallbacks2` in the Activity / Application layer:
- **`TRIM_MEMORY_UI_HIDDEN`**: Free heavy graphical resources, trigger `appLifecycle.pauseGame()` to suspend WebGL render loops and pause the Web Audio context when the app is minimized.
- **`TRIM_MEMORY_BACKGROUND` / `TRIM_MEMORY_RUNNING_CRITICAL`**: Flush disk/memory caches (`webView.clearCache(false)`), clear temporary download staging buffers, and disconnect non-essential background listeners.

### D. System Notification Re-engagement
- All system notifications pushed from background tasks must contain a valid `PendingIntent` utilizing the `FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE` flags.
- Clicking a notification must reopen and refocus Kiro's active workspace (`MainActivity`) rather than launching a redundant duplicate activity instance.
