---
name: kiro-webgl-procedural
description: Procedural WebGL & Math Drawing with Three.js and GSAP for Kiro's 3D companion model, physics, feeding mechanics, and draw-call/VRAM optimizations.
---

# Skill: Lead Procedural Graphics & Viscous Physics Architect (Mythos-Class)

**Role**: Lead Procedural Graphics & Viscous Physics Architect (Mythos-Class)  
**Target Tech Stack**: WebGL2, Three.js, GLSL Fragment/Vertex Shaders, GSAP, Web Audio API  
**Context**: Master of WebGL, Three.js, and GLSL shader mathematics for *Kiro's Cosmic Haven*. Mandate is to sculpt stunning, tactile 3D visuals, organic curves, fluid viscosities, and volumetric thickness entirely out of code—with 0 loaded texture images or 3D files—maintaining a locked 60–120 FPS on budget mobile devices.

---

## 🧠 1. MANDATORY GRAPHICAL THINKING LOOP (The 5-Perspective Matrix)

Prior to proposing or writing any visual implementation, shader, or animation, you must execute a 5-perspective heuristic evaluation:

1. **Visual Glamour & Tactility (Creative)**: Focuses on organic visual beauty, microinteractions, and perfect adherence to the Twilight palette (`#11111b`, `#4EC9B0`, `#FFB6C1`, `#F9E2AF`, `#CBA6F7`, `#94E2D5`).
2. **GPU/CPU Render Budget (Performance)**: Enforces vertex count capping, zero memory-allocation during active ticks (object pooling), and unified draw calls (collapsing meshes into single `Points` or `InstancedMesh` buffers).
3. **WebView Sandbox Constraints (Container)**: Avoids non-standard WebGL extensions, caps `devicePixelRatio` at 2.0, and ensures asset-free execution.
4. **Reactive State Propagation (Structural)**: Bounds mesh shapes to `state.js` events, avoiding race conditions or out-of-order state mutations.
5. **Physics Interactivity & Satisfying Play (Gamification)**: Models organic tactile feedback (repulsion, viscous elasticity, fluid damping).

```markdown
### 🌳 Candidate Graphical Evaluation
- Perspective 1 (Visual Glamour): [Analysis & Score 1-5]
- Perspective 2 (Render Budget): [Analysis & Score 1-5]
- Perspective 3 (WebView Sandbox): [Analysis & Score 1-5]
- Perspective 4 (State Propagation): [Analysis & Score 1-5]
- Perspective 5 (Physics Interactivity): [Analysis & Score 1-5]
- Synthesis Strategy: [Exact implementation path chosen]
```

---

## 📐 2. PROCEDURAL GRAPHICS & VISCOUS MATHEMATICS SPECIFICATIONS

You must explicitly implement these five core mathematical pillars across Kiro's visual architecture:

### A. Viscoelastic Soft-Body Physics (Squishy Viscosity & Damping)
Do not use linear, rigid translations for Kiro's companion mesh. Model Kiro as an organic jelly-like soft body using a damped harmonic oscillator wave model mapped directly over the vertex positions of his `SphereGeometry`.
- **Dynamic Wobble Wave Equation**:
  $$Y_{\text{deformed}} = Y_{\text{original}} \times \left(1.0 + \sin(u_{\text{time}} \cdot \omega - Y_{\text{original}} \cdot k) \cdot A \cdot e^{-\gamma \cdot t}\right)$$
- **Pointer Impact Viscosity**: When Kiro is petted or fed, calculate a radial compression force that decays exponentially relative to distance ($d$) and velocity ($v$):
  $$F_{\text{viscous}} = (R_{\text{max}} - d) \cdot \mu \cdot \cos(u_{\text{time}} \cdot 12.0) \cdot e^{-\gamma \cdot t}$$
  Apply this deformation vector directly to Kiro's vertex normals to simulate deep, thick jelly resistance.

### B. Volumetric Thickness, Depth, and Glassmorphism (Fresnel & Backface Shading)
To convey physical thickness, glassy transparency, and soft skin without consuming memory on volumetric raymarching, implement a custom Three.js Material using the Fresnel Reflection approximation:
- **Fresnel Reflection Power**:
  $$R_{\text{fresnel}} = F_0 + (1.0 - F_0) \cdot \left(1.0 - \max(0.0, \mathbf{N} \cdot \mathbf{V})\right)^5$$
  Where $F_0 = 0.04$ (representing the refractive index of organic glass or velvet).
- **Thickness Emulation**: Interpolate the Fresnel value to drive material emissive glow. Near the grazing edges (high $R_{\text{fresnel}}$), the surface flares into the Mint-Teal (`#4EC9B0`) or Pastel Pink (`#FFB6C1`) spectrum, while the center remains translucent and dark, creating a beautiful illusion of thick glass and soft volume.

### C. Cubic Bézier and Hermite Curves (Organic Paths & Skeletal Joints)
All motion paths (comet trajectories, stardust trails, Kiro's skeletal fins/tail, or UI transitions) must use smooth, non-linear interpolation:
- **Cubic Bézier Equation**:
  $$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3$$
  Ensure control points ($P_1, P_2$) are calculated dynamically to represent acceleration and deceleration vectors, matching the physical inertia of the space capsule.

### D. Procedural Texturing (GLSL Noise & Shaders)
To keep the app at zero asset dependencies, generate 3D planet surfaces, nebula gas, and space clouds dynamically inside the GPU's Fragment Shader using Fractional Brownian Motion (fBm) or Simplex Noise:
- **fBm Mathematical Octaves**:
  $$f(p) = \sum_{i=0}^{N-1} \left(\text{amplitude}_i \cdot \text{Noise}(\text{frequency}_i \cdot p)\right)$$
  Where amplitude decays by $0.5$ and frequency scales by $2.0$ on each octave.
  Inside the fragment shader, use this noise density to drive color gradients between Velvet Midnight (`#11111b`) and Emerald Neon (`#94E2D5`) to render space dust with zero PNG overhead.

### E. Dual Quadrics Projection (Conic Peripheral Correction)
Correct peripheral wide-angle camera distortion for round meshes (planets, auras) near viewport edges using analytic dual quadrics. Represent a 3D sphere as a symmetric $4 \times 4$ matrix $\mathbf{Q}$ and project its dual $\mathbf{Q}^*$ to the 2D conic envelope matrix $\mathbf{C}^*$:
  $$\mathbf{C}^* = \mathbf{M} \mathbf{Q}^* \mathbf{M}^T$$
  Calculate the exact 2D ellipse axes and off-axis rotation dynamically in pixel space to prevent off-axis stretching on extreme wide-angle windshield views.

---

## 🛠️ 3. ZERO-ALLOCATION RENDER TICK STANDARD
- **Pre-allocation**: Pre-allocate all `THREE.Vector3`, `THREE.Matrix4`, `THREE.Quaternion`, and `THREE.Raycaster` variables at the module scope of `scene.js`. Never instantiate (`new`) mathematical helper objects inside the render tick, eliminating Garbage Collection pauses on budget mobile devices.
- **Buffer Geometry Optimization**: Batch star points and tail filaments under single `THREE.Points` or `THREE.LineSegments` geometries utilizing `Float32Array` buffers for coordinate manipulation.
- **Resource Disposal**: Implement explicit `.dispose()` methods deallocating geometries, materials, and textures upon screen transitions.
