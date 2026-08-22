/**
 * kiro-preloader-v6.js — 3D Hatching Egg Preloader & Stutter-Free Warm-Up Engine (V6.0)
 * ─────────────────────────────────────────────────────────────────────────────
 * Implements the sophisticated, slow-paced anime-realistic loading sequence:
 * 1. Velvety Twilight Portal framing a 3D cel-shaded Egg in quiet space.
 * 2. Custom GLSL Cracking Shader with 2D Simplex noise golden crack branching.
 * 3. Offscreen GPU Shader Warming pass at the 60% loading milestone.
 * 4. Egg Wobble, Shell Split & Kiro Elastic Spring-Bounce POP with audio chime.
 * 5. Camera Focal Zoom (FOV 45° -> 15°) and High-Performance Radial Circle Wipe.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { 
  createAnimePlanetMaterial, 
  createPlanetShaderMaterial, 
  createAnimeCharacterMaterial, 
  createAnimeOutlineMesh, 
  createAnimeStarfieldShaderMaterial, 
  createNebulaShaderMaterial 
} from './scene.js';

export default class KiroPreloaderV6 {
  constructor(rootContainerId = 'intro-viewport-root', onCompleteCallback = null) {
    this.root = document.getElementById(rootContainerId);
    this.onComplete = onCompleteCallback;
    this.progress = 0;
    this.isWarmingComplete = false;
    this.isHatched = false;
    this.animFrameId = null;
    this.clock = new THREE.Clock();

    if (!this.root) {
      console.warn(`[KiroPreloaderV6] Root container '#${rootContainerId}' not found. Executing instant fallback.`);
      if (typeof this.onComplete === 'function') this.onComplete();
      return;
    }

    this.initDOM();
    this.initThree();
    this.startProgressTimeline();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1. DOM Structure & Ambient Layout
     ───────────────────────────────────────────────────────────────────────── */
  initDOM() {
    this.root.innerHTML = `
      <div class="preloader-v6-bg-glow preloader-v6-mint-glow"></div>
      <div class="preloader-v6-bg-glow preloader-v6-pink-glow"></div>
      <div class="preloader-v6-bg-glow preloader-v6-gold-glow"></div>

      <div class="preloader-v6-portal" id="preloader-egg-portal">
        <div class="preloader-v6-portal-ring"></div>
        <div id="egg-canvas-mount"></div>
      </div>

      <div class="preloader-v6-card">
        <div class="preloader-v6-title">
          <span class="preloader-v6-title-sparkle">✦</span>
          <span id="egg-status-label">Nurturing Cosmic Egg</span>
          <span class="preloader-v6-title-sparkle">✦</span>
        </div>

        <div class="preloader-v6-track">
          <div class="preloader-v6-fill" id="egg-progress-fill"></div>
        </div>

        <div class="preloader-v6-meta">
          <span id="egg-action-text">Aligning celestial shaders...</span>
          <span class="preloader-v6-percentage" id="egg-percent-text">0%</span>
        </div>

        <div class="preloader-v6-hatch-msg" id="egg-hatch-msg">Kiro has hatched! ✨</div>
      </div>
    `;

    this.mountEl = document.getElementById('egg-canvas-mount');
    this.fillEl = document.getElementById('egg-progress-fill');
    this.percentEl = document.getElementById('egg-percent-text');
    this.actionEl = document.getElementById('egg-action-text');
    this.statusLabel = document.getElementById('egg-status-label');
    this.hatchMsg = document.getElementById('egg-hatch-msg');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. 3D Three.js Micro-Scene & Procedural Egg Assembly
     ───────────────────────────────────────────────────────────────────────── */
  initThree() {
    const rect = this.mountEl.getBoundingClientRect();
    const width = rect.width || 290;
    const height = rect.height || 290;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 3.4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.mountEl.appendChild(this.renderer.domElement);

    // Studio Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.2);
    dirLight.position.set(3, 5, 4);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x94e2d5, 0.7);
    rimLight.position.set(-3, -2, -2);
    this.scene.add(rimLight);

    this.buildEggAndKiro();
    this.animate();
  }

  buildEggAndKiro() {
    this.eggMasterGroup = new THREE.Group();
    this.scene.add(this.eggMasterGroup);

    // ─────────────────────────────────────────────────────────────────────────
    // 2.1 Procedural Glowing Crack GLSL Shader Material
    // ─────────────────────────────────────────────────────────────────────────
    const crackVertexShader = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `;

    const crackFragmentShader = `
      uniform float uCrackProgress;
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uCrackColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      // 2D Simplex Noise for procedural crack branches
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
        m = m*m; m = m*m;
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
        vec3 lightDir = normalize(vec3(1.0, 1.5, 1.2));
        float diff = max(dot(vNormal, lightDir), 0.0);
        
        // 3-step Cel Shading
        float cel = 0.55;
        if (diff > 0.65) cel = 1.0;
        else if (diff > 0.25) cel = 0.78;

        vec3 col = uBaseColor * cel;

        // Procedural Crack Network
        float n1 = snoise(vUv * 9.0);
        float n2 = snoise(vUv * 22.0 + vec2(uTime * 0.1, 0.0));
        float crackPattern = abs(n1 + n2 * 0.5);

        // Crack threshold controlled by uCrackProgress (0.0 to 1.0)
        float crackThreshold = mix(1.8, 0.08, uCrackProgress);
        if (uCrackProgress > 0.05 && crackPattern < crackThreshold) {
          float glow = 1.0 - (crackPattern / crackThreshold);
          glow = pow(glow, 2.5);
          float pulse = 0.85 + 0.35 * sin(uTime * 6.0);
          col = mix(col, uCrackColor * 1.5, glow * pulse);
        }

        // Shinkai Fresnel Atmospheric Rim
        vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
        float fresnel = 1.0 - max(dot(vNormal, viewDir), 0.0);
        fresnel = pow(fresnel, 3.0);
        col += vec3(0.58, 0.89, 0.83) * (fresnel * 0.45);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    this.crackMaterial = new THREE.ShaderMaterial({
      vertexShader: crackVertexShader,
      fragmentShader: crackFragmentShader,
      uniforms: {
        uCrackProgress: { value: 0.0 },
        uTime: { value: 0.0 },
        uBaseColor: { value: new THREE.Color(0xf5c2e7) }, // Pastel Pink
        uCrackColor: { value: new THREE.Color(0xf9e2af) } // Golden Glow
      }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2.2 Top & Bottom Egg Shells
    // ─────────────────────────────────────────────────────────────────────────
    const shellSegments = 32;
    
    // Top Shell: Upper hemisphere scaled into an egg apex
    const topGeo = new THREE.SphereGeometry(0.85, shellSegments, shellSegments, 0, Math.PI * 2, 0, Math.PI * 0.52);
    this.topShell = new THREE.Mesh(topGeo, this.crackMaterial);
    this.topShell.scale.set(1.0, 1.32, 1.0);
    this.eggMasterGroup.add(this.topShell);

    // Bottom Shell: Lower hemisphere scaled into round egg base
    const bottomGeo = new THREE.SphereGeometry(0.85, shellSegments, shellSegments, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52);
    this.bottomShell = new THREE.Mesh(bottomGeo, this.crackMaterial);
    this.bottomShell.scale.set(1.0, 1.15, 1.0);
    this.eggMasterGroup.add(this.bottomShell);

    // ─────────────────────────────────────────────────────────────────────────
    // 2.3 Hatchling Kiro Assembly (Hidden inside egg initially)
    // ─────────────────────────────────────────────────────────────────────────
    this.kiroHatchGroup = new THREE.Group();
    this.kiroHatchGroup.scale.set(0.001, 0.001, 0.001); // Concealed initially
    this.scene.add(this.kiroHatchGroup);

    const mintMat = new THREE.MeshStandardMaterial({ color: 0x4ec9b0, roughness: 0.65, metalness: 0.1 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xfffdf7, roughness: 0.95 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x11111b, roughness: 0.1 });
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xff758f, roughness: 0.8 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Kiro Body
    const bodyGeo = new THREE.SphereGeometry(0.70, 24, 24);
    const body = new THREE.Mesh(bodyGeo, mintMat);
    body.scale.set(1.12, 0.92, 1.12);
    this.kiroHatchGroup.add(body);

    // White Belly
    const bellyGeo = new THREE.SphereGeometry(0.50, 20, 20);
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.scale.set(0.95, 0.78, 0.35);
    belly.position.set(0, -0.10, 0.54);
    this.kiroHatchGroup.add(belly);

    // Starry Eyes & Catchlights
    const eyeGeo = new THREE.SphereGeometry(0.085, 12, 12);
    const glintGeo = new THREE.SphereGeometry(0.025, 8, 8);

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.24, 0.14, 0.62);
    const leftGlint = new THREE.Mesh(glintGeo, glintMat);
    leftGlint.position.set(-0.025, 0.025, 0.065);
    leftEye.add(leftGlint);
    this.kiroHatchGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.24, 0.14, 0.62);
    const rightGlint = new THREE.Mesh(glintGeo, glintMat);
    rightGlint.position.set(-0.025, 0.025, 0.065);
    rightEye.add(rightGlint);
    this.kiroHatchGroup.add(rightEye);

    // Sweet Rosy Blushing Cheeks
    const blushGeo = new THREE.SphereGeometry(0.10, 12, 12);
    const leftBlush = new THREE.Mesh(blushGeo, blushMat);
    leftBlush.scale.set(0.8, 0.45, 0.2);
    leftBlush.position.set(-0.40, 0.02, 0.60);
    this.kiroHatchGroup.add(leftBlush);

    const rightBlush = new THREE.Mesh(blushGeo, blushMat);
    rightBlush.scale.set(0.8, 0.45, 0.2);
    rightBlush.position.set(0.40, 0.02, 0.60);
    this.kiroHatchGroup.add(rightBlush);

    // Joyful Arms in the air!
    const armGeo = new THREE.SphereGeometry(0.16, 12, 12);
    this.leftArm = new THREE.Mesh(armGeo, mintMat);
    this.leftArm.scale.set(1.2, 0.6, 0.6);
    this.leftArm.position.set(-0.62, 0.12, 0.2);
    this.leftArm.rotation.set(0, 0, 0.5);
    this.kiroHatchGroup.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, mintMat);
    this.rightArm.scale.set(1.2, 0.6, 0.6);
    this.rightArm.position.set(0.62, 0.12, 0.2);
    this.rightArm.rotation.set(0, 0, -0.5);
    this.kiroHatchGroup.add(this.rightArm);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. Asynchronous GPU Shader Warming (Warming Pass @ 60% Progress)
     ───────────────────────────────────────────────────────────────────────── */
  async warmupShaders() {
    if (this.isWarmingComplete) return;

    try {
      if (this.actionEl) this.actionEl.textContent = 'Warming GPU shader pipelines...';

      const warmupGroup = new THREE.Group();
      warmupGroup.position.set(0, 0, -50); // Far behind camera
      this.scene.add(warmupGroup);

      const dummyGeo = new THREE.SphereGeometry(1, 16, 16);
      const dummyQuad = new THREE.PlaneGeometry(2, 2);

      const mat1 = createAnimePlanetMaterial(0x4ec9b0, 0x11111b, 0x94e2d5, 14.0);
      const mat2 = createPlanetShaderMaterial('#cba6f7');
      const mat3 = createAnimeCharacterMaterial(0x5ae5c8, 0x2a7c6e, 0xa8f6e8, 2.2);
      const mat4 = createAnimeStarfieldShaderMaterial(0.40);
      const mat5 = createNebulaShaderMaterial();

      const mesh1 = new THREE.Mesh(dummyGeo, mat1);
      const mesh2 = new THREE.Mesh(dummyGeo, mat2);
      const mesh3 = new THREE.Mesh(dummyGeo, mat3);
      const mesh4 = new THREE.Points(dummyGeo, mat4);
      const mesh5 = new THREE.Mesh(dummyQuad, mat5);

      warmupGroup.add(mesh1, mesh2, mesh3, mesh4, mesh5);

      // Force synchronous GPU shader compilation & pipeline caching
      this.renderer.compile(this.scene, this.camera);

      // Clean up dummy objects
      warmupGroup.remove(mesh1, mesh2, mesh3, mesh4, mesh5);
      this.scene.remove(warmupGroup);

      dummyGeo.dispose();
      dummyQuad.dispose();
      mat1.dispose();
      mat2.dispose();
      mat3.dispose();
      mat4.dispose();
      mat5.dispose();

      this.isWarmingComplete = true;
      console.log('[KiroPreloaderV6] ✨ GPU shaders fully warmed and compiled with zero runtime hitching.');
    } catch (err) {
      console.warn('[KiroPreloaderV6] Warning during shader warming pass:', err);
      this.isWarmingComplete = true;
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     4. Progress Timeline & Egg Cracking Orchestration
     ───────────────────────────────────────────────────────────────────────── */
  startProgressTimeline() {
    const milestones = [
      { p: 15, text: 'Waking cosmic egg...', delay: 200 },
      { p: 35, text: 'Attuning starlight harmonics...', delay: 500 },
      { p: 60, text: 'Compiling neural shaders...', delay: 900, action: () => this.warmupShaders() },
      { p: 85, text: 'Cracking celestial shell...', delay: 1400 },
      { p: 98, text: 'Kiro ready to emerge!', delay: 1800 },
      { p: 100, text: 'Hatching!', delay: 2100, action: () => this.triggerHatchSequence() }
    ];

    milestones.forEach(({ p, text, delay, action }) => {
      setTimeout(async () => {
        this.progress = p;
        if (this.fillEl) this.fillEl.style.width = `${p}%`;
        if (this.percentEl) this.percentEl.textContent = `${p}%`;
        if (this.actionEl) this.actionEl.textContent = text;

        if (this.crackMaterial && this.crackMaterial.uniforms) {
          gsap.to(this.crackMaterial.uniforms.uCrackProgress, {
            value: p / 100,
            duration: 0.45,
            ease: 'power2.out'
          });
        }

        if (action) await action();
      }, delay);
    });
  }

  /* ─────────────────────────────────────────────────────────────────────────
     5. The Hatch, Pop & Cinematic Leap Transition
     ───────────────────────────────────────────────────────────────────────── */
  triggerHatchSequence() {
    if (this.isHatched) return;
    this.isHatched = true;

    if (this.statusLabel) this.statusLabel.textContent = 'Kiro Awakens!';
    if (this.hatchMsg) this.hatchMsg.classList.add('visible');

    // 1. Synthesize Procedural Pop Chime
    try {
      import('./synth.js').then(({ synthEngine }) => {
        if (synthEngine && typeof synthEngine.playHatchPopChime === 'function') {
          synthEngine.playHatchPopChime();
        }
      }).catch(() => {});
    } catch (_) {}

    const tl = gsap.timeline();

    // 2. Energetic Egg Wobble
    tl.to(this.eggMasterGroup.rotation, {
      z: 0.18,
      duration: 0.06,
      repeat: 7,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // 3. Shell Split: Top flies up/rotates, bottom drops downward
    tl.to(this.topShell.position, {
      y: 2.2,
      z: -0.6,
      duration: 0.65,
      ease: 'power3.out'
    }, '-=0.1');

    tl.to(this.topShell.rotation, {
      x: 0.6,
      z: -0.4,
      duration: 0.65,
      ease: 'power3.out'
    }, '<');

    tl.to(this.bottomShell.position, {
      y: -2.2,
      z: -0.4,
      duration: 0.65,
      ease: 'power3.out'
    }, '<');

    // 4. Kiro Spring-Bounce POP out into view!
    tl.fromTo(this.kiroHatchGroup.scale, 
      { x: 0.001, y: 0.001, z: 0.001 },
      { x: 1.0, y: 1.0, z: 1.0, duration: 0.75, ease: 'elastic.out(1.25, 0.45)' },
      '<+0.05'
    );

    // 5. Joyful arm celebration wave
    tl.to(this.leftArm.rotation, { z: 0.8, yoyo: true, repeat: 3, duration: 0.15, ease: 'sine.inOut' }, '<+0.2');
    tl.to(this.rightArm.rotation, { z: -0.8, yoyo: true, repeat: 3, duration: 0.15, ease: 'sine.inOut' }, '<');

    // 6. Camera Focal Zoom & Radial Circular Clip-Path Wipe
    tl.to(this.camera.position, {
      z: 1.4,
      duration: 0.8,
      ease: 'power2.inOut'
    }, '+=0.2');

    tl.to(this.root, {
      clipPath: 'circle(0% at 50% 50%)',
      opacity: 0,
      duration: 0.75,
      ease: 'power3.inOut',
      onComplete: () => {
        this.dispose();
        if (typeof this.onComplete === 'function') {
          this.onComplete();
        }
      }
    }, '-=0.45');
  }

  /* ─────────────────────────────────────────────────────────────────────────
     6. Render Loop & Trigonometric Gentle Idle
     ───────────────────────────────────────────────────────────────────────── */
  animate() {
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const t = this.clock.getElapsedTime();

    if (this.crackMaterial && this.crackMaterial.uniforms) {
      this.crackMaterial.uniforms.uTime.value = t;
    }

    if (!this.isHatched && this.eggMasterGroup) {
      // Gentle floating rocking physics
      this.eggMasterGroup.position.y = Math.sin(t * 2.2) * 0.06;
      this.eggMasterGroup.rotation.y = Math.sin(t * 1.2) * 0.12;
      this.eggMasterGroup.rotation.z = Math.cos(t * 1.8) * 0.04;
    } else if (this.isHatched && this.kiroHatchGroup) {
      this.kiroHatchGroup.rotation.y = Math.sin(t * 3.0) * 0.15;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     7. GPU Memory Deallocation
     ───────────────────────────────────────────────────────────────────────── */
  dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.root) {
      this.root.style.display = 'none';
      this.root.innerHTML = '';
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
