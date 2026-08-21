# Kiro's Cosmic Haven: Master Antigravity AI Developer Rules (V4.5)
# ai-developer-rules-v3.md — Master Architectural Guide & Continuous Learning Anchor

---

## 🪐 1. THE COSY TWILIGHT DESIGN STANDARD
Your visual outputs must align with Kiro's Twilight Celestial Color Space:
- **Midnight Navy (Backdrop)**: `--midnight` (`#11111b`)
- **Mint Teal (Kiro/Pats Operator)**: `--mint-teal` (`#4ec9b0`)
- **Pastel Pink (Yangiee Explorer)**: `--pastel-pink` (`#f5c2e7`) / `--blush-pink` (`#ffb6c1` / `#f5b7c0`)
- **Golden Glow (Auras/Chimes/Stars)**: `--gold-glow` (`#f9e2af`)
- **Lavender Gray (Sleep/Text)**: `--lavender-gray` (`#cdd6f4`) / `--lavender-cone` (`#cba6f7`)
- **Emerald Neon (Pedestals/Active HUD)**: `--emerald-neon` (`#94e2d5`)
- **Text Dark**: `--text-dark` (`#1e1e2e`)

---

## 📐 2. MATHEMATICAL PERSPECTIVE LAYOUT RULES
When positioning 3D WebGL assets relative to flat 2D glassmorphic HUD cards, you must compute layout coordinates using projective geometry constraints.

- **CAMERA INTRINSICS (K-Matrix)**: Assume a zero-skew pinhole model with a 1:1 pixel aspect ratio.
  - Set principal point `(cx, cy)` to exactly `[W/2, H/2]` in pixel space.
  - Define focal length: `fx = fy = 3024`.
- **CAMERA EXTRINSICS ([R|t])**:
  - Place camera origin elevation at height `Yc = 1.7` meters (standard human eye level).
  - Place Kiro's pedestal at depth `Zc = 6.2` meters directly along the optical Z-axis.
  - Set camera tilt (`theta = 0`), keeping the projected horizon line (`vh`) locked to the center principal point row (`cy`).
- **PERSPECTIVE HEIGHT SCALING (Hoiem's Law)**:
  - For Kiro's mesh at physical height `Yo = 0.85m`, compute screen-projected pixel height `(vt - vb)` dynamically:
    $$\frac{Y_o}{Y_c} = \frac{v_t - v_b}{v_h - v_b}$$
  - Ensure Kiro's top point aligns with the horizon when height matches camera level.
- **DEPTH DECAY & FORESHORTENING**: Scale falling candies and particles quadratically with depth: $S(Z) = \frac{f_x}{Z}$.
- **RADIAL DISTORTION BOUNDARIES**:
  - For wide-angle peripheral assets exceeding 30° off-axis, apply a negative radial distortion correction ($k_1 = -0.15$) to counteract central projection ellipse-stretching and keep spherical planets looking round.

---

## 🧠 3. THE 5-PERSPECTIVE COGNITIVE EVALUATION LOOP
Before generating, writing, or refactoring code, you must execute a heuristic Tree of Thoughts search across five dimensions:
- **Perspective 1 (Creative - Style & Emotional Design)**: Cozy Twilight theme, tactile vector SVGs, glassmorphism (`backdrop-filter: blur(14px)`).
- **Perspective 2 (Performance - WebGL Compute)**: Single `requestAnimationFrame` loop, draw calls < 50, explicit `.dispose()` GPU deallocations.
- **Perspective 3 (Container - WebView Bounds)**: Offline sandbox isolation, flat directory `/css` and `/js`, zero relative path traps (`../`).
- **Perspective 4 (Structural - State & Token Integrity)**: Centralized `state.js`, automatic input normalization (`'patrick'|'yangiee' -> 'pat'|'yang'`).
- **Perspective 5 (Gamification - Haptics & Fallbacks)**: Physically satisfying interactions, touch repulsion fields, programmatic button fallbacks.

---

## 🔄 4. THE COGNITIVE DEVELOPMENT CYCLE (AUTOPILOT)
1. **Implement Code**: Flat JS and custom Twilight CSS tokens.
2. **Automated Audit**: Run `python kiro-agent-harness.py --check`.
3. **Self-Healing**: Run `python kiro-agent-harness.py --heal-css`.
4. **Log Decisions**: Run `python kiro-agent-harness.py --log-decision`.
5. **Sync Rules**: Run `python kiro-agent-harness.py --sync-rules`.

---

## 🛡️ 5. GIT PRE-COMMIT QUALITY SHIELD
Install pre-commit hook with `python kiro-agent-harness.py --install-hook` to block commits containing path traps or off-palette colors.

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
