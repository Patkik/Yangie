# Kiro's Cosmic Haven — Main Screen Build Prompt
### Dynamic 3D Celestial Background & Space Shuttle Cockpit

> Paste this whole document into your IDE's coding agent as the task brief. It's self-contained — context, constraints, and five build phases in order. Each phase has its own acceptance criteria so the agent can be told "stop after Phase N and show me the result" if you want to review incrementally instead of running it end to end.

---

## 0. Project context (give this to the agent first)

You are implementing the main screen of **Kiro's Cosmic Haven**, a shared virtual sanctuary app connecting two siblings (Pat, in Malaybalay, and Yang, in Capas) through a 3D companion named Kiro. The app runs inside a native Android `WebView` (via `WebViewAssetLoader`, no bundler, flat-directory ES6 modules) and renders everything with Three.js on a single `requestAnimationFrame` loop.

This prompt covers **only the background/environment system and the space shuttle cockpit feature** — not identity selection, vitals, messaging, or calls. Assume `state.js` (`KiroState`) already exists as the reactive source of truth and that `scene.js` already owns the render loop; you are extending `scene.js` and adding new modules alongside it.

**Non-negotiable performance target:** locked 60–120 FPS on a mid-range Android device, zero main-thread blocking, zero layout reflow triggered by animation. If any technique below can't hit that on-device, flag it and propose an alternative before proceeding — don't silently downgrade the visual and call it done.

**Palette tokens (do not invent new colors):**
| Token | Hex | Use |
|---|---|---|
| Mint-teal (Pat) | `#4EC9B0` | left nebula wing, Pat's accent |
| Pastel-pink (Yang) | `#FFB6C1` / `#F5C2E7` | right nebula wing, Yang's accent |
| Midnight navy | `#11111B` | core spine, background base |
| Lavender | `#CBA6F7` | core spine highlight, sleep/text accent |
| Golden glow | `#F9E2AF` | audio-reactive pulse, lock-on energy |

---

## 1. Global constraints (apply to every phase below)

- Single `requestAnimationFrame` loop — no independent timers driving visual state.
- Every mesh, geometry, material, and texture created for this feature must have a matching disposal path, hooked into the native memory-trim signal (`TRIM_MEMORY_RUNNING_CRITICAL` / `TRIM_MEMORY_BACKGROUND` bridged from `MainActivity.kt`). No orphaned GPU allocations.
- The HUD/UI layer is a separate GPU compositing layer from the 3D canvas: `position: absolute; will-change: transform, opacity; transform: translate3d(0,0,0);`. Never let a WebGL frame update trigger a CSS layout recalculation.
- All background elements (nebula, galaxy, planets, meteors, comets) are children of one `THREE.Group` — `backgroundCelestialGroup`. Nothing in this feature moves independently of that group's transform. This is the rule that makes Phase 4's parallax possible without drift — respect it from Phase 2 onward, don't retrofit it later.
- Depth budget:
  - `Z = 0.0` — Kiro companion (out of scope here, but don't collide with it)
  - `Z = -3.0` — cockpit HUD elements when active
  - `Z = -12.0` — spiral galaxy + roaming planets + meteors + comets (`backgroundCelestialGroup`)
  - `Z = -14.0` — volumetric nebula shader (back plane of the same group)

---

## 2. Phase 1 — Scene & rendering foundation

**Objective:** stand up the layered render target this feature builds on, before any celestial content exists.

Build:
1. A `backgroundCelestialGroup = new THREE.Group()` added to the scene once, at rest position `(0, 0, 0)`.
2. A render-loop hook in `scene.js` — `updateCelestialLayer(time, delta)` — called every frame, currently a no-op, that later phases will fill in. Wire it into the existing loop now so later phases only add logic, never restructure the loop.
3. A disposal registry: a simple array or `Set` that every later phase pushes its geometries/materials/textures into, consumed by a `disposeCelestialLayer()` function triggered from the native memory-trim bridge.
4. A performance probe: an on-screen (dev-only, togglable, stripped in release builds) FPS counter and frame-time budget warning if any single frame exceeds ~8.3ms (120fps budget) sustained over 2 seconds.

**Acceptance criteria:**
- Blank scene renders at target framerate on-device with the empty group in place.
- Toggling the dev FPS counter shows a stable number with nothing drawn yet — this is your baseline before adding cost in Phase 2.
- `disposeCelestialLayer()` can be called manually (e.g. from a debug button) and results in zero WebGL memory growth on repeated calls, verified via `renderer.info.memory`.

---

## 3. Phase 2 — Celestial body systems

**Objective:** populate `backgroundCelestialGroup` with the living universe: nebula, galaxy, planets, meteors, comets. This is the highest-risk phase for framerate — build and profile each sub-system independently before combining them.

### 3.1 Volumetric nebula shader (Z = -14.0)
- A full-screen or large-plane `ShaderMaterial` using a GLSL 2D simplex noise function computed per-fragment on the GPU (not CPU-side).
- Three color zones blended by noise value and horizontal position: left wing mint-teal `#4EC9B0`, right wing pastel-pink `#FFB6C1`, core spine midnight navy `#11111B` blended with lavender `#CBA6F7`.
- Expose a uniform (e.g. `uAudioPulse`) that the synth engine's `AnalyserNode` RMS output drives each frame — a subtle golden (`#F9E2AF`) brightness pulse tied to ambient audio energy. Wire the uniform now; it's fine if the actual audio connection is a stub until the audio engine exists.

### 3.2 Double-arm logarithmic spiral galaxy (Z = -12.0)
- 800 particles (a single `THREE.Points` with a `BufferGeometry`, not 800 individual meshes — this is the difference between smooth and janky on mobile).
- Position math, per particle, per arm (2 arms):
  ```
  r = 0.5 + random()^2 * 8.0
  theta = (r * 0.45) + (arm * PI) + noise
  ```
- Each point uses an offscreen-canvas-generated radial gradient glow texture (`PointsMaterial` with `map` + `transparent: true` + `blending: THREE.AdditiveBlending`), generated once at init, not per frame.
- Slow uniform rotation of the whole galaxy group over time (rotation, not position, so it composes cleanly with the parallax translation added in Phase 4).

### 3.3 Roaming planets (Z = -10.0 to -14.0)
- 3 low-poly, flat-shaded (`MeshBasicMaterial` or `MeshLambertMaterial` with `flatShading: true`) spheres at varying depth planes within that range.
- Each on an independent slow orbital path (simple parametric motion, not physics-simulated).
- The middle planet gets a translucent ring (`RingGeometry` + `MeshBasicMaterial` with low opacity, additive or normal blending — test both, pick whichever doesn't wash out against the nebula).

### 3.4 Meteors
- A pooled system (reuse a fixed set of meteor objects rather than instantiating new ones) firing roughly every 3 seconds — stagger, don't fire all on the same tick.
- Each meteor: a short line/streak geometry with an additive glow trail, moving diagonally across the frame and fading out (opacity tween, not a spawned/destroyed mesh) before returning to the pool.

### 3.5 Comets with waving tails
- A comet head (small glowing sphere or sprite) drifting slowly left-to-right, with a tail mesh whose vertices are displaced per-frame:
  ```js
  const positions = tail.geometry.attributes.position.array;
  for (let j = 0; j < positions.length / 3; j++) {
    positions[j * 3 + 1] = -j * 0.02 + Math.sin(time * 8.0 + j) * 0.03;
  }
  tail.geometry.attributes.position.needsUpdate = true;
  ```
- Keep the tail vertex count low (this loop runs every frame, per comet) — profile with 1 comet before allowing more than 2 on screen at once.

**Acceptance criteria:**
- Each of the five sub-systems (3.1–3.5) hits target framerate *in isolation* before you combine them — profile one at a time.
- Combined scene sustains 60fps minimum on your lowest target device, 120fps on higher-end devices, with the dev FPS counter as proof.
- Every geometry/material/texture created here is registered in the Phase 1 disposal registry.
- Visual QA: left wing reads mint-teal, right wing reads pastel-pink, no color outside the palette table in section 0.

---

## 4. Phase 3 — Interaction layer

**Objective:** make the background feel alive and responsive to touch, without ever moving anything outside `backgroundCelestialGroup`'s own transform.

### 4.1 Touch repulsion
- On tap/drag, unproject the screen-space pointer coordinate into the `Z = -12.0` plane (standard raycaster-to-plane projection, not a full raycast against every star).
- Stars within a 2.5-unit radius of that projected point get pushed radially outward from it.
- On release (or continuously), ease displaced stars back to their rest position at roughly 0.03 spring interpolation per frame — smooth, not snapping.

### 4.2 Baseline-calibrated gyroscope parallax
- Subtract a 55° baseline from the device's portrait-orientation beta reading before using it, so the parallax is centered on how the phone is actually held, not on a flat 0° assumption:
  ```js
  const tilt = ((e.beta - 55) * 0.003);
  const clamped = Math.max(-0.25, Math.min(0.25, tilt));
  ```
- Apply `clamped` as a small offset to `backgroundCelestialGroup` alongside (not instead of) the touch-repulsion effect — they should compose, not conflict.

**Acceptance criteria:**
- Dragging a finger across the screen visibly and smoothly displaces nearby stars, with no stutter and no permanent drift after release.
- Tilting the device produces a subtle, comfortable parallax shift — not motion-sickness-inducing. If ±0.25 feels too strong on-device, that's a tuning call to flag back, not something to silently change without noting it.

---

## 5. Phase 4 — Space shuttle cockpit

**Objective:** the pilot's-POV mode. This is where the Phase 2 "everything is one group" discipline pays off — the entire universe pans as a single rigid block with zero coordinate drift.

### 5.1 Mode transition
- Tapping the shuttle nav control (🚀) triggers a coordinated camera/UI transition: Kiro, its pedestal, and the neon ring animate out of view; a windshield frame and a centered crosshair reticle HUD animate in.
- This is a state change (`telescopeActive` in `KiroState`), not a scene reload — the same `backgroundCelestialGroup` stays mounted and visible throughout, just reframed by the new camera/HUD context.

### 5.2 Unified parallax translation
This is the core mechanic. In the per-frame update:
```js
if (isTelescope) {
  backgroundCelestialGroup.position.x = steering.yaw * 0.08;
  backgroundCelestialGroup.position.y = steering.pitch * 0.08;
} else {
  backgroundCelestialGroup.position.x += (0 - backgroundCelestialGroup.position.x) * 0.05;
  backgroundCelestialGroup.position.y += (0 - backgroundCelestialGroup.position.y) * 0.05;
}
```
Because every star, planet, meteor, and comet is a child of this one group, translating the group's position is enough — never translate individual celestial objects to simulate steering. That's the bug this architecture exists to prevent.

### 5.3 Joystick steering
- On-screen directional control (▲ ▼ ◀ ▶, or a drag-based virtual joystick) updates `steering.yaw` and `steering.pitch` in `KiroState`, consumed by 5.2 above.
- Steering input should feel damped, not 1:1 — a small internal lerp toward the target yaw/pitch reads as "piloting," a direct snap reads as "dragging a background image."

### 5.4 Target lock-on
- Place 4 holographic target markers (e.g. "Butterfly Galaxy," "Sombrero Vortex") at fixed positions within `backgroundCelestialGroup`, so they pan correctly with everything else.
- When the crosshair (fixed at screen center) overlaps a target's projected screen position within a tolerance radius, trigger a lock-on chime and hand off to the relevant mini-game entry point.

**Acceptance criteria:**
- Entering and exiting cockpit mode repeatedly never leaves the background off-center or misaligned — the ease-back in 5.2 always returns exactly to `(0,0)`.
- Steering feels stable at target framerate with no added jank versus Phase 3's baseline.
- Lock-on triggers reliably at the intended tolerance without false positives from nearby stars.

---

## 6. Phase 5 — Hardening & QA

**Objective:** make this feature ship-safe under the project's existing harness, not just "working on my phone."

- Extend `kiro-agent-harness.py`'s checks to cover this feature specifically: palette-token compliance (no hex outside section 0's table anywhere in the new code), presence of a disposal call for every geometry/material/texture created in Phase 2, and confirmation that no new code translates an individual celestial child object directly (that would violate the Phase 5.2 contract).
- Run the existing dual-verification step (`python kiro-agent-harness.py --check` + `./gradlew.bat test compileDebugAndroidTestKotlin assembleDebug`) with this feature included.
- Cross-device pass: verify sustained framerate and memory stability (via `renderer.info.memory` before/after repeated cockpit enter/exit cycles) on at least a low-end and a high-end target device, not just your dev machine.
- Confirm `TRIM_MEMORY_RUNNING_CRITICAL` actually clears the disposal registry from Phase 1 without visually breaking the scene if the app returns from background.

**Definition of done:**
- All five phases pass their individual acceptance criteria.
- Harness dual-verification passes clean.
- No frame-time budget warnings over a 5-minute soak test alternating between dashboard and cockpit mode.
