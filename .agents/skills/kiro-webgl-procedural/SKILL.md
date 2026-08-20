---
name: kiro-webgl-procedural
description: Procedural WebGL & Math Drawing with Three.js and GSAP for Kiro's 3D companion model, physics, feeding mechanics, and draw-call/VRAM optimizations.
---

# Skill 1: WebGL Rendering & Draw Call Optimization

**Target Tech Stack**: Three.js, GSAP, WebGL2 Canvas  
**Scope**: Managing Kiro's 3D environment, procedurally building meshes, and implementing interactive petting and feeding physics.

## 1. Engineering Directives

### A. Strict Draw Call Budgets
- **Mobile WebGL Limit**: Maintain fewer than **50 draw calls per frame** for mobile WebGL.
- **Mesh Merging**: Group and merge static geometry components (e.g. environment sparkles, pedestal rings) to prevent driver-side CPU bottlenecks.
- **Material Sharing**: Reuse common `MeshStandardMaterial` and `MeshBasicMaterial` instances across sub-meshes rather than instantiating duplicate materials.

### B. Zero Layout Interleaving
- **Hot Loop Optimization**: Never measure and write layout styles in an interleaved pattern during animation frames.
- **Cached Projections**: All DOM measurements (e.g., bounding boxes, canvas resize dimensions, touch coordinate mappings) must be cached and updated strictly on `resize` or `pointer` events, never inside the hot `requestAnimationFrame` render loop.

### C. VRAM Footprint & Texture Compression
- **VRAM Estimation**:
  $$\text{Memory Overhead} = \text{Width} \times \text{Height} \times \text{Bytes per Pixel}$$
- **Compression Priorities**: When using external textures, prioritize **KTX2 containers with Basis Universal supercompression**:
  - `ETC1S` for low-to-medium quality color textures.
  - `UASTC` for high-quality normal, roughness, and alpha maps.
- **Low Memory Killer (LMK) Protection**: Keep total runtime GPU texture allocations below **32MB** to prevent Android LMK process termination.

### D. Hardware-Accelerated Fallbacks
- On mobile devices with `devicePixelRatio > 2` or lower GPU tiers, clamp `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))`.
- If frame drops (< 45 FPS) are detected, enable half-resolution scaling and disable `antialias` dynamically to guarantee a locked 60 FPS.

---

## 2. Procedural Geometry Composition
- **Kiro Body**: Squashed sphere (`SphereGeometry(1, 32, 32)`, `scale(1.1, 0.95, 1.1)`) in Mint-Teal `#4EC9B0`.
- **Creamy Belly**: Front patch (`SphereGeometry(0.72, 32, 32)`, `scale(1.0, 0.85, 0.5)` at `(0, -0.15, 0.72)`) in Cream `#F0EDE8`.
- **Obsidian Eyes**: Deep spheres (`#1A3A3A`) with bright specular starlight highlights (`#FFFFFF`).
- **Blush Discs**: Translucent pink cylinders (`#FFB6C1`, 55% opacity) tilted at `Math.PI / 2.3`.
- **Nightcap**: Lavender cone (`#CBA6F7`) with golden star pompom (`#F9E2AF`).
- **Pedestal & Neon Ring**: Dark floating island (`#1B2A38`) with emerald ring (`#94E2D5`) and 35 orbiting stars.

---

## 3. Interactive GSAP Physics & Chewing
- **Raycasting Petting**: Use `THREE.Raycaster` to trigger GSAP jump-and-spin animations (`y: 0.8`, `rotation.y += 2*PI`, landing squash `scale.y: 0.85, scale.x: 1.15`, elastic recovery).
- **Falling Candy Physics**: Candies (`donut`, `gummy`, `star`) spawn at `y = 4.0`, accelerate with gravity constant `ay = -0.004`, apply 3-axis rotational spin, and trigger collision when distance to mouth $< 0.65$.
- **Chewing Squash & Stretch**: Dual GSAP scale transitions on Kiro's body with flipper wiggles and crumb particle bursts.
