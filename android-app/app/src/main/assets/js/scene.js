/**
 * scene.js (Space Capsule V5.5 — Master Procedural WebGL & Unified Celestial Environment)
 * ─────────────────────────────────────────────────────────────────────────────────────
 * Fully implements the 5-phase Celestial Background & Space Shuttle Cockpit Architecture:
 * 
 * 1. Scene & Rendering Foundation:
 *    - Unified backgroundCelestialGroup at (0, 0, 0)
 *    - updateCelestialLayer(time, delta) render hook
 *    - celestialDisposalRegistry for zero GPU memory leaks
 *    - Togglable dev FPS & frame-budget performance monitor
 * 
 * 2. Living Celestial Body Systems (Children of backgroundCelestialGroup):
 *    - Volumetric Nebula Shader (Simplex noise GLSL at Z = -14.0)
 *    - Double-Arm Logarithmic Spiral Galaxy (800 radial glow stars at Z = -12.0)
 *    - 3 Roaming Flat-Shaded Low-Poly Planets (with translucent Saturn-like ring at Z = -11.0 to -13.5)
 *    - 6-Meteor Pooled Streak System (staggered diagonal diagonal trails with opacity tweens)
 *    - Living Comet with procedurally waving tail vertices
 * 
 * 3. Interaction Layer:
 *    - Unprojected pointer touch repulsion (2.5-unit radius, 0.03 fluid spring easing)
 *    - Baseline-calibrated gyroscope parallax (55 deg portrait hold baseline, clamped +-0.25)
 * 
 * 4. Space Shuttle Cockpit & Pilot Navigation:
 *    - Seamless camera/Kiro mode transitions via KiroState.get('telescopeActive')
 *    - Unified rigid-body parallax translation (zero coordinate drift)
 *    - 4 Holographic planetary targets (Butterfly Galaxy, Helix Nebula, Sombrero Vortex, Crab Pulsar)
 *    - Centered reticle lock-on alignment with audio chime feedback
 * 
 * 5. Memory Hardening & Android TRIM_MEMORY Bridge
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';
import KiroPhysicsAgent from './physics-agent.js';

// Pre-allocated Module Scratch Objects (Zero-Allocation Render Tick Standard)
const _scratchVec1 = new THREE.Vector3();
const _scratchVec2 = new THREE.Vector3();
const _scratchVec3 = new THREE.Vector3();
const _scratchColor = new THREE.Color();
const _scratchMat4 = new THREE.Matrix4();
const _scratchQuat = new THREE.Quaternion();
const _scratchRay = new THREE.Ray();

// Helper: Generate procedural radial glow texture for 100% reliable mobile star rendering
function createGlowStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // 1. Soft Outer Starlight Halo
  const outerGrad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  outerGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  outerGrad.addColorStop(0.15, 'rgba(230, 245, 255, 0.95)');
  outerGrad.addColorStop(0.38, 'rgba(148, 226, 213, 0.50)');
  outerGrad.addColorStop(0.65, 'rgba(203, 166, 247, 0.18)');
  outerGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, 128, 128);

  // 2. Crisp Diamond Twinkle Core
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.ellipse(64, 64, 3.5, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(64, 64, 18, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Subtle 4-Point Optical Diffraction Spikes
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(64, 8);
  ctx.lineTo(64, 120);
  ctx.moveTo(8, 64);
  ctx.lineTo(120, 64);
  ctx.stroke();

  // 4. Delicate diagonal micro rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(34, 34);
  ctx.lineTo(94, 94);
  ctx.moveTo(94, 34);
  ctx.lineTo(34, 94);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class KiroSceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    if (typeof THREE === 'undefined') {
      console.error('[KiroScene] THREE.js is not loaded.');
      return;
    }

    // Core Engine References
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this._elapsedTime = 0; // Manual accumulator — avoids THREE.Clock double-call bug
    this.animationFrameId = null;
    this.isDisposed = false;
    this.isPetting = false;
    this.isTelescopeTransitioning = false;

    // Dynamic 5-Phase Idle Animation Engine
    this.isPlayingIdle = false;
    this.idleTimer = 0;
    this.nextIdleTrigger = 4.5;
    this.lastIdleIndex = -1;

    // Viscoelastic Soft-Body Physics (Squishy Damped Harmonic Oscillator)
    this.viscousWobble = {
      active: false,
      startTime: 0,
      amplitude: 0.18,
      frequency: 14.0,
      decay: 3.2
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 1: Foundation & Disposal Registry
    // ─────────────────────────────────────────────────────────────────────────
    this.backgroundCelestialGroup = null;
    this.celestialDisposalRegistry = new Set();
    this.lastFrameTime = performance.now();
    this.fpsHistory = [];
    this.devFpsBadge = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 2: Celestial Body Subsystems
    // ─────────────────────────────────────────────────────────────────────────
    // 2.0 Deep Distant Cosmic Starfield (1400 stars across vast 3D hemisphere)
    this.distantStars = null;
    this.distantStarCount = 1400;
    this.distantStarOriginalPositions = [];
    this.distantStarPhases = [];

    // 2.1 Nebula Shader
    this.nebulaMesh = null;
    this.nebulaMaterial = null;

    // 2.2 Double-Arm Logarithmic Spiral Galaxy
    this.galaxyPoints = null;
    this.galaxyCount = 850;
    this.galaxyOriginalPositions = [];
    this.galaxyPhases = [];
    this.starTexture = null;

    // 2.3 Roaming Planets
    this.roamingPlanets = [];

    // 2.4 Meteor Pool
    this.meteorPool = [];
    this.maxMeteors = 6;
    this.nextMeteorSpawnTime = 0;

    // 2.5 Living Comet with Waving Tail
    this.cometMesh = null;
    this.cometTail = null;
    this.cometHead = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 3: Interaction, Touch Trails & Tactile Raycasting
    // ─────────────────────────────────────────────────────────────────────────
    this.mouse = new THREE.Vector2(0, 0);
    this.pointerInCanvas = false;
    this.gyro = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.touchParticles = [];
    this.maxTouchParticles = 80;
    this.raycaster = new THREE.Raycaster();
    this.lastPetTime = 0;

    // ─────────────────────────────────────────────────────────────────────────
    // Phase 4: Cockpit Space Shuttle & Holographic Targets
    // ─────────────────────────────────────────────────────────────────────────
    this.cockpitGroup = null;
    this.crosshairMesh = null;
    this.targetSystemMeshes = [];
    this.lastAlignedTargetId = null;
    this.spaceSystems = [
      { id: 'butterfly', name: 'Butterfly Galaxy (NGC 6302)', game: 'Nebula Dodge', type: 'GALACTIC SANCTUARY', dist: '3.80 kly', x: 6.2, y: 1.6, z: -8.5, size: 0.75, color: 0xF5C2E7 },
      { id: 'helix',     name: 'Eye of Helix Nebula (NGC 7293)', game: 'Celestial Bounce', type: 'IONIZED NEBULA', dist: '655 ly', x: -6.8, y: 2.4, z: -9.2, size: 0.85, color: 0x94E2D5 },
      { id: 'sombrero',  name: 'Sombrero Vortex (M104)', game: 'Cosmic Chimes', type: 'SPIRAL CORE', dist: '29.3 Mly', x: 7.5, y: -1.8, z: -10.0, size: 0.80, color: 0xF9E2AF },
      { id: 'crab',      name: 'Crab Pulsar Core (M1)', game: 'Supernova Blast', type: 'NEUTRON PULSAR', dist: '6.50 kly', x: -6.2, y: -2.2, z: -8.8, size: 0.70, color: 0xCBA6F7 },
      { id: 'gliese',    name: 'Mint Ice World (Gliese 667)', game: 'Frozen Stardust', type: 'EXOPLANET SANCTUARY', dist: '23.6 ly', x: -4.5, y: -0.5, z: -10.5, size: 0.60, color: 0x4EC9B0 },
      { id: 'kepler',    name: 'Lavender Ring Giant (Kepler 186)', game: 'Orbital Rings', type: 'RINGED GAS GIANT', dist: '582 ly', x: 4.8, y: 3.2, z: -11.0, size: 0.65, color: 0xCBA6F7 },
      { id: 'trappist',  name: 'Pastel Star Sanctuary (Trappist 1)', game: 'Starlight Catch', type: 'RED DWARF HABITAT', dist: '39.6 ly', x: 1.5, y: -3.4, z: -12.0, size: 0.55, color: 0xFFB6C1 }
    ];
    this.warpSpeed = 0.02;
    this.warpStarSize = 0.42;
    this.warpZStretch = 1.0;

    // ─────────────────────────────────────────────────────────────────────────
    // Entangled Twin Starlight Orbit (Patrick & Yangiee Link)
    // ─────────────────────────────────────────────────────────────────────────
    this.entangledStarlightGroup = null;
    this.patStarlightOrb = null;
    this.yangStarlightOrb = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Kiro Sanctuary Companion (Z = 0.0)
    // ─────────────────────────────────────────────────────────────────────────
    this.kiroGroup = null;
    this.pedestal = null;
    this.neonRing = null;
    this.pedestalSparkles = null;
    this.goldenAura = null;
    this.auraMaterial = null;
    this.nightcap = null;
    this.leftEye = null;
    this.rightEye = null;
    this.leftHl = null;
    this.rightHl = null;
    this.leftHl2 = null;
    this.rightHl2 = null;
    this.leftBlush = null;
    this.rightBlush = null;
    this.mouth = null;
    this.leftSleepEye = null;
    this.rightSleepEye = null;
    this.leftArm = null;
    this.rightArm = null;
    this.activeCandies = [];
    this.waterDroplets = [];

    // Projective Geometry & Physical Camera Intrinsics (Hoiem's Law)
    this.CAMERA_ELEVATION_M = 1.7; // Standard human eye level
    this.PEDESTAL_DEPTH_M = 6.2;   // Optical depth along Z-axis
    this.PINHOLE_FOCAL_PX = 3024;  // Zero-skew reference focal length

    // Framing & Geometry Constants
    this.baseCameraY = 0.12;
    this.baseCameraZ = 6.2;

    // Astrogation & Celestial Physics Agent
    this.physicsAgent = new KiroPhysicsAgent(this.PINHOLE_FOCAL_PX, 1080, 1920);

    this.init();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 1: Scene & Rendering Foundation
     ───────────────────────────────────────────────────────────────────────── */
  init() {
    this.scene = new THREE.Scene();

    const width = window.innerWidth || (this.container ? this.container.clientWidth : 360);
    const height = window.innerHeight || (this.container ? this.container.clientHeight : 640);
    const aspect = width / height;

    // Optimized Pinhole Camera with Dynamic Mobile Portrait Viewport Calibration
    this.baseCameraZ = aspect < 0.8
      ? Math.max(5.6, 2.7 / (2 * Math.tan((45 * Math.PI / 180) / 2) * Math.max(aspect, 0.35)))
      : 5.4;

    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 200);
    this.camera.position.set(0, this.baseCameraY, this.baseCameraZ);

    // Pre-rendered Canvas Binding
    const existingCanvas = document.getElementById('webgl-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: existingCanvas || undefined,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setClearColor(0x11111b, 1.0);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (!existingCanvas) {
      this.renderer.domElement.id = 'webgl-canvas';
      this.renderer.domElement.style.position = 'absolute';
      this.renderer.domElement.style.inset = '0';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);
    }

    // High-Contrast Balanced Warm Celestial Lighting (Elevated Gold & Cozy Twilight Radiance)
    const ambient = new THREE.AmbientLight(0x2D1F38, 0.90);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xF9E2AF, 1.35);
    keyLight.position.set(3.5, 6.0, 5.0);
    this.scene.add(keyLight);

    const mintFill = new THREE.PointLight(0x4EC9B0, 1.4, 10);
    mintFill.position.set(0, -1.2, 1.8);
    this.scene.add(mintFill);

    const pinkRim = new THREE.DirectionalLight(0xFFB6C1, 0.85);
    pinkRim.position.set(-3.5, 3.0, -3.0);
    this.scene.add(pinkRim);

    const warmGlow = new THREE.PointLight(0xF9E2AF, 0.80, 8);
    warmGlow.position.set(0, 2.4, 1.5);
    this.scene.add(warmGlow);

    // 1. Instantiate the Master Background Celestial Group
    this.backgroundCelestialGroup = new THREE.Group();
    this.backgroundCelestialGroup.position.set(0, 0, 0);
    this.scene.add(this.backgroundCelestialGroup);

    // 2. Offscreen Star Texture Map
    this.starTexture = createGlowStarTexture();
    this.registerDisposable(this.starTexture);

    // 3. Build All Phase 2 Celestial Subsystems into backgroundCelestialGroup
    this.buildVolumetricNebula();
    this.buildDistantStarfield();
    this.buildDynamicSpiralGalaxy();
    this.buildRoamingPlanets();
    this.buildMeteorPool();
    this.buildLivingComet();
    this.buildHolographicTargets();

    // 4. Build Kiro Companion & Cockpit HUD
    this.buildEnvironment();
    this.buildKiro();
    this.buildCockpitHUD();

    // 5. Setup Dev Performance Monitor (if enabled)
    this.setupDevPerformanceMonitor();

    // 6. Bind Event Listeners & State Subscriptions
    this.bindEvents();
    this.subscribeState();

    this.resize();
    requestAnimationFrame(() => this.resize());
    setTimeout(() => this.resize(), 150);

    // Start Unified Render Loop
    this.animate();
  }

  registerDisposable(resource) {
    if (resource) {
      this.celestialDisposalRegistry.add(resource);
    }
  }

  setupDevPerformanceMonitor() {
    if (localStorage.getItem('kiro_dev_fps') === 'true') {
      this.devFpsBadge = document.createElement('div');
      this.devFpsBadge.style.cssText = `
        position: fixed; top: 8px; right: 8px; z-index: 9999;
        background: rgba(17, 17, 27, 0.85); border: 1px solid #4EC9B0;
        color: #4EC9B0; font-family: monospace; font-size: 11px;
        padding: 4px 8px; border-radius: 6px; pointer-events: none;
      `;
      document.body.appendChild(this.devFpsBadge);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 2: Celestial Body Systems (Children of backgroundCelestialGroup)
     ───────────────────────────────────────────────────────────────────────── */

  // 2.0 Deep Distant Cosmic Starfield (1400 stars across vast 3D hemisphere)
  buildDistantStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.distantStarCount * 3);
    const colors = new Float32Array(this.distantStarCount * 3);

    this.distantStarOriginalPositions = [];
    this.distantStarPhases = [];

    // Spectral Class Color Palette for Distant Stars
    const colorWhite = new THREE.Color(0xFFFFFF);      // Pure Diamond White
    const colorSoftWhite = new THREE.Color(0xF0F4F8);  // Class A White
    const colorIcyBlue = new THREE.Color(0xA6E3E9);    // Class B Blue
    const colorMint = new THREE.Color(0x94E2D5);       // Mint Starlight
    const colorGold = new THREE.Color(0xF9E2AF);       // Class G Warm Gold
    const colorRose = new THREE.Color(0xF5B7C0);       // Class M Soft Rose
    const colorLavender = new THREE.Color(0xCBA6F7);   // Lavender Twinkle

    for (let i = 0; i < this.distantStarCount; i++) {
      // Natural 3D spherical dome distribution across deep cosmic hemisphere
      // Spanning R = 24.0 to 65.0 units away from camera
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random();
      const phi = Math.acos(1.0 - u * 0.95); // Wide cone in front of camera
      const dist = 24.0 + Math.pow(Math.random(), 1.4) * 42.0;

      const x = Math.sin(phi) * Math.cos(theta) * dist;
      const y = Math.sin(phi) * Math.sin(theta) * dist;
      const z = -Math.cos(phi) * dist; // Strictly negative Z (in front of camera)

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.distantStarOriginalPositions.push({ x, y, z });
      this.distantStarPhases.push(Math.random() * Math.PI * 2);

      // Varied Spectral Distribution & Apparent Magnitudes
      const pick = Math.random();
      let starColor;
      if (pick < 0.40) {
        starColor = colorWhite.clone();
      } else if (pick < 0.60) {
        starColor = colorSoftWhite.clone();
      } else if (pick < 0.75) {
        starColor = colorIcyBlue.clone().lerp(colorMint, Math.random() * 0.5);
      } else if (pick < 0.88) {
        starColor = colorGold.clone();
      } else if (pick < 0.95) {
        starColor = colorRose.clone();
      } else {
        starColor = colorLavender.clone();
      }

      // Apparent brightness variation: 75% faint distant pin-pricks, 19% medium, 6% bright beacons
      let brightness;
      const bPick = Math.random();
      if (bPick < 0.75) {
        brightness = 0.40 + Math.random() * 0.35; // Faint background pin-prick
      } else if (bPick < 0.94) {
        brightness = 0.75 + Math.random() * 0.20; // Medium star
      } else {
        brightness = 1.0 + Math.random() * 0.35;  // Bright prominent beacon
      }
      starColor.multiplyScalar(brightness);

      colors[i * 3]     = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.38,
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.registerDisposable(starGeo);
    this.registerDisposable(starMat);

    this.distantStars = new THREE.Points(starGeo, starMat);
    this.backgroundCelestialGroup.add(this.distantStars);
  }

  // 2.1 Simple & Performant Cosmic Space Backdrop (Z = -18.0)
  buildVolumetricNebula() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Deep Midnight Space Radial Vignette (#0B0B14 to #18162E)
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 256);
    grad.addColorStop(0.0, '#1A1832'); // Subtle warm celestial glow center
    grad.addColorStop(0.45, '#131224'); // Cozy midnight twilight
    grad.addColorStop(0.80, '#0E0D1B'); // Deep space indigo
    grad.addColorStop(1.0, '#080811'); // Pure infinite cosmic vacuum

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.registerDisposable(texture);

    const nebulaGeo = new THREE.PlaneGeometry(90, 60);
    this.nebulaMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      depthWrite: false
    });

    this.registerDisposable(nebulaGeo);
    this.registerDisposable(this.nebulaMaterial);

    this.nebulaMesh = new THREE.Mesh(nebulaGeo, this.nebulaMaterial);
    this.nebulaMesh.position.set(0, 0, -18.0);
    this.backgroundCelestialGroup.add(this.nebulaMesh);
  }

  // 2.2 Double-Arm Logarithmic Spiral Galaxy (Z = -13.5)
  // Tilted in 3D (X-tilt ~50 deg, Y-tilt ~16 deg) so it renders as a natural elliptical spiral galaxy
  buildDynamicSpiralGalaxy() {
    const galaxyGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.galaxyCount * 3);
    const colors = new Float32Array(this.galaxyCount * 3);

    this.galaxyOriginalPositions = [];
    this.galaxyPhases = [];

    const colorTeal = new THREE.Color(0x4EC9B0);      // Mint Teal (Patrick's arm)
    const colorPink = new THREE.Color(0xFFB6C1);      // Pastel Pink (Yangiee's arm)
    const colorAmber = new THREE.Color(0xF9E2AF);     // Warm Gold (shared core)
    const colorCoreWhite = new THREE.Color(0xFFFFFF); // Core nucleus

    for (let i = 0; i < this.galaxyCount; i++) {
      const arm = i % 2;
      const isCore = i < 160; // Dense glowing nucleus

      let r, angle, u, v, w;

      if (isCore) {
        // High density spherical/elliptical galactic nucleus
        r = Math.pow(Math.random(), 1.6) * 1.5;
        angle = Math.random() * Math.PI * 2;
        u = Math.cos(angle) * r;
        v = Math.sin(angle) * r;
        w = (Math.random() - 0.5) * 0.45 * Math.exp(-r / 1.0);
      } else {
        // Double-arm logarithmic spiral disk
        r = 0.8 + Math.pow(Math.random(), 1.5) * 6.5;
        const armAngle = arm * Math.PI;
        const winding = 2.2 * Math.log(1.0 + r * 0.65);
        const dispersion = (Math.random() - 0.5) * (0.32 + r * 0.04);
        angle = armAngle + winding + dispersion;

        u = Math.cos(angle) * r;
        v = Math.sin(angle) * r;
        // Realistic exponential vertical disk thickness
        w = (Math.random() - 0.5) * 0.32 * Math.exp(-r / 3.8);
      }

      positions[i * 3]     = u;
      positions[i * 3 + 1] = v;
      positions[i * 3 + 2] = w;

      this.galaxyOriginalPositions.push({ x: u, y: v, z: w, r, arm, isCore });
      this.galaxyPhases.push(Math.random() * Math.PI * 2);

      // Sibling color story
      let starColor;
      if (isCore) {
        starColor = colorCoreWhite.clone().lerp(colorAmber, Math.random() * 0.75);
      } else if (arm === 0) {
        const coreMix = Math.max(0, 1.0 - r / 3.2) * 0.55;
        starColor = colorTeal.clone().lerp(colorAmber, coreMix);
      } else {
        const coreMix = Math.max(0, 1.0 - r / 3.2) * 0.55;
        starColor = colorPink.clone().lerp(colorAmber, coreMix);
      }

      colors[i * 3]     = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: this.warpStarSize,
      map: this.starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.registerDisposable(galaxyGeo);
    this.registerDisposable(galaxyMat);

    this.galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    // Position galaxy disk at Z = -13.5, gracefully tilted in 3D (X-tilt 50 deg, Y-tilt 16 deg)
    this.galaxyPoints.position.set(0, 0.4, -13.5);
    this.galaxyPoints.rotation.set(Math.PI * 0.28, Math.PI * 0.09, 0);
    this.backgroundCelestialGroup.add(this.galaxyPoints);
  }

  // 2.3 Roaming Flat-Shaded Planets (Z = -10.0 to -14.0) with Keplerian Orbits
  buildRoamingPlanets() {
    this.roamingPlanets = [];

    // Planet 1: Mint/Teal Ice World (Gliese 667)
    const geo1 = new THREE.IcosahedronGeometry(0.48, 1);
    const mat1 = new THREE.MeshLambertMaterial({ color: 0x4EC9B0, flatShading: true });
    const p1 = new THREE.Mesh(geo1, mat1);
    p1.userData = { id: 'gliese', semiMajor: 6.8, semiMinor: 4.5, tiltAngle: 0.22, baseDepth: -11.0, speed: 0.045, baseAngle: 0 };
    this.registerDisposable(geo1);
    this.registerDisposable(mat1);
    this.backgroundCelestialGroup.add(p1);
    this.roamingPlanets.push(p1);

    // Planet 2: Lavender Gas Giant with Translucent Saturn-like Ring (Kepler 186)
    const planet2Group = new THREE.Group();
    const geo2 = new THREE.IcosahedronGeometry(0.72, 1);
    const mat2 = new THREE.MeshLambertMaterial({ color: 0xCBA6F7, flatShading: true });
    const p2Mesh = new THREE.Mesh(geo2, mat2);
    planet2Group.add(p2Mesh);

    const ringGeo = new THREE.RingGeometry(0.95, 1.55, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xF9E2AF,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    planet2Group.add(ringMesh);

    planet2Group.userData = { id: 'kepler', semiMajor: 8.2, semiMinor: 5.4, tiltAngle: 0.35, baseDepth: -12.5, speed: 0.028, baseAngle: 2.2 };
    this.registerDisposable(geo2);
    this.registerDisposable(mat2);
    this.registerDisposable(ringGeo);
    this.registerDisposable(ringMat);
    this.backgroundCelestialGroup.add(planet2Group);
    this.roamingPlanets.push(planet2Group);

    // Planet 3: Pastel-Pink Star Core (Trappist 1)
    const geo3 = new THREE.IcosahedronGeometry(0.42, 1);
    const mat3 = new THREE.MeshLambertMaterial({ color: 0xFFB6C1, flatShading: true });
    const p3 = new THREE.Mesh(geo3, mat3);
    p3.userData = { id: 'trappist', semiMajor: 5.6, semiMinor: 3.8, tiltAngle: -0.28, baseDepth: -13.5, speed: 0.065, baseAngle: 4.4 };
    this.registerDisposable(geo3);
    this.registerDisposable(mat3);
    this.backgroundCelestialGroup.add(p3);
    this.roamingPlanets.push(p3);
  }

  // 2.4 Meteor Pool (6 Reusable Streaks)
  buildMeteorPool() {
    this.meteorPool = [];

    for (let i = 0; i < this.maxMeteors; i++) {
      const geo = new THREE.BufferGeometry();
      const points = new Float32Array([0, 0, 0, -1.2, 0.8, 0]);
      geo.setAttribute('position', new THREE.BufferAttribute(points, 3));

      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x94E2D5 : 0xF9E2AF,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.userData = {
        active: false,
        progress: 0,
        startX: 0,
        startY: 0,
        startZ: -11.5,
        speed: 0.03
      };

      this.registerDisposable(geo);
      this.registerDisposable(mat);
      this.backgroundCelestialGroup.add(line);
      this.meteorPool.push(line);
    }
  }

  // 2.5 Photorealistic Astronomical Comet (Ion Coma, Filament Plasma Tail & Curved Stardust Plume)
  buildLivingComet() {
    this.cometMesh = new THREE.Group();
    this.cometMesh.position.set(-16.0, 4.2, -12.0);

    // 1. Brilliant Luminous Ion Coma & Nucleus
    const coreGeo = new THREE.SphereGeometry(0.20, 20, 20);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.cometHead = new THREE.Mesh(coreGeo, coreMat);
    this.cometMesh.add(this.cometHead);

    const innerComaGeo = new THREE.SphereGeometry(0.52, 20, 20);
    const innerComaMat = new THREE.MeshBasicMaterial({
      color: 0x4EC9B0,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.cometMesh.add(new THREE.Mesh(innerComaGeo, innerComaMat));

    const outerAtmosphereGeo = new THREE.SphereGeometry(1.05, 20, 20);
    const outerAtmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x94E2D5,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending
    });
    this.cometMesh.add(new THREE.Mesh(outerAtmosphereGeo, outerAtmosphereMat));

    // 2. Multi-Filament Electric Cyan Plasma / Ion Tail (6 Parallel Streamers)
    this.cometFilaments = [];
    this.filamentSegments = 16;
    const filamentColors = [0x4EC9B0, 0x94E2D5, 0x89DCEB, 0x4EC9B0, 0x94E2D5, 0xCBA6F7];

    for (let f = 0; f < 6; f++) {
      const fGeo = new THREE.BufferGeometry();
      const fVerts = new Float32Array(this.filamentSegments * 3);
      for (let s = 0; s < this.filamentSegments; s++) {
        fVerts[s * 3]     = -s * 0.55; // 8.8 units long
        fVerts[s * 3 + 1] = (f - 2.5) * 0.04;
        fVerts[s * 3 + 2] = 0;
      }
      fGeo.setAttribute('position', new THREE.BufferAttribute(fVerts, 3));

      const fMat = new THREE.LineBasicMaterial({
        color: filamentColors[f],
        transparent: true,
        opacity: 0.75 - f * 0.06,
        blending: THREE.AdditiveBlending
      });
      const fLine = new THREE.Line(fGeo, fMat);
      fLine.userData = { lateralOffset: (f - 2.5) * 0.05, phase: f * 0.75 };
      this.cometMesh.add(fLine);
      this.cometFilaments.push(fLine);

      this.registerDisposable(fGeo);
      this.registerDisposable(fMat);
    }
    this.cometTail = this.cometFilaments[0]; // Backward-compatibility alias

    // 3. Sweeping Curved Stardust Dust Tail (120 Instanced Particle Cloud)
    const dustCount = 120;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const goldColor = new THREE.Color(0xF9E2AF);
    const pinkColor = new THREE.Color(0xF5C2E7);

    for (let d = 0; d < dustCount; d++) {
      const tProgress = d / dustCount;
      // Trailing dust curves downward and expands quadratically
      const distBack = tProgress * 7.5;
      const curveY = -Math.pow(tProgress, 1.7) * 1.8 + (Math.random() - 0.5) * 0.35 * (1 + tProgress * 3);
      const spreadZ = (Math.random() - 0.5) * 0.45 * (1 + tProgress * 2.5);

      dustPositions[d * 3]     = -distBack;
      dustPositions[d * 3 + 1] = curveY;
      dustPositions[d * 3 + 2] = spreadZ;

      const mixed = goldColor.clone().lerp(pinkColor, Math.random());
      dustColors[d * 3]     = mixed.r;
      dustColors[d * 3 + 1] = mixed.g;
      dustColors[d * 3 + 2] = mixed.b;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.starTexture || null
    });
    this.cometDustTail = new THREE.Points(dustGeo, dustMat);
    this.cometMesh.add(this.cometDustTail);

    this.registerDisposable(coreGeo);
    this.registerDisposable(coreMat);
    this.registerDisposable(innerComaGeo);
    this.registerDisposable(innerComaMat);
    this.registerDisposable(outerAtmosphereGeo);
    this.registerDisposable(outerAtmosphereMat);
    this.registerDisposable(dustGeo);
    this.registerDisposable(dustMat);

    this.backgroundCelestialGroup.add(this.cometMesh);
  }

  // 4.4 Holographic Planetary Targets in backgroundCelestialGroup
  buildHolographicTargets() {
    this.targetSystemMeshes = [];

    this.spaceSystems.forEach(sys => {
      const group = new THREE.Group();
      group.position.set(sys.x, sys.y, sys.z);

      // 1. Central Wireframe Celestial Sphere
      const geo = new THREE.IcosahedronGeometry(sys.size, 2);
      const mat = new THREE.MeshBasicMaterial({
        color: sys.color,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      // 2. Soft Outer Luminous Atmosphere Aura
      const glowGeo = new THREE.SphereGeometry(sys.size * 1.35, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: sys.color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      group.add(glowMesh);

      // 3. Sci-Fi Holographic 4-Corner Targeting Brackets [  ]
      const bracketSize = sys.size * 1.55;
      const bracketArm = bracketSize * 0.35;
      const bPoints = [
        // Top-Left Corner
        -bracketSize, bracketSize - bracketArm, 0,  -bracketSize, bracketSize, 0,
        -bracketSize, bracketSize, 0,  -bracketSize + bracketArm, bracketSize, 0,
        // Top-Right Corner
        bracketSize - bracketArm, bracketSize, 0,  bracketSize, bracketSize, 0,
        bracketSize, bracketSize, 0,  bracketSize, bracketSize - bracketArm, 0,
        // Bottom-Right Corner
        bracketSize, -bracketSize + bracketArm, 0,  bracketSize, -bracketSize, 0,
        bracketSize, -bracketSize, 0,  bracketSize - bracketArm, -bracketSize, 0,
        // Bottom-Left Corner
        -bracketSize + bracketArm, -bracketSize, 0,  -bracketSize, -bracketSize, 0,
        -bracketSize, -bracketSize, 0,  -bracketSize, -bracketSize + bracketArm, 0
      ];
      const bracketGeo = new THREE.BufferGeometry();
      bracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(bPoints, 3));
      const bracketMat = new THREE.LineBasicMaterial({
        color: 0x94E2D5,
        transparent: true,
        opacity: 0.70,
        blending: THREE.AdditiveBlending
      });
      const bracketMesh = new THREE.LineSegments(bracketGeo, bracketMat);
      group.add(bracketMesh);

      // 4. Rotating Segmented Targeting Ring
      const reticleRingGeo = new THREE.RingGeometry(sys.size * 1.45, sys.size * 1.52, 24);
      const reticleRingMat = new THREE.MeshBasicMaterial({
        color: 0x4EC9B0,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const reticleRing = new THREE.Mesh(reticleRingGeo, reticleRingMat);
      group.add(reticleRing);

      // 5. Pulsing Diamond Center Marker
      const diamondGeo = new THREE.OctahedronGeometry(sys.size * 0.22);
      const diamondMat = new THREE.MeshBasicMaterial({
        color: 0xF9E2AF,
        wireframe: true,
        transparent: true,
        opacity: 0.90
      });
      const diamond = new THREE.Mesh(diamondGeo, diamondMat);
      group.add(diamond);

      group.userData = {
        id: sys.id,
        name: sys.name,
        type: sys.type || 'SANCTUARY',
        dist: sys.dist || '1.42 AU',
        game: sys.game || 'Star Pulse',
        basePos: new THREE.Vector3(sys.x, sys.y, sys.z),
        baseColor: sys.color,
        bracketMesh,
        reticleRing,
        diamond,
        glowMesh,
        isLocked: false
      };

      this.registerDisposable(geo);
      this.registerDisposable(mat);
      this.registerDisposable(glowGeo);
      this.registerDisposable(glowMat);
      this.registerDisposable(bracketGeo);
      this.registerDisposable(bracketMat);
      this.registerDisposable(reticleRingGeo);
      this.registerDisposable(reticleRingMat);
      this.registerDisposable(diamondGeo);
      this.registerDisposable(diamondMat);

      this.backgroundCelestialGroup.add(group);
      this.targetSystemMeshes.push(group);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Render Hook: updateCelestialLayer (Called per-frame)
     ───────────────────────────────────────────────────────────────────────── */
  updateCelestialLayer(time, delta) {
    const audioLevel = synthEngine.getAudioReactiveLevel();
    const isSleeping = KiroState.get('isSleeping');

    // 1. Update Nebula Shader Uniforms (if shader-based)
    if (this.nebulaMaterial && this.nebulaMaterial.uniforms) {
      this.nebulaMaterial.uniforms.u_time.value = time;
      this.nebulaMaterial.uniforms.u_audio.value = audioLevel;
    }

    // 2. Distant Deep Cosmic Starfield (Slow ethereal rotation)
    if (this.distantStars) {
      const starRotRate = isSleeping ? 0.0006 : 0.0015;
      this.distantStars.rotation.y += starRotRate * (delta || 0.016);
      this.distantStars.rotation.x += (starRotRate * 0.35) * (delta || 0.016);
    }

    // 3. Double-Arm Tilted Spiral Galaxy (Group in-plane rotation & touch repulsion)
    if (this.galaxyPoints) {
      // Size update for warp mode
      if (this.galaxyPoints.material.size !== this.warpStarSize) {
        this.galaxyPoints.material.size = this.warpStarSize;
        this.galaxyPoints.material.needsUpdate = true;
      }

      // Rotate galaxy group in its 3D plane
      const rotSpeed = isSleeping ? 0.003 : this.warpSpeed;
      this.galaxyPoints.rotation.z += rotSpeed * (delta || 0.016);

      // Touch repulsion: unproject pointer to galaxy disk plane (Z = -13.5)
      if (this.pointerInCanvas) {
        const mouseProj = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
        const mouseDir = mouseProj.sub(this.camera.position).normalize();
        const worldZ = -13.5 + (this.backgroundCelestialGroup.position.z || 0);
        const mouseDist = (worldZ - this.camera.position.z) / mouseDir.z;
        const mousePlanePos = this.camera.position.clone().add(mouseDir.multiplyScalar(mouseDist));

        const positions = this.galaxyPoints.geometry.attributes.position.array;
        const count = this.galaxyCount;

        for (let i = 0; i < count; i++) {
          const orig = this.galaxyOriginalPositions[i];
          const dx = positions[i * 3]     - mousePlanePos.x;
          const dy = positions[i * 3 + 1] - mousePlanePos.y;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < 6.25) { // 2.5^2 — skip sqrt for performance
            const distance = Math.sqrt(dist2);
            const force = (2.5 - distance) * 0.28;
            positions[i * 3]     += (dx / distance) * force;
            positions[i * 3 + 1] += (dy / distance) * force;
          } else {
            // Spring back to rest position
            positions[i * 3]     += (orig.x - positions[i * 3])     * 0.03;
            positions[i * 3 + 1] += (orig.y - positions[i * 3 + 1]) * 0.03;
          }

          // Gentle scintillation
          this.galaxyPhases[i] += 0.005;
          positions[i * 3 + 2] = orig.z + Math.sin(time * 2.0 + this.galaxyPhases[i]) * 0.05;
        }
        this.galaxyPoints.geometry.attributes.position.needsUpdate = true;
      } else {
        // No touch: subtle Z scintillation & relaxation
        const positions = this.galaxyPoints.geometry.attributes.position.array;
        for (let i = 0; i < this.galaxyCount; i++) {
          const orig = this.galaxyOriginalPositions[i];
          this.galaxyPhases[i] += 0.003;
          positions[i * 3 + 2] = orig.z + Math.sin(time * 1.5 + this.galaxyPhases[i]) * 0.05;
          positions[i * 3]     += (orig.x - positions[i * 3])     * 0.02;
          positions[i * 3 + 1] += (orig.y - positions[i * 3 + 1]) * 0.02;
        }
        this.galaxyPoints.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 3. Roaming Planets Parametric Keplerian Orbit (Calculated by physicsAgent)
    this.roamingPlanets.forEach(planet => {
      const u = planet.userData;
      const angle = u.baseAngle + time * u.speed;
      const orbitPos = this.physicsAgent.calculateOrbitalPosition(u.semiMajor, u.semiMinor, angle, u.tiltAngle);
      planet.position.set(orbitPos.x, orbitPos.y, (u.baseDepth || -12.0) + orbitPos.z);
      planet.rotation.y += 0.012;
      planet.rotation.x += 0.006;
    });

    // 4. Staggered Meteor Spawner
    if (time > this.nextMeteorSpawnTime) {
      const inactiveMeteor = this.meteorPool.find(m => !m.userData.active);
      if (inactiveMeteor) {
        inactiveMeteor.userData.active = true;
        inactiveMeteor.userData.progress = 0;
        inactiveMeteor.userData.startX = (Math.random() - 0.5) * 14;
        inactiveMeteor.userData.startY = 5.0 + Math.random() * 2.0;
        inactiveMeteor.position.set(inactiveMeteor.userData.startX, inactiveMeteor.userData.startY, -11.5);
        inactiveMeteor.visible = true;
      }
      this.nextMeteorSpawnTime = time + 2.5 + Math.random() * 1.5;
    }

    // Update Active Meteors
    this.meteorPool.forEach(meteor => {
      if (meteor.userData.active) {
        meteor.userData.progress += meteor.userData.speed;
        meteor.position.x = meteor.userData.startX - meteor.userData.progress * 8.0;
        meteor.position.y = meteor.userData.startY - meteor.userData.progress * 5.5;

        // Opacity fade in and out
        const p = meteor.userData.progress;
        const opacity = Math.sin(p * Math.PI) * 0.9;
        meteor.material.opacity = Math.max(0, opacity);

        if (meteor.userData.progress >= 1.0) {
          meteor.userData.active = false;
          meteor.visible = false;
          meteor.material.opacity = 0.0;
        }
      }
    });

    // 5. Photorealistic Astronomical Comet (Keplerian Parabolic Sweep & Dynamic Tail Physics)
    if (this.cometMesh) {
      // Natural parabolic celestial trajectory across deep space (Z = -12.0)
      const cTime = time * 0.08;
      const tNorm = ((cTime % 2.0) - 1.0) * 18.0; // Sweeps from -18.0 to +18.0
      const cY = 4.2 - (tNorm * tNorm) * 0.008 + Math.sin(time * 0.2) * 0.4;
      const cZ = -12.0 + Math.abs(tNorm) * 0.08;
      this.cometMesh.position.set(tNorm, cY, cZ);

      // Comet orientation tangent to parabolic velocity vector
      const dy_dx = -0.016 * tNorm;
      this.cometMesh.rotation.z = Math.atan2(dy_dx, 1.0);

      // Animate multi-filament plasma / ion tail micro-waves
      if (this.cometFilaments && this.cometFilaments.length > 0) {
        this.cometFilaments.forEach((filament) => {
          const posAttr = filament.geometry.attributes.position;
          const verts = posAttr.array;
          const lateral = filament.userData.lateralOffset || 0;
          const phase = filament.userData.phase || 0;

          for (let s = 1; s < this.filamentSegments; s++) {
            const distFromHead = s * 0.55;
            // Higher amplitude wave further down the tail stream
            const waveAmp = 0.02 + distFromHead * 0.035;
            const wave = Math.sin(time * 7.5 - s * 0.45 + phase) * waveAmp;
            verts[s * 3 + 1] = lateral + wave;
          }
          posAttr.needsUpdate = true;
        });
      }

      // Animate curved stardust tail rotation
      if (this.cometDustTail) {
        this.cometDustTail.rotation.x = Math.sin(time * 0.5) * 0.05;
      }
    }

    // 6. Sci-Fi Holographic Target Markers & Flight Crosshair Lock-On Detection
    const isTelescope = KiroState.get('telescopeActive');
    let lockedTargetId = null;

    this.targetSystemMeshes.forEach(target => {
      // Idle rotation of 3D targeting rings and diamond marker
      if (target.userData.reticleRing) target.userData.reticleRing.rotation.z += 0.018;
      if (target.userData.diamond) {
        target.userData.diamond.rotation.y += 0.025;
        target.userData.diamond.rotation.x += 0.015;
        const pulse = 1.0 + Math.sin(time * 4.0) * 0.15;
        target.userData.diamond.scale.set(pulse, pulse, pulse);
      }

      if (isTelescope) {
        // Calculate screen-projected distance relative to cockpit flight center
        const screenPos = target.position.clone();
        screenPos.add(this.backgroundCelestialGroup.position);
        const distToCenter = Math.sqrt(Math.pow(screenPos.x, 2) + Math.pow(screenPos.y - 0.15, 2));

        // Lock-on threshold cone (< 1.25 units)
        if (distToCenter < 1.25) {
          lockedTargetId = target.userData.id;
          target.userData.isLocked = true;

          // Visual lock state on the target in 3D
          if (target.userData.bracketMesh) {
            target.userData.bracketMesh.scale.set(1.35, 1.35, 1.35);
            target.userData.bracketMesh.material.color.setHex(0x94E2D5);
            target.userData.bracketMesh.material.opacity = 1.0;
          }
          if (target.userData.glowMesh) {
            target.userData.glowMesh.material.opacity = 0.60;
          }
        } else {
          target.userData.isLocked = false;
          if (target.userData.bracketMesh) {
            target.userData.bracketMesh.scale.set(1.0, 1.0, 1.0);
            target.userData.bracketMesh.material.color.setHex(0x4EC9B0);
            target.userData.bracketMesh.material.opacity = 0.50;
          }
          if (target.userData.glowMesh) {
            target.userData.glowMesh.material.opacity = 0.25;
          }
        }
      } else {
        target.userData.isLocked = false;
      }
    });

    if (isTelescope) {
      if (lockedTargetId) {
        if (this.lastAlignedTargetId !== lockedTargetId) {
          this.lastAlignedTargetId = lockedTargetId;
          KiroState.set('cockpitSteering.currentTarget', lockedTargetId);
          KiroState.set('cockpitSteering.aligned', true);
          synthEngine.playTargetLockSound();
        }
      } else {
        if (this.lastAlignedTargetId !== null) {
          this.lastAlignedTargetId = null;
          KiroState.set('cockpitSteering.aligned', false);
          KiroState.set('cockpitSteering.currentTarget', null);
        }
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Kiro Companion & Sanctuary Setup (Z = 0.0)
     ───────────────────────────────────────────────────────────────────────── */
  buildEnvironment() {
    // 1. Dark Obsidian Floating Island Pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.35, 1.45, 0.35, 32);
    const pedestalMat = new THREE.MeshPhongMaterial({
      color: 0x152232,
      emissive: 0x0A121E,
      specular: 0x4EC9B0,
      shininess: 45
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -1.08;
    this.scene.add(this.pedestal);

    // 2. Luminous Orbiting Neon Ring (#4EC9B0 Mint-Teal)
    const ringGeo = new THREE.TorusGeometry(1.40, 0.045, 12, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4EC9B0,
      transparent: true,
      opacity: 0.95
    });
    this.neonRing = new THREE.Mesh(ringGeo, ringMat);
    this.neonRing.rotation.x = Math.PI / 2;
    this.neonRing.position.y = -0.92;
    this.scene.add(this.neonRing);

    // 3. Orbiting Pedestal Sparkle Ring
    this.pedestalSparkles = new THREE.Group();
    this.pedestalSparkles.position.y = -0.92;
    const sparkleGeo = new THREE.DodecahedronGeometry(0.028);
    const sparkleColors = [0x4EC9B0, 0xFFB6C1, 0xF9E2AF, 0xCBA6F7];

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 1.45 + (Math.random() - 0.5) * 0.12;
      const spMat = new THREE.MeshBasicMaterial({
        color: sparkleColors[i % sparkleColors.length],
        transparent: true,
        opacity: 0.85
      });
      const sp = new THREE.Mesh(sparkleGeo, spMat);
      sp.position.set(Math.cos(angle) * dist, (Math.random() - 0.5) * 0.1, Math.sin(angle) * dist);
      this.pedestalSparkles.add(sp);
      this.registerDisposable(spMat);
    }
    this.registerDisposable(sparkleGeo);
    this.scene.add(this.pedestalSparkles);

    // 4. Entangled Twin Starlight Orbit (Patrick & Yangiee Celestial Link)
    this.entangledStarlightGroup = new THREE.Group();
    this.scene.add(this.entangledStarlightGroup);

    // Patrick's Mint-Teal Starlight Node (#4EC9B0)
    const patOrbGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const patOrbMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0 });
    this.patStarlightOrb = new THREE.Mesh(patOrbGeo, patOrbMat);
    this.entangledStarlightGroup.add(this.patStarlightOrb);

    // Yangiee's Pastel-Pink Starlight Node (#FFB6C1)
    const yangOrbGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const yangOrbMat = new THREE.MeshBasicMaterial({ color: 0xFFB6C1 });
    this.yangStarlightOrb = new THREE.Mesh(yangOrbGeo, yangOrbMat);
    this.entangledStarlightGroup.add(this.yangStarlightOrb);

    this.registerDisposable(patOrbGeo);
    this.registerDisposable(patOrbMat);
    this.registerDisposable(yangOrbGeo);
    this.registerDisposable(yangOrbMat);

    this.registerDisposable(pedestalGeo);
    this.registerDisposable(pedestalMat);
    this.registerDisposable(ringGeo);
    this.registerDisposable(ringMat);
  }

  buildKiro() {
    this.kiroGroup = new THREE.Group();
    this.kiroGroup.position.set(0, 0, 0);
    this.scene.add(this.kiroGroup);

    // Soft Matte Plushie Materials (Velvety finish, Fresnel grazing glow, cozy Twilight mint & cream)
    const mintMat = new THREE.MeshPhongMaterial({
      color: 0x4EC9B0,
      emissive: 0x1A4237,
      emissiveIntensity: 0.18,
      specular: 0x94E2D5,
      shininess: 14
    });
    this.registerDisposable(mintMat);

    const bellyMat = new THREE.MeshPhongMaterial({
      color: 0xFFF8EB,
      emissive: 0x221E18,
      emissiveIntensity: 0.08,
      specular: 0x222222,
      shininess: 4
    });
    this.registerDisposable(bellyMat);

    const crestMat = new THREE.MeshPhongMaterial({
      color: 0xFDE08B,
      emissive: 0x332A10,
      emissiveIntensity: 0.12,
      specular: 0x333322,
      shininess: 6
    });
    this.registerDisposable(crestMat);

    // 1. Cute Rounded Chubby Spherical Dino Body
    const bodyGeo = new THREE.SphereGeometry(0.85, 36, 36);
    this.bodyMesh = new THREE.Mesh(bodyGeo, mintMat);
    this.bodyMesh.scale.set(1.08, 0.98, 1.04);
    this.bodyMesh.position.set(0, 0, 0);
    this.kiroGroup.add(this.bodyMesh);
    this.registerDisposable(bodyGeo);

    // 2. Large Smooth Creamy Belly Patch (#FFF8EB)
    const bellyGeo = new THREE.SphereGeometry(0.58, 32, 24);
    this.bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    this.bellyMesh.scale.set(1.04, 0.90, 0.44);
    this.bellyMesh.position.set(0, -0.16, 0.65);
    this.kiroGroup.add(this.bellyMesh);
    this.registerDisposable(bellyGeo);

    // 3. Banana-Yellow 3-Lobed Scalloped Head Crest (Crown Spines)
    this.headCrests = [];
    const headCrests = [
      { x: -0.15, y: 0.88, z: 0.04, s: 0.17, sy: 1.15, sz: 0.95 },
      { x: 0.00, y: 0.95, z: -0.06, s: 0.20, sy: 1.25, sz: 1.05 },
      { x: 0.15, y: 0.86, z: -0.18, s: 0.17, sy: 1.15, sz: 0.95 }
    ];
    headCrests.forEach(c => {
      const spGeo = new THREE.SphereGeometry(c.s, 16, 16);
      const spMesh = new THREE.Mesh(spGeo, crestMat);
      spMesh.scale.set(0.55, c.sy, c.sz);
      spMesh.position.set(c.x, c.y, c.z);
      this.kiroGroup.add(spMesh);
      this.headCrests.push(spMesh);
      this.registerDisposable(spGeo);
    });

    // 4. Cute Chubby Dino Tail & Yellow Spines
    const tailGeo = new THREE.ConeGeometry(0.30, 0.72, 20);
    this.tailMesh = new THREE.Mesh(tailGeo, mintMat);
    this.tailMesh.position.set(0, -0.38, -0.80);
    this.tailMesh.rotation.set(-Math.PI / 2.6, 0, 0);
    this.kiroGroup.add(this.tailMesh);
    this.registerDisposable(tailGeo);

    const tailPlateGeo = new THREE.SphereGeometry(0.10, 14, 14);
    const tp1 = new THREE.Mesh(tailPlateGeo, crestMat);
    tp1.scale.set(0.45, 1.1, 0.9);
    tp1.position.set(0, -0.25, -0.74);
    this.kiroGroup.add(tp1);

    const tp2 = new THREE.Mesh(tailPlateGeo, crestMat);
    tp2.scale.set(0.38, 0.9, 0.8);
    tp2.position.set(0, -0.35, -1.02);
    this.kiroGroup.add(tp2);
    this.tailPlates = [tp1, tp2];
    this.registerDisposable(tailPlateGeo);

    // 5. Two Cute Little Stubby Dinosaur Feet at Base
    const footGeo = new THREE.SphereGeometry(0.18, 16, 16);
    this.leftFoot = new THREE.Mesh(footGeo, mintMat);
    this.leftFoot.scale.set(0.95, 0.60, 1.30);
    this.leftFoot.position.set(-0.36, -0.78, 0.30);
    this.kiroGroup.add(this.leftFoot);

    this.rightFoot = new THREE.Mesh(footGeo, mintMat);
    this.rightFoot.scale.set(0.95, 0.60, 1.30);
    this.rightFoot.position.set(0.36, -0.78, 0.30);
    this.kiroGroup.add(this.rightFoot);
    this.registerDisposable(footGeo);

    // 6. Soulful Sparkling Anime/Chibi Starlight Eyes
    const eyeGeo = new THREE.SphereGeometry(0.138, 24, 24);
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0x141B26,
      specular: 0x557788,
      shininess: 85
    });
    this.registerDisposable(eyeGeo);
    this.registerDisposable(eyeMat);

    // Left Eye
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.scale.set(1.0, 1.14, 0.55);
    this.leftEye.position.set(-0.28, 0.16, 0.80);
    this.kiroGroup.add(this.leftEye);

    // Right Eye
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.scale.set(1.0, 1.14, 0.55);
    this.rightEye.position.set(0.28, 0.16, 0.80);
    this.kiroGroup.add(this.rightEye);

    // Primary Bright Glossy Reflection Catchlights (Large Pure White)
    const hlGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.registerDisposable(hlGeo);
    this.registerDisposable(hlMat);

    this.leftHl = new THREE.Mesh(hlGeo, hlMat);
    this.leftHl.scale.set(1.0, 1.25, 0.4);
    this.leftHl.position.set(-0.24, 0.21, 0.89);
    this.kiroGroup.add(this.leftHl);

    this.rightHl = new THREE.Mesh(hlGeo, hlMat);
    this.rightHl.scale.set(1.0, 1.25, 0.4);
    this.rightHl.position.set(0.24, 0.21, 0.89);
    this.kiroGroup.add(this.rightHl);

    // Secondary Golden Starlight Diamond Twinkle (#F9E2AF)
    const hl2Geo = new THREE.SphereGeometry(0.026, 14, 14);
    const hl2Mat = new THREE.MeshBasicMaterial({ color: 0xF9E2AF });
    this.registerDisposable(hl2Geo);
    this.registerDisposable(hl2Mat);

    this.leftHl2 = new THREE.Mesh(hl2Geo, hl2Mat);
    this.leftHl2.position.set(-0.31, 0.11, 0.88);
    this.kiroGroup.add(this.leftHl2);

    this.rightHl2 = new THREE.Mesh(hl2Geo, hl2Mat);
    this.rightHl2.position.set(0.31, 0.11, 0.88);
    this.kiroGroup.add(this.rightHl2);

    // Tertiary Cyan Starlight Micro Glint (#94E2D5)
    const hl3Geo = new THREE.SphereGeometry(0.016, 12, 12);
    const hl3Mat = new THREE.MeshBasicMaterial({ color: 0x94E2D5 });
    this.registerDisposable(hl3Geo);
    this.registerDisposable(hl3Mat);

    this.leftHl3 = new THREE.Mesh(hl3Geo, hl3Mat);
    this.leftHl3.position.set(-0.23, 0.10, 0.88);
    this.kiroGroup.add(this.leftHl3);

    this.rightHl3 = new THREE.Mesh(hl3Geo, hl3Mat);
    this.rightHl3.position.set(0.23, 0.10, 0.88);
    this.kiroGroup.add(this.rightHl3);

    // 7. Sweet Rosy Peach/Pink Blush Cheeks (#FFB6C1)
    const blushGeo = new THREE.SphereGeometry(0.12, 20, 20);
    this.blushMat = new THREE.MeshBasicMaterial({
      color: 0xFFB6C1,
      transparent: true,
      opacity: 0.70
    });
    this.registerDisposable(blushGeo);
    this.registerDisposable(this.blushMat);

    this.leftBlush = new THREE.Mesh(blushGeo, this.blushMat);
    this.leftBlush.scale.set(1.0, 0.75, 0.25);
    this.leftBlush.position.set(-0.46, -0.02, 0.74);
    this.leftBlush.rotation.set(0.1, -0.2, 0.15);
    this.kiroGroup.add(this.leftBlush);

    this.rightBlush = new THREE.Mesh(blushGeo, this.blushMat);
    this.rightBlush.scale.set(1.0, 0.75, 0.25);
    this.rightBlush.position.set(0.46, -0.02, 0.74);
    this.rightBlush.rotation.set(0.1, 0.2, -0.15);
    this.kiroGroup.add(this.rightBlush);

    // 8. Sweet Wide Open Smile with Rosy Cavity and Cute Dinosaur Tooth (Z = 0.915)
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, 0.04, 0.915);

    // Inner rosy pink mouth opening cavity
    const mouthCavityGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0xF58282 });
    this.mouthInside = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
    this.mouthInside.scale.set(1.0, 0.60, 0.25);
    this.mouthInside.position.set(0, -0.012, 0);
    this.mouthGroup.add(this.mouthInside);

    // Outer dark lip smile curve
    const mouthGeo = new THREE.TorusGeometry(0.062, 0.016, 10, 24, Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x162432 });
    this.mouth = new THREE.Mesh(mouthGeo, mouthMat);
    this.mouth.rotation.set(0, 0, Math.PI);
    this.mouth.position.set(0, 0, 0.005);
    this.mouthGroup.add(this.mouth);

    // Cute tiny white dinosaur front tooth pointing down
    const toothGeo = new THREE.ConeGeometry(0.022, 0.038, 12);
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.tooth = new THREE.Mesh(toothGeo, toothMat);
    this.tooth.position.set(0.022, 0.018, 0.012);
    this.tooth.rotation.set(Math.PI, 0, 0);
    this.mouthGroup.add(this.tooth);

    this.kiroGroup.add(this.mouthGroup);

    this.registerDisposable(mouthCavityGeo);
    this.registerDisposable(mouthCavityMat);
    this.registerDisposable(mouthGeo);
    this.registerDisposable(mouthMat);
    this.registerDisposable(toothGeo);
    this.registerDisposable(toothMat);

    // Dynamic Animation State Trackers
    this.isChewing = false;
    this.blinkTimer = 0;
    this.nextBlinkTime = 3.2;

    // 9. Sleeping Eyes (Peaceful Curved Crescents)
    const sleepEyeGeo = new THREE.TorusGeometry(0.095, 0.022, 10, 20, Math.PI);
    const sleepEyeMat = new THREE.MeshBasicMaterial({ color: 0x11111B });
    this.registerDisposable(sleepEyeGeo);
    this.registerDisposable(sleepEyeMat);

    this.leftSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.leftSleepEye.rotation.set(0, 0, Math.PI);
    this.leftSleepEye.position.set(-0.28, 0.16, 0.82);
    this.leftSleepEye.visible = false;
    this.kiroGroup.add(this.leftSleepEye);

    this.rightSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.rightSleepEye.rotation.set(0, 0, Math.PI);
    this.rightSleepEye.position.set(0.28, 0.16, 0.82);
    this.rightSleepEye.visible = false;
    this.kiroGroup.add(this.rightSleepEye);

    // 10. Cute Little Dino Front Arms Resting on Chest
    const armGeo = new THREE.SphereGeometry(0.18, 20, 20);
    this.leftArm = new THREE.Mesh(armGeo, mintMat);
    this.leftArm.scale.set(0.68, 1.15, 0.68);
    this.leftArm.position.set(-0.46, -0.15, 0.62);
    this.leftArm.rotation.set(0.25, -0.45, 0.50);
    this.kiroGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mintMat);
    this.rightArm.scale.set(0.68, 1.15, 0.68);
    this.rightArm.position.set(0.46, -0.15, 0.62);
    this.rightArm.rotation.set(0.25, 0.45, -0.50);
    this.kiroGroup.add(this.rightArm);
    this.registerDisposable(armGeo);

    // 11. Sleep Nightcap (Pastel Lavender with Golden Star)
    const capGroup = new THREE.Group();
    const capGeo = new THREE.ConeGeometry(0.40, 0.95, 24);
    const capMat = new THREE.MeshPhongMaterial({
      color: 0xCBA6F7,
      emissive: 0x2A1A40,
      emissiveIntensity: 0.15,
      shininess: 25
    });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.rotation.z = -Math.PI / 4.2;
    capMesh.position.set(0.22, 0.40, 0);
    capGroup.add(capMesh);

    const pomGeo = new THREE.SphereGeometry(0.11, 16, 16);
    const pomMat = new THREE.MeshBasicMaterial({ color: 0xF9E2AF });
    const pomMesh = new THREE.Mesh(pomGeo, pomMat);
    pomMesh.position.set(0.66, 0.72, 0);
    capGroup.add(pomMesh);

    capGroup.position.set(0, 0.78, 0);
    capGroup.visible = false;
    this.nightcap = capGroup;
    this.kiroGroup.add(this.nightcap);

    this.registerDisposable(capGeo);
    this.registerDisposable(capMat);
    this.registerDisposable(pomGeo);
    this.registerDisposable(pomMat);

    // 12. Living Starlight Vitality Aura (Atmospheric Wellbeing & Warm Sanctuary Glow)
    const auraGeo = new THREE.SphereGeometry(1.32, 32, 32);
    this.auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xF9E2AF,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.goldenAura = new THREE.Mesh(auraGeo, this.auraMaterial);
    this.goldenAura.visible = false; // Hidden by default for unobstructed pure 3D sanctuary
    this.kiroGroup.add(this.goldenAura);

    this.registerDisposable(auraGeo);
  }

  buildCockpitHUD() {
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.visible = false;
    this.scene.add(this.cockpitGroup);

    // 1. Cockpit Arch Canopy Struts (Sleek Space Shuttle Glass Window Frame at Z = -1.8)
    const canopyMat = new THREE.MeshBasicMaterial({
      color: 0x181825,
      transparent: true,
      opacity: 0.85
    });

    // Top canopy arch
    const archGeo = new THREE.TorusGeometry(2.8, 0.07, 12, 48, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, canopyMat);
    archMesh.position.set(0, 0.25, -1.8);
    this.cockpitGroup.add(archMesh);

    // Side struts
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 3.5, 12);
    const leftStrut = new THREE.Mesh(strutGeo, canopyMat);
    leftStrut.position.set(-2.2, -0.2, -1.8);
    leftStrut.rotation.z = 0.25;
    this.cockpitGroup.add(leftStrut);

    const rightStrut = new THREE.Mesh(strutGeo, canopyMat);
    rightStrut.position.set(2.2, -0.2, -1.8);
    rightStrut.rotation.z = -0.25;
    this.cockpitGroup.add(rightStrut);

    // 2. Holographic Flight Reticle (Centered in screen at Z = -2.5)
    this.hudReticleGroup = new THREE.Group();
    this.hudReticleGroup.position.set(0, 0.15, -2.5);

    // Central pip dot
    const pipGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const pipMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0 });
    this.hudPip = new THREE.Mesh(pipGeo, pipMat);
    this.hudReticleGroup.add(this.hudPip);

    // Inner targeting ring
    const innerRingGeo = new THREE.RingGeometry(0.32, 0.35, 32);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x4EC9B0,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.crosshairMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.hudReticleGroup.add(this.crosshairMesh);

    // Outer compass ring
    const outerRingGeo = new THREE.RingGeometry(0.68, 0.70, 48);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x94E2D5,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    this.hudReticleGroup.add(outerRing);

    // Pitch ladder horizontal attitude lines
    [-0.55, -0.28, 0.28, 0.55].forEach((ladderY) => {
      const lineGeo = new THREE.BufferGeometry();
      const verts = new Float32Array([
        -0.22, ladderY, 0,
         0.22, ladderY, 0
      ]);
      lineGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x4EC9B0, transparent: true, opacity: 0.55 });
      this.hudReticleGroup.add(new THREE.Line(lineGeo, lineMat));
      this.registerDisposable(lineGeo);
      this.registerDisposable(lineMat);
    });

    // Horizon line
    const horizonGeo = new THREE.BufferGeometry();
    const hVerts = new Float32Array([
      -1.4, 0, 0,
       1.4, 0, 0
    ]);
    horizonGeo.setAttribute('position', new THREE.BufferAttribute(hVerts, 3));
    const horizonMat = new THREE.LineBasicMaterial({ color: 0x94E2D5, transparent: true, opacity: 0.65 });
    this.hudReticleGroup.add(new THREE.Line(horizonGeo, horizonMat));

    this.cockpitGroup.add(this.hudReticleGroup);

    this.registerDisposable(archGeo);
    this.registerDisposable(strutGeo);
    this.registerDisposable(canopyMat);
    this.registerDisposable(pipGeo);
    this.registerDisposable(pipMat);
    this.registerDisposable(innerRingGeo);
    this.registerDisposable(innerRingMat);
    this.registerDisposable(outerRingGeo);
    this.registerDisposable(outerRingMat);
    this.registerDisposable(horizonGeo);
    this.registerDisposable(horizonMat);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 3 & 4: Interactions, Parallax & State Synchronization
     ───────────────────────────────────────────────────────────────────────── */
  bindEvents() {
    let isDraggingFlight = false;
    let flightStartX = 0;
    let flightStartY = 0;
    let startPitch = 0;
    let startYaw = 0;

    const onFlightStart = (clientX, clientY) => {
      if (KiroState.get('telescopeActive')) {
        isDraggingFlight = true;
        flightStartX = clientX;
        flightStartY = clientY;
        const current = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };
        startPitch = current.pitch || 0;
        startYaw = current.yaw || 0;
      }
    };

    const onFlightMove = (clientX, clientY) => {
      if (isDraggingFlight && KiroState.get('telescopeActive')) {
        const deltaX = clientX - flightStartX;
        const deltaY = clientY - flightStartY;
        const pitch = Math.max(-50, Math.min(50, startPitch - deltaY * 0.18));
        const yaw = Math.max(-50, Math.min(50, startYaw + deltaX * 0.18));
        KiroState.set('cockpitSteering', { pitch, yaw });
        const speed = Math.min(1.0, (Math.abs(pitch) + Math.abs(yaw)) / 50);
        synthEngine.updateThrusterSpeed(speed);
      }
    };

    const onFlightEnd = () => {
      isDraggingFlight = false;
    };

    const onPointerMove = (clientX, clientY) => {
      this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      this.pointerInCanvas = true;

      if (KiroState.get('telescopeActive')) {
        onFlightMove(clientX, clientY);
      } else {
        // Stardust Sparkles at Z = 0
        const mouseProj = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
        const mouseDir = mouseProj.sub(this.camera.position).normalize();
        const dist = (0 - this.camera.position.z) / mouseDir.z;
        const worldPos = this.camera.position.clone().add(mouseDir.multiplyScalar(dist));
        this.spawnStardustParticle(worldPos.x, worldPos.y, worldPos.z);
      }
    };

    window.addEventListener('pointerdown', (e) => {
      onFlightStart(e.clientX, e.clientY);
      onPointerMove(e.clientX, e.clientY);
    });
    window.addEventListener('pointermove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('pointerup', onFlightEnd);
    window.addEventListener('pointercancel', onFlightEnd);
    window.addEventListener('pointerenter', () => { this.pointerInCanvas = true; });
    window.addEventListener('pointerleave', () => {
      this.pointerInCanvas = false;
      onFlightEnd();
    });

    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        onFlightStart(e.touches[0].clientX, e.touches[0].clientY);
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', () => {
      this.pointerInCanvas = false;
      onFlightEnd();
    }, { passive: true });

    // Interactive Kiro Petting Raycast
    window.addEventListener('click', (e) => {
      if (!this.kiroGroup || !this.camera) return;
      if (KiroState.get('telescopeActive')) return;

      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      const normY = -(e.clientY / window.innerHeight) * 2 + 1;
      const clickRay = new THREE.Raycaster();
      clickRay.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
      const hits = clickRay.intersectObjects(this.kiroGroup.children, true);
      if (hits.length > 0) {
        this.triggerPetReaction();
      }
    });

    // Baseline-Calibrated Gyro Parallax (55 deg portrait hold baseline)
    window.addEventListener('deviceorientation', (e) => {
      if (KiroState.get('gyroEnabled')) {
        const deltaBeta = ((e.beta || 55) - 55) * 0.003;
        const deltaGamma = (e.gamma || 0) * 0.003;
        this.gyro.targetY = Math.max(-0.25, Math.min(0.25, deltaBeta));
        this.gyro.targetX = Math.max(-0.25, Math.min(0.25, deltaGamma));
      }
    });

    // Native Memory Trim Bridge Listener
    window.addEventListener('kiro:trim_memory', () => this.disposeCelestialLayer());

    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('orientationchange', this.boundResize);
  }

  subscribeState() {
    KiroState.on('wellbeing:change', (wellbeing) => this.updateWellbeing(wellbeing));
    KiroState.on('vital:feed', ({ type }) => this.dropCandy(type));
    KiroState.on('vital:water', () => this.splashWater());
    KiroState.on('sleep:change', ({ isSleeping, hasWellRestedBuff }) => this.onSleepChange(isSleeping, hasWellRestedBuff));
    KiroState.on('memory:trim', () => this.disposeCelestialLayer());

    KiroState.on('change:telescopeActive', ({ newValue }) => {
      const isActive = Boolean(newValue);
      if (this.cockpitGroup) this.cockpitGroup.visible = isActive;

      if (isActive) {
        this.triggerWarpAcceleration();
      } else {
        this.exitWarpAcceleration();
      }

      if (window.gsap && this.kiroGroup && this.pedestal && this.neonRing) {
        this.isTelescopeTransitioning = true;
        gsap.to(this.kiroGroup.position, {
          y: isActive ? -4 : 0,
          duration: 1.0,
          ease: "power2.inOut",
          onComplete: () => {
            this.isTelescopeTransitioning = false;
          }
        });
        gsap.to(this.pedestal.position, {
          y: isActive ? -5 : -1.08,
          duration: 1.0,
          ease: "power2.inOut"
        });
        gsap.to(this.neonRing.position, {
          y: isActive ? -5 : -0.92,
          duration: 1.0,
          ease: "power2.inOut"
        });
        if (this.pedestalSparkles) {
          gsap.to(this.pedestalSparkles.position, {
            y: isActive ? -5 : -0.92,
            duration: 1.0,
            ease: "power2.inOut"
          });
        }
      }
    });
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const width = window.innerWidth || (this.container ? this.container.clientWidth : 360);
    const height = window.innerHeight || (this.container ? this.container.clientHeight : 640);
    const aspect = width / height;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    this.baseCameraZ = aspect < 0.8
      ? Math.max(5.6, 2.7 / (2 * Math.tan((45 * Math.PI / 180) / 2) * Math.max(aspect, 0.35)))
      : 5.4;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    if (this.physicsAgent) {
      this.physicsAgent.updateViewport(width, height, this.PINHOLE_FOCAL_PX);
    }
  }

  triggerWarpAcceleration() {
    this.warpSpeed = 0.08;
    this.warpZStretch = 2.5;
    this.warpStarSize = 0.65;
  }

  exitWarpAcceleration() {
    this.warpSpeed = 0.02;
    this.warpZStretch = 1.0;
    this.warpStarSize = 0.42;
  }

  triggerWarpJump(sys) {
    if (this.isTelescopeTransitioning) return;
    this.isTelescopeTransitioning = true;

    // 1. Accelerate Warp Tunnel
    this.warpSpeed = 0.22;
    this.warpZStretch = 6.0;
    this.warpStarSize = 0.85;

    // 2. Play Supernova Warp Audio
    synthEngine.playSupernovaSound();

    // 3. Smooth Camera Surge & Orient to System
    if (window.gsap) {
      gsap.to(this.camera.position, {
        z: 3.5,
        duration: 1.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut"
      });

      gsap.delayedCall(2.2, () => {
        this.warpSpeed = 0.02;
        this.warpZStretch = 1.0;
        this.warpStarSize = 0.42;
        this.isTelescopeTransitioning = false;
        synthEngine.playChimeSound(1046.5);
      });
    } else {
      setTimeout(() => {
        this.warpSpeed = 0.02;
        this.warpZStretch = 1.0;
        this.warpStarSize = 0.42;
        this.isTelescopeTransitioning = false;
      }, 2200);
    }
  }

  setSleepMode(isSleeping) {
    this.onSleepChange(isSleeping, false);
  }

  setTelescopeMode(isActive) {
    KiroState.set('telescopeActive', isActive);
  }

  onSleepChange(isSleeping, hasWellRestedBuff) {
    if (this.nightcap) this.nightcap.visible = isSleeping;
    if (this.goldenAura) this.goldenAura.visible = hasWellRestedBuff;

    if (this.leftEye) this.leftEye.visible = !isSleeping;
    if (this.rightEye) this.rightEye.visible = !isSleeping;
    if (this.leftHl) this.leftHl.visible = !isSleeping;
    if (this.rightHl) this.rightHl.visible = !isSleeping;
    if (this.leftHl2) this.leftHl2.visible = !isSleeping;
    if (this.rightHl2) this.rightHl2.visible = !isSleeping;
    if (this.leftSleepEye) this.leftSleepEye.visible = isSleeping;
    if (this.rightSleepEye) this.rightSleepEye.visible = isSleeping;

    // Shift Entangled Orbit Neon Ring to Deep Bedtime Lavender/Indigo on sleep
    if (this.neonRing && this.neonRing.material) {
      if (window.gsap) {
        const targetColor = new THREE.Color(isSleeping ? 0xCBA6F7 : 0x4EC9B0);
        gsap.to(this.neonRing.material.color, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          duration: 1.2
        });
      } else {
        this.neonRing.material.color.setHex(isSleeping ? 0xCBA6F7 : 0x4EC9B0);
      }
    }
  }

  updateWellbeing(wellbeing) {
    const scaleFactor = 0.5 + 0.6 * Math.pow(wellbeing / 100, 2);
    if (window.gsap && this.kiroGroup) {
      gsap.to(this.kiroGroup.scale, {
        x: scaleFactor,
        y: scaleFactor,
        z: scaleFactor,
        duration: 1.2,
        ease: 'power2.out'
      });
    }
  }

  performBlink() {
    if (!window.gsap || !this.leftEye || !this.rightEye) return;
    const isSleeping = KiroState.get('isSleeping');
    if (isSleeping) return;

    gsap.timeline()
      .to([this.leftEye.scale, this.rightEye.scale], { y: 0.08, duration: 0.07, ease: 'power2.in' })
      .to([this.leftEye.scale, this.rightEye.scale], { y: 1.0, duration: 0.09, ease: 'power2.out' });
  }

  triggerViscoelasticSquish(amplitude = 0.18, frequency = 14.0, decay = 3.2) {
    this.viscousWobble = {
      active: true,
      startTime: performance.now(),
      amplitude,
      frequency,
      decay
    };
  }

  triggerPetReaction() {
    if (!this.kiroGroup) return;
    this.isPetting = true;

    // Trigger viscoelastic harmonic squish
    this.triggerViscoelasticSquish(0.24, 15.0, 3.0);

    // Synthesize cozy procedural purr & sweet pentatonic pet chime
    synthEngine.playPurrSound(1.4);
    synthEngine.playPetChime(660);

    // Warm blushing cheek glow reaction
    if (this.blushMat && window.gsap) {
      gsap.to(this.blushMat, { opacity: 0.95, yoyo: true, repeat: 1, duration: 0.4 });
    }

    if (window.gsap) {
      const baseScale = 1.0;
      const tl = gsap.timeline({
        onComplete: () => {
          this.isPetting = false;
          if (this.leftArm) this.leftArm.rotation.set(0.25, -0.45, 0.50);
          if (this.rightArm) this.rightArm.rotation.set(0.25, 0.45, -0.50);
          if (this.leftEye) this.leftEye.scale.set(1, 1, 1);
          if (this.rightEye) this.rightEye.scale.set(1, 1, 1);
        }
      });

      // 1. Soft living squish: compress under touch like soft memory foam
      tl.to(this.kiroGroup.scale, { y: baseScale * 0.78, x: baseScale * 1.18, z: baseScale * 1.15, duration: 0.16, ease: 'power2.out' })
        // 2. Joyful rebound hop with affectionate head tilt
        .to(this.kiroGroup.position, { y: 0.22, duration: 0.22, ease: 'power1.out' })
        .to(this.kiroGroup.rotation, { z: (Math.random() > 0.5 ? 0.14 : -0.14), duration: 0.22, ease: 'power1.out' }, '<')
        .to(this.kiroGroup.scale, { y: baseScale * 1.10, x: baseScale * 0.94, z: baseScale * 0.94, duration: 0.20, ease: 'power1.in' })
        // 3. Elastic settle back to pedestal
        .to(this.kiroGroup.position, { y: 0, duration: 0.25, ease: 'bounce.out' })
        .to(this.kiroGroup.rotation, { z: 0, duration: 0.25, ease: 'elastic.out(1, 0.4)' }, '<')
        .to(this.kiroGroup.scale, { x: baseScale, y: baseScale, z: baseScale, duration: 0.35, ease: 'elastic.out(1.2, 0.35)' }, '<');

      // Happy Rapid Tail Waggle
      if (this.tailMesh) {
        tl.to(this.tailMesh.rotation, { y: 0.55, yoyo: true, repeat: 5, duration: 0.07, ease: 'sine.inOut' }, 0);
      }

      // Happy Arm Flutter
      if (this.leftArm && this.rightArm) {
        tl.to(this.leftArm.rotation, { z: -0.9, yoyo: true, repeat: 3, duration: 0.1 }, 0)
          .to(this.rightArm.rotation, { z: 0.9, yoyo: true, repeat: 3, duration: 0.1 }, 0);
      }

      // Affectionate Winking / Smiling Eyes
      if (this.leftEye && this.rightEye) {
        tl.to(this.leftEye.scale, { y: 0.15, duration: 0.12 }, 0)
          .to(this.leftEye.scale, { y: 1.0, duration: 0.18 }, 0.25);
      }
    } else {
      this.isPetting = false;
    }

    this.spawnHeartParticles();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5 Distinct Living Idle Animations & Posture Recovery Engine
     ───────────────────────────────────────────────────────────────────────── */
  resetPose() {
    if (!this.kiroGroup) return;
    if (this.leftArm) {
      this.leftArm.position.set(-0.46, -0.15, 0.62);
      this.leftArm.rotation.set(0.25, -0.45, 0.50);
    }
    if (this.rightArm) {
      this.rightArm.position.set(0.46, -0.15, 0.62);
      this.rightArm.rotation.set(0.25, 0.45, -0.50);
    }
    if (this.leftFoot) {
      this.leftFoot.position.set(-0.36, -0.78, 0.30);
      this.leftFoot.rotation.set(0, 0, 0);
    }
    if (this.rightFoot) {
      this.rightFoot.position.set(0.36, -0.78, 0.30);
      this.rightFoot.rotation.set(0, 0, 0);
    }
    if (this.mouthGroup) this.mouthGroup.scale.set(1, 1, 1);
    if (this.leftEye) this.leftEye.scale.set(1, 1, 1);
    if (this.rightEye) this.rightEye.scale.set(1, 1, 1);
    if (this.tailMesh) this.tailMesh.rotation.set(-Math.PI / 2.6, 0, 0);
    if (this.blushMat) this.blushMat.opacity = 0.70;
  }

  triggerRandomIdleAnimation() {
    if (this.isPlayingIdle || this.isPetting || this.isChewing) return;
    const isSleeping = KiroState.get('isSleeping');
    if (isSleeping || KiroState.get('telescopeActive')) return;

    // Pick 1 of 5 animations, avoiding immediate repeats
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * 5);
    } while (nextIdx === this.lastIdleIndex && Math.random() > 0.15);

    this.lastIdleIndex = nextIdx;

    switch (nextIdx) {
      case 0:
        this.playIdleHopAndWiggle();
        break;
      case 1:
        this.playIdleCuriousLook();
        break;
      case 2:
        this.playIdleTailWagAndTap();
        break;
      case 3:
        this.playIdleYawnAndStretch();
        break;
      case 4:
      default:
        this.playIdleSpinAndStardust();
        break;
    }
  }

  // Idle 1: Happy Spring Hop & Mid-Air Foot Wiggle (User Signature Request)
  playIdleHopAndWiggle() {
    if (!window.gsap || !this.kiroGroup) return;
    this.isPlayingIdle = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isPlayingIdle = false;
        this.resetPose();
      }
    });

    // 1. Anticipation crouch down
    tl.to(this.kiroGroup.scale, { y: 0.82, x: 1.14, z: 1.12, duration: 0.16, ease: 'power2.in' })
      .to(this.kiroGroup.position, { y: -0.06, duration: 0.16 }, 0)
      // 2. Joyful Spring Hop high into the air
      .to(this.kiroGroup.position, { y: 0.32, duration: 0.26, ease: 'power2.out' })
      .to(this.kiroGroup.scale, { y: 1.12, x: 0.92, z: 0.92, duration: 0.18 }, '<')
      // 3. Mid-Air Excited Stubby Feet Wiggle & Happy Arm Flaps!
      .to(this.leftFoot.rotation, { z: -0.45, yoyo: true, repeat: 5, duration: 0.07, ease: 'sine.inOut' }, 0.22)
      .to(this.rightFoot.rotation, { z: 0.45, yoyo: true, repeat: 5, duration: 0.07, ease: 'sine.inOut' }, 0.22)
      .to(this.leftArm.rotation, { z: -0.85, yoyo: true, repeat: 3, duration: 0.10, ease: 'power1.inOut' }, 0.22)
      .to(this.rightArm.rotation, { z: 0.85, yoyo: true, repeat: 3, duration: 0.10, ease: 'power1.inOut' }, 0.22)
      .to(this.tailMesh.rotation, { y: 0.50, yoyo: true, repeat: 4, duration: 0.08, ease: 'sine.inOut' }, 0.22)
      // 4. Squishy Bounce Landing on Pedestal
      .to(this.kiroGroup.position, { y: 0, duration: 0.22, ease: 'power2.in' }, 0.62)
      .to(this.kiroGroup.scale, { y: 0.84, x: 1.14, z: 1.10, duration: 0.14, ease: 'power2.out' }, 0.84)
      .to(this.kiroGroup.scale, { y: 1.0, x: 1.0, z: 1.0, duration: 0.35, ease: 'elastic.out(1, 0.3)' }, 0.98);
  }

  // Idle 2: Curious Looking Around & Inquisitive Head Tilt
  playIdleCuriousLook() {
    if (!window.gsap || !this.kiroGroup) return;
    this.isPlayingIdle = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isPlayingIdle = false;
        this.resetPose();
      }
    });

    // Tilt head curiously to the left, glance up at passing stars
    tl.to(this.kiroGroup.rotation, { z: 0.18, y: -0.32, duration: 0.42, ease: 'power2.out' })
      .to([this.leftEye.position, this.rightEye.position], { y: '+=0.025', x: '-=0.018', duration: 0.32 }, 0.1)
      // Curious pause
      .to({}, { duration: 0.45 })
      // Gentle inquisitive tilt to the right with eye sparkle wink
      .to(this.kiroGroup.rotation, { z: -0.16, y: 0.28, duration: 0.48, ease: 'power2.inOut' })
      .to([this.leftEye.position, this.rightEye.position], { x: '+=0.035', duration: 0.35 }, '<')
      .to(this.rightEye.scale, { y: 0.2, duration: 0.12, yoyo: true, repeat: 1 }, '+=0.1')
      // Settle back to center
      .to(this.kiroGroup.rotation, { x: 0, y: 0, z: 0, duration: 0.38, ease: 'power2.out' }, '+=0.2')
      .to([this.leftEye.position, this.rightEye.position], { x: (i) => (i === 0 ? -0.28 : 0.28), y: 0.16, duration: 0.3 }, '<');
  }

  // Idle 3: Playful Dino Tail Waggle & Stubby Foot Tap
  playIdleTailWagAndTap() {
    if (!window.gsap || !this.kiroGroup) return;
    this.isPlayingIdle = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isPlayingIdle = false;
        this.resetPose();
      }
    });

    // Rhythmic body sway with fast tail wags & rhythmic foot taps
    tl.to(this.kiroGroup.rotation, { z: -0.06, yoyo: true, repeat: 5, duration: 0.12, ease: 'sine.inOut' })
      .to(this.tailMesh.rotation, { y: 0.55, yoyo: true, repeat: 7, duration: 0.09, ease: 'sine.inOut' }, 0)
      .to(this.leftFoot.position, { y: -0.70, yoyo: true, repeat: 5, duration: 0.12, ease: 'power1.out' }, 0.08)
      .to(this.blushMat, { opacity: 0.95, yoyo: true, repeat: 1, duration: 0.35 }, 0.15);
  }

  // Idle 4: Cute Little Yawn & Big Body Stretch
  playIdleYawnAndStretch() {
    if (!window.gsap || !this.kiroGroup) return;
    this.isPlayingIdle = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isPlayingIdle = false;
        this.resetPose();
      }
    });

    // 1. Open mouth in sweet round "O" yawn
    tl.to(this.mouthGroup.scale, { x: 1.35, y: 1.85, z: 1.35, duration: 0.38, ease: 'power1.out' })
      // 2. Stretch tall on toes
      .to(this.kiroGroup.position, { y: 0.14, duration: 0.42, ease: 'power2.out' }, 0)
      .to(this.kiroGroup.scale, { y: 1.15, x: 0.90, z: 0.90, duration: 0.42 }, 0)
      .to([this.leftArm.rotation, this.rightArm.rotation], { x: -0.65, duration: 0.38 }, 0)
      .to([this.leftEye.scale, this.rightEye.scale], { y: 0.25, duration: 0.28 }, 0.15)
      // 3. Hold cozy stretch
      .to({}, { duration: 0.35 })
      // 4. Relax back down with cute satisfied belly wobble
      .to(this.mouthGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.28, ease: 'power2.inOut' })
      .to(this.kiroGroup.position, { y: 0, duration: 0.32, ease: 'bounce.out' }, '<')
      .to(this.kiroGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.35, ease: 'elastic.out(1, 0.3)' }, '<')
      .to([this.leftArm.rotation, this.rightArm.rotation], { x: 0.25, duration: 0.3 }, '<')
      .to([this.leftEye.scale, this.rightEye.scale], { y: 1.0, duration: 0.22 }, '<');
  }

  // Idle 5: Joyful 360° Spin Hop & Stardust Burst
  playIdleSpinAndStardust() {
    if (!window.gsap || !this.kiroGroup) return;
    this.isPlayingIdle = true;

    const tl = gsap.timeline({
      onComplete: () => {
        this.isPlayingIdle = false;
        this.resetPose();
      }
    });

    // 1. Crouch & spring
    tl.to(this.kiroGroup.scale, { y: 0.84, x: 1.12, duration: 0.14, ease: 'power2.in' })
      .to(this.kiroGroup.position, { y: 0.28, duration: 0.28, ease: 'power2.out' })
      .to(this.kiroGroup.scale, { y: 1.08, x: 0.95, duration: 0.18 }, '<')
      // 2. 360 Pirouette Spin in the air
      .to(this.kiroGroup.rotation, { y: Math.PI * 2, duration: 0.48, ease: 'power1.inOut' }, 0.12)
      .to([this.leftFoot.rotation, this.rightFoot.rotation], { z: (i) => (i === 0 ? -0.4 : 0.4), yoyo: true, repeat: 1, duration: 0.24 }, 0.12)
      // 3. Stardust sparkles release
      .call(() => {
        for (let s = 0; s < 6; s++) {
          this.spawnStardustParticle(
            (Math.random() - 0.5) * 0.7,
            0.1 + Math.random() * 0.35,
            (Math.random() - 0.5) * 0.4
          );
        }
      }, null, 0.30)
      // 4. Elastic landing with happy smile
      .to(this.kiroGroup.position, { y: 0, duration: 0.22, ease: 'power2.in' }, 0.52)
      .to(this.kiroGroup.scale, { y: 0.86, x: 1.12, duration: 0.12 }, 0.72)
      .to(this.kiroGroup.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.35, ease: 'elastic.out(1, 0.3)' }, 0.84);
  }

  spawnHeartParticles() {
    if (!window.gsap) return;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.95 }));
      p.position.set(0, 0.2, 0.1);
      this.scene.add(p);

      const theta = Math.random() * Math.PI * 2;
      const dist = 1.2 + Math.random() * 0.8;

      gsap.to(p.position, {
        x: Math.cos(theta) * dist,
        y: 0.5 + Math.random() * 0.8,
        z: Math.sin(theta) * dist,
        duration: 0.8,
        ease: 'power2.out'
      });

      gsap.to(p.scale, {
        x: 0, y: 0, z: 0, duration: 0.8, ease: 'power2.in',
        onComplete: () => {
          this.scene.remove(p);
          p.geometry.dispose();
          p.material.dispose();
        }
      });
    }
  }

  spawnStardustParticle(x, y, z) {
    if (this.touchParticles.length >= this.maxTouchParticles) return;

    const colors = [0x4EC9B0, 0xFFB6C1, 0xF9E2AF, 0xCBA6F7];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const geo = new THREE.DodecahedronGeometry(0.045 + Math.random() * 0.04);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
    const p = new THREE.Mesh(geo, mat);

    p.position.set(x + (Math.random() - 0.5) * 0.2, y + (Math.random() - 0.5) * 0.2, z + (Math.random() - 0.5) * 0.2);
    p.userData = {
      vx: (Math.random() - 0.5) * 0.02,
      vy: 0.02 + Math.random() * 0.02,
      vz: (Math.random() - 0.5) * 0.02,
      life: 1.0,
      decay: 0.03
    };

    this.scene.add(p);
    this.touchParticles.push(p);
  }

  updateTouchParticles() {
    for (let i = this.touchParticles.length - 1; i >= 0; i--) {
      const p = this.touchParticles[i];
      p.position.x += p.userData.vx;
      p.position.y += p.userData.vy;
      p.position.z += p.userData.vz;
      p.userData.life -= p.userData.decay;

      p.material.opacity = p.userData.life;
      p.scale.setScalar(p.userData.life);

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        this.touchParticles.splice(i, 1);
        p.geometry.dispose();
        p.material.dispose();
      }
    }
  }

  dropCandy(type = 'star') {
    let candyGeo, candyMat;
    if (type === 'star') {
      candyGeo = new THREE.DodecahedronGeometry(0.24);
      candyMat = new THREE.MeshPhongMaterial({
        color: 0xF9E2AF,
        emissive: 0xF9E2AF,
        emissiveIntensity: 0.4,
        shininess: 60
      });
    } else {
      candyGeo = new THREE.TorusGeometry(0.20, 0.09, 16, 32);
      candyMat = new THREE.MeshPhongMaterial({
        color: 0xF5C2E7,
        emissive: 0x6E3558,
        shininess: 40
      });
    }

    const candyMesh = new THREE.Mesh(candyGeo, candyMat);
    candyMesh.position.set((Math.random() - 0.5) * 0.6, 2.5, 0.85);
    candyMesh.userData = {
      vy: -0.015,
      ay: -0.003,
      rotX: (Math.random() - 0.5) * 0.08,
      rotY: (Math.random() - 0.5) * 0.08,
      type
    };

    this.scene.add(candyMesh);
    this.activeCandies.push(candyMesh);
  }

  splashWater() {
    synthEngine.playWaterSound();

    if (window.gsap && this.kiroGroup) {
      const tl = gsap.timeline();
      // Mouth opens in cute "O" drinking shape
      if (this.mouth) {
        tl.to(this.mouth.scale, { x: 1.4, y: 2.2, z: 1.4, duration: 0.15, ease: 'power1.out' })
          .to(this.mouth.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.25, ease: 'elastic.out(1, 0.3)' }, 0.3);
      }
      // Joyful water splash arms flutter
      if (this.leftArm && this.rightArm) {
        tl.to(this.leftArm.rotation, { z: -Math.PI / 3, yoyo: true, repeat: 3, duration: 0.12 }, 0)
          .to(this.rightArm.rotation, { z: Math.PI / 3, yoyo: true, repeat: 3, duration: 0.12 }, 0);
      }
      // Refreshed puppy-like body shake
      tl.to(this.kiroGroup.rotation, { z: 0.10, yoyo: true, repeat: 5, duration: 0.06, ease: 'sine.inOut' }, 0.2)
        .to(this.kiroGroup.rotation, { z: 0, duration: 0.15 }, 0.6);
    }

    for (let i = 0; i < 14; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x4EC9B0, transparent: true, opacity: 0.85 })
      );
      drop.position.set(0, 0.2, 0.8);

      const angle = Math.random() * Math.PI * 2;
      const speed = 0.06 + Math.random() * 0.08;
      drop.userData = {
        vx: Math.cos(angle) * speed,
        vy: 0.08 + Math.random() * 0.07,
        vz: Math.sin(angle) * speed,
        gravity: -0.006,
        life: 1.0,
        decay: 0.028
      };

      this.scene.add(drop);
      this.waterDroplets.push(drop);
    }
  }

  updateWaterPhysics() {
    for (let i = this.waterDroplets.length - 1; i >= 0; i--) {
      const drop = this.waterDroplets[i];
      drop.userData.vy += drop.userData.gravity;
      drop.position.x += drop.userData.vx;
      drop.position.y += drop.userData.vy;
      drop.position.z += drop.userData.vz;
      drop.userData.life -= drop.userData.decay;

      drop.material.opacity = drop.userData.life * 0.85;

      if (drop.userData.life <= 0 || drop.position.y < -1.5) {
        this.scene.remove(drop);
        this.waterDroplets.splice(i, 1);
        drop.geometry.dispose();
        drop.material.dispose();
      }
    }
  }

  updatePhysics() {
    for (let i = this.activeCandies.length - 1; i >= 0; i--) {
      const candy = this.activeCandies[i];
      candy.userData.vy += candy.userData.ay;
      candy.position.y += candy.userData.vy;
      candy.rotation.x += candy.userData.rotX;
      candy.rotation.y += candy.userData.rotY;

      if (this.kiroGroup) {
        const dx = candy.position.x - this.kiroGroup.position.x;
        const dy = candy.position.y - (this.kiroGroup.position.y + 0.12);
        const dz = candy.position.z - (this.kiroGroup.position.z + 0.82);
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < 0.65 && candy.position.y > -0.2) {
          this.scene.remove(candy);
          this.activeCandies.splice(i, 1);
          this.onEatCandy(candy.userData.type);
          continue;
        }
      }

      if (candy.position.y < -1.35) {
        this.scene.remove(candy);
        this.activeCandies.splice(i, 1);
        if (candy.geometry) candy.geometry.dispose();
      }
    }
  }

  onEatCandy(type) {
    synthEngine.playChewSound();
    this.isChewing = true;

    // Trigger viscoelastic harmonic squish on treat munch
    this.triggerViscoelasticSquish(0.22, 16.0, 3.5);

    if (window.gsap && this.kiroGroup) {
      const baseScale = 1.0;
      const tl = gsap.timeline({
        onComplete: () => {
          this.isChewing = false;
          if (this.mouthGroup) this.mouthGroup.scale.set(1, 1, 1);
          if (this.mouth) this.mouth.scale.set(1, 1, 1);
          if (this.tooth) this.tooth.position.set(0.022, 0.018, 0.012);
          if (this.leftEye) this.leftEye.scale.set(1, 1, 1);
          if (this.rightEye) this.rightEye.scale.set(1, 1, 1);
          if (this.leftArm) this.leftArm.rotation.set(0.25, -0.45, 0.50);
          if (this.rightArm) this.rightArm.rotation.set(0.25, 0.45, -0.50);
        }
      });

      // 1. Anticipation: mouth opens wide to catch the treat
      if (this.mouthGroup) {
        tl.to(this.mouthGroup.scale, { x: 1.45, y: 2.4, z: 1.35, duration: 0.12, ease: 'power1.out' });

        // 2. Dynamic Chomping / Munching Chewing cycles (4 quick delicious munches)
        for (let m = 0; m < 4; m++) {
          tl.to(this.mouthGroup.scale, { y: 0.45, duration: 0.08, ease: 'power2.in' })
            .to(this.tooth.position, { y: 0.035, duration: 0.08 }, '<')
            .to(this.mouthGroup.scale, { y: 1.75, duration: 0.08, ease: 'power2.out' })
            .to(this.tooth.position, { y: 0.012, duration: 0.08 }, '<');
        }
      }

      // Happy Eye Squint & Cheerful Wiggle during chewing
      if (this.leftEye && this.rightEye) {
        tl.to([this.leftEye.scale, this.rightEye.scale], { y: 0.25, duration: 0.15 }, 0.1)
          .to([this.leftEye.scale, this.rightEye.scale], { y: 1.0, duration: 0.2 }, 0.6);
      }

      // Excited Tail Wag during munching
      if (this.tailMesh) {
        tl.to(this.tailMesh.rotation, { y: 0.45, yoyo: true, repeat: 4, duration: 0.08, ease: 'sine.inOut' }, 0);
      }

      // Cute Front Arms grasping treat
      if (this.leftArm && this.rightArm) {
        tl.to(this.leftArm.rotation, { z: -0.85, yoyo: true, repeat: 3, duration: 0.1, ease: 'power1.inOut' }, 0)
          .to(this.rightArm.rotation, { z: 0.85, yoyo: true, repeat: 3, duration: 0.1, ease: 'power1.inOut' }, 0);
      }

      // Joyful Body Bounce & Belly Expansion (Yum!)
      tl.to(this.kiroGroup.position, { y: 0.26, duration: 0.2, ease: 'power2.out' }, 0.3)
        .to(this.kiroGroup.scale, { y: baseScale * 0.88, x: baseScale * 1.12, duration: 0.15, ease: 'power1.out' }, 0.3)
        .to(this.kiroGroup.position, { y: 0, duration: 0.25, ease: 'bounce.out' }, 0.5)
        .to(this.kiroGroup.scale, { x: baseScale, y: baseScale, z: baseScale, duration: 0.3, ease: 'elastic.out(1, 0.3)' }, 0.5);
    } else {
      this.isChewing = false;
    }

    this.spawnHeartParticles();
  }

  triggerWarpAcceleration() {
    // FIX: warpZStretch removed — it pushed star Z coords past the frustum far plane
    // Warp visual = faster rotation speed + larger point size only
    if (window.gsap) {
      gsap.to(this, {
        warpSpeed: 0.12,
        warpStarSize: 0.85,
        duration: 1.5,
        ease: 'power2.in'
      });
    } else {
      this.warpSpeed = 0.12;
      this.warpStarSize = 0.85;
    }
  }

  exitWarpAcceleration() {
    if (window.gsap) {
      gsap.to(this, {
        warpSpeed: 0.02,
        warpStarSize: 0.42,
        duration: 1.0,
        ease: 'power2.out'
      });
    } else {
      this.warpSpeed = 0.02;
      this.warpStarSize = 0.42;
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Main Render Loop (Single requestAnimationFrame)
     ───────────────────────────────────────────────────────────────────────── */
  animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    this._elapsedTime += delta;
    const t = this._elapsedTime;
    const now = performance.now();
    const frameMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Performance Monitor update
    if (this.devFpsBadge) {
      this.fpsHistory.push(frameMs);
      if (this.fpsHistory.length > 30) this.fpsHistory.shift();
      const avgMs = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
      const currentFps = Math.round(1000 / (avgMs || 16.6));
      this.devFpsBadge.textContent = `${currentFps} FPS | ${avgMs.toFixed(1)}ms`;
    }

    // 1. Gyro Parallax Smooth Interpolation
    this.gyro.x += (this.gyro.targetX - this.gyro.x) * 0.08;
    this.gyro.y += (this.gyro.targetY - this.gyro.y) * 0.08;
    this.camera.position.x = this.gyro.x;
    this.camera.position.y = this.baseCameraY + this.gyro.y;
    this.camera.position.z = this.baseCameraZ;

    // 2. Space Shuttle Steering & Unified Rigid-Body Celestial Parallax (Phase 5.2)
    const isTelescope = KiroState.get('telescopeActive');
    const steering = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };

    if (isTelescope) {
      const targetGroupX = -(steering.yaw || 0) * 0.12;
      const targetGroupY = -(steering.pitch || 0) * 0.12;
      this.backgroundCelestialGroup.position.x += (targetGroupX - this.backgroundCelestialGroup.position.x) * 0.10;
      this.backgroundCelestialGroup.position.y += (targetGroupY - this.backgroundCelestialGroup.position.y) * 0.10;
      this.backgroundCelestialGroup.rotation.y += ((steering.yaw || 0) * 0.005 - this.backgroundCelestialGroup.rotation.y) * 0.10;
      this.backgroundCelestialGroup.rotation.x += (-(steering.pitch || 0) * 0.005 - this.backgroundCelestialGroup.rotation.x) * 0.10;

      // Animate reticle ring and dynamic target alignment color
      if (this.crosshairMesh) {
        this.crosshairMesh.rotation.z += 0.015;
        const isAligned = KiroState.get('cockpitSteering.aligned');
        this.crosshairMesh.material.color.setHex(isAligned ? 0x94E2D5 : 0x4EC9B0);
      }

      this.camera.lookAt(0, 0, -10);
    } else {
      this.backgroundCelestialGroup.position.x += (0 - this.backgroundCelestialGroup.position.x) * 0.05;
      this.backgroundCelestialGroup.position.y += (0 - this.backgroundCelestialGroup.position.y) * 0.05;
      this.backgroundCelestialGroup.rotation.x += (0 - this.backgroundCelestialGroup.rotation.x) * 0.05;
      this.backgroundCelestialGroup.rotation.y += (0 - this.backgroundCelestialGroup.rotation.y) * 0.05;
      this.camera.lookAt(0, 0, 0);

      // Organic Soft-Body Breathing & Living Creature Kinematics
      const isSleeping = KiroState.get('isSleeping');
      const freq = isSleeping ? 0.8 : 2.2;
      const amp = isSleeping ? 0.02 : 0.045;

      if (this.kiroGroup && !this.isPetting && !this.isChewing && !this.isPlayingIdle && !this.isTelescopeTransitioning) {
        // Apply Viscoelastic Damped Harmonic Oscillator deformation
        if (this.viscousWobble && this.viscousWobble.active && this.bodyMesh) {
          const elapsed = (now - this.viscousWobble.startTime) / 1000;
          const damp = Math.exp(-this.viscousWobble.decay * elapsed);
          if (damp < 0.008 || elapsed > 1.8) {
            this.viscousWobble.active = false;
            this.bodyMesh.scale.set(1.08, 0.98, 1.04);
          } else {
            const wave = Math.sin(elapsed * this.viscousWobble.frequency) * this.viscousWobble.amplitude * damp;
            this.bodyMesh.scale.set(
              1.08 * (1.0 - 0.45 * wave),
              0.98 * (1.0 + wave),
              1.04 * (1.0 - 0.45 * wave)
            );
          }
        }

        // Natural squish-and-stretch breathing (Volume-conserving organic chest & belly expansion)
        const breathY = 1.0 + Math.sin(t * freq) * (isSleeping ? 0.022 : 0.038);
        const breathXZ = 1.0 - Math.sin(t * freq) * (isSleeping ? 0.011 : 0.019);
        this.kiroGroup.scale.y = breathY;
        this.kiroGroup.scale.x = breathXZ;
        this.kiroGroup.scale.z = breathXZ;
        this.kiroGroup.position.y = Math.sin(t * freq) * amp;

        // Soft tail breathing sway
        if (this.tailMesh) {
          this.tailMesh.rotation.y = Math.sin(t * (freq * 0.9)) * (isSleeping ? 0.03 : 0.12);
        }

        // Soft arm breathing sway
        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x = 0.25 + Math.sin(t * freq) * 0.04;
          this.rightArm.rotation.x = 0.25 + Math.sin(t * freq) * 0.04;
        }

        // Soft head crest breathing bounce
        if (this.headCrests) {
          this.headCrests.forEach((c, idx) => {
            c.rotation.x = Math.sin(t * freq + idx * 0.5) * 0.06;
          });
        }

        // Natural Organic Eye Blinking & Idle Timer
        if (!isSleeping) {
          this.blinkTimer += delta;
          if (this.blinkTimer >= this.nextBlinkTime) {
            this.blinkTimer = 0;
            this.nextBlinkTime = 2.8 + Math.random() * 3.5;
            this.performBlink();
          }

          // Trigger one of the 5 distinct living idle animations periodically
          this.idleTimer += delta;
          if (this.idleTimer >= this.nextIdleTrigger) {
            this.idleTimer = 0;
            this.nextIdleTrigger = 4.5 + Math.random() * 4.0;
            this.triggerRandomIdleAnimation();
          }

          // Subtle alive eye catchlight pulse (pupil breathing)
          if (this.leftHl && this.rightHl) {
            const hlScale = 1.0 + Math.sin(t * 3.2) * 0.08;
            this.leftHl.scale.set(hlScale, hlScale * 1.25, 0.4);
            this.rightHl.scale.set(hlScale, hlScale * 1.25, 0.4);
          }
        }

        // Head & Eye Tracking towards User Touch / Pointer
        if (!isSleeping && this.pointerInCanvas) {
          const targetRotY = this.mouse.x * 0.35;
          const targetRotX = -this.mouse.y * 0.22;
          this.kiroGroup.rotation.y += (targetRotY - this.kiroGroup.rotation.y) * 0.08;
          this.kiroGroup.rotation.x += (targetRotX - this.kiroGroup.rotation.x) * 0.08;

          if (this.leftEye && this.rightEye) {
            const eyeShiftX = this.mouse.x * 0.025;
            const eyeShiftY = this.mouse.y * 0.025;
            this.leftEye.position.x = -0.28 + eyeShiftX;
            this.leftEye.position.y = 0.16 + eyeShiftY;
            this.rightEye.position.x = 0.28 + eyeShiftX;
            this.rightEye.position.y = 0.16 + eyeShiftY;
          }
        } else if (!isSleeping) {
          this.kiroGroup.rotation.y += (0 - this.kiroGroup.rotation.y) * 0.06;
          this.kiroGroup.rotation.x += (0 - this.kiroGroup.rotation.x) * 0.06;
          if (this.leftEye && this.rightEye) {
            this.leftEye.position.x += (-0.28 - this.leftEye.position.x) * 0.06;
            this.leftEye.position.y += (0.16 - this.leftEye.position.y) * 0.06;
            this.rightEye.position.x += (0.28 - this.rightEye.position.x) * 0.06;
            this.rightEye.position.y += (0.16 - this.rightEye.position.y) * 0.06;
          }
        }
      }
    }

    // 3. Update Living Celestial Subsystems
    this.updateCelestialLayer(t, delta);

    // 4. Entangled Twin Starlight Orbit (Patrick mint-teal & Yangiee pastel-pink)
    if (this.entangledStarlightGroup && this.patStarlightOrb && this.yangStarlightOrb) {
      const orbitSpeed = 0.75;
      const orbitRadiusX = 1.55;
      const orbitRadiusZ = 0.58;
      const anglePat = t * orbitSpeed;
      const angleYang = anglePat + Math.PI;

      this.patStarlightOrb.position.set(
        Math.cos(anglePat) * orbitRadiusX,
        -0.88 + Math.sin(anglePat * 2) * 0.08,
        Math.sin(anglePat) * orbitRadiusZ
      );

      this.yangStarlightOrb.position.set(
        Math.cos(angleYang) * orbitRadiusX,
        -0.88 + Math.sin(angleYang * 2) * 0.08,
        Math.sin(angleYang) * orbitRadiusZ
      );
    }

    // 5. Audio-Visual Synesthesia & Vitality Aura
    const audioLevel = synthEngine.getAudioReactiveLevel();
    if (this.neonRing) {
      this.neonRing.rotation.z += 0.008;
      const ringScale = 1.0 + audioLevel * 0.35;
      this.neonRing.scale.set(ringScale, ringScale, 1.0);
      this.neonRing.material.opacity = 0.75 + audioLevel * 0.25;
    }

    if (this.pedestalSparkles) {
      this.pedestalSparkles.rotation.y += 0.006;
    }

    if (this.goldenAura && this.goldenAura.visible) {
      const auraBreath = 1.0 + Math.sin(t * 1.5) * 0.06 + audioLevel * 0.2;
      this.goldenAura.scale.set(auraBreath, auraBreath, auraBreath);
      this.goldenAura.material.opacity = 0.20 + audioLevel * 0.18;
    }

    // 6. Update Local Particle Systems & Physics
    this.updateTouchParticles();
    this.updatePhysics();
    this.updateWaterPhysics();

    // 6. Single WebGL Render Call
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth || document.documentElement.clientWidth || (this.container ? this.container.clientWidth : 360);
    const height = window.innerHeight || document.documentElement.clientHeight || (this.container ? this.container.clientHeight : 640);
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;

    this.baseCameraZ = aspect < 0.8
      ? Math.max(5.6, 2.7 / (2 * Math.tan((45 * Math.PI / 180) / 2) * Math.max(aspect, 0.35)))
      : 5.4;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.gyro.x, this.baseCameraY + this.gyro.y, this.baseCameraZ);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 5: Resource Disposal & Memory Trim Bridge
     ───────────────────────────────────────────────────────────────────────── */
  disposeCelestialLayer() {
    this.celestialDisposalRegistry.forEach(resource => {
      if (resource && typeof resource.dispose === 'function') {
        try { resource.dispose(); } catch (e) { /* ignore */ }
      }
    });
    this.celestialDisposalRegistry.clear();
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    if (this.boundResize) {
      window.removeEventListener('resize', this.boundResize);
      window.removeEventListener('orientationchange', this.boundResize);
    }

    if (this.devFpsBadge && this.devFpsBadge.parentNode) {
      this.devFpsBadge.parentNode.removeChild(this.devFpsBadge);
    }

    this.disposeCelestialLayer();

    this.touchParticles.forEach(p => {
      this.scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
    });
    this.touchParticles = [];

    this.activeCandies.forEach(c => {
      this.scene.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
    this.activeCandies = [];

    this.waterDroplets.forEach(d => {
      this.scene.remove(d);
      if (d.geometry) d.geometry.dispose();
      if (d.material) d.material.dispose();
    });
    this.waterDroplets = [];

    if (this.scene) {
      this.scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
