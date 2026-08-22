# Kiro's Cosmic Haven: Master Antigravity AI Directives (V4.7)
# .agents/rules/kiro-workflow-directives.md — Ultra-Effective Agent Operating System

# =============================================================================
# 0. CONTINUOUS UNBLOCKED DEVELOPMENT & HARNESS GUARDRAIL PROTOCOL (V4.7)
# =============================================================================
**NON-NEGOTIABLE CORE CONTRACT FOR EVERY SINGLE CHAT SESSION & TASK TURN:**
1. **UNBLOCKED CONTINUOUS DEVELOPMENT**: Never halt, artificially pause, or stall development flow with bureaucratic roadblocks. The agent must proactively and autonomously write, iterate, design, and implement features directly without unnecessary friction.
2. **HARNESS AS DRIFT GUARDRAIL**: The workspace harness (`kiro-agent-harness.py`) and skill dispatch matrix exist specifically to catch when code strays or drifts from the core architecture, Twilight palette, projective geometry, or single-identity model. The harness is an active self-healing safety net, not an impediment to forward progress.
3. **SKILLS-1.2.3 HARNESS ARCHITECTURE**: The operational skill framework leverages the clean taxonomy of `skills-1.2.3` (Engineering, Productivity, Domain matrix).
4. **MANDATORY FINAL AUDIT & GIT LIFECYCLE (THE INVIOLABLE FINISHING GATE)**:
   While development is fluid and unblocked, the completion of every task/turn MUST execute the strict audit and git publication cycle:
   - **Step 1: Dual Verification**: Run `python kiro-agent-harness.py --check` AND `./gradlew.bat test compileDebugAndroidTestKotlin assembleDebug`. Both must pass with exit code 0.
   - **Step 2: Synchronized SemVer Bump**: Increment SemVer across `version.json`, `index.html` badge, `state.js`, and `build.gradle.kts` (`versionName` & `versionCode`) to guarantee stale Android WebView OTA cache eviction.
   - **Step 3: Decision Logging & Rule Sync**: Record 5-perspective cognitive scores in `agent-decisions-log.json` and execute `python kiro-agent-harness.py --sync-rules`.
   - **Step 4: Git Commit, Tag, Push & Walkthrough Audit**:
     - `git add -A`
     - `git commit -m "..."`
     - `git tag v1.X.X`
     - `git push origin main --tags`
     - Create or update `walkthrough.md` with complete architectural summary, tested mechanics, build logs, and commit status.
5. **ZERO TRIVIAL BYPASS**: No task is too small to bypass the final verification, decision logging, version bumping, git publication, and walkthrough audit cycle.

---

# =============================================================================
# 0.1 MANDATORY AGENTIC SKILL DISPATCH & EXECUTION PROTOCOL
# =============================================================================
All 34 Antigravity skills in `.agents/skills/` are ACTIVE OPERATIONAL CONTRACTS. Whenever a task touches a specific workflow or domain, the agent MUST immediately inspect, load, and follow the corresponding skill instructions (`SKILL.md`):

1. **Debugging, Failures, & Performance Regressions**:
   - MUST trigger `diagnosing-bugs` (`.agents/skills/diagnosing-bugs/SKILL.md`).
   - Hard invariant: Build a tight, deterministic, red-capable feedback loop first (test, CLI runner, or harness invocation) before formulating hypotheses or editing code.
2. **Feature Development & Test-Driven Code**:
   - MUST trigger `tdd` (`.agents/skills/tdd/SKILL.md`) and `implement` (`.agents/skills/implement/SKILL.md`).
   - Follow strict Red -> Green -> Refactor cycles with deterministic assertions.
3. **Architecture, Deep Modules, & Seams**:
   - MUST trigger `codebase-design` (`.agents/skills/codebase-design/SKILL.md`) and `domain-modeling` (`.agents/skills/domain-modeling/SKILL.md`).
   - Enforce "Design It Twice" and "Deepening" heuristics.
4. **Code Audits & Review Tasks**:
   - MUST trigger `code-review` (`.agents/skills/code-review/SKILL.md`) to evaluate Standards and Spec compliance.
5. **Ambiguity, Fuzzy Requirements, or User Questions**:
   - MUST trigger `grilling` (`.agents/skills/grilling/SKILL.md`) / `grill-me` (`.agents/skills/grill-me/SKILL.md`) to interview and eliminate misalignment.
6. **Domain Subsystems (Kiro Native Matrix)**:
   - **3D Graphics & Three.js**: MUST invoke `kiro-webgl-procedural`.
   - **Procedural Web Audio**: MUST invoke `kiro-webaudio-synthesis`.
   - **UI Tokens & Glassmorphism**: MUST invoke `kiro-glassmorphic-design`.
   - **Android Sandbox, Permissions & OTA**: MUST invoke `kiro-android-webview-hardening`.
   - **Git Versioning & Safety**: MUST invoke `kiro-git-lifecycle` and `git-guardrails-claude-code`.

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
> Master decision logs and 5-perspective evaluations are archived in [`agent-decisions-log.json`](file:///./agent-decisions-log.json) and [`DECISIONS.md`](file:///./DECISIONS.md).

- **[DEC-551900]** Active User Top Bar Beacon, Pure Vector SVG UI & 3D Perspective Rotation
- **[DEC-541900]** Categorical Settings Navigation & Structured Panels
- **[DEC-531900]** Pure Mathematical Web Audio Procedural Synthesis & Synesthesia
- **[DEC-655841]** Antigravity Flat-Directory Architecture Refactoring
- **[DEC-711920]** Master Vector SVG & Pure Geometry UI Refactoring
- **[DEC-744810]** Dynamic Single-Identity Profile Architecture & Immovable Viewport Lock
- **[DEC-812030]** Autonomous Quality Suite V4.5 & Continuous Learning Loop
- **[DEC-852100]** Universal 12-Hour Clock & Strict Chat Iteration Lifecycle Protocol
- **[DEC-889310]** Messenger Geometric Stabilization & Anti-Distortion Flexbox Fix
- **[DEC-948120]** Offline WebGL Engine Hardening & Cinematic Warp Acceleration
- **[DEC-982310]** Strict Antigravity Skill Dispatch Matrix & 34-Skill Operational Registry
- **[DEC-994180]** 3D WebGL Viewport Re-Architecture & Android WebView Display Resolution
- **[DEC-103840]** Externalized Decision Registry & Uncongested Rule Synchronization Architecture
- **[DEC-114920]** Space Capsule V5.0 Full Architectural Refactoring & Procedural Audio Modernization
- **[DEC-125890]** Sleep Pill Geometry Stabilization, SVG Overflow Prevention & 3D Stage Framing Calibration
- **[DEC-132940]** Double-Arm Logarithmic Spiral Galaxy & Opaque WebGL Backbuffer Hardware Hardening
- **[DEC-141850]** Volumetric Procedural Cosmic Nebula Shader & Space Capsule 3D Scene Integration
- **[DEC-152910]** Gyroscope Pitch Baseline Calibration, Radial Star Texture Synthesis & Phong Material Hardening
- **[DEC-160820]** Double-Arm Logarithmic Spiral Galaxy Math & Sibling Color Alignment at Z = -12.0
- **[DEC-170150]** Full 5-Phase Celestial Background & Space Shuttle Cockpit Architecture Implementation
- **[DEC-160820]** Double-Arm Logarithmic Spiral Galaxy Math & Sibling Color Alignment at Z = -12.0
- **[DEC-181240]** Elimination of gsap.isAnimating Render-Loop Crash & Transition Flag Architecture
- **[DEC-190100]** Kiro Procedural 3D Companion Redesign, Soulful Starlight Eyes & Responsive Viewport Framing
- **[DEC-201940]** Deep Distant Cosmic Starfield, 3D-Tilted Spiral Galaxy & Volumetric Nebula Real Space Architecture
- **[DEC-210450]** GitHub Release Updater Network Hardening, ConnectivityManager Pre-Check & Friendly Error Banner UX
- **[DEC-221800]** Celestial Sanctuary Transformation, Unobstructed 90% WebGL Viewport, Floating Starlight Dock & Tactile Petting Engine
- **[DEC-231900]** Continuous Unblocked Development Protocol & Skills-1.2.3 Harness Architecture Integration
- **[DEC-241900]** Input Analysis & Rule Guardrail Engine V4.7, Intent Triage & Submodule Skill Synchronization
- **[DEC-251900]** Remediation Blueprint V5.0 & Dynamic Headless WebGL/Audio Assertions Suite
- **[DEC-261900]** Satellite Orbital Dock, Twin Sanctuary Beacon & Agentic Orchestration Engine V6.6
- **[DEC-271900]** Satellite Orbital Dock, Twin Sanctuary Beacon & Authentic Plushie Dinosaur Refinement V6.7
- **[DEC-281900]** Rounded Spherical Plushie Dinosaur Companion Architecture V6.8
- **[DEC-291900]** Living Creature Kinematics & Organic Soft-Body Physics Engine V7.0
- **[DEC-301900]** Photorealistic Astronomical Nebula, High-Fidelity Starbursts, Visible Mouth & Space Shuttle Flight POV V7.1
- **[DEC-311900]** Performant Simple Cosmic Space, Soulful Starlight Eyes & 5 Dynamic Idle Animations V7.2
- **[DEC-321900]** Starlight Messenger Push Notification Guard, Message Persistence & Unread Badge Architecture V7.3
- **[DEC-331900]** Astrogation Celestial Physics Agent, Photorealistic Multi-Tail Comet & Sci-Fi Target Lock-On Architecture V7.4
- **[DEC-341900]** Unified Master Agentic Refactor & Viscous Physics Architecture V7.5
- **[DEC-351900]** Intro Cinematic Replay Engine Restoration V7.6
- **[DEC-361900]** Anime Realistic Shaders, Cel-Shading & Watercolor Parallax Nebula V7.7
- **[DEC-371900]** Anime Inverted-Hull Outlines & Hand-Painted Character Shaders V7.8
- **[DEC-381900]** Cozy Matte Fur & Velvet Microfiber Shader Architecture V7.9
- **[DEC-391900]** Clean Plushie Velvet & Soft Half-Lambert Wrap Architecture V8.0
- **[DEC-401900]** Anime Background Nebula, Gaussian Starfield Bokeh & Facial Harmony Architecture V8.1
- **[DEC-411900]** Hierarchical Eye Assemblies, Non-Clipping Flush Belly & Reactive Action Kinematics V8.2
- **[DEC-421900]** Starlight Messenger V4.0 Glassmorphic Styling & Cosmic Aurora Backdrop
- **[DEC-431900]** Reactive Target Lock Cleanup & Celestial System Catalog V8.4
- **[DEC-441900]** Procedural Vocal SFX Soundboard & 3-Bus Audio Mixer Architecture V8.5
- **[DEC-451900]** Adaptive Resource Throttling (ART) Engine & 5-Signal Predictive Telemetry Architecture V8.6
- **[DEC-461900]** Comprehensive Gamification, Cozy Minigame Suite & Economic Progression Architecture V8.7
- **[DEC-471900]** Cozy Eco-Battery Mode & 4-Step Thermal Mitigation Architecture V8.8
- **[DEC-481900]** WebGL Shader Preloader & Running Kiro Warm-Up Engine V8.9
- **[DEC-491900]** 3D Hatching Egg Preloader & Stutter-Free GPU Engine V9.0
- **[DEC-501900]** Sleep ZZZ Particle Emitter, Snoring Kinematics, Sleep Hat Removal, & Reorganized Sanctuary HUD V9.1
- **[DEC-511900]** Master Architectural Blueprint for Mathematically Efficient Modular Asset Systems V9.2
- **[DEC-521900]** Android WebView Scene AST Syntax Hardening & Automated Node ES6 Linter Hook V9.3
