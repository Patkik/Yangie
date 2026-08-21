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

// Helper: Generate procedural radial glow texture for 100% reliable mobile star rendering
function createGlowStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.2, 'rgba(240, 248, 255, 0.9)');
  gradient.addColorStop(0.5, 'rgba(148, 226, 213, 0.4)');
  gradient.addColorStop(0.8, 'rgba(203, 166, 247, 0.15)');
  gradient.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

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
    this.spaceSystems = [
      { id: 'butterfly', name: 'Butterfly Galaxy (NGC 6302)', x: 6.0, y: 1.2, z: -8.0, size: 0.65, color: 0xF5C2E7 },
      { id: 'helix', name: 'Eye of Helix Nebula (NGC 7293)', x: -7.0, y: 2.5, z: -9.0, size: 0.75, color: 0x94E2D5 },
      { id: 'sombrero', name: 'Sombrero Vortex (M104)', x: 8.0, y: -1.0, z: -10.0, size: 0.80, color: 0xF9E2AF },
      { id: 'crab', name: 'Crab Pulsar Core (M1)', x: -6.0, y: -2.0, z: -8.0, size: 0.60, color: 0xCBA6F7 }
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

  // 2.1 Volumetric Procedural Cosmic Nebula Shader (Z = -18.0)
  buildVolumetricNebula() {
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform float u_audio;
      varying vec2 vUv;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy));
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        float t = u_time * 0.04;

        float n1 = snoise(uv * 1.2 + vec2(t * 0.3, t * 0.15));
        float n2 = snoise(uv * 2.4 - vec2(t * 0.15, t * 0.35));
        float cloud = (n1 * 0.6 + n2 * 0.4) * 0.5 + 0.5;

        vec3 deepSpace = vec3(0.055, 0.055, 0.090); // Deep Midnight Space
        vec3 lavender  = vec3(0.42, 0.28, 0.72);    // #CBA6F7 Lavender Cosmic Dust
        vec3 mint      = vec3(0.24, 0.68, 0.58);    // #4EC9B0 Mint Teal (Patrick)
        vec3 pink      = vec3(0.92, 0.58, 0.68);    // #FFB6C1 Pastel Pink (Yangiee)
        vec3 gold      = vec3(0.95, 0.82, 0.58);    // #F9E2AF Warm Gold Core

        // Organic billowing interstellar gas
        vec3 col = mix(deepSpace, lavender, smoothstep(0.32, 0.78, cloud) * 0.75);

        if (uv.x < 0.0) {
          col = mix(col, mint, smoothstep(0.35, 0.85, cloud) * abs(uv.x) * 0.70);
        } else {
          col = mix(col, pink, smoothstep(0.35, 0.85, cloud) * uv.x * 0.70);
        }

        float centerDist = length(uv);
        col = mix(col, gold, smoothstep(0.70, 0.0, centerDist) * 0.18 * (1.0 + u_audio * 0.5));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const nebulaGeo = new THREE.PlaneGeometry(85, 55);
    this.nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_audio: { value: 0.0 }
      },
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

  // 2.3 Roaming Flat-Shaded Planets (Z = -10.0 to -14.0)
  buildRoamingPlanets() {
    this.roamingPlanets = [];

    // Planet 1: Mint/Teal Ice World
    const geo1 = new THREE.IcosahedronGeometry(0.45, 1);
    const mat1 = new THREE.MeshLambertMaterial({ color: 0x4EC9B0, flatShading: true });
    const p1 = new THREE.Mesh(geo1, mat1);
    p1.userData = { orbitRadius: 6.5, speed: 0.04, baseAngle: 0, depth: -11.0 };
    this.registerDisposable(geo1);
    this.registerDisposable(mat1);
    this.backgroundCelestialGroup.add(p1);
    this.roamingPlanets.push(p1);

    // Planet 2: Lavender Gas Giant with Translucent Saturn-like Ring
    const planet2Group = new THREE.Group();
    const geo2 = new THREE.IcosahedronGeometry(0.68, 1);
    const mat2 = new THREE.MeshLambertMaterial({ color: 0xCBA6F7, flatShading: true });
    const p2Mesh = new THREE.Mesh(geo2, mat2);
    planet2Group.add(p2Mesh);

    const ringGeo = new THREE.RingGeometry(0.88, 1.45, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xF9E2AF,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    planet2Group.add(ringMesh);

    planet2Group.userData = { orbitRadius: 8.0, speed: 0.025, baseAngle: 2.2, depth: -12.5 };
    this.registerDisposable(geo2);
    this.registerDisposable(mat2);
    this.registerDisposable(ringGeo);
    this.registerDisposable(ringMat);
    this.backgroundCelestialGroup.add(planet2Group);
    this.roamingPlanets.push(planet2Group);

    // Planet 3: Pastel-Pink Star Core
    const geo3 = new THREE.IcosahedronGeometry(0.38, 1);
    const mat3 = new THREE.MeshLambertMaterial({ color: 0xFFB6C1, flatShading: true });
    const p3 = new THREE.Mesh(geo3, mat3);
    p3.userData = { orbitRadius: 5.2, speed: 0.06, baseAngle: 4.4, depth: -13.5 };
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

  // 2.5 Living Comet with Waving Tail
  buildLivingComet() {
    this.cometMesh = new THREE.Group();
    this.cometMesh.position.set(-15, 4.0, -11.5);

    // Comet Glowing Head
    const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.cometHead = new THREE.Mesh(headGeo, headMat);
    this.cometMesh.add(this.cometHead);

    const haloGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x94E2D5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });
    this.cometMesh.add(new THREE.Mesh(haloGeo, haloMat));

    // Waving Tail Geometry (8 segment strip)
    const tailGeo = new THREE.BufferGeometry();
    const tailVerts = new Float32Array(8 * 3);
    for (let j = 0; j < 8; j++) {
      tailVerts[j * 3]     = -j * 0.35;
      tailVerts[j * 3 + 1] = 0;
      tailVerts[j * 3 + 2] = 0;
    }
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));

    const tailMat = new THREE.LineBasicMaterial({
      color: 0xF5C2E7,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });
    this.cometTail = new THREE.Line(tailGeo, tailMat);
    this.cometMesh.add(this.cometTail);

    this.registerDisposable(headGeo);
    this.registerDisposable(headMat);
    this.registerDisposable(haloGeo);
    this.registerDisposable(haloMat);
    this.registerDisposable(tailGeo);
    this.registerDisposable(tailMat);

    this.backgroundCelestialGroup.add(this.cometMesh);
  }

  // 4.4 Holographic Planetary Targets in backgroundCelestialGroup
  buildHolographicTargets() {
    this.targetSystemMeshes = [];

    this.spaceSystems.forEach(sys => {
      const group = new THREE.Group();
      group.position.set(sys.x, sys.y, sys.z);

      const geo = new THREE.IcosahedronGeometry(sys.size, 2);
      const mat = new THREE.MeshBasicMaterial({
        color: sys.color,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      const glowGeo = new THREE.SphereGeometry(sys.size * 1.25, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: sys.color,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      group.add(new THREE.Mesh(glowGeo, glowMat));

      group.userData = { id: sys.id, name: sys.name, basePos: new THREE.Vector3(sys.x, sys.y, sys.z) };

      this.registerDisposable(geo);
      this.registerDisposable(mat);
      this.registerDisposable(glowGeo);
      this.registerDisposable(glowMat);

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

    // 1. Update Nebula Shader Uniforms
    if (this.nebulaMaterial) {
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

    // 3. Roaming Planets Parametric Orbit
    this.roamingPlanets.forEach(planet => {
      const u = planet.userData;
      const angle = u.baseAngle + time * u.speed;
      planet.position.x = Math.cos(angle) * u.orbitRadius;
      planet.position.y = Math.sin(angle * 0.7) * (u.orbitRadius * 0.45);
      planet.position.z = u.depth;
      planet.rotation.y += 0.01;
      planet.rotation.x += 0.005;
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

    // 5. Living Comet with Waving Tail
    if (this.cometMesh && this.cometTail) {
      this.cometMesh.position.x += 0.015;
      this.cometMesh.position.y = 3.5 + Math.sin(time * 0.35) * 0.6;
      if (this.cometMesh.position.x > 16.0) {
        this.cometMesh.position.x = -16.0;
      }

      const tailPos = this.cometTail.geometry.attributes.position.array;
      for (let j = 0; j < 8; j++) {
        tailPos[j * 3 + 1] = Math.sin(time * 8.0 + j * 0.8) * 0.04;
      }
      this.cometTail.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Holographic Target Markers
    const isTelescope = KiroState.get('telescopeActive');
    const steering = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };

    this.targetSystemMeshes.forEach(target => {
      target.rotation.y += 0.012;
      target.rotation.x += 0.006;

      if (isTelescope) {
        // Calculate screen-projected distance to center crosshair
        const screenPos = target.position.clone();
        screenPos.add(this.backgroundCelestialGroup.position);
        const distToCenter = Math.sqrt(Math.pow(screenPos.x, 2) + Math.pow(screenPos.y - 0.15, 2));

        if (distToCenter < 0.9) {
          if (KiroState.get('cockpitSteering.currentTarget') !== target.userData.id) {
            KiroState.set('cockpitSteering.currentTarget', target.userData.id);
            KiroState.set('cockpitSteering.aligned', true);
            synthEngine.playChimeSound(660);
          }
        }
      }
    });
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

    const mintMat = new THREE.MeshPhongMaterial({
      color: 0x4EC9B0,
      emissive: 0x14352D,
      emissiveIntensity: 0.20,
      specular: 0x94E2D5,
      shininess: 45
    });
    this.registerDisposable(mintMat);

    // 1. Cute Chubby Mint Body
    const bodyGeo = new THREE.SphereGeometry(0.85, 36, 36);
    const bodyMesh = new THREE.Mesh(bodyGeo, mintMat);
    bodyMesh.scale.set(1.06, 0.94, 1.02);
    this.kiroGroup.add(bodyMesh);
    this.registerDisposable(bodyGeo);

    // 2. Smooth Creamy Belly Patch (#FDFBF7) — Placed softly without z-fighting
    const bellyGeo = new THREE.SphereGeometry(0.56, 32, 24);
    const bellyMat = new THREE.MeshPhongMaterial({
      color: 0xFDFBF7,
      emissive: 0x24201A,
      emissiveIntensity: 0.12,
      specular: 0xFFFFFF,
      shininess: 20
    });
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.scale.set(1.05, 0.88, 0.42);
    bellyMesh.position.set(0, -0.18, 0.64);
    this.kiroGroup.add(bellyMesh);
    this.registerDisposable(bellyGeo);
    this.registerDisposable(bellyMat);

    // 3. Soulful Obsidian Eyes & Starlight Catchlights
    const eyeGeo = new THREE.SphereGeometry(0.125, 24, 24);
    const eyeMat = new THREE.MeshPhongMaterial({
      color: 0x11111B,
      specular: 0x668899,
      shininess: 90
    });
    this.registerDisposable(eyeGeo);
    this.registerDisposable(eyeMat);

    // Left Eye
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.28, 0.16, 0.74);
    this.kiroGroup.add(this.leftEye);

    // Right Eye
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.28, 0.16, 0.74);
    this.kiroGroup.add(this.rightEye);

    // Primary Starlight Specular Highlights (Catchlights)
    const hlGeo = new THREE.SphereGeometry(0.042, 16, 16);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    this.registerDisposable(hlGeo);
    this.registerDisposable(hlMat);

    this.leftHl = new THREE.Mesh(hlGeo, hlMat);
    this.leftHl.position.set(-0.24, 0.20, 0.855);
    this.kiroGroup.add(this.leftHl);

    this.rightHl = new THREE.Mesh(hlGeo, hlMat);
    this.rightHl.position.set(0.24, 0.20, 0.855);
    this.kiroGroup.add(this.rightHl);

    // Secondary Mini Kawaii Sparkles (#F9E2AF Starlight Gold)
    const hl2Geo = new THREE.SphereGeometry(0.020, 12, 12);
    const hl2Mat = new THREE.MeshBasicMaterial({ color: 0xF9E2AF });
    this.registerDisposable(hl2Geo);
    this.registerDisposable(hl2Mat);

    this.leftHl2 = new THREE.Mesh(hl2Geo, hl2Mat);
    this.leftHl2.position.set(-0.31, 0.11, 0.845);
    this.kiroGroup.add(this.leftHl2);

    this.rightHl2 = new THREE.Mesh(hl2Geo, hl2Mat);
    this.rightHl2.position.set(0.31, 0.11, 0.845);
    this.kiroGroup.add(this.rightHl2);

    // 4. Rosy Blush Cheeks (#FFB6C1 Soft Pastel-Pink)
    const blushGeo = new THREE.SphereGeometry(0.12, 20, 20);
    const blushMat = new THREE.MeshBasicMaterial({
      color: 0xFFB6C1,
      transparent: true,
      opacity: 0.65
    });
    this.registerDisposable(blushGeo);
    this.registerDisposable(blushMat);

    this.leftBlush = new THREE.Mesh(blushGeo, blushMat);
    this.leftBlush.scale.set(1.0, 0.75, 0.25);
    this.leftBlush.position.set(-0.46, -0.02, 0.73);
    this.leftBlush.rotation.set(0.1, -0.2, 0.15);
    this.kiroGroup.add(this.leftBlush);

    this.rightBlush = new THREE.Mesh(blushGeo, blushMat);
    this.rightBlush.scale.set(1.0, 0.75, 0.25);
    this.rightBlush.position.set(0.46, -0.02, 0.73);
    this.rightBlush.rotation.set(0.1, 0.2, -0.15);
    this.kiroGroup.add(this.rightBlush);

    // 5. Sweet Little Smile
    const mouthGeo = new THREE.TorusGeometry(0.048, 0.015, 8, 16, Math.PI);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x162432 });
    this.mouth = new THREE.Mesh(mouthGeo, mouthMat);
    this.mouth.rotation.set(0, 0, Math.PI);
    this.mouth.position.set(0, 0.02, 0.855);
    this.kiroGroup.add(this.mouth);
    this.registerDisposable(mouthGeo);
    this.registerDisposable(mouthMat);

    // 6. Sleeping Eyes (Peaceful Curved Crescents)
    const sleepEyeGeo = new THREE.TorusGeometry(0.095, 0.022, 10, 20, Math.PI);
    const sleepEyeMat = new THREE.MeshBasicMaterial({ color: 0x11111B });
    this.registerDisposable(sleepEyeGeo);
    this.registerDisposable(sleepEyeMat);

    this.leftSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.leftSleepEye.rotation.set(0, 0, Math.PI);
    this.leftSleepEye.position.set(-0.28, 0.15, 0.815);
    this.leftSleepEye.visible = false;
    this.kiroGroup.add(this.leftSleepEye);

    this.rightSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.rightSleepEye.rotation.set(0, 0, Math.PI);
    this.rightSleepEye.position.set(0.28, 0.15, 0.815);
    this.rightSleepEye.visible = false;
    this.kiroGroup.add(this.rightSleepEye);

    // 7. Rounded Flippers / Arms
    const armGeo = new THREE.SphereGeometry(0.22, 24, 24);
    this.leftArm = new THREE.Mesh(armGeo, mintMat);
    this.leftArm.scale.set(0.72, 1.25, 0.72);
    this.leftArm.position.set(-0.84, -0.16, 0.18);
    this.leftArm.rotation.set(0.1, 0.15, 0.35);
    this.kiroGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mintMat);
    this.rightArm.scale.set(0.72, 1.25, 0.72);
    this.rightArm.position.set(0.84, -0.16, 0.18);
    this.rightArm.rotation.set(0.1, -0.15, -0.35);
    this.kiroGroup.add(this.rightArm);
    this.registerDisposable(armGeo);

    // 8. Sleep Nightcap (Pastel Lavender with Golden Star)
    const capGroup = new THREE.Group();
    const capGeo = new THREE.ConeGeometry(0.42, 0.95, 24);
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

    capGroup.position.set(0, 0.76, 0);
    capGroup.visible = false;
    this.nightcap = capGroup;
    this.kiroGroup.add(this.nightcap);

    this.registerDisposable(capGeo);
    this.registerDisposable(capMat);
    this.registerDisposable(pomGeo);
    this.registerDisposable(pomMat);

    // 9. Living Starlight Vitality Aura (Atmospheric Wellbeing & Warm Sanctuary Glow)
    const auraGeo = new THREE.SphereGeometry(1.32, 32, 32);
    this.auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xF9E2AF,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.goldenAura = new THREE.Mesh(auraGeo, this.auraMaterial);
    this.goldenAura.visible = true;
    this.kiroGroup.add(this.goldenAura);

    this.registerDisposable(auraGeo);
    this.registerDisposable(this.auraMaterial);
  }

  buildCockpitHUD() {
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.visible = false;
    this.scene.add(this.cockpitGroup);

    // Pilot Reticle (Centered in screen at Z = -3.0)
    const crossGeo = new THREE.RingGeometry(0.45, 0.48, 32);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0, transparent: true, opacity: 0.9 });
    this.crosshairMesh = new THREE.Mesh(crossGeo, crossMat);
    this.crosshairMesh.position.set(0, 0.15, -3.0);
    this.cockpitGroup.add(this.crosshairMesh);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Phase 3 & 4: Interactions, Parallax & State Synchronization
     ───────────────────────────────────────────────────────────────────────── */
  bindEvents() {
    const onPointerMove = (clientX, clientY) => {
      this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      this.pointerInCanvas = true;

      // Stardust Sparkles at Z = 0
      const mouseProj = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
      const mouseDir = mouseProj.sub(this.camera.position).normalize();
      const dist = (0 - this.camera.position.z) / mouseDir.z;
      const worldPos = this.camera.position.clone().add(mouseDir.multiplyScalar(dist));
      this.spawnStardustParticle(worldPos.x, worldPos.y, worldPos.z);
    };

    window.addEventListener('pointermove', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('pointerdown', (e) => onPointerMove(e.clientX, e.clientY));
    window.addEventListener('pointerenter', () => { this.pointerInCanvas = true; });
    window.addEventListener('pointerleave', () => { this.pointerInCanvas = false; });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener('touchend', () => { this.pointerInCanvas = false; }, { passive: true });

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

  triggerPetReaction() {
    if (!this.kiroGroup) return;
    this.isPetting = true;

    // Synthesize cozy procedural purr & sweet pentatonic pet chime
    synthEngine.playPurrSound(1.2);
    synthEngine.playPetChime(660);

    // Warm blushing cheek glow reaction
    if (window.gsap && this.leftBlush && this.rightBlush) {
      gsap.to([this.leftBlush.scale, this.rightBlush.scale], {
        x: 1.3,
        y: 1.1,
        z: 0.4,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
    }

    if (window.gsap) {
      const tl = gsap.timeline({
        onComplete: () => {
          this.isPetting = false;
        }
      });
      tl.to(this.kiroGroup.position, { y: 0.5, duration: 0.22, ease: 'power1.out' })
        .to(this.kiroGroup.rotation, { y: this.kiroGroup.rotation.y + Math.PI * 2, duration: 0.55, ease: 'sine.inOut' }, 0)
        .to(this.kiroGroup.position, { y: 0, duration: 0.22, ease: 'power1.in' })
        .to(this.kiroGroup.scale, { y: 0.85, x: 1.15, duration: 0.12, ease: 'power2.out' })
        .to(this.kiroGroup.scale, { y: 1, x: 1, duration: 0.25, ease: 'elastic.out(1, 0.3)' });
    } else {
      this.isPetting = false;
    }

    this.spawnHeartParticles();
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

    if (window.gsap && this.leftArm && this.rightArm) {
      gsap.to(this.leftArm.rotation, { z: -Math.PI / 3, yoyo: true, repeat: 3, duration: 0.12 });
      gsap.to(this.rightArm.rotation, { z: Math.PI / 3, yoyo: true, repeat: 3, duration: 0.12 });
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

    if (window.gsap && this.kiroGroup) {
      const scale = this.kiroGroup.scale.x;
      const tl = gsap.timeline();
      tl.to(this.kiroGroup.scale, { y: scale * 0.78, x: scale * 1.15, duration: 0.12 })
        .to(this.kiroGroup.scale, { y: scale * 1.12, x: scale * 0.9, duration: 0.12 })
        .to(this.kiroGroup.scale, { x: scale, y: scale, z: scale, duration: 0.2, ease: 'elastic.out(1, 0.3)' });
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

    // FIX: getDelta() first (resets internal oldTime), then accumulate elapsed
    // manually. Calling getElapsedTime() before getDelta() caused the clock's
    // internal state to desync, making nebula u_time jump erratically.
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
      const targetGroupX = (steering.yaw || 0) * 0.08;
      const targetGroupY = (steering.pitch || 0) * 0.08;
      this.backgroundCelestialGroup.position.x += (targetGroupX - this.backgroundCelestialGroup.position.x) * 0.08;
      this.backgroundCelestialGroup.position.y += (targetGroupY - this.backgroundCelestialGroup.position.y) * 0.08;

      const lookX = (steering.yaw || 0) * 0.02;
      const lookY = this.baseCameraY + (steering.pitch || 0) * 0.02;
      this.camera.lookAt(lookX, lookY, 0);
    } else {
      this.backgroundCelestialGroup.position.x += (0 - this.backgroundCelestialGroup.position.x) * 0.05;
      this.backgroundCelestialGroup.position.y += (0 - this.backgroundCelestialGroup.position.y) * 0.05;
      this.camera.lookAt(0, 0, 0);

      // Kiro Breathing Idle (only when idle, not during active pet or telescope transitions)
      const isSleeping = KiroState.get('isSleeping');
      const freq = isSleeping ? 0.6 : 2.0;
      const amp = isSleeping ? 0.02 : 0.05;
      if (this.kiroGroup && !this.isPetting && !this.isTelescopeTransitioning) {
        this.kiroGroup.position.y = Math.sin(t * freq) * amp;

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
        } else {
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
