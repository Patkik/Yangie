# Yangie - Starlight Sanctuary

An interactive 3D virtual companion and sanctuary Android application featuring real-time Three.js graphics, custom audio synthesis, and OTA update capabilities.

## Overview

- **Android Native Container**: High-performance WebView with secure asset loader and native JavaScript-to-Kotlin bridging (`AndroidHost`).
- **Interactive 3D Experience**: Three.js celestial scene rendering, interactive companion interactions, and procedural animations.
- **Audio Engine**: Web Audio synthesis and atmospheric soundscapes.
- **OTA Updates**: Built-in GitHub Releases integration via `KiroUpdateManager` for seamless asset and logic updates.

## Project Structure

```
.
├── android-app/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/       # Three.js, CSS, JS audio engines, web UI
│   │   │   ├── java/         # Kotlin Android native classes (MainActivity, KiroUpdateManager)
│   │   │   └── res/          # Android resources, icons, XML config
│   │   └── build.gradle.kts
│   ├── gradle/
│   ├── build.gradle.kts
│   └── settings.gradle.kts
└── .gitignore
```

## Getting Started

### Prerequisites

- Android Studio Hedgehog (or newer)
- Android SDK (API 34)
- JDK 17+

### Building and Running

1. Open the `android-app` directory in Android Studio.
2. Allow Gradle sync to download necessary dependencies.
3. Build and run on an Android device or emulator running Android 7.0+ (API 24+).
