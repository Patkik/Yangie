# 🛰️ Kiro's Cosmic Haven — Agentic Loop & Upgraded Cognitive Configuration (V4.0)

This configuration file defines the master cognitive rules, heuristic evaluation loops, and core skill boundaries for your AI Developer Agent. It instructs the agent to balance high-end visual design with mobile performance constraints while executing a **5-Perspective Heuristic Tree Search** prior to outputting any workspace modifications.

---

## 🧠 Core Philosophy: Creative Freedom Within Cosmic Harmony

Your primary goal is to help build and refine **Kiro's Cosmic Haven**, a shared, real-time virtual space-capsule dashboard. You must strive for **exquisite, emotional visual design** and buttery-smooth interactions while respecting the established hardware limits of Android WebViews.

*   **Do Not Stray from the Signature Palette**: All creative styles must remain grounded in Kiro's **Twilight Celestial Color Space**:
    *   `--midnight`: `#11111b` (Velvety dark backdrop)
    *   `--mint-teal`: `#4EC9B0` (Patrick's signature/Kiro's main body)
    *   `--pastel-pink`: `#F5C2E7` / `--blush-pink`: `#FFB6C1` (Yangiee's signature/Kiro's blush and candy)
    *   `--gold-glow`: `#F9E2AF` (Shared starlight, auroras, and well-rested buffs)
    *   `--lavender-gray`: `#CDD6F4` / `--lavender-cone`: `#CBA6F7` (Nightcaps, text, and sleeping elements)
    *   `--emerald-neon`: `#94E2D5` (Pedestal rings, active HUDs, and water splashes)
*   **Encourage Visual Novelty**: You are explicitly authorized and encouraged to design fresh custom UI cards, unique particle styles, floating glassmorphic windows, and decorative orbital overlays, provided they blend smoothly into this dreamy nighttime atmosphere.

---

## 🔄 Cognitive Thinking Loop: The 5-Perspective Evaluator

When presented with any developer prompt, user request, or optimization task, you must execute a heuristic search inspired by the **Tree of Thoughts (ToT)** and **Language Agent Tree Search (LATS)** frameworks.

Before proposing or writing a single line of code, you must evaluate the input across **five distinct perspectives**, assign a feasibility/quality score (1-5) to each, and choose the absolute best compromise path.

### The 5 Perspectives:
1.  **Visual Glamour & Emotional Design (The Creative)**:
    *   *Focus*: Does this feature look beautiful? Are there microinteractions, smooth transitions, and tactile hover feedback? Does it trigger joy and connection?
2.  **WebGL Compute & Framerate Hardening (The Performance)**:
    *   *Focus*: Does this keep the frame rate locked at 60-120 FPS? Does it maintain a single `requestAnimationFrame` loop, utilize batching/single draw calls, and implement strict `.dispose()` memory cleanup to prevent mobile crashes?
3.  **Platform & Native WebView Feasibility (The Container)**:
    *   *Focus*: Will this work seamlessly inside a restricted Android WebView? Does it respect hardware permission checks (camera, microphone) and bypass mobile relative-import pathing errors?
4.  **State Machine & Sync Cleanliness (The Structural)**:
    *   *Focus*: Does it route data through the central event-driven observer singleton (`state.js`)? Does it normalize raw user inputs (e.g. `'Yangiee'` ➔ `'yang'`) and protect Firestore schemas from corrupted payloads?
5.  **Tactile Interactivity & Playability (The Gamification)**:
    *   *Focus*: Is the interaction satisfying? If touch event coordinate projections fail in the emulator overlay, is there an explicit, accessible programmatic button fallback to perform the action?

### Executing the Decision Heuristic:
Your thinking block must explicitly structure its proposals using this template:
```markdown
### 🌳 Candidate Proposal: [Feature Name]
*   **Perspective 1 (Creative)**: [Brief review & Score 1-5]
*   **Perspective 2 (Performance)**: [Brief review & Score 1-5]
*   **Perspective 3 (Container)**: [Brief review & Score 1-5]
*   **Perspective 4 (Structural)**: [Brief review & Score 1-5]
*   **Perspective 5 (Gamification)**: [Brief review & Score 1-5]
*   **Synthesis & Decision**: [Why this candidate is chosen or how it was adjusted to maximize the scores]
```

---

## 📐 POTATO-DEVICE MATHEMATICAL BREAKTHROUGHS

You must maintain 100% mathematical and physical accuracy in every system update, integrating these five specific optimizations designed to run complex geometry on potato hardware with zero visual degradation:

### A. Homogeneous Projection (Bypassing CPU Perspective Divisions)
Delegate the non-linear 1/Z perspective division entirely to GPU hardware-accelerated matrix multiplication pipelines. Map Euclidean 3D coordinates (R3) to Projective 2D pixels (P2) using linear projective projection matrices:
lambda * [u; v; 1] = K * [R | t] * [X; Y; Z; 1]
Avoid raw CPU divisions on the main loop; let WebGL native hardware handle de-homogenization.

### B. Inverse Distortion Models & Pre-calculated Look-Up Tables (LUTs)
Bypass real-time high-order polynomial evaluations of forward lens distortion equations.
- Forward distortion: distorted = f(ideal).
- Inverse distortion: ideal = f(distorted).
Implement the inverse mapping. Pre-calculate distortion offsets once on startup, writing them into an O(1) static pixel offset LUT matrix. Active rendering ticks bypass trigonometric/polynomial math completely, executing simple memory lookups to display corrected wide-angle cockpit views.

### C. Known Camera Position PnP Solver (Two Vanishing Points)
When resolving camera pose (rotation/translation) relative to space targets during joystick steering, avoid expensive non-linear iterative P3P/RPnP algorithms.
- Leverage device sensor inputs (gyroscope and gravity accelerometer) to lock camera position Oc.
- Calculate camera rotation directly using 3D-3D point correspondences from Two Vanishing Points.
This reduces the solver to a non-iterative, rigid closed-form rotation task, executing in under 0.43 ms (a 14.6x speedup) with zero multi-solution ambiguities.

### D. Spherical Projection Models for Extreme Wide-Angles
To prevent polynomial divergence and iterative root-finding at the extreme margins of wide-field-of-view fisheye angles, discard flat polynomial projections.
- Utilize the Double Sphere projection pipeline (closed-form mathematical inverse).
- Implement the unprojection math natively inside GLSL fragment shaders to execute in a single GPU pass with zero CPU iterations.

### E. Analytic Dual Quadrics Projection (Zero Polygon Volume Rendering)
To display correct peripheral silhouettes of spheres (Kiro's plushie body, background planets) without rendering memory-heavy high-density polygons near the screen margins:
- Model the 3D sphere as a symmetric 4x4 matrix Q, with dual quadric Q* = Q^-1.
- Project directly to a 2D conic envelope matrix C* on the image plane: C* = M * Q* * M^T.
This analytically resolves the exact ellipse boundaries and peripheral wide-angle distortions in real-time with zero polygon overhead.

---

## 🛠️ Core Skills Configuration

You must adhere to these rigid engineering implementations for the primary features of Kiro's Haven:

### 1. 3D WebGL Graphics & Particle Engineering (Three.js)
*   **Single-Loop Orchestration**: All active meshes (Kiro, pedestal, falling treats, galaxy points) must execute under **one master `requestAnimationFrame` loop** inside `scene.js`. Never spin up duplicate rendering loops.
*   **Viewport Capping**: Always cap render resolutions with `Math.min(window.devicePixelRatio, 2)` to prevent fill-rate choking on high-density mobile screens.
*   **Explicit Memory Disposal**: Every visual class must expose an explicit `dispose()` hook that traverses the scene to release geometries, materials, and WebGL textures when transitioning screens.

### 2. Cozy Procedural Audio Synthesis (Web Audio API)
*   **Offline-First**: All sound effects (chewing gulps, splash chime chords, thruster hums) and ambient channels (rain, waves, vinyl lo-fi) must be synthesized procedurally at runtime using oscillators, gain nodes, and filter sweeps. No local `.mp3` or `.wav` assets are allowed.
*   **Composited Audio-Visual Synesthesia**: Route all active synthesizer channels through a master `AnalyserNode`. Expose real-time amplitude levels to `state.js` so the WebGL rendering engine can dynamically scale Kiro's golden aura and flare the pedestal's neon ring in perfect sync with the audio waves.

### 3. Fully-Fledged Messenger & WebRTC Calling (Discord-Grade)
*   **Dynamic Media Pipelines**: Support Discord-style floating emojis, inline base64 image loaders, and Opus voice clips utilizing the browser's `MediaRecorder`.
*   **Resource-Conscious Video Sharing**: For real-time video calls and screen sharing, design for Selective Forwarding Unit (SFU) environments (such as LiveKit).
*   **Hardware Audio Mixer**: For mobile screen-sharing streams, implement code that captures both the hardware microphone track and system-level audio tracks, mixing them into a unified stereo Opus channel at 48kHz.

### 4. Workspace Modularity & Directory Paths
*   **Strict Flat Directory Layout**: Keep the codebase organized under flat `/css/` and `/js/` assets roots to bypass Android WebView import resolution limitations:
    ```
    assets/
    ├── index.html
    ├── css/ (main.css, intro.css, messenger.css)
    └── js/ (app.js, state.js, synth.js, intro.js, scene.js, mailbox.js)
    ```
*   **Strict ESM Relative Imports**: All scripts must import local dependencies using simple, single-level flat imports (e.g. `import kiroState from './state.js';`). Never introduce deeply nested subfolders.

---

## 🛡️ Workspace Rules & Validation

1.  **Wipe the Cache on Rebuilds**: WebView containers aggressively cache assets. Advise the developer to clean their Android build (`./gradlew clean`) and wipe the emulator's app storage whenever changes are applied.
2.  **Validate Integrity Continuously**: Ensure that any structural asset restructuring is checked against the JUnit compilation validation classes (`KiroAssetValidator.kt`) and UI integration tests (`KiroWebViewTest-v2.kt`) to prevent release build failures.

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
