/**
 * intro.js
 * High-Fidelity 4-Act Lightspeed Warp Sequence & Identity Portal Selection (ES6 Module)
 * 
 * Act I: The Quiet Boot-Up (0-2s) - Midnight screen, letterbox bars, minimal HUD boot text, warm engine drone.
 * Act II: The Lightspeed Warp (2-5s) - 800 golden stardust streaks, camera rush, white noise swoosh & sub rumble.
 * Act III: Entering Orbit (5-7s) - Smooth braking, stardust sparkles, letterbox retraction, arrival chime.
 * Act IV: Portals of Identity (7s+) - Patrick & Yangiee glassmorphic portals, chords on hover, mini-supernova on selection.
 */

import { KiroState } from '../state.js';
import { synthEngine } from '../audio/synth.js';

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
    this.animFrameId = null;
    this.isDisposed = false;

    // Supernova canvas
    this.supernovaCanvas = null;
    this.supernovaCtx = null;
    this.supernovaParticles = [];

    this.init();
  }

  init() {
    if (!this.overlay) return;

    // Check if persona already selected and we are not in replay mode
    if (this.selectedPersona && KiroState.get('hasCompletedIntro')) {
      this.overlay.classList.add('hidden');
      if (this.onComplete) this.onComplete(this.selectedPersona);
      return;
    }

    this.renderDOM();
    this.initThree();
    this.bindInteractions();
    this.runTimeline();
  }

  renderDOM() {
    this.overlay.innerHTML = `
      <!-- Three.js Canvas -->
      <canvas id="intro-three-canvas"></canvas>

      <!-- Supernova FX Canvas -->
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
            Cosmic Alignment
          </div>
          <h2 class="intro-stage-title">Select Sanctuary Portal</h2>
        </div>

        <div class="persona-portals-grid">
          <!-- Patrick's Portal -->
          <div class="portal-card patrick" id="portal-patrick" data-persona="patrick">
            <div class="portal-avatar-wrapper">
              <svg class="portal-avatar-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer Space Helmet Circle -->
                <circle cx="32" cy="32" r="26" stroke="#4EC9B0" stroke-width="2.5" fill="rgba(78, 201, 176, 0.12)"/>
                <!-- Helmet Dome -->
                <path d="M18 34C18 24.0589 24.268 16 32 16C39.732 16 46 24.0589 46 34C46 41 40 46 32 46C24 46 18 41 18 34Z" fill="#2E4A56" stroke="#4EC9B0" stroke-width="2"/>
                <!-- Glass Visor with Deep Space Gloss -->
                <rect x="22" y="24" width="20" height="14" rx="7" fill="#0D1622" stroke="#4EC9B0" stroke-width="1.5"/>
                <!-- Visor Cyan Reflection -->
                <path d="M26 27C27.5 25.5 30 25 33 25" stroke="#4EC9B0" stroke-width="2" stroke-linecap="round"/>
                <circle cx="38" cy="27" r="1.5" fill="#FFFFFF" opacity="0.85"/>
                <!-- Helmet Antenna -->
                <line x1="32" y1="16" x2="32" y2="10" stroke="#4EC9B0" stroke-width="2" stroke-linecap="round"/>
                <circle cx="32" cy="9" r="2" fill="#4EC9B0"/>
              </svg>
            </div>
            <div class="portal-meta">
              <div class="portal-name">Patrick</div>
              <div class="portal-role">The Anchor • Malaybalay</div>
              <div class="portal-tap-hint">Tap to Enter</div>
            </div>
          </div>

          <!-- Yangiee's Portal -->
          <div class="portal-card yangiee" id="portal-yangiee" data-persona="yangiee">
            <div class="portal-avatar-wrapper">
              <svg class="portal-avatar-svg" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Outer Halo Circle -->
                <circle cx="32" cy="32" r="26" stroke="#FFB6C1" stroke-width="2.5" fill="rgba(255, 182, 193, 0.12)"/>
                <!-- Cat Ears -->
                <path d="M19 28L15 15L28 20" stroke="#FFB6C1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255, 182, 193, 0.3)"/>
                <path d="M45 28L49 15L36 20" stroke="#FFB6C1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="rgba(255, 182, 193, 0.3)"/>
                <!-- Cute Cat Face Head -->
                <ellipse cx="32" cy="35" rx="16" ry="13" fill="#FFE4E8" stroke="#FFB6C1" stroke-width="2"/>
                <!-- Eyes -->
                <ellipse cx="26" cy="34" rx="2.5" ry="3" fill="#1B2A38"/>
                <ellipse cx="38" cy="34" rx="2.5" ry="3" fill="#1B2A38"/>
                <circle cx="25" cy="33" r="0.8" fill="#FFF"/>
                <circle cx="37" cy="33" r="0.8" fill="#FFF"/>
                <!-- Cute Nose & Mouth -->
                <path d="M31 38L32 39L33 38" stroke="#F5B7C0" stroke-width="1.5" stroke-linecap="round"/>
                <!-- Blushing Cheeks -->
                <circle cx="21" cy="37" r="2.5" fill="#FFB6C1" opacity="0.6"/>
                <circle cx="43" cy="37" r="2.5" fill="#FFB6C1" opacity="0.6"/>
              </svg>
            </div>
            <div class="portal-meta">
              <div class="portal-name">Yangiee</div>
              <div class="portal-role">The Catalyst • Capas</div>
              <div class="portal-tap-hint">Tap to Enter</div>
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

  /* Three.js Particle Warp Scene */
  initThree() {
    const canvas = document.getElementById('intro-three-canvas');
    if (!canvas || !window.THREE) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0018);

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

    // Build 800 Stardust Light Line Segments
    const positions = new Float32Array(this.starCount * 6);
    const colors = new Float32Array(this.starCount * 6);

    const goldColor = new THREE.Color(0xF9E2AF);
    const mintColor = new THREE.Color(0x4EC9B0);
    const pinkColor = new THREE.Color(0xFFB6C1);

    for (let i = 0; i < this.starCount; i++) {
      // Cylinder distribution along Z tunnel
      const radius = 8 + Math.random() * 85;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 1400;
      const speed = 0.5 + Math.random() * 1.5;

      this.starData.push({ x, y, z, baseZ: z, speed, radius, angle });

      const pIdx = i * 6;
      positions[pIdx] = x;
      positions[pIdx + 1] = y;
      positions[pIdx + 2] = z;
      positions[pIdx + 3] = x;
      positions[pIdx + 4] = y;
      positions[pIdx + 5] = z - this.streakLength;

      // Color variation
      let c = goldColor;
      if (i % 7 === 0) c = mintColor;
      else if (i % 9 === 0) c = pinkColor;

      colors[pIdx] = c.r;
      colors[pIdx + 1] = c.g;
      colors[pIdx + 2] = c.b;
      colors[pIdx + 3] = c.r * 1.2;
      colors[pIdx + 4] = c.g * 1.2;
      colors[pIdx + 5] = c.b * 1.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5
    });

    this.starLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.starLines);

    // Nebula Backdrop for Act III & IV
    const nebulaGeo = new THREE.PlaneGeometry(1600, 1000);
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: 0x0D1622,
      transparent: true,
      opacity: 0.0
    });
    this.nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
    this.nebulaMesh.position.z = -600;
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

  animate() {
    if (this.isDisposed) return;
    this.animFrameId = requestAnimationFrame(this.animate.bind(this));

    if (!this.starLines) return;

    const positions = this.starLines.geometry.attributes.position.array;

    for (let i = 0; i < this.starCount; i++) {
      const star = this.starData[i];
      const pIdx = i * 6;

      // Advance star towards camera
      star.z += star.speed * this.warpSpeed;

      // Loop particles in tunnel
      if (star.z > 250) {
        star.z = -1200;
      }

      // Gentle orbital spin
      star.angle += 0.0006 * (this.warpSpeed > 5 ? 2.5 : 1);
      const curX = Math.cos(star.angle) * star.radius;
      const curY = Math.sin(star.angle) * star.radius;

      // Start point
      positions[pIdx] = curX;
      positions[pIdx + 1] = curY;
      positions[pIdx + 2] = star.z;

      // End point (stretched streak)
      positions[pIdx + 3] = curX;
      positions[pIdx + 4] = curY;
      positions[pIdx + 5] = star.z - this.streakLength;
    }

    this.starLines.geometry.attributes.position.needsUpdate = true;

    // Subtle camera drift
    this.camera.rotation.z += 0.0005 * (this.warpSpeed > 5 ? 4 : 1);

    this.renderer.render(this.scene, this.camera);
  }

  /* GSAP 4-Act Cinematic Director */
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
      .to(this, { warpSpeed: 2.0, duration: 1.8, ease: 'sine.in' })

    // Act II: The Lightspeed Warp (2 to 5s)
    tl.call(() => {
        if (hudBoot) hudBoot.classList.remove('visible');
        synthEngine.playWarpSwoosh(3.0);
      })
      .to(this, {
        warpSpeed: 38.0,
        streakLength: 42.0,
        duration: 2.8,
        ease: 'power2.inOut'
      })

    // Act III: Entering Orbit & Braking (5 to 7s)
    tl.to(this, {
        warpSpeed: 0.8,
        streakLength: 1.2,
        duration: 2.2,
        ease: 'power3.out'
      })
      .to(this.nebulaMesh ? this.nebulaMesh.material : {}, {
        opacity: 0.85,
        duration: 1.5
      }, '-=1.8')
      .call(() => {
        if (letterboxTop) letterboxTop.classList.add('retracted');
        if (letterboxBottom) letterboxBottom.classList.add('retracted');
        synthEngine.playArrivalChime();
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
    this.warpSpeed = 0.8;
    this.streakLength = 1.0;
  }

  bindInteractions() {
    const patrickCard = document.getElementById('portal-patrick');
    const yangieeCard = document.getElementById('portal-yangiee');

    // Patrick Audio & Hover
    if (patrickCard) {
      patrickCard.addEventListener('mouseenter', () => synthEngine.playPatrickChord());
      patrickCard.addEventListener('click', (e) => this.selectPersona('patrick', e));
    }

    // Yangiee Audio & Hover
    if (yangieeCard) {
      yangieeCard.addEventListener('mouseenter', () => synthEngine.playYangieeChord());
      yangieeCard.addEventListener('click', (e) => this.selectPersona('yangiee', e));
    }
  }

  /* Selection: Mini-Supernova & State Transition */
  selectPersona(persona, event) {
    if (this.isSelecting) return;
    this.isSelecting = true;

    KiroState.setPersona(persona);
    KiroState.set('hasCompletedIntro', true);

    // Audio Supernova Burst
    synthEngine.playSupernovaSound();

    // Trigger 2D/3D Radial Stardust Explosion
    const rect = event.currentTarget.getBoundingClientRect();
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const particleColor = persona === 'patrick' ? '#4EC9B0' : '#FFB6C1';

    this.triggerSupernovaBurst(originX, originY, particleColor, () => {
      // Fade out overlay & complete
      this.overlay.classList.add('hidden');
      setTimeout(() => {
        this.dispose();
        if (this.onComplete) this.onComplete(persona);
      }, 700);
    });
  }

  triggerSupernovaBurst(x, y, colorHex, doneCallback) {
    if (!this.supernovaCanvas || !this.supernovaCtx) {
      if (doneCallback) doneCallback();
      return;
    }

    const count = 140;
    this.supernovaParticles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 18;
      const size = 2 + Math.random() * 5;
      const life = 1.0;
      const decay = 0.015 + Math.random() * 0.025;

      this.supernovaParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        life,
        decay,
        color: colorHex
      });
    }

    const renderBurst = () => {
      if (!this.supernovaCtx) return;
      this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);

      let aliveCount = 0;
      for (let i = 0; i < this.supernovaParticles.length; i++) {
        const p = this.supernovaParticles[i];
        if (p.life > 0) {
          aliveCount++;
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          p.life -= p.decay;

          this.supernovaCtx.beginPath();
          this.supernovaCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          this.supernovaCtx.fillStyle = p.color;
          this.supernovaCtx.globalAlpha = Math.max(0, p.life);
          this.supernovaCtx.shadowBlur = 10;
          this.supernovaCtx.shadowColor = p.color;
          this.supernovaCtx.fill();
        }
      }

      if (aliveCount > 0) {
        requestAnimationFrame(renderBurst);
      } else {
        this.supernovaCtx.clearRect(0, 0, this.supernovaCanvas.width, this.supernovaCanvas.height);
        if (doneCallback) doneCallback();
      }
    };

    renderBurst();
  }

  replay() {
    this.isDisposed = false;
    this.isSelecting = false;
    this.overlay.classList.remove('hidden');
    this.init();
  }

  dispose() {
    this.isDisposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    if (this.starLines) {
      if (this.starLines.geometry) this.starLines.geometry.dispose();
      if (this.starLines.material) this.starLines.material.dispose();
    }

    if (this.nebulaMesh) {
      if (this.nebulaMesh.geometry) this.nebulaMesh.geometry.dispose();
      if (this.nebulaMesh.material) this.nebulaMesh.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.starData = [];
  }
}
