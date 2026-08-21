/**
 * scene.js (Space Capsule V5.2 — Volumetric Procedural Cosmic Nebula & Logarithmic Galaxy Engine)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Living Volumetric Cosmic Nebula Shader (Procedural 2D Simplex Noise Shader Plane at Z = -14.0)
 *    - Left Wing: Patrick's Mint Teal (#4EC9B0)
 *    - Right Wing: Yangiee's Pastel Pink (#FFB6C1 / #F5C2E7)
 *    - Core Spine: Deep Space Velvet Midnight Navy (#11111B) & Lavender (#CBA6F7)
 * 2. Double-Arm Logarithmic Spiral Galaxy (800 dynamic stardust particles with pointer repulsion)
 * 3. 3D Unproject-to-Plane Vector Repulsion Math at Galaxy Depth (Z = -10.0)
 * 4. Kiro 3D Model with Tactile Petting Physics, Treat Feeding, Water Splashes & Audio Synesthesia
 * 5. Single requestAnimationFrame loop with sub-50 draw call budget & leak-proof GPU/CPU memory disposal.
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';

export class KiroSceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    if (typeof THREE === 'undefined') {
      console.error('[KiroScene] THREE.js not loaded — WebGL init aborted. Check js/three.min.js.');
      return;
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.kiroGroup = null;
    this.pedestal = null;
    this.neonRing = null;
    this.goldenAura = null;
    this.nightcap = null;
    this.leftEye = null;
    this.rightEye = null;
    this.leftHl = null;
    this.rightHl = null;
    this.leftSleepEye = null;
    this.rightSleepEye = null;
    this.leftArm = null;
    this.rightArm = null;

    // 1. Volumetric Procedural Nebula Shader
    this.nebulaMesh = null;
    this.nebulaMaterial = null;

    // 2. Dynamic Logarithmic Spiral Galaxy
    this.galaxyPoints = null;
    this.galaxyCount = 800;
    this.galaxyOriginalPositions = [];
    this.galaxyPhases = [];

    // 3. Stardust Touch Trails
    this.touchParticles = [];
    this.maxTouchParticles = 120;

    // 4. Physics & Treat Drops
    this.activeCandies = [];
    this.waterDroplets = [];

    // 5. Cockpit HUD & Telescope Space Systems
    this.cockpitGroup = null;
    this.crosshairMesh = null;
    this.targetSystemMeshes = [];
    this.spaceSystems = [
      { id: 'butterfly', name: 'Butterfly Galaxy (NGC 6302)', x: 12, y: -8, z: -15, size: 0.45, color: 0xF5C2E7, unlockedGame: 'Nebula Dodge' },
      { id: 'helix', name: 'Eye of Helix Nebula (NGC 7293)', x: -14, y: 15, z: -18, size: 0.55, color: 0x94E2D5, unlockedGame: 'Celestial Bounce' },
      { id: 'sombrero', name: 'Sombrero Vortex (M104)', x: 22, y: 14, z: -25, size: 0.6, color: 0xF9E2AF, unlockedGame: 'Cosmic Chimes' },
      { id: 'crab', name: 'Crab Pulsar Core (M1)', x: -18, y: -16, z: -20, size: 0.5, color: 0xCBA6F7, unlockedGame: 'Supernova Blast' }
    ];

    // 6. Cinematic Warp State
    this.warpActive = false;
    this.warpSpeed = 0.02;
    this.warpTargetSpeed = 0.02;
    this.warpStarSize = 0.20;
    this.warpTargetStarSize = 0.20;
    this.warpZStretch = 1.0;
    this.warpTargetZStretch = 1.0;

    // Pointer Coordinates & Repulsion
    this.mouse = new THREE.Vector2(0, 0);
    this.pointerInCanvas = false;
    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    this.gyro = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isDisposed = false;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    const width = window.innerWidth || this.container.clientWidth || 360;
    const height = window.innerHeight || this.container.clientHeight || 640;

    // Pinhole Camera with 45 deg FOV optimized for mobile sanctuary stage
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    this.camera.position.set(0, 0.2, 5.2);

    // Direct Canvas Binding (or fallback element creation)
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
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    if (!existingCanvas) {
      this.renderer.domElement.id = 'webgl-canvas';
      this.renderer.domElement.style.position = 'absolute';
      this.renderer.domElement.style.inset = '0';
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.container.appendChild(this.renderer.domElement);
    }

    // High-Contrast Celestial Lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF, 1.2);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.4);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const bottomPoint = new THREE.PointLight(0x4EC9B0, 2.5, 16);
    bottomPoint.position.set(0, -1.2, 0.8);
    this.scene.add(bottomPoint);

    const backLight = new THREE.PointLight(0xF5B7C0, 1.8, 14);
    backLight.position.set(0, 2.5, -2.5);
    this.scene.add(backLight);

    // Build Scene Geometry Components
    this.buildVolumetricNebula();
    this.buildDynamicSpiralGalaxy();
    this.buildEnvironment();
    this.buildKiro();
    this.buildCockpitHUD();

    // State & Event Bindings
    this.bindEvents();
    this.subscribeState();

    // Multi-stage Resize Calibration
    this.resize();
    requestAnimationFrame(() => this.resize());
    setTimeout(() => this.resize(), 100);
    setTimeout(() => this.resize(), 500);

    // Start Unified Single Render Loop
    this.animate();
  }

  /* 1. Volumetric Procedural Cosmic Nebula Shader Plane */
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
        float t = u_time * 0.06;

        float n1 = snoise(uv * 1.4 + vec2(t * 0.4, t * 0.2));
        float n2 = snoise(uv * 2.8 - vec2(t * 0.2, t * 0.5));
        float cloud = (n1 * 0.6 + n2 * 0.4) * 0.5 + 0.5;

        // Signature Celestial Palette
        vec3 deepSpace = vec3(0.067, 0.067, 0.106); // #11111B Midnight Navy
        vec3 lavender  = vec3(0.55, 0.40, 0.85);    // #CBA6F7 Lavender
        vec3 mint      = vec3(0.31, 0.79, 0.69);    // #4EC9B0 Mint Teal (Patrick)
        vec3 pink      = vec3(1.0, 0.71, 0.76);     // #FFB6C1 Pastel Pink (Yangiee)
        vec3 gold      = vec3(0.98, 0.89, 0.69);    // #F9E2AF Golden Glow

        vec3 col = mix(deepSpace, lavender, smoothstep(0.28, 0.72, cloud) * 0.75);

        // Chromatic Separation (Mint on left, Pink on right)
        if (uv.x < 0.0) {
          col = mix(col, mint, smoothstep(0.32, 0.85, cloud) * abs(uv.x) * 0.85);
        } else {
          col = mix(col, pink, smoothstep(0.32, 0.85, cloud) * uv.x * 0.85);
        }

        // Center Golden Aura Pulse
        float centerDist = length(uv);
        col = mix(col, gold, smoothstep(0.6, 0.0, centerDist) * 0.15 * (1.0 + u_audio * 0.5));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const nebulaGeo = new THREE.PlaneGeometry(48, 32);
    this.nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_audio: { value: 0.0 }
      },
      depthWrite: false
    });

    this.nebulaMesh = new THREE.Mesh(nebulaGeo, this.nebulaMaterial);
    this.nebulaMesh.position.set(0, 0, -14.0);
    this.scene.add(this.nebulaMesh);
  }

  /* 2. Double-Arm Logarithmic Spiral Galaxy */
  buildDynamicSpiralGalaxy() {
    const galaxyGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.galaxyCount * 3);
    const colors = new Float32Array(this.galaxyCount * 3);

    this.galaxyOriginalPositions = [];
    this.galaxyPhases = [];

    const colorTeal = new THREE.Color(0x4EC9B0);   // Mint-Teal
    const colorPink = new THREE.Color(0xFFB6C1);   // Pastel-Pink
    const colorAmber = new THREE.Color(0xF9E2AF);  // Warm Gold
    const colorLavender = new THREE.Color(0xCBA6F7); // Lavender

    for (let i = 0; i < this.galaxyCount; i++) {
      const arm = i % 2; // Split particles across exactly 2 spiral arms

      // Logarithmic density distribution math: clusters particles tightly at core
      const r = 0.5 + Math.pow(Math.random(), 1.8) * 8.5;
      const angle = (r * 0.45) + (arm * Math.PI) + (Math.random() - 0.5) * 0.4;

      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * 1.2;
      const z = Math.sin(angle) * r - 10.0; // Place behind Kiro and interactive HUD

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this.galaxyOriginalPositions.push(new THREE.Vector3(x, y, z));
      this.galaxyPhases.push(Math.random() * Math.PI * 2);

      // Dynamic color interpolation across arms
      let starColor;
      if (arm === 0) {
        starColor = colorTeal.clone().lerp(colorAmber, Math.random() * 0.5);
      } else {
        starColor = colorPink.clone().lerp(colorLavender, Math.random() * 0.5);
      }

      colors[i * 3]     = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: this.warpStarSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    this.scene.add(this.galaxyPoints);
  }

  buildEnvironment() {
    const pedestalGeo = new THREE.CylinderGeometry(1.9, 2.0, 0.45, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x131F30,
      roughness: 0.55,
      metalness: 0.25
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -1.35;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    const ringGeo = new THREE.TorusGeometry(1.95, 0.05, 10, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4EC9B0,
      transparent: true,
      opacity: 0.9
    });
    this.neonRing = new THREE.Mesh(ringGeo, ringMat);
    this.neonRing.rotation.x = Math.PI / 2;
    this.neonRing.position.y = -1.12;
    this.scene.add(this.neonRing);
  }

  buildKiro() {
    this.kiroGroup = new THREE.Group();
    this.kiroGroup.position.set(0, 0, 0);
    this.scene.add(this.kiroGroup);

    const mintMat = new THREE.MeshStandardMaterial({
      color: 0x4EC9B0,
      roughness: 0.85,
      metalness: 0.05
    });

    // 1. Body
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    const bodyMesh = new THREE.Mesh(bodyGeo, mintMat);
    bodyMesh.scale.set(1.1, 0.95, 1.1);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.kiroGroup.add(bodyMesh);

    // 2. Belly Patch (#F0EDE8)
    const bellyGeo = new THREE.SphereGeometry(0.72, 32, 32);
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0xF0EDE8,
      roughness: 0.9,
      metalness: 0.0
    });
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.scale.set(1.0, 0.85, 0.5);
    bellyMesh.position.set(0, -0.15, 0.72);
    this.kiroGroup.add(bellyMesh);

    // 3. Eyes & Awake/Sleep Variations
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1A3A3A, roughness: 0.1, metalness: 0.9 });
    const hlGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.35, 0.18, 0.85);
    this.leftHl = new THREE.Mesh(hlGeo, hlMat);
    this.leftHl.position.set(-0.31, 0.22, 0.95);
    this.kiroGroup.add(this.leftEye);
    this.kiroGroup.add(this.leftHl);

    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.35, 0.18, 0.85);
    this.rightHl = new THREE.Mesh(hlGeo, hlMat);
    this.rightHl.position.set(0.39, 0.22, 0.95);
    this.kiroGroup.add(this.rightEye);
    this.kiroGroup.add(this.rightHl);

    const sleepEyeGeo = new THREE.TorusGeometry(0.1, 0.022, 8, 16, Math.PI);
    const sleepEyeMat = new THREE.MeshBasicMaterial({ color: 0x1A3A3A });

    this.leftSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.leftSleepEye.rotation.set(0, 0, Math.PI);
    this.leftSleepEye.position.set(-0.35, 0.18, 0.86);
    this.leftSleepEye.visible = false;
    this.kiroGroup.add(this.leftSleepEye);

    this.rightSleepEye = new THREE.Mesh(sleepEyeGeo, sleepEyeMat);
    this.rightSleepEye.rotation.set(0, 0, Math.PI);
    this.rightSleepEye.position.set(0.35, 0.18, 0.86);
    this.rightSleepEye.visible = false;
    this.kiroGroup.add(this.rightSleepEye);

    // 4. Arms
    const armGeo = new THREE.SphereGeometry(0.24, 16, 16);
    this.leftArm = new THREE.Mesh(armGeo, mintMat);
    this.leftArm.scale.set(0.8, 1.2, 0.8);
    this.leftArm.position.set(-0.95, -0.15, 0.3);
    this.kiroGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mintMat);
    this.rightArm.scale.set(0.8, 1.2, 0.8);
    this.rightArm.position.set(0.95, -0.15, 0.3);
    this.kiroGroup.add(this.rightArm);

    // 5. Sleep Nightcap (Pastel Lavender with Golden Star)
    const capGroup = new THREE.Group();
    const capGeo = new THREE.ConeGeometry(0.48, 1.1, 24);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xCBA6F7, roughness: 0.8 });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.rotation.z = -Math.PI / 4.5;
    capMesh.position.set(0.25, 0.45, 0);
    capGroup.add(capMesh);

    const pomGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const pomMat = new THREE.MeshStandardMaterial({ color: 0xF9E2AF, roughness: 0.3 });
    const pomMesh = new THREE.Mesh(pomGeo, pomMat);
    pomMesh.position.set(0.72, 0.78, 0);
    capGroup.add(pomMesh);

    capGroup.position.set(0, 0.85, 0);
    capGroup.visible = false;
    this.nightcap = capGroup;
    this.kiroGroup.add(this.nightcap);

    // 6. Well-Rested Golden Aura
    const auraGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0xF9E2AF,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    this.goldenAura = new THREE.Mesh(auraGeo, auraMat);
    this.goldenAura.visible = false;
    this.kiroGroup.add(this.goldenAura);
  }

  buildCockpitHUD() {
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.visible = false;
    this.scene.add(this.cockpitGroup);

    // Pilot Reticle
    const crossGeo = new THREE.RingGeometry(0.55, 0.58, 32);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0, transparent: true, opacity: 0.85 });
    this.crosshairMesh = new THREE.Mesh(crossGeo, crossMat);
    this.crosshairMesh.position.set(0, 1.6, -4);
    this.cockpitGroup.add(this.crosshairMesh);

    // Celestial Minigame Space Systems
    this.spaceSystems.forEach(sys => {
      const geo = new THREE.IcosahedronGeometry(sys.size, 2);
      const mat = new THREE.MeshStandardMaterial({
        color: sys.color,
        emissive: sys.color,
        emissiveIntensity: 0.45,
        wireframe: true
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(sys.x, sys.y, sys.z);
      mesh.userData = { id: sys.id, name: sys.name, basePos: mesh.position.clone() };

      const glowGeo = new THREE.SphereGeometry(sys.size * 1.3, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: sys.color,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending
      });
      mesh.add(new THREE.Mesh(glowGeo, glowMat));

      this.cockpitGroup.add(mesh);
      this.targetSystemMeshes.push(mesh);
    });
  }

  bindEvents() {
    const onPointerMove = (clientX, clientY) => {
      this.mouse.x = (clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(clientY / window.innerHeight) * 2 + 1;
      this.pointerInCanvas = true;

      // Unproject pointer to 3D world space at depth Z = 0 for stardust sparkles
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

    // Interactive Kiro Petting Touch Raycast
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

    window.addEventListener('deviceorientation', (e) => {
      if (KiroState.get('gyroEnabled')) {
        this.gyro.targetX = (e.gamma || 0) * 0.015;
        this.gyro.targetY = (e.beta || 0) * 0.015;
      }
    });

    this.boundResize = () => this.resize();
    window.addEventListener('resize', this.boundResize);
    window.addEventListener('orientationchange', this.boundResize);
  }

  subscribeState() {
    KiroState.on('wellbeing:change', (wellbeing) => this.updateWellbeing(wellbeing));
    KiroState.on('vital:feed', ({ type }) => this.dropCandy(type));
    KiroState.on('vital:water', () => this.splashWater());
    KiroState.on('sleep:change', ({ isSleeping, hasWellRestedBuff }) => this.onSleepChange(isSleeping, hasWellRestedBuff));

    KiroState.on('change:telescopeActive', ({ newValue }) => {
      const isActive = Boolean(newValue);
      if (this.cockpitGroup) this.cockpitGroup.visible = isActive;

      if (isActive) {
        this.triggerWarpAcceleration();
      } else {
        this.exitWarpAcceleration();
      }

      if (window.gsap && this.kiroGroup && this.pedestal && this.neonRing) {
        gsap.to(this.kiroGroup.position, {
          y: isActive ? -4 : 0,
          duration: 1.2,
          ease: "power2.inOut"
        });
        gsap.to(this.pedestal.position, {
          y: isActive ? -5 : -1.35,
          duration: 1.2,
          ease: "power2.inOut"
        });
        gsap.to(this.neonRing.position, {
          y: isActive ? -5 : -1.12,
          duration: 1.2,
          ease: "power2.inOut"
        });
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
    if (this.leftSleepEye) this.leftSleepEye.visible = isSleeping;
    if (this.rightSleepEye) this.rightSleepEye.visible = isSleeping;
  }

  updateWellbeing(wellbeing) {
    const scaleFactor = 0.4 + 0.7 * Math.pow(wellbeing / 100, 2);
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
    if (!window.gsap || !this.kiroGroup) return;

    const tl = gsap.timeline();
    tl.to(this.kiroGroup.position, { y: 0.7, duration: 0.3, ease: 'power1.out' })
      .to(this.kiroGroup.rotation, { y: this.kiroGroup.rotation.y + Math.PI * 2, duration: 0.6, ease: 'sine.inOut' }, 0)
      .to(this.kiroGroup.position, { y: 0, duration: 0.3, ease: 'power1.in' })
      .to(this.kiroGroup.scale, { y: 0.85, x: 1.15, duration: 0.1, ease: 'power2.out' })
      .to(this.kiroGroup.scale, { y: 1, x: 1, duration: 0.2, ease: 'elastic.out(1, 0.3)' });

    this.spawnHeartParticles();
  }

  spawnHeartParticles() {
    if (!window.gsap) return;
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.9 }));
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

    const geo = new THREE.DodecahedronGeometry(0.04 + Math.random() * 0.04);
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
      candyGeo = new THREE.DodecahedronGeometry(0.22);
      candyMat = new THREE.MeshStandardMaterial({
        color: 0xF9E2AF,
        emissive: 0xF9E2AF,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.1
      });
    } else {
      candyGeo = new THREE.TorusGeometry(0.18, 0.09, 16, 32);
      candyMat = new THREE.MeshStandardMaterial({
        color: 0xF5C2E7,
        roughness: 0.3,
        metalness: 0.05
      });
    }

    const candyMesh = new THREE.Mesh(candyGeo, candyMat);
    candyMesh.position.set((Math.random() - 0.5) * 0.6, 2.5, 0.85);
    candyMesh.castShadow = true;
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
        new THREE.MeshStandardMaterial({ color: 0x4EC9B0, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.1 })
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

      drop.material.opacity = drop.userData.life * 0.8;

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
    this.warpActive = true;
    this.warpTargetSpeed = 0.08;
    this.warpTargetStarSize = 0.55;
    this.warpTargetZStretch = 4.0;

    if (window.gsap && this.galaxyPoints) {
      gsap.to(this, {
        warpSpeed: this.warpTargetSpeed,
        warpStarSize: this.warpTargetStarSize,
        warpZStretch: this.warpTargetZStretch,
        duration: 1.8,
        ease: 'power2.in'
      });
    } else {
      this.warpSpeed = this.warpTargetSpeed;
      this.warpStarSize = this.warpTargetStarSize;
      this.warpZStretch = this.warpTargetZStretch;
    }
  }

  exitWarpAcceleration() {
    this.warpActive = false;
    this.warpTargetSpeed = 0.02;
    this.warpStarSize = 0.20;
    this.warpTargetZStretch = 1.0;

    if (window.gsap) {
      gsap.to(this, {
        warpSpeed: this.warpTargetSpeed,
        warpStarSize: this.warpTargetStarSize,
        warpZStretch: this.warpTargetZStretch,
        duration: 1.2,
        ease: 'power2.out'
      });
    } else {
      this.warpSpeed = this.warpTargetSpeed;
      this.warpStarSize = this.warpTargetStarSize;
      this.warpZStretch = this.warpTargetZStretch;
    }
  }

  triggerBootWarp() {
    this.triggerWarpAcceleration();
    setTimeout(() => this.exitWarpAcceleration(), 2200);
  }

  animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();
    const isSleeping = KiroState.get('isSleeping');
    const audioLevel = synthEngine.getAudioReactiveLevel();

    // 1. Gyro Parallax Smooth Interpolation
    this.gyro.x += (this.gyro.targetX - this.gyro.x) * 0.08;
    this.gyro.y += (this.gyro.targetY - this.gyro.y) * 0.08;
    this.camera.position.x = this.gyro.x;
    this.camera.position.y = 0.2 + this.gyro.y;

    // 2. Update Volumetric Nebula Shader Uniforms
    if (this.nebulaMaterial) {
      this.nebulaMaterial.uniforms.u_time.value = t;
      this.nebulaMaterial.uniforms.u_audio.value = audioLevel;
    }

    // 3. Idle Bobbing & Telescope Steering
    const isTelescope = KiroState.get('telescopeActive');
    const steering = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };

    if (isTelescope) {
      const lookX = (steering.yaw || 0) * 0.02;
      const lookY = 1.6 + (steering.pitch || 0) * 0.02;
      this.camera.lookAt(lookX, lookY, 0);

      if (this.galaxyPoints) {
        this.galaxyPoints.position.x = (steering.yaw || 0) * 0.06;
        this.galaxyPoints.position.y = (steering.pitch || 0) * 0.06;
      }

      this.targetSystemMeshes.forEach(mesh => {
        const base = mesh.userData.basePos;
        let targetX = base.x + ((steering.yaw || 0) * 0.15);
        let targetY = base.y + ((steering.pitch || 0) * 0.15);

        mesh.position.x = targetX;
        mesh.position.y = targetY;
        mesh.rotation.y += 0.01;
        mesh.rotation.x += 0.005;

        // Check lock-on alignment with pilot's HUD reticle (at x=0, y=1.6)
        const distToHUD = Math.sqrt(Math.pow(mesh.position.x, 2) + Math.pow(mesh.position.y - 1.6, 2));
        if (distToHUD < 0.75) {
          if (KiroState.get('cockpitSteering.currentTarget') !== mesh.userData.id) {
            KiroState.set('cockpitSteering.currentTarget', mesh.userData.id);
            KiroState.set('cockpitSteering.aligned', true);
            synthEngine.playChimeSound(660);
          }
        }
      });
    } else {
      this.camera.lookAt(0, 0, 0);

      const freq = isSleeping ? 0.6 : 2.0;
      const amp = isSleeping ? 0.02 : 0.06;
      if (this.kiroGroup && (!window.gsap || !gsap.isAnimating(this.kiroGroup.position))) {
        this.kiroGroup.position.y = Math.sin(t * freq) * amp;
      }
    }

    // 4. Double-Arm Logarithmic Spiral Galaxy Twinkle & Tactile Repulsion
    if (this.galaxyPoints) {
      const positions = this.galaxyPoints.geometry.attributes.position.array;
      const count = this.galaxyCount;

      if (this.galaxyPoints.material.size !== this.warpStarSize) {
        this.galaxyPoints.material.size = this.warpStarSize;
      }

      // Project pointer NDC coordinates to the plane at depth Z = -10.0
      const mouseProj = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
      const mouseDir = mouseProj.sub(this.camera.position).normalize();
      const mouseDist = (-10.0 - this.camera.position.z) / mouseDir.z;
      const mousePlanePos = this.camera.position.clone().add(mouseDir.multiplyScalar(mouseDist));

      const rotAngle = isSleeping ? t * 0.005 : t * this.warpSpeed;

      for (let i = 0; i < count; i++) {
        const orig = this.galaxyOriginalPositions[i];

        // 3D Orbital Spiral Rotation
        const rotatedX = orig.x * Math.cos(rotAngle) - orig.z * Math.sin(rotAngle);
        const rotatedZ = (orig.x * Math.sin(rotAngle) + orig.z * Math.cos(rotAngle)) * this.warpZStretch;

        this.galaxyPhases[i] += 0.005;

        if (this.pointerInCanvas) {
          const dx = positions[i * 3] - mousePlanePos.x;
          const dy = positions[i * 3 + 1] - mousePlanePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Repulse stars if pointer lies within 2.5 units
          if (distance < 2.5) {
            const force = (2.5 - distance) * 0.28;
            positions[i * 3]     += (dx / distance) * force;
            positions[i * 3 + 1] += (dy / distance) * force;
          } else {
            // Smooth ease back to logarithmic orbital path
            positions[i * 3]     += (rotatedX - positions[i * 3]) * 0.05;
            positions[i * 3 + 1] += (orig.y - positions[i * 3 + 1]) * 0.05;
          }
        } else {
          // Seamless drift along orbital coordinates
          positions[i * 3]     += (rotatedX - positions[i * 3]) * 0.03;
          positions[i * 3 + 1] += (orig.y - positions[i * 3 + 1]) * 0.03;
        }

        const twinkle = Math.sin(t * 2.0 + this.galaxyPhases[i]) * 0.2;
        positions[i * 3 + 2] = rotatedZ + twinkle;
      }

      this.galaxyPoints.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Audio-Visual Synesthesia (Neon Ring & Golden Aura)
    if (this.neonRing) {
      this.neonRing.rotation.z += 0.008;
      const ringScale = 1.0 + audioLevel * 0.35;
      this.neonRing.scale.set(ringScale, ringScale, 1.0);
      this.neonRing.material.opacity = 0.7 + audioLevel * 0.3;
    }

    if (this.goldenAura && this.goldenAura.visible) {
      const auraScale = 1.35 + audioLevel * 0.25;
      this.goldenAura.scale.set(auraScale, auraScale, auraScale);
      this.goldenAura.material.opacity = 0.1 + audioLevel * 0.2;
    }

    // 6. Update Particle Systems & Physics
    this.updateTouchParticles();
    this.updatePhysics();
    this.updateWaterPhysics();

    // 7. Single WebGL Render Call
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.camera || !this.renderer) return;
    const width = window.innerWidth || document.documentElement.clientWidth || (this.container ? this.container.clientWidth : 360);
    const height = window.innerHeight || document.documentElement.clientHeight || (this.container ? this.container.clientHeight : 640);
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    if (this.boundResize) {
      window.removeEventListener('resize', this.boundResize);
      window.removeEventListener('orientationchange', this.boundResize);
    }

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
