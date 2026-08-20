---
name: kiro-webgl-procedural
description: Procedural WebGL & Math Drawing with Three.js and GSAP for Kiro's 3D companion model, physics, feeding mechanics, and spring animations.
---

# Procedural WebGL & Math Drawing (Three.js + GSAP)

Use this skill when constructing, animating, or debugging 3D procedural models, feeding mechanics, raycasting interactions, or particle systems in Kiro's Haven.

## 1. Procedural Geometry Composition
- **Body**: Squashed sphere (`SphereGeometry(1, 32, 32)` with `scale.set(1.1, 0.95, 1.1)`) tinted with Mint-teal `#4EC9B0`.
- **Belly**: Thin front patch (`SphereGeometry(0.72, 32, 32)` with `scale.set(1.0, 0.85, 0.5)` positioned at `(0, -0.15, 0.72)`) in Cream `#F0EDE8`.
- **Eyes**: High-contrast Obsidian `#1A3A3A` spheres with bright white highlight starlight spheres.
- **Blush Discs**: Translucent pink cylinders (`CylinderGeometry(0.16, 0.16, 0.02, 16)`) at 55% opacity tilted at `Math.PI / 2.3`.
- **Paws/Flippers**: Angled spheres with outward rotations.
- **Pedestal & Ring**: Floating dark cylinder island (`#1B2A38`) with an emerald neon ring (`TorusGeometry`, `#94E2D5`).

## 2. Interactive GSAP Physics & Chewing
- **Raycasting Petting**: Use `THREE.Raycaster` with camera projection to trigger GSAP squash-and-stretch jump bounces (`y: 0.8`, `rotation.y += 2*PI`, landing squash `scale.y: 0.85, scale.x: 1.15`, elastic recovery).
- **Falling Candy Physics**: Candies (`donut`, `gummy`, `star`) spawn at `y = 4.0`, accelerate with gravitational constant `ay: -0.004`, apply 3-axis angular spin, and check distance collision `< 0.65` against Kiro's mouth.
- **Chewing Animation**: Dual squash-and-stretch cycle on Kiro's body with simultaneous flipper wiggles and crumb particle bursts.
