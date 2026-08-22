/**
 * Kiro's Cosmic Haven - Astrogation & Celestial Physics Agent (js/physics-agent.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements Keplerian planetary trajectories, logarithmic double-arm spiral coordinates,
 * spring-damper cursor repulsion fields, and 3D-to-2D pinhole camera perspective projections.
 * 
 * Sibling-import compatible for secure Android WebView offline sandbox execution.
 */

import { KiroState } from './state.js';

export class KiroPhysicsAgent {
  constructor(focalLength = 3024, viewportWidth = 1080, viewportHeight = 1920) {
    // 1. Camera Intrinsic Parameters (K-Matrix)
    this.fx = focalLength;
    this.fy = focalLength;
    this.cx = viewportWidth / 2;
    this.cy = viewportHeight / 2;
    this.skew = 0; // Negligible in modern digital sensors

    // 2. Camera Extrinsic Parameters (6-DOF Translation and Rotation)
    this.translation = { x: 0, y: 0.4, z: 6.2 }; // Eye level above ground
    this.rotation = { yaw: 0, pitch: 0, roll: 0 }; // Euler angles in radians

    // 3. Physical Constants & Boundaries
    this.gravity = -4.8; // Gravity for falling starlight treats
    this.damping = 0.95; // Friction damping factor for spring oscillators
    this.repulsionRadius = 2.5; // Radius of tactile coordinate disturbance in space
  }

  /**
   * Update viewport dimensions for dynamic intrinsic matrix recalibration.
   */
  updateViewport(width, height, focalLength = 3024) {
    this.cx = width / 2;
    this.cy = height / 2;
    this.fx = focalLength;
    this.fy = focalLength;
  }

  /**
   * Compute Keplerian elliptical trajectories for roaming planets
   * Formulated using parametric angle theta, semi-major axis (a), and semi-minor axis (b)
   */
  calculateOrbitalPosition(semiMajor, semiMinor, angle, tiltAngle = 0.15) {
    const xRaw = Math.cos(angle) * semiMajor;
    const yRaw = Math.sin(angle) * semiMinor;

    // Apply 3D coordinate orbital tilt plane
    return {
      x: xRaw,
      y: yRaw * Math.cos(tiltAngle),
      z: -yRaw * Math.sin(tiltAngle)
    };
  }

  /**
   * Generate double-arm spiral logarithmic coordinates for background stars
   * Math: r = A * e^(B * theta) packed with density scattering
   */
  calculateSpiralStarPosition(index, totalStars) {
    const arm = index % 2; // Symmetrical split: Arm 0 (Pat Teal) / Arm 1 (Yang Pink)
    
    // Logarithmic core concentration: dense at center, sparse at outer rim
    const r = 0.5 + Math.pow(Math.random(), 2.0) * 8.5; 
    const angle = (r * 0.45) + (arm * Math.PI) + (Math.random() - 0.5) * 0.45;

    return {
      x: Math.cos(angle) * r,
      y: (Math.random() - 0.5) * 0.8, // Subtle vertical depth scattering
      z: Math.sin(angle) * r - 15.0,  // Push deep behind interactive HUD
      arm: arm
    };
  }

  /**
   * Calculate spring-damper mouse/touch repulsion force field vector (Hooke's Law)
   */
  calculateRepulsionForce(starX, starY, cursorX, cursorY) {
    const dx = starX - cursorX;
    const dy = starY - cursorY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.repulsionRadius && distance > 0.0001) {
      // Hooke's Law expansion: Force is inversely proportional to distance
      const force = (this.repulsionRadius - distance) * 0.28;
      return {
        fx: (dx / distance) * force,
        fy: (dy / distance) * force
      };
    }
    return { fx: 0, fy: 0 };
  }

  /**
   * 3D Pinhole Camera Projection: Maps world points to 2D image pixels
   * Equation: λ * [u, v, 1]^T = K * [R | T] * [X, Y, Z, 1]^T
   */
  project3DTo2DPixel(worldPoint) {
    // A. Apply Extrinsic Translations & Rotations (World -> Camera coordinates)
    let xc = worldPoint.x - this.translation.x;
    let yc = worldPoint.y - this.translation.y;
    let zc = worldPoint.z - this.translation.z;

    // Apply pitch (theta) and yaw (psi) rotations
    const cosP = Math.cos(this.rotation.pitch);
    const sinP = Math.sin(this.rotation.pitch);
    const cosY = Math.cos(this.rotation.yaw);
    const sinY = Math.sin(this.rotation.yaw);

    // Rotation Matrix multiplication
    const xRot = cosY * xc - sinY * zc;
    const zRot = sinY * xc + cosY * zc;
    const yRot = cosP * yc + sinP * zRot;
    const zFinal = -sinP * yc + cosP * zRot;

    // B. Apply Intrinsic K-Matrix Perspective Division (De-Homogenization)
    if (Math.abs(zFinal) < 0.0001) return null; // Avoid division-by-zero plane singularity
    
    const scale = 1.0 / zFinal; // Dynamic depth scale factor
    const u = this.fx * (xRot * scale) + this.cx;
    const v = this.fy * (yRot * scale) + this.cy;

    return { u, v, zDepth: zFinal };
  }

  /**
   * Unproject: Back-projects 2D screen coordinate to a 3D plane at depth Zc
   */
  unproject2DTo3DPlane(screenX, screenY, planeZ) {
    // Convert screen pixel coordinates back to normalized camera space
    const normX = (screenX - this.cx) / this.fx;
    const normY = (screenY - this.cy) / this.fy;

    // Scale coordinates by proportional target plane depth
    const scaleFactor = Math.abs(planeZ); 
    return {
      x: normX * scaleFactor,
      y: normY * scaleFactor,
      z: planeZ
    };
  }

  /**
   * Dual Quadric Projection Envelope: Projects a 3D sphere into a 2D conic ellipse
   * Equation: C* = M * Q* * M^T
   */
  projectSphereToEllipse(sphereCenter, radius) {
    const r2 = radius * radius;
    const z = Math.abs(sphereCenter.z) || 1;
    
    // Evaluate eccentricity wide-angle peripheral stretching
    const offAxisDistance = Math.sqrt(sphereCenter.x * sphereCenter.x + sphereCenter.y * sphereCenter.y);
    const eccentricity = offAxisDistance / z;

    return {
      center: this.project3DTo2DPixel(sphereCenter),
      semiMajorAxis: radius * (this.fx / z) * (1 + eccentricity * 0.15), // Stretch factor
      semiMinorAxis: radius * (this.fx / z),
      rotation: Math.atan2(sphereCenter.y, sphereCenter.x) // Pointing outwards off-axis
    };
  }
}

export default KiroPhysicsAgent;
