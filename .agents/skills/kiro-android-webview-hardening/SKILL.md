---
name: kiro-android-webview-hardening
description: Android WebView sandbox security hardening, WebViewAssetLoader virtual HTTPS serving, dual OTA/APK update pipelines, and system notifications with PendingIntent.
---

# Android WebView Security & Native Architecture

Use this skill when maintaining or extending `MainActivity.kt`, `KiroUpdateManager.kt`, AndroidManifest, or native bridges.

## 1. WebView Security Hardening
- **Sandbox Isolation**:
  - `allowFileAccess = false`
  - `allowContentAccess = false`
  - `mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW`
- **Debug Inspection Control**:
  - Only enable debugging in debug builds: `if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true)`.

## 2. Asset Serving Strategy
- Serve web assets via `WebViewAssetLoader` over `https://appassets.androidplatform.net/assets/`.
- If an OTA update exists in `context.filesDir/kiro_ota_updates/`, route requests through `InternalStoragePathHandler`; otherwise fall back to pre-bundled APK `AssetsPathHandler`.

## 3. Dual Update Pipelines
- **OTA Updates**: Download release zip (`dist.zip` / archive), extract to staging with Zip-Slip path sanitization, verify entry `index.html`, and atomically swap. Reconfigure AssetLoader and reload without app restart.
- **Native APKs**: Download `.apk` to cache, invoke `FileProvider` (`com.starlight.sanctuary.fileprovider`), and launch `ACTION_VIEW` intent with `FLAG_GRANT_READ_URI_PERMISSION`.

## 4. Notifications with Intent Re-engagement
- Always attach a `PendingIntent` with `FLAG_UPDATE_CURRENT or FLAG_IMMUTABLE` targeting `MainActivity::class.java` to bring the user directly back into the Space Capsule dashboard.
