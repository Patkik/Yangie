/**
 * cor-amoris.js — Cor Amoris Scavenger Hunt & Memorial Archive Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated engine for the Anniversary Scavenger Hunt (01-27-2024)
 * 
 * Features:
 * 1. Double-Ledger Wallet HUD & Synchronization
 * 2. Kiro Guidance System, Monologue HUD & 20s Viewport Idle-Hint Timer
 * 3. Bottom Navigation Constellation Dock (✧ ✧ ✧)
 * 4. Quest 1: 3-Tap RGB Color Interpolation Shader Modal (Kepler Squishy -> "01")
 * 5. Quest 2: Trappist-1 27-Point Starlight Catch Event ("27")
 * 6. Quest 3: 3-Second Weather Stardate Detachment & Physics Drop ("2024")
 * 7. Zero-Clutter Stargate Dial Drag-and-Drop Resonance Lock
 * 8. Grand Emotional Cutscene with Twin Suns, Crystal Bridge & Stardust Letter
 * 9. Memorial Archive with Backdrop Switcher, Love Notes Ledger & "Under the Same Sky"
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';

export class CorAmorisEngine {
  constructor() {
    this.lastInteractionTime = Date.now();
    this.idleHintTimer = null;
    this.squishyShaderActive = false;
    this.squishyTapCount = 0;
    this.stardatePressTimer = null;
    this.stardatePressDuration = 0;
    this.isCutscenePlaying = false;

    this.init();
  }

  init() {
    this.bindIdleTracker();
    this.bindEvents();
    this.startIdleMonitor();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Idle Tracker & 20-Second Contextual Hint Engine
  // ─────────────────────────────────────────────────────────────────────────

  bindIdleTracker() {
    const resetIdle = () => {
      this.lastInteractionTime = Date.now();
      const hintEl = document.getElementById('kiro-idle-hint-bubble');
      if (hintEl && !hintEl.classList.contains('hidden') && !this.isCutscenePlaying) {
        hintEl.classList.add('hidden');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', resetIdle, { passive: true });
      window.addEventListener('pointermove', resetIdle, { passive: true });
      window.addEventListener('keydown', resetIdle, { passive: true });
      window.addEventListener('touchstart', resetIdle, { passive: true });
    }
  }

  startIdleMonitor() {
    if (typeof window === 'undefined') return;
    if (this.idleHintTimer) clearInterval(this.idleHintTimer);

    this.idleHintTimer = setInterval(() => {
      if (this.isCutscenePlaying) return;
      const corState = KiroState.getCorAmorisState();
      if (!corState || corState.unlocked) return;

      const elapsed = Date.now() - this.lastInteractionTime;
      if (elapsed >= 20000) {
        this.showContextualIdleHint();
      }
    }, 5000);
  }

  showContextualIdleHint() {
    const corState = KiroState.getCorAmorisState();
    if (!corState) return;

    let hintText = '';
    if (!corState.fragments['01']) {
      hintText = '✦ A squishy memory in Kepler-186 Outpost holds the spark of the beginning... 3 taps reveal its warmth.';
    } else if (!corState.fragments['27']) {
      hintText = '✦ In Trappist-1\'s rhythm, score 27 starlight catches to align the celestial tempo.';
    } else if (!corState.fragments['2024']) {
      hintText = '✦ The Genesis Year sleeps inside the Capsule Core Weather Stardate... hold it gently for 3 seconds.';
    } else if (!corState.gateAligned) {
      hintText = '✦ All 3 fragments are anchored in your Satchel! Tap the Stargate dial to synchronize the Resonance Lock.';
    } else {
      return;
    }

    const hintEl = document.getElementById('kiro-idle-hint-bubble');
    const hintTextEl = document.getElementById('kiro-idle-hint-text');
    if (hintEl && hintTextEl) {
      hintTextEl.textContent = hintText;
      hintEl.classList.remove('hidden');
      synthEngine.playAlienChirp(synthEngine.ctx, 1.2);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Monologue Opening Invitation HUD
  // ─────────────────────────────────────────────────────────────────────────

  showOpeningMonologue() {
    const modal = document.getElementById('cor-amoris-monologue-modal');
    const textEl = document.getElementById('cor-amoris-monologue-text');
    if (!modal || !textEl) return;

    modal.classList.remove('hidden');
    const fullText = 'Yang, the stars have aligned to form a bridge back to where it all began. Kiro has found fragments of a date scattered across the Kepler and Trappist systems. Only your resonance can anchor them. Will you join Pat in the Haven to reclaim our Genesis Year?';
    
    textEl.textContent = '';
    let charIdx = 0;
    synthEngine.playCrystalChime(523.25);

    const typeInterval = setInterval(() => {
      if (charIdx < fullText.length) {
        textEl.textContent += fullText[charIdx];
        if (charIdx % 4 === 0) {
          synthEngine.playAlienChirp(synthEngine.ctx, 1.4);
        }
        charIdx++;
      } else {
        clearInterval(typeInterval);
      }
    }, 28);
  }

  hideOpeningMonologue() {
    const modal = document.getElementById('cor-amoris-monologue-modal');
    if (modal) modal.classList.add('hidden');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Quest 1: Kepler-186 Cosmic Memory Squishy (3-Tap Shader Modal)
  // ─────────────────────────────────────────────────────────────────────────

  openMemorySquishyModal() {
    const modal = document.getElementById('cor-amoris-squishy-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.squishyTapCount = 0;
    this.updateSquishyTapVisuals();
    this.initSquishyShader();
  }

  closeMemorySquishyModal() {
    const modal = document.getElementById('cor-amoris-squishy-modal');
    if (modal) modal.classList.add('hidden');
    this.squishyShaderActive = false;
  }

  handleSquishyTap() {
    this.squishyTapCount = Math.min(3, this.squishyTapCount + 1);
    this.updateSquishyTapVisuals();

    if (this.squishyTapCount === 1) {
      synthEngine.playElasticPop(synthEngine.ctx);
    } else if (this.squishyTapCount === 2) {
      synthEngine.playCozyPurr(synthEngine.ctx);
      synthEngine.playCrystalChime(440.0);
    } else if (this.squishyTapCount === 3) {
      synthEngine.playElasticPop(synthEngine.ctx);
      synthEngine.playCrystalChime(523.25);
      KiroState.unlockCorAmorisFragment('01');
      
      const glyphEl = document.getElementById('squishy-revealed-glyph');
      if (glyphEl) {
        glyphEl.classList.remove('hidden');
        glyphEl.classList.add('pop-stardust-burst');
      }

      setTimeout(() => {
        this.closeMemorySquishyModal();
        this.showQuestCompletionNotification('01', 'Touch of Beginning Unlocked! Added to Satchel.');
      }, 1800);
    }
  }

  updateSquishyTapVisuals() {
    const badge = document.getElementById('squishy-tap-progress-badge');
    if (badge) {
      badge.textContent = `Resonance Taps: ${this.squishyTapCount}/3`;
    }
  }

  initSquishyShader() {
    const canvas = document.getElementById('squishy-shader-canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_pos;
      void main() {
        gl_Position = vec4(a_pos, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform float u_time;
      uniform float u_tap_count;
      uniform vec2 u_resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        vec2 center = vec2(0.5);
        float dist = distance(uv, center);

        vec3 colIndigo = vec3(0.08, 0.05, 0.20);
        vec3 colRose   = vec3(0.76, 0.38, 0.56);
        vec3 colMint   = vec3(0.31, 0.79, 0.69);

        float tapFactor = clamp(u_tap_count / 3.0, 0.0, 1.0);
        vec3 baseCol = mix(colIndigo, colRose, tapFactor);

        float wave = sin(dist * 20.0 - u_time * 4.0) * 0.1;
        float circle = smoothstep(0.45 + wave, 0.1, dist);

        vec3 finalCol = mix(baseCol, colMint, tapFactor * circle * 0.5);
        gl_FragColor = vec4(finalCol * circle, circle * 0.95);
      }
    `;

    const createShader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uTap = gl.getUniformLocation(program, 'u_tap_count');
    const uRes = gl.getUniformLocation(program, 'u_resolution');

    this.squishyShaderActive = true;
    let startTime = performance.now();

    const render = () => {
      if (!this.squishyShaderActive) return;
      const elapsed = (performance.now() - startTime) / 1000.0;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uTime, elapsed);
      gl.uniform1f(uTap, this.squishyTapCount);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };
    render();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Quest 2: Trappist-1 27 Points Handler
  // ─────────────────────────────────────────────────────────────────────────

  handleTrappistScoreTrigger(score) {
    if (score !== 27) return;
    const corState = KiroState.getCorAmorisState();
    if (corState && corState.fragments['27']) return;

    synthEngine.playTrappistBandpassSweep();
    setTimeout(() => {
      synthEngine.playMusicBoxMelody();
      synthEngine.playCrystalChime(659.25);
      KiroState.unlockCorAmorisFragment('27');
      this.showQuestCompletionNotification('27', 'Rhythm of Us Unlocked! Added to Satchel.');
    }, 1200);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Quest 3: Weather Station Stardate 3-Second Detachment
  // ─────────────────────────────────────────────────────────────────────────

  bindStardateLongPress() {
    const stardateBadges = document.querySelectorAll('.capsule-stardate-val, #weather-stardate-badge, #stardate-quest-target');
    stardateBadges.forEach(el => {
      if (!el) return;

      const startPress = () => {
        const corState = KiroState.getCorAmorisState();
        if (corState && corState.fragments['2024']) return;

        el.classList.add('stardate-detaching-pulse');
        this.stardatePressDuration = 0;
        synthEngine.playAlienChirp(synthEngine.ctx, 1.0);

        this.stardatePressTimer = setInterval(() => {
          this.stardatePressDuration += 100;
          if (this.stardatePressDuration >= 3000) {
            clearInterval(this.stardatePressTimer);
            this.stardatePressTimer = null;
            this.detachStardateElement(el);
          }
        }, 100);
      };

      const cancelPress = () => {
        if (this.stardatePressTimer) {
          clearInterval(this.stardatePressTimer);
          this.stardatePressTimer = null;
        }
        el.classList.remove('stardate-detaching-pulse');
      };

      el.addEventListener('pointerdown', startPress);
      el.addEventListener('pointerup', cancelPress);
      el.addEventListener('pointerleave', cancelPress);
      el.addEventListener('touchend', cancelPress);
    });
  }

  detachStardateElement(el) {
    el.classList.remove('stardate-detaching-pulse');
    el.classList.add('stardate-physics-detached');
    synthEngine.playElasticPop(synthEngine.ctx);
    synthEngine.playCrystalChime(783.99);

    const floating2024 = document.getElementById('floating-2024-fragment');
    if (floating2024) {
      floating2024.classList.remove('hidden');
      floating2024.style.left = '50%';
      floating2024.style.top = '40%';
    }

    setTimeout(() => {
      KiroState.unlockCorAmorisFragment('2024');
      if (floating2024) floating2024.classList.add('hidden');
      this.showQuestCompletionNotification('2024', 'Genesis Year 2024 Unlocked! Added to Satchel.');
    }, 1500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Stargate Dial Resonance Lock Drag-and-Drop
  // ─────────────────────────────────────────────────────────────────────────

  openStargateDialModal() {
    const modal = document.getElementById('cor-amoris-stargate-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.updateStargateSlotsUI();
    synthEngine.playCrystalChime(523.25);
  }

  closeStargateDialModal() {
    const modal = document.getElementById('cor-amoris-stargate-modal');
    if (modal) modal.classList.add('hidden');
  }

  updateStargateSlotsUI() {
    const corState = KiroState.getCorAmorisState();
    if (!corState) return;

    const slot01 = document.getElementById('stargate-slot-01');
    const slot27 = document.getElementById('stargate-slot-27');
    const slot2024 = document.getElementById('stargate-slot-2024');

    if (slot01) slot01.classList.toggle('locked', Boolean(corState.fragments['01']));
    if (slot27) slot27.classList.toggle('locked', Boolean(corState.fragments['27']));
    if (slot2024) slot2024.classList.toggle('locked', Boolean(corState.fragments['2024']));

    const alignBtn = document.getElementById('btn-align-stargate');
    const allCollected = corState.fragments['01'] && corState.fragments['27'] && corState.fragments['2024'];
    if (alignBtn) {
      alignBtn.disabled = !allCollected;
      alignBtn.textContent = allCollected ? '✦ Synchronize Resonance Lock ✦' : 'Gather All 3 Fragments (01-27-2024)';
    }
  }

  triggerResonanceLockAlignment() {
    const corState = KiroState.getCorAmorisState();
    if (!corState) return;

    const allCollected = corState.fragments['01'] && corState.fragments['27'] && corState.fragments['2024'];
    if (!allCollected) return;

    this.closeStargateDialModal();
    KiroState.alignStargate();
    this.playGrandCutscene();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. The Grand Emotional Sequence (Visual Supremacy Cutscene)
  // ─────────────────────────────────────────────────────────────────────────

  playGrandCutscene() {
    this.isCutscenePlaying = true;
    document.body.style.pointerEvents = 'none';

    const cutsceneOverlay = document.getElementById('cor-amoris-cutscene-overlay');
    const sceneShatter = document.getElementById('cutscene-scene-shatter');
    const sceneCathedral = document.getElementById('cutscene-scene-cathedral');
    const sceneDeclaration = document.getElementById('cutscene-scene-declaration');
    const sceneBadge = document.getElementById('cutscene-scene-badge');

    if (!cutsceneOverlay) return;
    cutsceneOverlay.classList.remove('hidden');

    // Scene 1: The Shatter (0.0s - 2.5s)
    if (sceneShatter) sceneShatter.classList.remove('hidden');
    synthEngine.playStargateShatterFX();

    setTimeout(() => {
      // Scene 2: The Cosmic Cathedral & Twin Suns (2.5s - 6.5s)
      if (sceneShatter) sceneShatter.classList.add('hidden');
      if (sceneCathedral) sceneCathedral.classList.remove('hidden');
      synthEngine.playUnderTheSameSky();

      // Scene 3: The Declaration (6.5s - 13.0s)
      setTimeout(() => {
        if (sceneCathedral) sceneCathedral.classList.add('hidden');
        if (sceneDeclaration) sceneDeclaration.classList.remove('hidden');

        // Scene 4: Core Lock Badge (13.0s - 18.0s)
        setTimeout(() => {
          if (sceneDeclaration) sceneDeclaration.classList.add('hidden');
          if (sceneBadge) sceneBadge.classList.remove('hidden');
          synthEngine.playCrystalChime(783.99);

          // Finalization & Unlock
          setTimeout(() => {
            if (sceneBadge) sceneBadge.classList.add('hidden');
            cutsceneOverlay.classList.add('hidden');
            this.isCutscenePlaying = false;
            document.body.style.pointerEvents = 'auto';

            KiroState.completeCorAmorisQuest();
            this.openMemorialArchiveModal();
          }, 4500);
        }, 6500);
      }, 4000);
    }, 2500);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Memorial Archive Modal & Permanent Persistence
  // ─────────────────────────────────────────────────────────────────────────

  openMemorialArchiveModal() {
    const modal = document.getElementById('cor-amoris-archive-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.renderMemorialNotes();
    this.updateBackdropSwitcherUI();
  }

  closeMemorialArchiveModal() {
    const modal = document.getElementById('cor-amoris-archive-modal');
    if (modal) modal.classList.add('hidden');
  }

  renderMemorialNotes() {
    const listEl = document.getElementById('cor-amoris-notes-list');
    if (!listEl) return;

    const corState = KiroState.getCorAmorisState();
    const notes = corState ? corState.memorialNotes : [];

    if (notes.length === 0) {
      listEl.innerHTML = `
        <div class="archive-empty-placeholder">
          <span>✧ The Crystal Bridge is open. Write your first mutual love note or memorial snapshot below.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = notes.map(n => `
      <div class="archive-note-card ${n.author === 'pat' ? 'author-pat' : 'author-yang'}">
        <div class="note-card-header">
          <span class="note-author-badge">${n.author === 'pat' ? '● ✦ Patrick' : '● ✦ Yangiee'}</span>
          <span class="note-time-badge">${new Date(n.timestamp).toLocaleDateString()}</span>
        </div>
        <p class="note-card-text">${this.escapeHtml(n.text)}</p>
        ${n.image ? `<img class="note-card-image" src="${n.image}" alt="Memorial Snapshot" />` : ''}
      </div>
    `).join('');
  }

  submitNewMemorialNote() {
    const inputEl = document.getElementById('cor-amoris-note-input');
    if (!inputEl || !inputEl.value.trim()) return;

    const text = inputEl.value.trim();
    KiroState.addMemorialNote({ text });
    inputEl.value = '';
    synthEngine.playAlienChirp(synthEngine.ctx, 1.2);
    this.renderMemorialNotes();
  }

  updateBackdropSwitcherUI() {
    const corState = KiroState.getCorAmorisState();
    const current = corState ? corState.backdrop : 'default';
    const buttons = document.querySelectorAll('.backdrop-pill-btn');
    buttons.forEach(btn => {
      const bid = btn.getAttribute('data-backdrop');
      btn.classList.toggle('active', bid === current);
    });
  }

  setCelestialBackdrop(backdropId) {
    KiroState.setBackdrop(backdropId);
    this.updateBackdropSwitcherUI();
    synthEngine.playCrystalChime(659.25);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Satchel & Constellation Dock UI
  // ─────────────────────────────────────────────────────────────────────────

  openSatchelModal() {
    const modal = document.getElementById('cor-amoris-satchel-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    this.updateSatchelUI();
    synthEngine.playElasticPop(synthEngine.ctx);
  }

  closeSatchelModal() {
    const modal = document.getElementById('cor-amoris-satchel-modal');
    if (modal) modal.classList.add('hidden');
  }

  updateSatchelUI() {
    const corState = KiroState.getCorAmorisState();
    if (!corState) return;

    const frag01 = document.getElementById('satchel-item-01');
    const frag27 = document.getElementById('satchel-item-27');
    const frag2024 = document.getElementById('satchel-item-2024');

    if (frag01) frag01.classList.toggle('collected', Boolean(corState.fragments['01']));
    if (frag27) frag27.classList.toggle('collected', Boolean(corState.fragments['27']));
    if (frag2024) frag2024.classList.toggle('collected', Boolean(corState.fragments['2024']));
  }

  openResonanceWalletModal() {
    const modal = document.getElementById('cor-amoris-wallet-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    const patWallet = KiroState.getWallet('pat');
    const yangWallet = KiroState.getWallet('yang');

    const patEl = document.getElementById('resonance-wallet-pat-val');
    const yangEl = document.getElementById('resonance-wallet-yang-val');

    if (patEl) patEl.textContent = `✦ ${patWallet.toLocaleString()}`;
    if (yangEl) yangEl.textContent = `✦ ${yangWallet.toLocaleString()}`;

    synthEngine.playCrystalChime(523.25);
  }

  closeResonanceWalletModal() {
    const modal = document.getElementById('cor-amoris-wallet-modal');
    if (modal) modal.classList.add('hidden');
  }

  showQuestCompletionNotification(fragmentId, message) {
    const toast = document.getElementById('cor-amoris-quest-toast');
    const msgEl = document.getElementById('cor-amoris-toast-msg');
    if (toast && msgEl) {
      msgEl.textContent = `✦ [FRAGMENT ${fragmentId}] ${message}`;
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 4000);
    }
  }

  bindEvents() {
    this.bindStardateLongPress();

    // Listen to minigame events
    KiroState.on('minigame:score', (data) => {
      if (data && data.score !== undefined) {
        this.handleTrappistScoreTrigger(data.score);
      }
    });
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  destroy() {
    this.dispose();
  }

  dispose() {
    if (this.idleHintTimer) {
      clearInterval(this.idleHintTimer);
      this.idleHintTimer = null;
    }
    if (this.stardatePressTimer) {
      clearInterval(this.stardatePressTimer);
      this.stardatePressTimer = null;
    }
    this.squishyShaderActive = false;
  }
}

export const corAmorisEngine = new CorAmorisEngine();
if (typeof window !== 'undefined') {
  window.corAmorisEngine = corAmorisEngine;
}
export default corAmorisEngine;
