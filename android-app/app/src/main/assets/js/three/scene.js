/**
 * scene.js
 * Unified 3D Celestial Environment, Kiro Procedural Model, Dynamic Spiral Galaxy & Physics (ES6 Module)
 * 
 * Features:
 * 1. 800-Star Double-Arm Logarithmic Spiral Galaxy with Pointer Repulsion & Twinkle
 * 2. Stardust Touch Trail Particle Emitter (3D Projection with Upward Drift)
 * 3. Physical 3D Treat Drops (Star & Donut) with Gravity, Snout Collision & Chewing Reaction
 * 4. 3D Water Droplet Splash Explosion & Flipper Delight Animation
 * 5. Audio-Visual Synesthesia (Neon Ring & Golden Aura Amplitude Pulsing)
 * 6. Sleep Mode Transformation (Eyelids, Lavender Nightcap & Tranquil Constellation Mode)
 */

import { KiroState } from '../state.js';
import { synthEngine } from '../audio/synth.js';

export class KiroSceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

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

    // 1. Dynamic Spiral Galaxy
    this.galaxyStars = null;
    this.galaxyStarCount = 800;
    this.galaxyData = [];

    // 2. Stardust Touch Trails
    this.touchParticles = [];
    this.touchParticlePool = [];
    this.maxTouchParticles = 120;

    // 3. Physics & Treat Drops
    this.activeCandies = [];
    this.waterDroplets = [];

    // 4. Cockpit HUD & Telescope Space Systems
    this.cockpitGroup = null;
    this.crosshairMesh = null;
    this.targetSystemMeshes = [];
    this.spaceSystems = [
      { id: 'butterfly', name: 'Butterfly Galaxy (NGC 6302)', x: 12, y: -8, z: -15, size: 0.45, color: 0xF5C2E7, unlockedGame: 'Nebula Dodge' },
      { id: 'helix', name: 'Eye of Helix Nebula (NGC 7293)', x: -14, y: 15, z: -18, size: 0.55, color: 0x94E2D5, unlockedGame: 'Celestial Bounce' },
      { id: 'sombrero', name: 'Sombrero Vortex (M104)', x: 22, y: 14, z: -25, size: 0.6, color: 0xF9E2AF, unlockedGame: 'Cosmic Chime Sequence' },
      { id: 'crab', name: 'Crab Pulsar Core (M1)', x: -18, y: -16, z: -20, size: 0.5, color: 0xCBA6F7, unlockedGame: 'Supernova Blast' }
    ];

    // Raycasting & Gyro Parallax
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.touchPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.touchIntersectPoint = new THREE.Vector3();
    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    this.gyro = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.isDisposed = false;

    this.init();
  }

  init() {
    // 1. Scene & Camera Setup
    this.scene = new THREE.Scene();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    this.camera.position.set(0, 1.6, 8.0);

    // 2. WebGL Renderer with GPU Clamping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 3. Lighting
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.85);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const bottomPoint = new THREE.PointLight(0x4EC9B0, 1.4, 12);
    bottomPoint.position.set(0, -1.5, 0.5);
    this.scene.add(bottomPoint);

    // 4. Build Components
    this.buildDynamicSpiralGalaxy();
    this.buildEnvironment();
    this.buildKiro();
    this.buildCockpitHUD();

    // 5. State & Events
    this.bindEvents();
    this.subscribeState();

    // 6. Animation Loop
    this.animate();
  }

  /* 1. Double-Arm Logarithmic Spiral Galaxy with Pointer Repulsion */
  buildDynamicSpiralGalaxy() {
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.galaxyStarCount * 3);
    const colors = new Float32Array(this.galaxyStarCount * 3);

    const mintColor = new THREE.Color(0x4EC9B0); // Patrick
    const pinkColor = new THREE.Color(0xFFB6C1); // Yangiee
    const goldColor = new THREE.Color(0xF9E2AF);
    const lavenderColor = new THREE.Color(0xCBA6F7);

    for (let i = 0; i < this.galaxyStarCount; i++) {
      // 2 Arms Spiral Formula
      const armIndex = i % 2;
      const angleOffset = armIndex * Math.PI;
      const dist = Math.pow(Math.random(), 1.6) * 16.0 + 1.2;
      const spiralAngle = dist * 0.45 + angleOffset + (Math.random() - 0.5) * 0.45;

      const baseX = Math.cos(spiralAngle) * dist;
      const baseY = Math.sin(spiralAngle) * dist * 0.65;
      const baseZ = -3.5 - Math.random() * 8.0;

      this.galaxyData.push({
        baseX, baseY, baseZ,
        x: baseX, y: baseY, z: baseZ,
        vx: 0, vy: 0,
        spiralAngle,
        dist,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.5 + Math.random() * 3.0,
        repelRadius: 2.2
      });

      positions[i * 3] = baseX;
      positions[i * 3 + 1] = baseY;
      positions[i * 3 + 2] = baseZ;

      // Color Gradient from Mint-Teal (Left) to Pastel Pink (Right)
      const t = (baseX + 12) / 24;
      let c = new THREE.Color().lerpColors(mintColor, pinkColor, Math.max(0, Math.min(1, t)));
      if (Math.random() < 0.15) c = goldColor;
      else if (Math.random() < 0.15) c = lavenderColor;

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.galaxyStars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.galaxyStars);
  }

  buildEnvironment() {
    // Pedestal Base
    const pedestalGeo = new THREE.CylinderGeometry(1.9, 2.0, 0.45, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x131F30,
      roughness: 0.55,
      metalness: 0.25
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -1.6;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    // Audio-Reactive Neon Ring (#4EC9B0)
    const ringGeo = new THREE.TorusGeometry(1.95, 0.05, 10, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4EC9B0,
      transparent: true,
      opacity: 0.9
    });
    this.neonRing = new THREE.Mesh(ringGeo, ringMat);
    this.neonRing.rotation.x = Math.PI / 2;
    this.neonRing.position.y = -1.38;
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

    // Left Eye
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.35, 0.18, 0.85);
    this.leftHl = new THREE.Mesh(hlGeo, hlMat);
    this.leftHl.position.set(-0.31, 0.22, 0.95);
    this.kiroGroup.add(this.leftEye);
    this.kiroGroup.add(this.leftHl);

    // Right Eye
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.35, 0.18, 0.85);
    this.rightHl = new THREE.Mesh(hlGeo, hlMat);
    this.rightHl.position.set(0.39, 0.22, 0.95);
    this.kiroGroup.add(this.rightEye);
    this.kiroGroup.add(this.rightHl);

    // Sleeping Eye Curves (Torus semi-arcs)
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

    // 4. Snout / Nose (#F5B7C0)
    const noseGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xF5B7C0, roughness: 0.8 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.scale.set(1.2, 1.0, 0.8);
    noseMesh.position.set(0, 0.06, 0.95);
    this.kiroGroup.add(noseMesh);

    // 5. Blush Cheeks
    const cheekGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.6 });

    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.rotation.set(Math.PI / 2.3, -Math.PI / 6, 0);
    leftCheek.position.set(-0.55, 0.02, 0.82);
    this.kiroGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.rotation.set(Math.PI / 2.3, Math.PI / 6, 0);
    rightCheek.position.set(0.55, 0.02, 0.82);
    this.kiroGroup.add(rightCheek);

    // 6. Flipper Arms
    const armGeo = new THREE.SphereGeometry(0.24, 16, 16);
    this.leftArm = new THREE.Mesh(armGeo, mintMat);
    this.leftArm.scale.set(1.5, 0.8, 0.8);
    this.leftArm.position.set(-0.9, -0.3, 0.2);
    this.leftArm.rotation.set(0, -Math.PI / 4, -Math.PI / 6);
    this.kiroGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mintMat);
    this.rightArm.scale.set(1.5, 0.8, 0.8);
    this.rightArm.position.set(0.9, -0.3, 0.2);
    this.rightArm.rotation.set(0, Math.PI / 4, Math.PI / 6);
    this.kiroGroup.add(this.rightArm);

    // 7. Lavender Nightcap (#CBA6F7)
    this.nightcap = new THREE.Group();
    this.nightcap.position.set(0, 0.9, 0);
    const capGeo = new THREE.ConeGeometry(0.45, 1.0, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xCBA6F7, roughness: 0.7 });
    const capMesh = new THREE.Mesh(capGeo, capMat);
    capMesh.rotation.set(-0.15, 0, -0.25);
    this.nightcap.add(capMesh);

    const starPompom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xF9E2AF }));
    starPompom.position.set(0.18, 0.55, 0.1);
    this.nightcap.add(starPompom);

    this.kiroGroup.add(this.nightcap);
    this.nightcap.visible = KiroState.get('isSleeping');

    // 8. Golden Aura
    const auraGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xF9E2AF, transparent: true, opacity: 0.12, side: THREE.BackSide });
    this.goldenAura = new THREE.Mesh(auraGeo, auraMat);
    this.kiroGroup.add(this.goldenAura);
    this.goldenAura.visible = KiroState.get('hasWellRestedBuff');
  }

  buildCockpitHUD() {
    this.cockpitGroup = new THREE.Group();
    this.cockpitGroup.visible = false;
    this.scene.add(this.cockpitGroup);

    // Pilot HUD Reticle Ring Crosshair
    const ringGeo = new THREE.RingGeometry(0.45, 0.48, 32);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    this.crosshairMesh = new THREE.Mesh(ringGeo, lineMat);
    this.crosshairMesh.position.set(0, 1.6, 3.5);
    this.cockpitGroup.add(this.crosshairMesh);

    // Reticle Crosshair Alignment Lines
    const vertGeo = new THREE.PlaneGeometry(0.015, 1.2);
    const horGeo = new THREE.PlaneGeometry(1.2, 0.015);
    const hLine = new THREE.Mesh(horGeo, lineMat);
    const vLine = new THREE.Mesh(vertGeo, lineMat);
    hLine.position.set(0, 1.6, 3.48);
    vLine.position.set(0, 1.6, 3.48);
    this.cockpitGroup.add(hLine);
    this.cockpitGroup.add(vLine);

    // Build Holographic Wireframe Space System Planet Targets
    this.spaceSystems.forEach(sys => {
      const planetGeo = new THREE.SphereGeometry(sys.size, 16, 16);
      const planetMat = new THREE.MeshBasicMaterial({
        color: sys.color,
        transparent: true,
        opacity: 0.9,
        wireframe: true
      });
      const mesh = new THREE.Mesh(planetGeo, planetMat);
      mesh.position.set(sys.x, sys.y, sys.z);
      mesh.userData = { id: sys.id, name: sys.name, basePos: new THREE.Vector3(sys.x, sys.y, sys.z) };

      this.scene.add(mesh);
      this.targetSystemMeshes.push(mesh);
    });
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Pointer Move for Galaxy Repulsion & 3D Stardust Touch Trails
    const onPointerMove = (clientX, clientY) => {
      if (!this.container || !this.camera) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      // Project into 3D Touch Plane for Stardust Spawning
      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.raycaster.ray.intersectPlane(this.touchPlane, this.touchIntersectPoint);

      if (this.touchIntersectPoint) {
        this.spawnStardustParticle(this.touchIntersectPoint.x, this.touchIntersectPoint.y, this.touchIntersectPoint.z);
      }
    };

    this.container.addEventListener('pointermove', (e) => onPointerMove(e.clientX, e.clientY));
    this.container.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Petting Click
    this.container.addEventListener('click', (e) => {
      if (!this.kiroGroup || !this.camera) return;
      if (KiroState.get('telescopeActive')) return;

      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.kiroGroup.children, true);
      if (hits.length > 0) {
        this.triggerPetReaction();
      }
    });

    // Gyroscope Parallax
    window.addEventListener('deviceorientation', (e) => {
      if (KiroState.get('gyroEnabled')) {
        this.gyro.targetX = (e.gamma || 0) * 0.015;
        this.gyro.targetY = (e.beta || 0) * 0.015;
      }
    });
  }

  subscribeState() {
    KiroState.on('wellbeing:change', (wellbeing) => this.updateWellbeing(wellbeing));
    KiroState.on('vital:feed', ({ type }) => this.dropCandy(type));
    KiroState.on('vital:water', () => this.splashWater());
    KiroState.on('sleep:change', ({ isSleeping, hasWellRestedBuff }) => this.onSleepChange(isSleeping, hasWellRestedBuff));

    // Telescope State Listener
    KiroState.on('change:telescopeActive', ({ newValue }) => {
      const isActive = Boolean(newValue);
      if (this.cockpitGroup) this.cockpitGroup.visible = isActive;

      if (window.gsap && this.kiroGroup && this.pedestal && this.neonRing) {
        gsap.to(this.kiroGroup.position, {
          y: isActive ? -4 : 0,
          duration: 1.2,
          ease: "power2.inOut"
        });
        gsap.to(this.pedestal.position, {
          y: isActive ? -5 : -1.6,
          duration: 1.2,
          ease: "power2.inOut"
        });
        gsap.to(this.neonRing.position, {
          y: isActive ? -5 : -1.38,
          duration: 1.2,
          ease: "power2.inOut"
        });
      }
    });
  }

  onSleepChange(isSleeping, hasWellRestedBuff) {
    if (this.nightcap) this.nightcap.visible = isSleeping;
    if (this.goldenAura) this.goldenAura.visible = hasWellRestedBuff;

    // Toggle Eye Visuals
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

  /* 2. 3D Stardust Touch Trails (Dense glowing particle streams with convection) */
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
      vy: 0.025 + Math.random() * 0.035, // Upward localized convection
      vz: (Math.random() - 0.5) * 0.02,
      life: 1.0,
      decay: 0.035 + Math.random() * 0.025
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

  /* 3. Physical 3D Treat Drops (Star & Donut) */
  dropCandy(type = 'star') {
    if (KiroState.get('isSleeping')) return;

    let candyMesh;
    const group = new THREE.Group();

    if (type === 'donut') {
      const donut = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.3 }));
      donut.rotation.x = Math.PI / 2;
      group.add(donut);
      candyMesh = group;
    } else {
      const star = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), new THREE.MeshStandardMaterial({ color: 0xF9E2AF, roughness: 0.2, metalness: 0.4 }));
      candyMesh = star;
    }

    candyMesh.position.set((Math.random() - 0.5) * 0.4, 4.2, 0.85);
    candyMesh.userData = { vy: -0.07, ay: -0.005, rotX: (Math.random() - 0.5) * 0.05, rotY: (Math.random() - 0.5) * 0.05, type };
    this.scene.add(candyMesh);
    this.activeCandies.push(candyMesh);
  }

  /* 4. 3D Water Droplet Splash (12 Translucent Teal Droplets) */
  splashWater() {
    synthEngine.playWaterSound();

    // Flipper wiggle in delight
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

      // Mouth Collision Detection
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

      // Pedestal Landing & Dissolve
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

  animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();
    const isSleeping = KiroState.get('isSleeping');

    // 1. Gyro Parallax Smooth Interpolation
    this.gyro.x += (this.gyro.targetX - this.gyro.x) * 0.08;
    this.gyro.y += (this.gyro.targetY - this.gyro.y) * 0.08;
    this.camera.position.x = this.gyro.x;
    this.camera.position.y = 1.6 + this.gyro.y;
    this.camera.lookAt(0, 0, 0);

    // 2. Idle Bobbing & Telescope Steering
    const isTelescope = KiroState.get('telescopeActive');
    const steering = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };

    if (isTelescope) {
      if (this.galaxyStars) {
        this.galaxyStars.position.x = (steering.yaw || 0) * 0.06;
        this.galaxyStars.position.y = (steering.pitch || 0) * 0.06;
      }

      this.targetSystemMeshes.forEach(mesh => {
        const base = mesh.userData.basePos;
        mesh.position.x = base.x + ((steering.yaw || 0) * 0.15);
        mesh.position.y = base.y + ((steering.pitch || 0) * 0.15);

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
      const freq = isSleeping ? 0.6 : 2.0;
      const amp = isSleeping ? 0.02 : 0.06;
      if (this.kiroGroup && (!window.gsap || !gsap.isAnimating(this.kiroGroup.position))) {
        this.kiroGroup.position.y = Math.sin(t * freq) * amp;
      }
    }

    // 3. Dynamic Spiral Galaxy Twinkle & Pointer Repulsion
    if (this.galaxyStars) {
      const positions = this.galaxyStars.geometry.attributes.position.array;
      const rotSpeed = isSleeping ? 0.0003 : 0.0012;
      this.galaxyStars.rotation.z += rotSpeed;

      // Project pointer into galaxy plane for repulsion
      const touchX = this.touchIntersectPoint ? this.touchIntersectPoint.x : -999;
      const touchY = this.touchIntersectPoint ? this.touchIntersectPoint.y : -999;

      for (let i = 0; i < this.galaxyStarCount; i++) {
        const star = this.galaxyData[i];
        const pIdx = i * 3;

        // Pointer Repulsion Physics
        const dx = star.x - touchX;
        const dy = star.y - touchY;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < star.repelRadius && dist > 0.01) {
          const force = (1.0 - dist / star.repelRadius) * 0.22;
          star.vx += (dx / dist) * force;
          star.vy += (dy / dist) * force;
        }

        // Spring force back to base coordinates
        star.vx += (star.baseX - star.x) * 0.04;
        star.vy += (star.baseY - star.y) * 0.04;
        star.vx *= 0.88;
        star.vy *= 0.88;

        star.x += star.vx;
        star.y += star.vy;

        positions[pIdx] = star.x;
        positions[pIdx + 1] = star.y;
        positions[pIdx + 2] = star.z + Math.sin(t * star.twinkleSpeed + star.phase) * 0.15;
      }

      this.galaxyStars.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Audio-Visual Synesthesia (Neon Ring & Golden Aura)
    const audioLevel = synthEngine.getAudioReactiveLevel();
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

    // 5. Update Particle Systems & Physics
    this.updateTouchParticles();
    this.updatePhysics();
    this.updateWaterPhysics();

    // 6. Render
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

    if (this.galaxyStars) {
      if (this.galaxyStars.geometry) this.galaxyStars.geometry.dispose();
      if (this.galaxyStars.material) this.galaxyStars.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
