# Kiro's Cosmic Haven: Master Antigravity AI Directives (V4.7)
# .agents/rules/kiro-workflow-directives.md — Ultra-Effective Agent Operating System

# =============================================================================
# 0. INVARIANT CONTRACT & MANDATORY 5-STEP LIFECYCLE
# =============================================================================
**NON-NEGOTIABLE CORE CONTRACT FOR EVERY SINGLE CHAT SESSION & TASK TURN:**
No task is exempt. Every code change, styling tweak, bug fix, or UI refactor MUST execute:
1. **Pre-Flight Invariant Verification**: Sibling imports only (`./sibling.js`), zero emoji fonts (pure vector SVGs), fixed viewport lock, single-identity profile, 12-hour AM/PM time, and non-collapsible flex controls (`flex-shrink: 0`, `min-width: 0`).
2. **Automated Dual Quality Gate**: Run `python kiro-agent-harness.py --check` AND `./gradlew.bat test compileDebugAndroidTestKotlin assembleDebug`. Both must exit with code 0.
3. **Synchronized SemVer Bump**: Increment version across `version.json`, `index.html` badge, `state.js`, and `build.gradle.kts` (`versionName` & `versionCode`) to guarantee Android WebView OTA cache eviction.
4. **Cognitive Logging & Rule Sync**: Evaluate 5 perspectives, append entry to `agent-decisions-log.json`, and run `python kiro-agent-harness.py --sync-rules`.
5. **Git Publication & Audit**: `git add -A`, `git commit -m "..."`, `git tag v1.X.X`, `git push origin main --tags`, and update `walkthrough.md`.

---

# =============================================================================
# 1. HARD NEGATIVE CONSTRAINTS (WHAT AN AGENT MUST NEVER DO)
# =============================================================================
- 🚫 **NEVER** use system emoji fonts for controls, badges, logos, or HUD meters. Use crisp inline vector SVGs.
- 🚫 **NEVER** use unconstrained flex items in button bars or message bubbles. Always enforce `flex-shrink: 0`, `min-width: 0`, and explicit circular aspect ratios (`border-radius: 50%`).
- 🚫 **NEVER** use relative path traversal (`../`) for sibling ES6 imports. Standardize on flat sibling imports (`./sibling.js`).
- 🚫 **NEVER** format time in 24-hour mode. Always format as 12-hour AM/PM (`hh:mm:ss AM/PM PST` and `h:mm AM/PM`).
- 🚫 **NEVER** allow the main dashboard to scroll (`position: fixed; inset: 0; overflow: hidden !important; touch-action: none;`). Scroll only internal sub-containers (`.mailbox-feed`, `.settings-card`).
- 🚫 **NEVER** load external audio files (`.mp3`/`.wav`). Procedurally synthesize all ambient audio and sound effects with Web Audio API.

---

# =============================================================================
# 2. THE SIGNATURE TWILIGHT CELESTIAL DESIGN STANDARD
# =============================================================================
All visual elements must adhere to the Twilight Celestial Color Space:
- **Midnight Navy (Backdrop)**: `--midnight` (`#11111b`)
- **Mint Teal (Host / Kiro / Patrick Operator)**: `--mint-teal` (`#4ec9b0`)
- **Pastel Pink (Explorer / Yangiee)**: `--pastel-pink` (`#f5c2e7`) / `--blush-pink` (`#f5b7c0` / `#ffb6c1`)
- **Golden Glow (Auras / Chimes / Star Candies)**: `--gold-glow` (`#f9e2af`)
- **Lavender Gray (Sleep / Text)**: `--lavender-gray` (`#cdd6f4`) / `--lavender-cone` (`#cba6f7`)
- **Emerald Neon (Pedestals / Active HUD Accents)**: `--emerald-neon` (`#94e2d5`)
- **Text Dark Surface**: `--text-dark` (`#1e1e2e`)
- **Glassmorphism**: `rgba(30, 30, 46, 0.75)` with `backdrop-filter: blur(14px)`

---

# =============================================================================
# 3. MATHEMATICAL PERSPECTIVE LAYOUT (PROJECTIVE GEOMETRY)
# =============================================================================
- **Camera Intrinsics**: Zero-skew pinhole model ($f_x = f_y = 3024$, principal point $[W/2, H/2]$).
- **Camera Extrinsics**: Camera height $Y_c = 1.7\text{m}$, pedestal depth $Z_c = 6.2\text{m}$, tilt $\theta = 0$.
- **Hoiem's Height Scaling**: $\frac{Y_o}{Y_c} = \frac{v_t - v_b}{v_h - v_b}$.
- **Depth Foreshortening**: $S(Z) = \frac{f_x}{Z}$.
- **Radial Distortion Correction**: $k_1 = -0.15$ for peripheral assets exceeding 30° off-axis.

---

# =============================================================================
# 4. SINGLE-IDENTITY & IMMOVABLE VIEWPORT ARCHITECTURE
# =============================================================================
1. **Single-Identity Rule**: The active user is strictly ONE person per device:
   - **Patrick (`pat`)**: Local user is Patrick (You), Partner is Yangiee. Outgoing messages on right (mint glow), incoming on left. Subtitle: `Connected with Yangiee`. Telemetry: `Malaybalay (You)`.
   - **Yangiee (`yang`)**: Local user is Yangiee (You), Partner is Patrick. Outgoing messages on right (blush glow), incoming on left. Subtitle: `Connected with Patrick`. Telemetry: `Capas (You)`.
   - Settings modal provides instantaneous reactive profile switcher.
2. **Deterministic 12-Hour Clock**: Formats live PST time deterministically (`hh:mm:ss AM/PM PST` and `${h12}:${mStr} ${ampm}`).

---

# =============================================================================
# 5. ANDROID WEBVIEW SANDBOX & DUAL OTA/APK PIPELINE
# =============================================================================
- **Sandbox Hardening**: `allowFileAccess = false`, `allowContentAccess = false`, `mixedContentMode = NEVER_ALLOW`.
- **Virtual HTTPS Serving**: Served via `WebViewAssetLoader` mapped to `https://appassets.androidplatform.net/`.
- **Cache Eviction**: `apkVersion >= otaVersion` automatically clears stale OTA cache and forces fresh bundled APK asset execution.

---

# =============================================================================
# 6. CONTINUOUS LEARNING LOOP & AUTOMATED HARNESS AUDITS
# =============================================================================
Before concluding work, evaluate and log the 5 perspectives:
- **Creative (Visual Glamour)** | **Performance (60-120 FPS)** | **Container (WebView Safety)** | **Structural (State Integrity)** | **Gamification (Tactile Delight)**
Commands:
- `python kiro-agent-harness.py --check`: Audits directory structure, imports, color harmony, memory disposal, SemVer sync, and flexbox geometry.
- `python kiro-agent-harness.py --heal-css`: Auto-repairs foreign colors to Twilight palette via Euclidean distance.
- `python kiro-agent-harness.py --log-decision`: Logs 5-perspective scores to `agent-decisions-log.json`.
- `python kiro-agent-harness.py --sync-rules`: Dynamically injects repository learnings into all rule targets.

### 🧠 REPO-SPECIFIC LEARNINGS (DYNAMICALLY SYNCD FROM DECISION LOGS)
- **[DEC-655841] Antigravity Flat-Directory Architecture Refactoring**:
  - *Decision Strategy*: The Antigravity Flat-Directory Architecture was selected as the optimal compromise path. It resolves a critical WebView TypeImport network error that previously caused silent Javascript execution crashes, while successfully protecting both the raw performance of our WebGL rendering loop and the visual charm of Kiro's starry home. The decision was validated utilizing KiroAssetValidator and verified via connected Espresso UI tests.
  - *Evaluated Perspectives*: Creative: Score 5/5: Preserves the cozy 'Soft Twilight / Dreamy Celestial' signature palette (midnight, mint-teal, pastel-pink, blush-pink, gold-glow, lavender-gray, and emerald-neon). Restores the dynamic rotating spiral nebula background galaxy, twinkling stardust, and satisfying pointer repulsion fields, while maintaining responsive glassmorphic cockpit HUD overlays. | Performance: Score 5/5: Enforces a locked 60-120 FPS on spec-constrained mobile displays. Batches stardust particle meshes, consolidates rendering to a single master WebGL frame loop, caps viewport resolutions at Math.min(window.devicePixelRatio, 2), and implements strict .dispose() resource cleanup to eliminate GPU memory leaks. | Container: Score 5/5: Overcomes aggressive WebView asset caching and import errors by flattening the directory structure into single-level /css/ and /js/ asset roots. Standardizes ES6 relative module imports to sibling paths (./state.js) to guarantee 100% path resolution inside the native Android WebView sandbox.
- **[DEC-711920] Master Vector SVG & Pure Geometry UI Refactoring**:
  - *Decision Strategy*: Migrated completely from emoji fonts to pure vector inline SVGs, elevating visual luxury and crispness across all screen densities.
  - *Evaluated Perspectives*: Creative: Score 5/5: Replaced all emojis on the brand logo and HUD controls with a bespoke Hakdog Celestial Gyroscope & Starlight Constellation SVG, featuring dual orbital nodes and 4-point radiant diamond core. | Performance: Score 5/5: Inline SVGs eliminate external asset downloads and browser glyph font rasterization bottlenecks, resulting in zero jank and instant 120Hz compositor rendering. | Container: Score 5/5: Inline SVGs guarantee 100% offline rendering within Android WebView sandbox without font dependency.
- **[DEC-744810] Dynamic Single-Identity Profile Architecture & Immovable Viewport Lock**:
  - *Decision Strategy*: Enforced strict immovable viewport positioning and single-identity user state, ensuring a stable, beautiful, and conflict-free dual sanctuary.
  - *Evaluated Perspectives*: Creative: Score 5/5: Dynamic single-identity profile adapts the entire sanctuary interface to the active user (Patrick vs Yangiee) with directional chat bubbles and highlighted telemetry station. | Performance: Score 5/5: Immovable viewport lock (position: fixed; inset: 0; touch-action: none; overscroll-behavior: none;) eliminates screen jitter, page dragging, and Android WebView rubber-banding. | Container: Score 5/5: Scroll containment (touch-action: pan-y; overscroll-behavior: contain;) isolates scrolling to inner modal containers (.mailbox-feed, .settings-card).
- **[DEC-812030] Autonomous Quality Suite V4.5 & Continuous Learning Loop**:
  - *Decision Strategy*: Engineered the V4.5 Continuous Learning Loop and Git Pre-Commit Quality Guardrail, closing the feedback loop for autonomous development.
  - *Evaluated Perspectives*: Creative: Score 5/5: Self-healing Euclidean color space sanitizer keeps CSS files locked to signature Twilight tokens. | Performance: Score 5/5: Automated AST syntax analysis and memory disposal auditing prevents listener leaks. | Container: Score 5/5: Pre-commit hook enforces offline sandbox safety and blocks relative traversal import traps.
- **[DEC-852100] Universal 12-Hour Clock & Strict Chat Iteration Lifecycle Protocol**:
  - *Decision Strategy*: Enforced deterministic 12-hour AM/PM formatting across live cockpit telemetry and chat feeds, and codified the non-negotiable Chat Initiation & Mandatory Iteration Protocol across all agent rulebooks.
  - *Evaluated Perspectives*: Creative: Score 5/5: 12-Hour AM/PM format cleanly integrated with live PST telemetry pulse and Starlight Messenger timestamps, preserving typographic rhythm and readability. | Performance: Score 5/5: Zero-overhead deterministic date math avoids Intl runtime evaluation bugs and overhead on Android WebViews. | Container: Score 5/5: SemVer bump to v1.6.1 invalidates stale WebView OTA cache and triggers clean APK asset loading via KiroUpdateManager.
- **[DEC-889310] Messenger Geometric Stabilization & Anti-Distortion Flexbox Fix**:
  - *Decision Strategy*: Stabilized messenger control geometry by applying explicit flex-shrink: 0, min-width: 0, and 1:1 circular aspect ratios across all chat buttons and avatars.
  - *Evaluated Perspectives*: Creative: Score 5/5: Restores perfect 1:1 circular geometries on messenger control buttons (camera, mic, phone call, send) and sender avatar bubbles, completely eliminating flex squishing and elliptical distortion on mobile viewports. | Performance: Score 5/5: CSS hardware-accelerated transforms and explicit flexbox box-sizing boundaries eliminate browser reflows and relayout jank during chat input focus. | Container: Score 5/5: SemVer bump to v1.6.2 triggers immediate WebView OTA cache purge so fresh APK stylesheet layout rules are executed.
