/**
 * intro.js (Space Capsule V5.0 — Cinematic WebGL Starfield Warp & Identity Selector Portals)
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Volumetric Cosmic Dust Clouds (Procedural Shader Nebula in Three.js)
 * 2. Chromatic Warp Transition (Mint-Teal on left, Pastel Pink on right, Gold in center)
 * 3. Stardust Touch Trails (Swirling interactive stardust sparkles on touch/cursor movement)
 * 4. Deep-Space Orbital Hum & Solar Wind Atmosphere (55Hz sub-bass + 0.05Hz LFO + pink noise bandpass sweep)
 * 5. Flat-directory sibling imports and leak-proof WebGL memory disposal.
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';

export class KiroIntroManager {
  constructor(overlayId, onCompleteCallback) {
    this.overlay = document.getElementById(overlayId);
    this.onComplete = onCompleteCallback;
    this.selectedPersona = KiroState.get('persona') || null;

    // Three.js State
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.starLines = null;
    this.starCount = 800;
    this.starData = [];
    this.warpSpeed = 1.0;
    this.streakLength = 0.5;
    this.nebulaMesh = null;
    this.nebulaMaterial = null;
    this.clock = null;
    this.animFrameId = null;
    this.isDisposed = false;
    this.isSelecting = false;

    // Supernova & Stardust Trails Canvas
    this.supernovaCanvas = null;
    this.supernovaCtx = null;
    this.supernovaParticles = [];
    this.stardustTrailParticles = [];

    this.init();
  }

  init(force = false) {
    if (!this.overlay) return;

    // Check if persona already selected or intro completed (unless force replay)
    if (!force && KiroState.get('hasCompletedIntro')) {
      const persona = this.selectedPersona || KiroState.getPersona() || 'pat';
      this.overlay.classList.add('hidden');
      this.overlay.style.display = 'none';
      this.overlay.style.pointerEvents = 'none';
      if (this.onComplete) this.onComplete(persona);
      return;
    }

    this.renderDOM();
    this.initThree();
    this.bindInteractions();
    this.bindStardustTrails();
    this.runTimeline();
  }

  renderDOM() {
    this.overlay.innerHTML = `
      <!-- Three.js Canvas -->
      <canvas id="intro-three-canvas"></canvas>

      <!-- Supernova & Stardust Touch Trails Canvas -->
      <canvas id="supernova-canvas"></canvas>

      <!-- Letterbox Bars -->
      <div class="cinematic-letterbox-top" id="letterbox-top"></div>
      <div class="cinematic-letterbox-bottom" id="letterbox-bottom"></div>

      <!-- Act I: Minimal HUD Boot Line -->
      <div class="intro-hud-boot" id="intro-hud-boot">
        <div class="intro-hud-line">[ INITIATING HYPERDRIVE... ]</div>
        <div class="intro-hud-line intro-hud-line-sub">[ SCANNING COSMIC SECTOR... ]</div>
      </div>

      <!-- Act IV: Portals of Identity -->
      <div class="intro-portals-stage" id="intro-portals-stage">
        <div class="intro-stage-header">
          <div class="intro-stage-badge">
            <svg class="inline-svg-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>
            Select Profile
          </div>
          <h2 class="intro-stage-title">Who is using this device?</h2>
        </div>

        <div class="persona-portals-grid">
          <!-- Patrick's Portal -->
          <div class="portal-card patrick portal-pat" id="portal-patrick" data-persona="pat">
            <div class="portal-avatar-wrapper">
              <svg class="portal-avatar-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="26" stroke="#4EC9B0" stroke-width="2.5" fill="rgba(78, 201, 176, 0.12)"/>
                <path d="M18 34C18 24.0589 24.268 16 32 16C39.732 16 46 24.0589 46 34C46 41 40 46 32 46C24 46 18 41 18 34Z" fill="#2E4A56" stroke="#4EC9B0" stroke-width="2"/>
                <rect x="22" y="24" width="20" height="14" rx="7" fill="#0D1622" stroke="#4EC9B0" stroke-width="1.5"/>
                <path d="M26 27C27.5 25.5 30 25 33 25" stroke="#4EC9B0" stroke-width="2" stroke-linecap="round"/>
                <circle cx="38" cy="27" r="1.5" fill="#FFFFFF" opacity="0.85"/>
                <line x1="32" y1="16" x2="32" y2="10" stroke="#4EC9B0" stroke-width="2" stroke-linecap="round"/>
                <circle cx="32" cy="9" r="2" fill="#4EC9B0"/>
              </svg>
            </div>
            <div class="portal-meta">
              <div class="portal-name">Patrick</div>
              <div class="portal-role">Malaybalay</div>
              <button type="button" class="portal-choose-btn btn-pat" data-persona="pat">Patrick</button>
            </div>
          </div>

          <!-- Yangiee's Portal -->
          <div class="portal-card yangiee portal-yang" id="portal-yangiee" data-persona="yang">
            <div class="portal-avatar-wrapper">
              <svg class="portal-avatar-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="26" stroke="#FFB6C1" stroke-width="2.5" fill="rgba(255, 182, 193, 0.12)"/>
                <path d="M19 28L15 15L28 20" stroke="#FFB6C1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255, 182, 193, 0.3)"/>
                <path d="M45 28L49 15L36 20" stroke="#FFB6C1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255, 182, 193, 0.3)"/>
                <ellipse cx="32" cy="35" rx="16" ry="13" fill="#FFE4E8" stroke="#FFB6C1" stroke-width="2"/>
                <ellipse cx="26" cy="34" rx="2.5" ry="3" fill="#1B2A38"/>
                <ellipse cx="38" cy="34" rx="2.5" ry="3" fill="#1B2A38"/>
                <circle cx="25" cy="33" r="0.8" fill="#FFF"/>
                <circle cx="37" cy="33" r="0.8" fill="#FFF"/>
                <path d="M31 38L32 39L33 38" stroke="#F5B7C0" stroke-width="1.5" stroke-linecap="round"/>
                <circle cx="21" cy="37" r="2.5" fill="#FFB6C1" opacity="0.6"/>
                <circle cx="43" cy="37" r="2.5" fill="#FFB6C1" opacity="0.6"/>
              </svg>
            </div>
            <div class="portal-meta">
              <div class="portal-name">Yangiee</div>
              <div class="portal-role">Capas</div>
              <button type="button" class="portal-choose-btn btn-yang" data-persona="yang">Yangiee</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.supernovaCanvas = document.getElementById('supernova-canvas');
    if (this.supernovaCanvas) {
      this.supernovaCtx = this.supernovaCanvas.getContext('2d');
      this.resizeSupernovaCanvas();
    }
  }

  resizeSupernovaCanvas() {
    if (!this.supernovaCanvas) return;
    this.supernovaCanvas.width = window.innerWidth;
    this.supernovaCanvas.height = window.innerHeight;
  }

  /* Three.js Particle Warp & Volumetric Nebula Shader */
  initThree() {
    const canvas = document.getElementById('intro-three-canvas');
    if (!canvas || !window.THREE) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0016);

    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 2000);
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // 1. Build 800 Chromatic Stardust Line Segments
    this.starData = [];
    const positions = new Float32Array(this.starCount * 6);
    const colors = new Float32Array(this.starCount * 6);

    const goldColor = new THREE.Color(0xF9E2AF);
    const mintColor = new THREE.Color(0x4EC9B0); // Patrick's Left Aura
    const pinkColor = new THREE.Color(0xFFB6C1); // Yangiee's Right Aura
    const lavenderColor = new THREE.Color(0xCBA6F7);

    for (let i = 0; i < this.starCount; i++) {
      const radius = 8 + Math.random() * 95;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 1400;
      const speed = 0.5 + Math.random() * 1.6;

      this.starData.push({ x, y, z, baseZ: z, speed, radius, angle });

      const pIdx = i * 6;
      positions[pIdx] = x;
      positions[pIdx + 1] = y;
      positions[pIdx + 2] = z;
      positions[pIdx + 3] = x;
      positions[pIdx + 4] = y;
      positions[pIdx + 5] = z - this.streakLength;

      let c = goldColor;
      if (x < -12) {
        c = mintColor;
      } else if (x > 12) {
        c = pinkColor;
      } else {
        c = i % 2 === 0 ? goldColor : lavenderColor;
      }

      colors[pIdx] = c.r;
      colors[pIdx + 1] = c.g;
      colors[pIdx + 2] = c.b;
      colors[pIdx + 3] = Math.min(1.0, c.r * 1.3);
      colors[pIdx + 4] = Math.min(1.0, c.g * 1.3);
      colors[pIdx + 5] = Math.min(1.0, c.b * 1.3);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5
    });

    this.starLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.starLines);

    // 2. Volumetric Cosmic Dust Clouds (Procedural Shader Nebula)
    const nebulaVertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const nebulaFragmentShader = `
      uniform float u_time;
      uniform float u_opacity;
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
        float t = u_time * 0.08;

        float n1 = snoise(uv * 1.5 + vec2(t * 0.5, t * 0.3));
        float n2 = snoise(uv * 3.0 - vec2(t * 0.3, t * 0.6));
        float cloud = (n1 * 0.6 + n2 * 0.4) * 0.5 + 0.5;

        vec3 deepSpace = vec3(0.05, 0.08, 0.14);
        vec3 lavender = vec3(0.55, 0.40, 0.85);
        vec3 mint = vec3(0.31, 0.79, 0.69);
        vec3 pink = vec3(1.0, 0.71, 0.76);

        vec3 col = mix(deepSpace, lavender, smoothstep(0.35, 0.75, cloud));
        
        if (uv.x < 0.0) {
          col = mix(col, mint, smoothstep(0.4, 0.85, cloud) * abs(uv.x) * 0.65);
        } else {
          col = mix(col, pink, smoothstep(0.4, 0.85, cloud) * uv.x * 0.65);
        }

        float alpha = smoothstep(0.2, 0.8, cloud) * u_opacity * 0.82;
        gl_FragColor = vec4(col, alpha);
      }
    `;

    const nebulaGeo = new THREE.PlaneGeometry(1800, 1100);
    this.nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_opacity: { value: 0.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.nebulaMesh = new THREE.Mesh(nebulaGeo, this.nebulaMaterial);
    this.nebulaMesh.position.z = -550;
    this.scene.add(this.nebulaMesh);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.animate();
  }

  onWindowResize() {
    if (this.isDisposed || !this.camera || !this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.resizeSupernovaCanvas();
  }

  bindStardustTrails() {
    const handleMove = (clientX, clientY) => {
      if (this.isDisposed) return;
      const count = 3;
      const colors = ['#4EC9B0', '#FFB6C1', '#F9E2AF', '#CBA6F7'];

      for (let i = 0; i < count; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.5;

        this.stardustTrailParticles.push({
          x: clientX + (Math.random() - 0.5) * 14,
          y: clientY + (Math.random() - 0.5) * 14,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: 1.5 + Math.random() * 3.5,
          life: 1.0,
          decay: 0.035 + Math.random() * 0.03,
          color
        });
      }
    };

    this.overlay.addEventListener('pointermove', (e) => handleMove(e.clientX, e.clientY));
    this.overlay.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  animate() {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock ? this.clock.getDelta() : 0.016;
    const elapsedTime = this.clock ? this.clock.getElapsedTime() : 0;

    if (this.nebulaMaterial && this.nebulaMaterial.uniforms) {
      this.nebulaMaterial.uniforms.u_time.value = elapsedTime;
    }

    if (this.starLines) {
      const positions = this.starLines.geometry.attributes.position.array;

      for (let i = 0; i < this.starCount; i++) {
        const star = this.starData[i];
        const pIdx = i * 6;

        star.z += star.speed * this.warpSpeed;

        if (star.z > 250) {
          star.z = -1200;
        }

        star.angle += 0.0006 * (this.warpSpeed > 5 ? 2.5 : 1);
        const curX = Math.cos(star.angle) * star.radius;
        const curY = Math.sin(star.angle) * star.radius;

        positions[pIdx] = curX;
        positions[pIdx + 1] = curY;
        positions[pIdx + 2] = star.z;

        positions[pIdx + 3] = curX;
        positions[pIdx + 4] = curY;
        positions[pIdx + 5] = star.z - this.streakLength;
      }

      this.starLines.geometry.attributes.position.needsUpdate = true;
    }

    if (this.camera) {
      this.camera.rotation.z += 0.0005 * (this.warpSpeed > 5 ? 4 : 1);
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.renderStardustTrails();
  }

  renderStardustTrails() {
    if (!this.supernovaCtx || !this.supernovaCanvas) return;
    if (this.stardustTrailParticles.length === 0) {
      this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);
      return;
    }

    this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);

    for (let i = this.stardustTrailParticles.length - 1; i >= 0; i--) {
      const p = this.stardustTrailParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.stardustTrailParticles.splice(i, 1);
        continue;
      }

      this.supernovaCtx.save();
      this.supernovaCtx.beginPath();
      this.supernovaCtx.arc(p.x, p.y, Math.max(0.5, p.size * p.life), 0, Math.PI * 2);
      this.supernovaCtx.fillStyle = p.color;
      this.supernovaCtx.globalAlpha = Math.max(0, p.life * 0.9);
      this.supernovaCtx.shadowBlur = 8;
      this.supernovaCtx.shadowColor = p.color;
      this.supernovaCtx.fill();
      this.supernovaCtx.restore();
    }
  }

  runTimeline() {
    if (!window.gsap) {
      this.skipToPortals();
      return;
    }

    const hudBoot = document.getElementById('intro-hud-boot');
    const letterboxTop = document.getElementById('letterbox-top');
    const letterboxBottom = document.getElementById('letterbox-bottom');
    const portalStage = document.getElementById('intro-portals-stage');

    const tl = gsap.timeline();

    // Act I: The Quiet Boot-Up (0 to 2s)
    tl.to({}, { duration: 0.1 })
      .call(() => {
        if (hudBoot) hudBoot.classList.add('visible');
        synthEngine.playEngineDrone(2.5);
      })
      .to(this, { warpSpeed: 2.2, duration: 1.8, ease: 'sine.in' })

    // Act II: The Lightspeed Warp & Chromatic Surge (2 to 5s)
    tl.call(() => {
        if (hudBoot) hudBoot.classList.remove('visible');
        synthEngine.playWarpSwoosh(3.0);
      })
      .to(this, {
        warpSpeed: 40.0,
        streakLength: 45.0,
        duration: 2.8,
        ease: 'power2.inOut'
      })

    // Act III: Entering Orbit & Nebula Atmosphere (5 to 7s)
    tl.to(this, {
        warpSpeed: 0.8,
        streakLength: 1.2,
        duration: 2.2,
        ease: 'power3.out'
      })
      .to(this.nebulaMaterial ? this.nebulaMaterial.uniforms.u_opacity : {}, {
        value: 0.95,
        duration: 1.8
      }, '-=1.8')
      .call(() => {
        if (letterboxTop) letterboxTop.classList.add('retracted');
        if (letterboxBottom) letterboxBottom.classList.add('retracted');
        synthEngine.playArrivalChime();
        synthEngine.startCosmicAtmosphere();
      }, null, '-=1.2')

    // Act IV: The Portals of Identity (7s onward)
    tl.call(() => {
      if (portalStage) portalStage.classList.add('active');
    });
  }

  skipToPortals() {
    const letterboxTop = document.getElementById('letterbox-top');
    const letterboxBottom = document.getElementById('letterbox-bottom');
    const portalStage = document.getElementById('intro-portals-stage');
    if (letterboxTop) letterboxTop.classList.add('retracted');
    if (letterboxBottom) letterboxBottom.classList.add('retracted');
    if (portalStage) portalStage.classList.add('active');
    if (this.nebulaMaterial) this.nebulaMaterial.uniforms.u_opacity.value = 0.95;
    this.warpSpeed = 0.8;
    this.streakLength = 1.0;
    synthEngine.startCosmicAtmosphere();
  }

  bindInteractions() {
    const patrickCard = document.getElementById('portal-patrick');
    const yangieeCard = document.getElementById('portal-yangiee');

    const setupInteractivePortal = (card, btnSelector, persona, chordFn) => {
      if (!card) return;

      card.addEventListener('mouseenter', () => chordFn());

      const handleTrigger = (e) => {
        if (e && e.cancelable && e.type === 'touchend') {
          e.preventDefault();
        }
        if (e && e.stopPropagation) {
          e.stopPropagation();
        }
        this.selectPersona(persona, e);
      };

      card.addEventListener('click', handleTrigger);
      card.addEventListener('touchend', handleTrigger);
      card.addEventListener('pointerup', handleTrigger);

      const btn = card.querySelector(btnSelector);
      if (btn) {
        btn.addEventListener('click', handleTrigger);
        btn.addEventListener('touchend', handleTrigger);
        btn.addEventListener('pointerup', handleTrigger);
      }
    };

    setupInteractivePortal(patrickCard, '.portal-choose-btn', 'pat', () => synthEngine.playPatrickChord());
    setupInteractivePortal(yangieeCard, '.portal-choose-btn', 'yang', () => synthEngine.playYangieeChord());
  }

  selectPersona(persona, event) {
    if (this.isSelecting) return;
    this.isSelecting = true;

    this.stardustTrailParticles = [];
    if (this.supernovaCtx && this.supernovaCanvas) {
      this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);
    }

    const normalized = (persona === 'yang' || persona === 'yangiee') ? 'yang' : 'pat';

    KiroState.setPersona(normalized);
    KiroState.set('hasCompletedIntro', true);

    try {
      synthEngine.stopCosmicAtmosphere(0.3);
      synthEngine.playSupernovaSound();
    } catch (e) {
      console.warn('Audio play error on selection:', e);
    }

    const appUi = document.getElementById('app-ui');
    if (appUi) {
      appUi.classList.add('visible');
      appUi.style.opacity = '1';
      appUi.style.pointerEvents = 'auto';
    }

    if (this.overlay) {
      this.overlay.classList.add('hidden');
      this.overlay.style.opacity = '0';
      this.overlay.style.pointerEvents = 'none';
      this.overlay.style.display = 'none';
    }

    this.dispose();
    document.body.style.pointerEvents = 'auto';

    if (this.onComplete) {
      this.onComplete(normalized);
    }
  }

  replay() {
    this.dispose();
    this.isDisposed = false;
    this.isSelecting = false;
    this.warpSpeed = 1.0;
    this.streakLength = 0.5;

    if (this.overlay) {
      this.overlay.innerHTML = '';
      this.overlay.classList.remove('hidden');
      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = '1';
      this.overlay.style.pointerEvents = 'auto';
    }

    const appUi = document.getElementById('app-ui');
    if (appUi) {
      appUi.classList.remove('visible');
      appUi.style.opacity = '0';
      appUi.style.pointerEvents = 'none';
    }

    this.init(true);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    synthEngine.stopCosmicAtmosphere(0.1);

    if (this.supernovaCtx && this.supernovaCanvas) {
      this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);
    }

    if (this.starLines) {
      if (this.starLines.geometry) this.starLines.geometry.dispose();
      if (this.starLines.material) this.starLines.material.dispose();
    }

    if (this.nebulaMesh) {
      if (this.nebulaMesh.geometry) this.nebulaMesh.geometry.dispose();
      if (this.nebulaMesh.material) this.nebulaMesh.material.dispose();
    }

    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.starData = [];
    this.stardustTrailParticles = [];
    this.supernovaParticles = [];

    if (this.overlay) {
      this.overlay.innerHTML = '';
      this.overlay.classList.add('hidden');
      this.overlay.style.display = 'none';
      this.overlay.style.pointerEvents = 'none';
    }
  }
}
