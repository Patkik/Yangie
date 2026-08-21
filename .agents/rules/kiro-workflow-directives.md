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
