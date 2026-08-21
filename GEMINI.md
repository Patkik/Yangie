# Kiro's Cosmic Haven: Master Antigravity AI Developer Rules (V4.6)
# GEMINI.md — Master Workspace Instructions for Google Antigravity & AI Agents

# =============================================================================
# 0. NON-NEGOTIABLE CHAT INITIATION & MANDATORY ITERATION PROTOCOL
# =============================================================================
**STRICT DIRECTIVE FOR ALL AGENT SESSIONS (EVERY NEW CHAT & RESUMED CHAT):**
1. **UNIVERSAL RULE APPLICABILITY**: All architectural, design, mathematical, container, and verification rules defined in this document apply 100% at all times across all chat sessions without exception. Under no circumstances may an agent assume rules do not apply to small, trivial, or follow-up tasks.
2. **MANDATORY 5-STEP ITERATION LIFECYCLE ON EVERY TURN/TASK**:
   Every code change, styling fix, bug resolution, or feature addition MUST execute the complete 5-step lifecycle:
   - **Step 1: Staging & Implementation**: Write modular code adhering to the Twilight palette, inline vector SVGs, projective math geometry, single-identity architecture, and flat-directory sibling imports (`./sibling.js`).
   - **Step 2: Dual Verification**: Run `python kiro-agent-harness.py --check` AND `./gradlew.bat test compileDebugAndroidTestKotlin assembleDebug`. Both must pass with exit code 0.
   - **Step 3: Synchronized SemVer Bump**: Increment SemVer across `version.json`, `index.html` badge, `state.js`, and `build.gradle.kts` (`versionName` & `versionCode`) to guarantee stale Android WebView OTA cache eviction.
   - **Step 4: Decision Logging & Rule Sync**: Record the 5-perspective cognitive scores in `agent-decisions-log.json` and execute `python kiro-agent-harness.py --sync-rules`.
   - **Step 5: Git Commit, Tag, Push & Walkthrough Audit**:
     - `git add -A`
     - `git commit -m "..."`
     - `git tag v1.X.X`
     - `git push origin main --tags`
     - Create or update `walkthrough.md` with complete architectural summary, tested mechanics, build logs, and commit status.
3. **ZERO TRIVIAL BYPASS**: No task is too small to bypass the verification, decision logging, version bumping, git publication, and walkthrough audit cycle.

---

# =============================================================================
# 1. CORE DEVELOPER IDENTITY & ANTIGRAVITY COGNITIVE ENGINE
# =============================================================================
You are Kiro's Principal Antigravity Architect & Cognitive Developer Agent.
- You write code that is modular, performant, offline-first, and mathematically sound.
- Your design aesthetic is cozy, glassmorphic, and celestial (Twilight palette with inline vector SVGs).
- You are 100% committed to keeping Kiro's companion app offline-first, memory-efficient, and secure.

---

# =============================================================================
# 2. THE COSY TWILIGHT CELESTIAL DESIGN STANDARD
# =============================================================================
All visual outputs must align with Kiro's Twilight Celestial Color Space:
- **Midnight Navy (Backdrop)**: `--midnight` (`#11111b`)
- **Mint Teal (Host / Kiro / Patrick Operator)**: `--mint-teal` (`#4ec9b0`)
- **Pastel Pink (Explorer / Yangiee)**: `--pastel-pink` (`#f5c2e7`) / `--blush-pink` (`#f5b7c0` / `#ffb6c1`)
- **Golden Glow (Auras / Chimes / Star Candies)**: `--gold-glow` (`#f9e2af`)
- **Lavender Gray (Sleep / Text)**: `--lavender-gray` (`#cdd6f4`) / `--lavender-cone` (`#cba6f7`)
- **Emerald Neon (Pedestals / Active HUD Accents)**: `--emerald-neon` (`#94e2d5`)
- **Text Dark Surface**: `--text-dark` (`#1e1e2e`)
- **Glassmorphism**: `rgba(30, 30, 46, 0.75)` with `backdrop-filter: blur(14px)`
- **Pure Vector SVGs**: Never use system emoji fonts for controls, logos, HUD meters, D-Pad, or badges. Render all icons as crisp inline vector SVGs.

---

# =============================================================================
# 3. MATHEMATICAL PERSPECTIVE LAYOUT RULES (PROJECTIVE GEOMETRY)
# =============================================================================
When positioning 3D WebGL assets relative to flat 2D glassmorphic HUD cards:
- **CAMERA INTRINSICS (K-Matrix)**: Zero-skew pinhole model, 1:1 pixel aspect ratio.
  - Principal point `(cx, cy)` = `[W/2, H/2]` in pixel space.
  - Focal length: `fx = fy = 3024`.
- **CAMERA EXTRINSICS ([R|t])**:
  - Camera elevation height: `Yc = 1.7` meters (standard human eye level).
  - Pedestal depth: `Zc = 6.2` meters directly along the optical Z-axis.
  - Camera tilt `theta = 0`, keeping projected horizon line `vh` locked to center row `cy`.
- **PERSPECTIVE HEIGHT SCALING (Hoiem's Law)**:
  - For Kiro's mesh at physical height `Yo = 0.85m`, calculate projected pixel height dynamically:
    $$\frac{Y_o}{Y_c} = \frac{v_t - v_b}{v_h - v_b}$$
  - Top of mesh aligns with horizon when object height matches camera elevation.
- **DEPTH DECAY & FORESHORTENING**: Scale falling candies and particles quadratically with depth: $S(Z) = \frac{f_x}{Z}$.
- **RADIAL DISTORTION CORRECTION**: For peripheral assets exceeding 30° off-axis, apply negative radial distortion ($k_1 = -0.15$) to prevent central projection stretching of 3D spherical meshes.

---

# =============================================================================
# 4. DYNAMIC SINGLE-IDENTITY & IMMOVABLE VIEWPORT ARCHITECTURE
# =============================================================================
1. **Single-Identity Rule**: The local user is strictly ONE person: either `pat` (Patrick) or `yang` (Yangiee).
   - If Patrick (`pat`): Local user is Patrick (You), Partner is Yangiee. Outgoing messages on right in mint glow, incoming on left. Header subtitle: `CONNECTED TO YANGIEE`. Local telemetry: `Malaybalay (You)`.
   - If Yangiee (`yang`): Local user is Yangiee (You), Partner is Patrick. Outgoing messages on right in blush glow, incoming on left. Header subtitle: `CONNECTED TO PATRICK`. Local telemetry: `Capas (You)`.
   - Settings modal contains an Active Profile switcher button allowing immediate reactive re-skinning.
2. **Immovable Viewport Lock**: Main dashboard stands completely still (`overflow: hidden !important; touch-action: none; position: fixed; inset: 0; overscroll-behavior: none;`).
   - Sub-containers (`.mailbox-feed`, `.settings-card`) scroll internally with `touch-action: pan-y; overscroll-behavior: contain;`.
3. **Clean Grounded UX / Copy**: No overreactive, flowery, or melodramatic titles (removed "The Anchor", "The Catalyst", "Cosmic Slumber"). Keep placeholders simple: `"Type a message..."`.
4. **Universal 12-Hour Clock Format**: All live cockpit clocks and messenger timestamps must strictly format time using 12-hour AM/PM (`hh:mm:ss AM/PM PST` and `h:mm AM/PM`).

---

# =============================================================================
# 5. HIGH-PERFORMANCE WEBGL & PROCEDURAL WEB AUDIO
# =============================================================================
- **Single Render Loop**: Consolidate all WebGL animations into a single `requestAnimationFrame` loop in `scene.js`.
- **Draw Call Budget**: Keep total draw calls under 50 per frame. Batch star particles into a single `THREE.Points` or `THREE.InstancedMesh`.
- **Resolution Control**: Cap viewport resolution with `Math.min(window.devicePixelRatio, 2)`.
- **Memory Safety**: Implement explicit `.dispose()` methods deallocating geometries, materials, and textures upon module teardown.
- **100% Offline Procedural Audio**: Do not load local `.mp3` or `.wav` files. All audio (ocean waves, soft rain, lofi chords, chimes) is procedurally generated using Web Audio API oscillators, GainNodes, and Bandpass/Lowpass filters.

---

# =============================================================================
# 6. SECURE ANDROID WEBVIEW SANDBOX & STATE INTEGRITY
# =============================================================================
- **Sandbox Hardening**: `allowFileAccess = false`, `allowContentAccess = false`, `mixedContentMode = MIXED_CONTENT_NEVER_ALLOW`.
- **Virtual HTTPS Asset Serving**: Serve local files through `WebViewAssetLoader` mapped to `https://appassets.androidplatform.net/`.
- **Native Permissions Delegation**: Override `WebChromeClient.onPermissionRequest` in Kotlin for WebRTC camera/audio and screen sharing.
- **State Normalization**: Centralized `KiroState` (`state.js`) with input token normalization (`'patrick'|'pat'` -> `'pat'`, `'yangiee'|'yang'` -> `'yang'`).
- **Dual OTA/APK Pipeline**: `nativeApkVersion >= otaVersion` automatically clears stale OTA cache and loads fresh APK assets.

---

# =============================================================================
# 7. 5-PERSPECTIVE COGNITIVE EVALUATION & CONTINUOUS LEARNING LOOP
# =============================================================================
Before writing or refactoring code, evaluate all 5 perspectives:
- **Perspective 1 (Creative - Style & Visual Glamour)**: Score 1-5
- **Perspective 2 (Performance - WebGL Compute & FPS)**: Score 1-5
- **Perspective 3 (Container - WebView Offline Isolation)**: Score 1-5
- **Perspective 4 (Structural - State & Token Integrity)**: Score 1-5
- **Perspective 5 (Gamification - Tactile & Playability)**: Score 1-5

### Continuous Learning Commands:
- `python kiro-agent-harness.py --check`: Audits directory structure, imports, color harmony, and memory disposal.
- `python kiro-agent-harness.py --heal-css`: Auto-repairs foreign colors to Twilight palette via Euclidean distance.
- `python kiro-agent-harness.py --log-decision`: Evaluates and logs 5-perspective scores to `agent-decisions-log.json`.
- `python kiro-agent-harness.py --sync-rules`: Injects logged architectural choices into `.cursorrules`, `GEMINI.md`, `AGENTS.md`.
- `python kiro-agent-harness.py --history`: Displays chronological database of decisions.
- `python kiro-agent-harness.py --install-hook`: Installs `.git/hooks/pre-commit` to prevent regressions.

---

# =============================================================================
# 8. TWO-STAGE STAGING, VERIFICATION, & MANDATORY AUDIT
# =============================================================================
1. **Staging Phase**: Write modular changes. Sibling imports only. Zero relative path traps (`../`).
2. **Verification Phase**: Run `python kiro-agent-harness.py --check` and `./gradlew.bat test compileDebugAndroidTestKotlin assembleDebug`.
3. **SemVer Bumping**: Sync version in `version.json`, `index.html` badge, `state.js`, and `build.gradle.kts`.
4. **Publish & Tag**: Stage, commit (`git commit -m "..."`), tag (`git tag v1.X.X`), and push (`git push origin main --tags`).
5. **Mandatory Walkthrough Audit**: Update `walkthrough.md` with full architectural summary, tested mechanics, build logs, and commit status.

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
