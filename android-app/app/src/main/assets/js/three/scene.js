/**
 * scene.js
 * Unified 3D Celestial Environment, Kiro Procedural Model, & Feeding Physics (ES6 Module)
 * Single requestAnimationFrame loop, audio-visual synesthesia, and explicit GPU memory disposal.
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
    this.orbitingStars = null;
    this.nightcap = null;
    this.goldenAura = null;

    // Physics & Interaction
    this.activeCandies = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.animationFrameId = null;

    // Gyro Parallax State
    this.gyro = { x: 0, y: 0, targetX: 0, targetY: 0 };

    this.init();
  }

  init() {
    // 1. Three.js Scene & Camera Setup
    this.scene = new THREE.Scene();
    const aspect = (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 1.8, 7.5);

    // 2. WebGL Renderer with Hardware-Clamped Pixel Ratio (Max 2.0 to protect mobile GPU)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 3. Lighting Setup
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x94E2D5, 1.3, 10);
    pointLight.position.set(0, -1.2, 0);
    this.scene.add(pointLight);

    // 4. Build Environment & Kiro Model
    this.buildEnvironment();
    this.buildKiro();

    // 5. Event Listeners & State Subscriptions
    this.bindEvents();
    this.subscribeState();

    // 6. Start Unified Animation Loop
    this.animate();
  }

  buildEnvironment() {
    // Floating Pedestal Island
    const pedestalGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1B2A38,
      roughness: 0.6,
      metalness: 0.2
    });
    this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.pedestal.position.y = -1.6;
    this.pedestal.receiveShadow = true;
    this.scene.add(this.pedestal);

    // Audio-Reactive Neon Ring (#94E2D5)
    const ringGeo = new THREE.TorusGeometry(1.85, 0.05, 8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x94E2D5,
      transparent: true,
      opacity: 0.9
    });
    this.neonRing = new THREE.Mesh(ringGeo, ringMat);
    this.neonRing.rotation.x = Math.PI / 2;
    this.neonRing.position.y = -1.4;
    this.scene.add(this.neonRing);

    // 35 Orbiting Star Sparkles in a Single Draw Call (THREE.Points)
    const starCount = 35;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const phases = [];

    for (let i = 0; i < starCount; i++) {
      const r = 2.0 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 0.2;
      positions[i * 3 + 2] = r * Math.cos(phi);

      phases.push(Math.random() * Math.PI * 2);
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xF9E2AF,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.orbitingStars = new THREE.Points(starGeo, starMat);
    this.orbitingStars.userData = { phases };
    this.scene.add(this.orbitingStars);
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

    // Body: Cute squashed mint sphere
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    const bodyMesh = new THREE.Mesh(bodyGeo, mintMat);
    bodyMesh.scale.set(1.1, 0.95, 1.1);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.kiroGroup.add(bodyMesh);

    // Belly: Cream front patch
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

    // Eyes: Obsidian spheres with bright starlight specular highlights
    const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x1A3A3A,
      roughness: 0.1,
      metalness: 0.9
    });
    const hlGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.18, 0.85);
    const leftHl = new THREE.Mesh(hlGeo, hlMat);
    leftHl.position.set(-0.31, 0.22, 0.95);
    this.kiroGroup.add(leftEye);
    this.kiroGroup.add(leftHl);

    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.18, 0.85);
    const rightHl = new THREE.Mesh(hlGeo, hlMat);
    rightHl.position.set(0.39, 0.22, 0.95);
    this.kiroGroup.add(rightEye);
    this.kiroGroup.add(rightHl);

    // Nose: Pastel pink button nose
    const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xF5B7C0, roughness: 0.8 });
    const noseMesh = new THREE.Mesh(noseGeo, noseMat);
    noseMesh.scale.set(1.2, 1.0, 0.8);
    noseMesh.position.set(0, 0.06, 0.95);
    this.kiroGroup.add(noseMesh);

    // Blush Cheeks
    const cheekGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.55 });
    
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.rotation.set(Math.PI / 2.3, -Math.PI / 6, 0);
    leftCheek.position.set(-0.55, 0.02, 0.82);
    this.kiroGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.rotation.set(Math.PI / 2.3, Math.PI / 6, 0);
    rightCheek.position.set(0.55, 0.02, 0.82);
    this.kiroGroup.add(rightCheek);

    // Flipper Arms
    const armGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const leftArm = new THREE.Mesh(armGeo, mintMat);
    leftArm.scale.set(1.5, 0.8, 0.8);
    leftArm.position.set(-0.9, -0.3, 0.2);
    leftArm.rotation.set(0, -Math.PI / 4, -Math.PI / 6);
    this.kiroGroup.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, mintMat);
    rightArm.scale.set(1.5, 0.8, 0.8);
    rightArm.position.set(0.9, -0.3, 0.2);
    rightArm.rotation.set(0, Math.PI / 4, Math.PI / 6);
    this.kiroGroup.add(rightArm);

    // Nightcap (Sleeping state accessory)
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

    // Golden Aura
    const auraGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xF9E2AF, transparent: true, opacity: 0.12, side: THREE.BackSide });
    this.goldenAura = new THREE.Mesh(auraGeo, auraMat);
    this.kiroGroup.add(this.goldenAura);
    this.goldenAura.visible = KiroState.get('hasWellRestedBuff');
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    // Raycast Petting Trigger
    const handlePet = (clientX, clientY) => {
      if (!this.container || !this.camera || !this.kiroGroup) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.kiroGroup.children, true);
      if (intersects.length > 0) {
        this.triggerPetReaction();
      }
    };

    this.container.addEventListener('click', (e) => handlePet(e.clientX, e.clientY));
    this.container.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        handlePet(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Gyroscope Parallax
    window.addEventListener('deviceorientation', (e) => {
      if (KiroState.get('gyroEnabled')) {
        this.gyro.targetX = (e.gamma || 0) * 0.015;
        this.gyro.targetY = (e.beta || 0) * 0.015;
      }
    });
  }

  subscribeState() {
    KiroState.on('wellbeing:change', (wellbeing) => {
      this.updateWellbeing(wellbeing);
    });

    KiroState.on('vital:feed', ({ type }) => {
      this.dropCandy(type);
    });

    KiroState.on('sleep:change', ({ isSleeping, hasWellRestedBuff }) => {
      if (this.nightcap) this.nightcap.visible = isSleeping;
      if (this.goldenAura) this.goldenAura.visible = hasWellRestedBuff;
    });
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
    tl.to(this.kiroGroup.position, { y: 0.8, duration: 0.35, ease: 'power1.out' })
      .to(this.kiroGroup.rotation, { y: this.kiroGroup.rotation.y + Math.PI * 2, duration: 0.6, ease: 'sine.inOut' }, 0)
      .to(this.kiroGroup.position, { y: 0, duration: 0.35, ease: 'power1.in' })
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

  dropCandy(type = 'star') {
    if (KiroState.get('isSleeping')) return;

    let candyMesh;
    const group = new THREE.Group();

    if (type === 'donut') {
      const donut = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xFFB6C1 }));
      donut.rotation.x = Math.PI / 2;
      group.add(donut);
      candyMesh = group;
    } else if (type === 'gummy') {
      candyMesh = new THREE.Mesh(
        new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.08, 0.14, 8, 16) : new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16),
        new THREE.MeshStandardMaterial({ color: 0x94E2D5, transparent: true, opacity: 0.85 })
      );
    } else {
      const star = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), new THREE.MeshStandardMaterial({ color: 0xF9E2AF, roughness: 0.2, metalness: 0.4 }));
      candyMesh = star;
    }

    candyMesh.position.set(Math.random() * 0.4 - 0.2, 4.0, 0.85);
    candyMesh.userData = { vy: -0.06, ay: -0.004, rotX: Math.random() * 0.04 - 0.02, rotY: Math.random() * 0.04 - 0.02, type };
    this.scene.add(candyMesh);
    this.activeCandies.push(candyMesh);
  }

  updatePhysics() {
    for (let i = this.activeCandies.length - 1; i >= 0; i--) {
      const candy = this.activeCandies[i];
      candy.userData.vy += candy.userData.ay;
      candy.position.y += candy.userData.vy;
      candy.rotation.x += candy.userData.rotX;
      candy.rotation.y += candy.userData.rotY;

      // Collision Detection with Mouth
      if (this.kiroGroup) {
        const dx = candy.position.x - this.kiroGroup.position.x;
        const dy = candy.position.y - (this.kiroGroup.position.y + 0.15);
        const dz = candy.position.z - (this.kiroGroup.position.z + 0.8);
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        if (dist < 0.65 && candy.position.y > -0.2) {
          this.scene.remove(candy);
          this.activeCandies.splice(i, 1);
          this.onEatCandy(candy.userData.type);
          continue;
        }
      }

      // Splash on Pedestal
      if (candy.position.y < -1.4) {
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
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();

    // 1. Gyroscope Parallax Smooth Interpolation
    this.gyro.x += (this.gyro.targetX - this.gyro.x) * 0.08;
    this.gyro.y += (this.gyro.targetY - this.gyro.y) * 0.08;
    this.camera.position.x = this.gyro.x;
    this.camera.position.y = 1.8 + this.gyro.y;
    this.camera.lookAt(0, 0, 0);

    // 2. Idle Bobbing
    const isSleeping = KiroState.get('isSleeping');
    const freq = isSleeping ? 0.6 : 2.0;
    const amp = isSleeping ? 0.02 : 0.08;
    if (this.kiroGroup && (!window.gsap || !gsap.isAnimating(this.kiroGroup.position))) {
      this.kiroGroup.position.y = Math.sin(t * freq) * amp;
    }

    // 3. Audio-Visual Synesthesia: Pulse Neon Ring with Synth Frequency Data
    const audioReactiveLevel = synthEngine.getAudioReactiveLevel();
    if (this.neonRing) {
      this.neonRing.rotation.z += 0.008;
      const baseScale = 1.0 + audioReactiveLevel * 0.25;
      this.neonRing.scale.set(baseScale, baseScale, 1.0);
      this.neonRing.material.opacity = 0.75 + audioReactiveLevel * 0.25;
    }

    // 4. Update Candy Physics
    this.updatePhysics();

    // 5. Render Scene
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
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
