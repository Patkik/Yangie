/**
 * synth.js (Space Capsule V5.0 — Procedural Web Audio Engine)
 * ─────────────────────────────────────────────────────────────────────────────
 * 100% Offline-First Procedural Sound Synthesis Engine with Zero External Audio Files.
 * 
 * Features:
 * 1. Continuous Engine Thruster Synthesizer (Sawtooth 55Hz + Triangle 110Hz + BiquadFilter Q=6.0 + LFO)
 * 2. Real-Time Dynamic Cockpit Steering Speed Vector Pitch/Filter/Gain Modulation
 * 3. Audio-Reactive Analyser Bridge for 3D WebGL Aura & Pedestal Synesthesia
 * 4. Cozy Atmospheric Generators: Rain, Ocean Waves (0.12Hz LFO), Thunder, Forest Birds, Lo-Fi Beat
 * 5. Procedural Sound FX: Cartoon Chewing, Glass Water Droplets, Warp Swoosh, Portal Chords
 * 6. WebRTC Voice Recording Interface & Leak-Proof Node Disposal Lifecycle
 */

import { KiroState } from './state.js';

export class CosmicSynthEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.analyser = null;
    this.analyserData = null;
    this.isPlaying = false;
    this.atmosphereActive = false;

    // Sub-Gain Master Volume Levels
    const savedAudio = KiroState.get('audioSettings') || {};
    this.masterVolume = savedAudio.masterVolume ?? 0.85;
    this.sfxVolume = savedAudio.sfxVolume ?? 0.90;
    this.ambientVolume = savedAudio.ambientVolume ?? 0.75;
    this.cutenessPitchMultiplier = savedAudio.pitchMultiplier ?? 1.0;

    // Ambient Channels
    this.channels = {
      rain: { volume: 0, node: null, gainNode: null },
      thunder: { volume: 0, node: null, gainNode: null },
      ocean: { volume: 0, node: null, gainNode: null },
      forest: { volume: 0, node: null, gainNode: null },
      lofi: { volume: 0, node: null, gainNode: null }
    };

    // Thruster Synthesizer State (V5.0)
    this.thruster = {
      active: false,
      sawOsc: null,
      triOsc: null,
      lfoOsc: null,
      lfoGain: null,
      filterNode: null,
      gainNode: null,
      currentSpeed: 0.0 // 0.0 (idle hum) to 1.0 (full burn)
    };

    // Scheduled Timers
    this.thunderTimer = null;
    this.birdTimer = null;
    this.lofiInterval = null;

    // Media Recording Stream
    this.activeStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];

    // State Subscriptions
    KiroState.on('sound:volume', ({ channel, volume }) => {
      this.setVolume(channel, volume);
    });

    KiroState.on('audio:masterVolume', (val) => this.setMasterVolume(val));
    KiroState.on('audio:sfxVolume', (val) => this.setSfxVolume(val));
    KiroState.on('audio:ambientVolume', (val) => this.setAmbientVolume(val));
    KiroState.on('audio:pitchMultiplier', (val) => this.setCutenessPitchMultiplier(val));

    // Adaptive Resource Throttling (ART) & 30Hz Sub-Sampled FFT Cache
    this.fftThrottleMs = 33.3; // 30Hz max frequency resolution to protect main-thread frame budget
    this._lastFftTime = 0;
    this._cachedAudioLevel = 0.0;
    KiroState.on('art:scale_change', ({ audioFftRate }) => {
      this.fftThrottleMs = Math.max(33.3, (audioFftRate || 1) * 33.3);
    });

    // 120s AudioContext Inactivity Sleep Watchdog
    this.inactivityTimer = null;
    this.resetInactivityWatchdog();
    if (typeof window !== 'undefined') {
      ['touchstart', 'mousedown', 'keydown', 'pointerdown'].forEach(evt => {
        window.addEventListener(evt, () => this.resetInactivityWatchdog(), { passive: true });
      });
    }

    KiroState.on('cockpitSteering:change', (steering) => {
      if (steering) {
        const speed = Math.min(1.0, (Math.abs(steering.pitch || 0) + Math.abs(steering.yaw || 0)) / 80);
        this.updateThrusterSpeed(speed);
      }
    });

    KiroState.on('change:telescopeActive', ({ newValue }) => {
      if (newValue && !KiroState.get('minigameActive')) {
        this.startThruster();
      } else {
        this.stopThruster();
      }
    });

    KiroState.on('change:minigameActive', ({ newValue }) => {
      if (newValue) {
        this.stopThruster(0.05);
      }
    });

    // Cozy Eco-Battery Audio & Duty-Cycle Sleep Subscriptions
    this.isEcoAudio = KiroState.get('ecoModeActive') || false;
    this.isDutyCycleAsleep = false;

    KiroState.on('change:ecoModeActive', ({ newValue }) => {
      this.setEcoAudioMode(Boolean(newValue));
    });

    KiroState.on('sound:duty_cycle_sleep', () => {
      this.enterDutyCycleSleep();
    });

    KiroState.on('sound:duty_cycle_wake', () => {
      this.wakeFromDutyCycleSleep();
    });

    // Snoring & Cozy Sleep Breathing State
    this.snoreTimer = null;
    this.isSnoring = false;

    KiroState.on('sleep:change', ({ isSleeping }) => {
      if (isSleeping) {
        this.startSnoringBreathing();
      } else {
        this.stopSnoringBreathing();
      }
    });
  }

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // 1. Master Gain Node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    // 2. SFX Sub-Gain Node (Kiro vocals & SFX)
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // 3. Ambient Sub-Gain Node (Background space ambiance loops)
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Audio-Reactive Analyser Node for 3D Synesthesia (Aura & Ring Pulsing)
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize Procedural Generators
    this.initRain();
    this.initOcean();
    this.initThunder();
    this.initForest();
    this.initLofi();

    this.isPlaying = true;
  }

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1.0, parseFloat(val) || 0));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1.0, parseFloat(val) || 0));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.05);
    }
  }

  setAmbientVolume(val) {
    this.ambientVolume = Math.max(0, Math.min(1.0, parseFloat(val) || 0));
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(this.ambientVolume, this.ctx.currentTime, 0.05);
    }
  }

  setCutenessPitchMultiplier(val) {
    this.cutenessPitchMultiplier = Math.max(0.4, Math.min(2.4, parseFloat(val) || 1.0));
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }
  }

  /**
   * Cozy Eco-Battery Audio Mode Toggle
   * Smoothly silences continuous background loops to save mobile CPU cycles
   */
  setEcoAudioMode(enable) {
    this.isEcoAudio = Boolean(enable);
    if (!this.ctx) return;

    if (this.isEcoAudio) {
      // Smoothly ramp ambient channels to zero
      Object.values(this.channels).forEach(ch => {
        if (ch.gainNode && this.ctx) {
          ch.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        }
      });
    } else {
      // Restore ambient channel volumes
      Object.keys(this.channels).forEach(name => {
        const ch = this.channels[name];
        if (ch.gainNode && this.ctx && ch.volume > 0) {
          ch.gainNode.gain.setTargetAtTime(ch.volume, this.ctx.currentTime, 0.2);
        }
      });
      this.resume();
    }
  }

  /**
   * Web Audio Duty-Cycle Sleeping
   * Suspends AudioContext when device is idle (>2 mins) or asleep to let CPU sleep
   */
  enterDutyCycleSleep() {
    if (this.isDutyCycleAsleep || !this.ctx) return;
    this.isDutyCycleAsleep = true;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      setTimeout(() => {
        if (this.isDutyCycleAsleep && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend();
        }
      }, 200);
    }
  }

  /**
   * Wakes AudioContext immediately upon user interaction
   */
  wakeFromDutyCycleSleep() {
    if (!this.isDutyCycleAsleep || !this.ctx) return;
    this.isDutyCycleAsleep = false;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.15);
    }
  }

  resetInactivityWatchdog() {
    if (this.isDutyCycleAsleep) {
      this.wakeFromDutyCycleSleep();
    }
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      // If no ambient channel has active volume and thrusters are off, suspend context
      const hasActiveAmbient = Object.values(this.channels).some(ch => ch.volume > 0);
      if (!hasActiveAmbient && (!this.thruster || !this.thruster.active)) {
        this.enterDutyCycleSleep();
      }
    }, 120000); // 120-second watchdog
  }

  getAudioReactiveLevel() {
    if (!this.analyser || !this.analyserData || !this.isPlaying) return 0;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (this._lastFftTime && (now - this._lastFftTime < (this.fftThrottleMs || 33.3))) {
      return this._cachedAudioLevel || 0;
    }
    this._lastFftTime = now;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      sum += this.analyserData[i];
    }
    this._cachedAudioLevel = sum / (this.analyserData.length * 255); // Normalized 0.0 to 1.0
    return this._cachedAudioLevel;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Procedural Noise Buffer Generators
  // ─────────────────────────────────────────────────────────────────────────────

  createPinkNoiseBuffer() {
    const bufferSize = 2 * (this.ctx ? this.ctx.sampleRate : 44100);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return noiseBuffer;
  }

  createWhiteNoiseBuffer() {
    const bufferSize = 2 * (this.ctx ? this.ctx.sampleRate : 44100);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Procedural Engine Thruster Synthesizer (Ultra-Soft Cosmic Hum)
  // ─────────────────────────────────────────────────────────────────────────────

  startThruster() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.thruster.active) return;
    if (KiroState.get('minigameActive')) return;

    this.thruster.active = true;
    const now = this.ctx.currentTime;

    // 1. Soft Warm Sub Sine (42Hz Base)
    this.thruster.sawOsc = this.ctx.createOscillator();
    this.thruster.sawOsc.type = 'sine';
    this.thruster.sawOsc.frequency.setValueAtTime(42, now);

    // 2. Gentle Harmonic Sine (84Hz)
    this.thruster.triOsc = this.ctx.createOscillator();
    this.thruster.triOsc.type = 'sine';
    this.thruster.triOsc.frequency.setValueAtTime(84, now);

    // 3. Subtle LFO Pitch-Drift (0.10Hz rate, ±1.5Hz swing)
    this.thruster.lfoOsc = this.ctx.createOscillator();
    this.thruster.lfoGain = this.ctx.createGain();
    this.thruster.lfoOsc.type = 'sine';
    this.thruster.lfoOsc.frequency.setValueAtTime(0.10, now);
    this.thruster.lfoGain.gain.setValueAtTime(1.5, now);
    this.thruster.lfoOsc.connect(this.thruster.lfoGain);
    this.thruster.lfoGain.connect(this.thruster.sawOsc.frequency);
    this.thruster.lfoGain.connect(this.thruster.triOsc.frequency);

    // 4. Smooth Lowpass Filter (Q = 0.8, Initial Cutoff = 100Hz — No harsh resonance)
    this.thruster.filterNode = this.ctx.createBiquadFilter();
    this.thruster.filterNode.type = 'lowpass';
    this.thruster.filterNode.Q.setValueAtTime(0.8, now);
    this.thruster.filterNode.frequency.setValueAtTime(100, now);

    // 5. Thruster Gain (Idle Volume = 0.0 — Completely silent when stationary!)
    this.thruster.gainNode = this.ctx.createGain();
    this.thruster.gainNode.gain.setValueAtTime(0.0, now);

    // Route audio into ambient gain
    this.thruster.sawOsc.connect(this.thruster.filterNode);
    this.thruster.triOsc.connect(this.thruster.filterNode);
    this.thruster.filterNode.connect(this.thruster.gainNode);
    this.thruster.gainNode.connect(this.ambientGain || this.masterGain);

    this.thruster.sawOsc.start(now);
    this.thruster.triOsc.start(now);
    this.thruster.lfoOsc.start(now);
  }

  updateThrusterSpeed(speedRatio) {
    if (!this.thruster.active || !this.ctx) return;
    if (KiroState.get('minigameActive')) {
      this.stopThruster(0.05);
      return;
    }
    const ratio = Math.max(0, Math.min(1.0, speedRatio));
    this.thruster.currentSpeed = ratio;

    const now = this.ctx.currentTime;

    // Gentle Speed Mapping:
    // Stationary: 42Hz pitch, 100Hz cutoff, 0.0 gain (silent)
    // Steering:  68Hz pitch, 160Hz cutoff, 0.015 gain (whisper-soft warm sub hum)
    const targetPitch = 42 + ratio * (68 - 42);
    const targetCutoff = 100 + ratio * (160 - 100);
    const targetGain = ratio > 0.02 ? ratio * 0.015 : 0.0;

    if (this.thruster.sawOsc) {
      this.thruster.sawOsc.frequency.setTargetAtTime(targetPitch, now, 0.12);
    }
    if (this.thruster.triOsc) {
      this.thruster.triOsc.frequency.setTargetAtTime(targetPitch * 2.0, now, 0.12);
    }
    if (this.thruster.filterNode) {
      this.thruster.filterNode.frequency.setTargetAtTime(targetCutoff, now, 0.12);
    }
    if (this.thruster.gainNode) {
      this.thruster.gainNode.gain.setTargetAtTime(targetGain, now, 0.12);
    }
  }

  stopThruster(fadeDuration = 0.8) {
    if (!this.thruster.active || !this.ctx) return;
    this.thruster.active = false;

    const now = this.ctx.currentTime;
    if (this.thruster.gainNode) {
      this.thruster.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }

    setTimeout(() => {
      try {
        if (this.thruster.sawOsc) { this.thruster.sawOsc.stop(); this.thruster.sawOsc.disconnect(); }
        if (this.thruster.triOsc) { this.thruster.triOsc.stop(); this.thruster.triOsc.disconnect(); }
        if (this.thruster.lfoOsc) { this.thruster.lfoOsc.stop(); this.thruster.lfoOsc.disconnect(); }
        if (this.thruster.lfoGain) { this.thruster.lfoGain.disconnect(); }
        if (this.thruster.filterNode) { this.thruster.filterNode.disconnect(); }
        if (this.thruster.gainNode) { this.thruster.gainNode.disconnect(); }
      } catch (e) {
        // Safe disposal
      }
    }, fadeDuration * 1000 + 50);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Atmospheric Generators (Rain, Ocean, Thunder, Forest, Lo-Fi)
  // ─────────────────────────────────────────────────────────────────────────────

  initRain() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.createWhiteNoiseBuffer();
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain || this.masterGain);

    source.start(0);
    this.channels.rain.node = source;
    this.channels.rain.gainNode = gain;
  }

  initOcean() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.createPinkNoiseBuffer();
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // ~8 second rolling wave swells

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 160;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain || this.masterGain);

    lfo.start(0);
    source.start(0);

    this.channels.ocean.node = source;
    this.channels.ocean.gainNode = gain;
  }

  initThunder() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.ambientGain || this.masterGain);

    this.channels.thunder.gainNode = gain;
    this.scheduleThunder();
  }

  scheduleThunder() {
    this.thunderTimer = setTimeout(() => {
      this.triggerThunderStrike();
      this.scheduleThunder();
    }, 9000 + Math.random() * 18000);
  }

  triggerThunderStrike() {
    if (!this.ctx || this.channels.thunder.volume === 0) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.createPinkNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(130, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 3.8);

    const strikeGain = this.ctx.createGain();
    strikeGain.gain.setValueAtTime(0, this.ctx.currentTime);
    strikeGain.gain.linearRampToValueAtTime(this.channels.thunder.volume * 0.6, this.ctx.currentTime + 0.1);
    strikeGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4.2);

    source.connect(filter);
    filter.connect(strikeGain);
    strikeGain.connect(this.channels.thunder.gainNode);

    source.start(0);
    source.stop(this.ctx.currentTime + 4.5);
  }

  initForest() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.ambientGain || this.masterGain);

    this.channels.forest.gainNode = gain;
    this.scheduleBirdChirp();
  }

  scheduleBirdChirp() {
    this.birdTimer = setTimeout(() => {
      this.triggerBirdChirp();
      this.scheduleBirdChirp();
    }, 4000 + Math.random() * 7000);
  }

  triggerBirdChirp() {
    if (!this.ctx || this.channels.forest.volume === 0) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + Math.random() * 1000, now);
    osc.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 400, now + 0.14);

    amp.gain.setValueAtTime(0, now);
    amp.gain.linearRampToValueAtTime(this.channels.forest.volume * 0.12, now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(amp);
    amp.connect(this.channels.forest.gainNode);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  initLofi() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.ambientGain || this.masterGain);

    this.channels.lofi.gainNode = gain;
    this.startLofiBeat();
  }

  startLofiBeat() {
    let step = 0;
    const tempo = 72;
    const stepTime = 60 / tempo / 2;

    const chords = [
      [174.61, 220.00, 261.63, 329.63], // FM7
      [196.00, 246.94, 293.66, 329.63], // G6
      [164.81, 196.00, 246.94, 293.66], // Em7
      [220.00, 261.63, 329.63, 392.00]  // Am7
    ];

    this.lofiInterval = setInterval(() => {
      if (!this.ctx || this.channels.lofi.volume === 0) return;
      const now = this.ctx.currentTime;
      const vol = this.channels.lofi.volume;

      // Kick on step 0, 4
      if (step % 8 === 0 || step % 8 === 4) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
        g.gain.setValueAtTime(vol * 0.45, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(g);
        g.connect(this.channels.lofi.gainNode);
        osc.start(now);
        osc.stop(now + 0.2);
      }

      // Snare on step 2, 6
      if (step % 8 === 2 || step % 8 === 6) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createPinkNoiseBuffer();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol * 0.18, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(filter);
        filter.connect(g);
        g.connect(this.channels.lofi.gainNode);
        noise.start(now);
        noise.stop(now + 0.2);
      }

      // Chords every 16 steps
      if (step % 16 === 0) {
        const chordIndex = Math.floor(step / 16) % chords.length;
        chords[chordIndex].forEach(freq => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          const lp = this.ctx.createBiquadFilter();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(600, now);
          g.gain.setValueAtTime(0, now);
          g.gain.linearRampToValueAtTime(vol * 0.06, now + 0.3);
          g.gain.exponentialRampToValueAtTime(0.001, now + stepTime * 14);
          osc.connect(lp);
          lp.connect(g);
          g.connect(this.channels.lofi.gainNode);
          osc.start(now);
          osc.stop(now + stepTime * 14 + 0.1);
        });
      }

      step++;
    }, stepTime * 1000);
  }

  setVolume(channel, volume) {
    if (!this.ctx) this.init();
    const vol = Math.max(0, Math.min(1, volume));
    if (this.channels[channel]) {
      this.channels[channel].volume = vol;
      if (this.channels[channel].gainNode) {
        this.channels[channel].gainNode.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.2);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Tactile Sound FX (Chewing, Water, Chimes, Cinematic Chords)
  // ─────────────────────────────────────────────────────────────────────────────

  playChewSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);

    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(now + 0.26);
  }

  playWaterSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Glass Water Chimes (E6, G#6, B6)
    const freqs = [1318.51, 1661.22, 1975.53];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.04);

      g.gain.setValueAtTime(0.08, now + idx * 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.6);

      osc.connect(g);
      g.connect(this.masterGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.65);
    });

    // Soft Water Droplet Bandpass Plop
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.18);
    filter.Q.value = 5.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.22);
  }

  playPurrSound(duration = 1.2) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Carrier Oscillator (Cozy deep purr tone ~52Hz)
    const carrier = this.ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(52, now);
    carrier.frequency.linearRampToValueAtTime(58, now + duration * 0.5);
    carrier.frequency.linearRampToValueAtTime(48, now + duration);

    // Tremolo LFO for purr pulse (~22Hz)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(22, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.35, now);

    // Warm Lowpass Filter (Eliminates harsh highs, preserves rich purr warmth)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);
    filter.Q.value = 1.5;

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.28, now + 0.15);
    mainGain.gain.linearRampToValueAtTime(0.22, now + duration * 0.7);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    lfo.connect(lfoGain.gain);
    carrier.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.masterGain);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + duration + 0.05);
    lfo.stop(now + duration + 0.05);
  }

  playPetChime() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const petFreqs = [659.25, 783.99, 987.77, 1318.51]; // E5, G5, B5, E6 Major Pentatonic

    petFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.35);

      gain.gain.setValueAtTime(0.09, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  }

  playChimeSound(frequency = 880) {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;

    const safeFreq = (typeof frequency === 'number' && Number.isFinite(frequency) && frequency > 0) ? frequency : 880;
    const now = (this.ctx && Number.isFinite(this.ctx.currentTime)) ? this.ctx.currentTime : 0;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(safeFreq, now);
    osc.frequency.exponentialRampToValueAtTime(safeFreq * 1.05, now + 0.15);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(0.035, now + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.66);
  }

  playEngineDrone(duration = 2.5) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(42, now);
    osc1.frequency.linearRampToValueAtTime(55, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(84, now);
    osc2.frequency.linearRampToValueAtTime(110, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(85, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + duration);
    filter.Q.value = 1.5;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 1.2);
    gain.gain.linearRampToValueAtTime(0.05, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  playCinematicSwoosh(duration = 2.2) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.6;
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.05);
  }

  playWarpSwoosh(duration = 3.0) {
    this.playCinematicSwoosh(duration);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(48, now);
    subOsc.frequency.linearRampToValueAtTime(75, now + duration * 0.6);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + duration);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.07, now + 1.0);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain || this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + duration + 0.1);
  }

  playArrivalChime() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const chimeFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    chimeFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const delay = idx * 0.09;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.035, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 2.1);
    });
  }

  playPatrickChord() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const freqs = [329.63, 415.30, 493.88, 659.25]; // E4, G#4, B4, E5

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + 1.2);

      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.045, now + i * 0.03 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 1.5);
    });
  }

  playShootingStarChime() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const notes = [1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = idx * 0.05;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08, now + delay + 0.3);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.025, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.6);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.65);
    });
  }

  playStampChime() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const freqs = [659.25, 880.00, 1174.66];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = idx * 0.04;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.04, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    });
  }

  playYangieeChord() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const freqs = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + 1.2);

      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.04, now + i * 0.03 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 1.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 1.7);
    });
  }

  playSupernovaSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    const burstFreqs = [587.33, 880.00, 1174.66];
    burstFreqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now);
      osc.stop(now + 0.75);
    });

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.8);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    noise.start(now);
    noise.stop(now + 0.85);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. The Cute Procedural Mathematical Vocalizations of Kiro (V5.0 / V6.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * 1. The Elastic Hatch Pop (Egg Crack & Spring)
   * Rapid pitch sweep up (150Hz -> 800Hz) with snappy amplitude envelope.
   */
  playElasticPop(dest = null) {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;
    const targetDest = (dest && typeof dest.connect === 'function') ? dest : (this.sfxGain || this.masterGain);
    playElasticPop(this.ctx, targetDest);
  }

  /**
   * 2. Kiro's Cute Alien Chirp (With Cuteness Pitch Multiplier)
   * Dynamic triangle wave pitch modulation scaling from 0.4x to 2.4x.
   */
  playAlienChirp(pitchMultiplier = null, dest = null) {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;
    let mult = this.cutenessPitchMultiplier || 1.0;
    if (typeof pitchMultiplier === 'number' && Number.isFinite(pitchMultiplier)) {
      mult = pitchMultiplier;
    } else if (pitchMultiplier && typeof pitchMultiplier === 'object' && typeof arguments[1] === 'number' && Number.isFinite(arguments[1])) {
      mult = arguments[1];
    }
    const targetDest = (dest && typeof dest.connect === 'function') ? dest : (this.sfxGain || this.masterGain);
    playAlienChirp(this.ctx, mult, targetDest);
  }

  /**
   * 1b. Happy Chirp (playHappyChirp)
   * High-frequency ascending alien chick chirps.
   */
  playHappyChirp() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const chirps = [
      { startFreq: 480 * mult, delay: 0.00 },
      { startFreq: 620 * mult, delay: 0.085 }
    ];

    chirps.forEach(({ startFreq, delay }) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + delay;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 2.1, t + 0.08);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  /**
   * 2b. Viscoelastic Purr (playCozyPurr)
   * Deep 60Hz rumble modulated by a 25Hz sine LFO vibration for petting response.
   */
  playCozyPurr(dest = null) {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;
    const targetDest = (dest && typeof dest.connect === 'function') ? dest : (this.sfxGain || this.masterGain);
    playCozyPurr(this.ctx, targetDest);
  }

  /**
   * 2. Cozy Purr (playPurr)
   * The Sound: A rhythmic, comforting, vibrating hum representing deep satisfaction.
   * The Math: Combines a warm 65Hz base triangle oscillator with a low-pass filter (set to 140Hz)
   * and connects an LFO running at 8.5Hz directly into the gain node to simulate a pulsing purr.
   */
  playPurr(duration = 1.4) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;

    const carrier = this.ctx.createOscillator();
    carrier.type = 'triangle';
    carrier.frequency.setValueAtTime(65 * mult, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(1000, 140 * mult), now);
    filter.Q.setValueAtTime(2.0, now);

    const purrGain = this.ctx.createGain();
    purrGain.gain.setValueAtTime(0.001, now);
    purrGain.gain.linearRampToValueAtTime(0.22, now + 0.15);
    purrGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(8.5, now);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(0.12, now);

    lfo.connect(lfoGain);
    lfoGain.connect(purrGain.gain);

    carrier.connect(filter);
    filter.connect(purrGain);
    purrGain.connect(this.sfxGain || this.masterGain);

    carrier.start(now);
    lfo.start(now);
    carrier.stop(now + duration + 0.05);
    lfo.stop(now + duration + 0.05);
  }

  /**
   * 3. Candy Chew (playEatingCandy)
   * The Sound: A multi-step, wet-crunchy swallowing noise when Kiro eats Star Candies.
   * The Math: A three-beat sequence of triangle wave pitch sweeps starting at 150Hz,
   * peaking linearly to 360Hz, and decaying exponentially to 75Hz with a rapid gain-decay envelope.
   */
  playEatingCandy() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;

    for (let i = 0; i < 3; i++) {
      const delay = i * 0.11;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150 * mult, t);
      osc.frequency.linearRampToValueAtTime(360 * mult, t + 0.035);
      osc.frequency.exponentialRampToValueAtTime(75 * mult, t + 0.095);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.20, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.11);
    }

    // Sparkle crunch burst
    const crunch = this.ctx.createBufferSource();
    crunch.buffer = this.createPinkNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400 * Math.min(2.0, mult), now);
    filter.Q.setValueAtTime(5.0, now);

    const cGain = this.ctx.createGain();
    cGain.gain.setValueAtTime(0.14, now);
    cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    crunch.connect(filter);
    filter.connect(cGain);
    cGain.connect(this.sfxGain || this.masterGain);

    crunch.start(now);
    crunch.stop(now + 0.33);
  }

  /**
   * 4. Water Gulp (playWaterGulp)
   * The Sound: Rising, gurgly bubbles representing Kiro quenching his thirst.
   * The Math: An escalating cascade of four sine wave pops (pitched at 180Hz, 230Hz, 290Hz, and 360Hz)
   * with ultra-fast attack/decay times.
   */
  playWaterGulp() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const pitches = [180, 230, 290, 360];

    pitches.forEach((baseFreq, i) => {
      const delay = i * 0.075;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * mult, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5 * mult, t + 0.06);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  /**
   * Kiro Sweet Dialogue Chirp / Giggle (playGiggle)
   * The Sound: A whisper-soft, cozy 3-harmonic sine flutter that chirps gently when speaking in anime cloud bubbles.
   */
  playGiggle() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const pitches = [392.00, 493.88, 587.33]; // G4, B4, D5 (Warm, soothing pentatonic tri-tone)

    pitches.forEach((freq, idx) => {
      const t = now + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06 * mult, t + 0.04);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(850, t);
      filter.Q.value = 1.0;

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.015, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.10);
    });
  }

  /**
   * 5. Sleepy Yawn (playSleepyYawn)
   * The Sound: A tired, long, sighing low-pass sweep when tucked into bed.
   * The Math: A sleepy sine oscillator with 500Hz lowpass filter sliding exponentially from 400Hz to 150Hz.
   */
  playSleepyYawn(dest = null) {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;
    const targetDest = (dest && typeof dest.connect === 'function') ? dest : (this.sfxGain || this.masterGain);
    playSleepyYawn(this.ctx, targetDest);
  }

  /**
   * 5b. Cozy Snoring & Sleeping Breath Loop (startSnoringBreathing)
   * The Sound: Gentle, rhythmic, cozy sleeping breaths synchronized with Kiro's snoring kinematics.
   * The Math: Inhale (1.2s): Soft resonant bandpass triangle wave sweeping upwards from 130Hz to 220Hz.
   *           Exhale (1.4s): Gentle warm sighing release sliding exponentially from 210Hz to 110Hz.
   */
  startSnoringBreathing() {
    if (this.isSnoring) return;
    this.isSnoring = true;

    const playOneSnoreCycle = () => {
      if (!this.isSnoring) return;
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const mult = this.cutenessPitchMultiplier || 1.0;

      // 1. Inhale: Soft rising filtered tone (130Hz -> 220Hz)
      const oscInhale = this.ctx.createOscillator();
      oscInhale.type = 'triangle';
      oscInhale.frequency.setValueAtTime(130 * mult, now);
      oscInhale.frequency.exponentialRampToValueAtTime(220 * mult, now + 1.2);

      const filterInhale = this.ctx.createBiquadFilter();
      filterInhale.type = 'lowpass';
      filterInhale.frequency.setValueAtTime(280 * mult, now);
      filterInhale.frequency.linearRampToValueAtTime(450 * mult, now + 1.2);
      filterInhale.Q.setValueAtTime(1.5, now);

      const gainInhale = this.ctx.createGain();
      gainInhale.gain.setValueAtTime(0.0001, now);
      gainInhale.gain.linearRampToValueAtTime(0.035, now + 0.6);
      gainInhale.gain.linearRampToValueAtTime(0.0001, now + 1.25);

      oscInhale.connect(filterInhale);
      filterInhale.connect(gainInhale);
      gainInhale.connect(this.sfxGain || this.masterGain);

      oscInhale.start(now);
      oscInhale.stop(now + 1.30);

      // 2. Exhale: Gentle warm sighing release (210Hz -> 110Hz)
      const tExhale = now + 1.45;
      const oscExhale = this.ctx.createOscillator();
      oscExhale.type = 'sine';
      oscExhale.frequency.setValueAtTime(210 * mult, tExhale);
      oscExhale.frequency.exponentialRampToValueAtTime(110 * mult, tExhale + 1.4);

      const filterExhale = this.ctx.createBiquadFilter();
      filterExhale.type = 'lowpass';
      filterExhale.frequency.setValueAtTime(320 * mult, tExhale);
      filterExhale.frequency.linearRampToValueAtTime(160 * mult, tExhale + 1.4);
      filterExhale.Q.setValueAtTime(1.2, tExhale);

      const gainExhale = this.ctx.createGain();
      gainExhale.gain.setValueAtTime(0.0001, tExhale);
      gainExhale.gain.linearRampToValueAtTime(0.028, tExhale + 0.4);
      gainExhale.gain.exponentialRampToValueAtTime(0.0001, tExhale + 1.5);

      oscExhale.connect(filterExhale);
      filterExhale.connect(gainExhale);
      gainExhale.connect(this.sfxGain || this.masterGain);

      oscExhale.start(tExhale);
      oscExhale.stop(tExhale + 1.55);
    };

    // Initial cycle then repeat every 3.8s
    playOneSnoreCycle();
    this.snoreTimer = setInterval(() => {
      if (this.isSnoring) {
        playOneSnoreCycle();
      }
    }, 3800);
  }

  stopSnoringBreathing() {
    this.isSnoring = false;
    if (this.snoreTimer) {
      clearInterval(this.snoreTimer);
      this.snoreTimer = null;
    }
  }

  /**
   * 6. Aura Flare (playAuraFlare)
   * The Sound: A brilliant, magical, shimmering arpeggio when Kiro's golden glow pulses.
   * The Math: Triggers a sequential C-Major chord sweep (329Hz, 392Hz, 523Hz, 659Hz, 783Hz, 1046Hz)
   * delayed by 75ms per note with highly resonating sine waves.
   */
  playAuraFlare() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const chordFrequencies = [329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];

    chordFrequencies.forEach((freq, idx) => {
      const delay = idx * 0.075;
      const t = now + delay;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02 * mult, t + 0.45);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.70);
    });
  }

  /**
   * 7. Joyful Jump (playJoyfulJump)
   * The Sound: An elastic, rubbery, cartoon-style bounce slide.
   * The Math: A smooth sine wave that sweeps exponentially upwards from 220Hz to 680Hz in 350 milliseconds.
   */
  playJoyfulJump() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220 * mult, now);
    osc.frequency.exponentialRampToValueAtTime(680 * mult, now + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.40);
  }

  /**
   * 8. Sad Whimper (playSadWhimper)
   * The Sound: A microtonally trembling, shivering cry when neglected or hungry.
   * The Math: A high 410Hz sine wave bending down to 290Hz, modulated on the frequency bus
   * by a secondary 12Hz shivering tremolo oscillator.
   */
  playSadWhimper() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(410 * mult, now);
    carrier.frequency.exponentialRampToValueAtTime(290 * mult, now + 0.85);

    const tremolo = this.ctx.createOscillator();
    tremolo.type = 'sine';
    tremolo.frequency.setValueAtTime(12.0, now);

    const tremoloGain = this.ctx.createGain();
    tremoloGain.gain.setValueAtTime(18.0 * mult, now);

    tremolo.connect(tremoloGain);
    tremoloGain.connect(carrier.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.90);

    carrier.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    carrier.start(now);
    tremolo.start(now);
    carrier.stop(now + 0.95);
    tremolo.stop(now + 0.95);
  }

  /**
   * 9. Tickle Giggle (playTickleGiggle)
   * The Sound: Soft sweet staccato giggles when Kiro is petted.
   */
  playTickleGiggle() {
    this.playGiggle();
  }

  /**
   * 10. Stardust Whoosh (playStarTrailWhoosh)
   * The Sound: A soft, magical brush whoosh when dragging stardust trail particles.
   * The Math: Generates a raw white noise buffer, passes it through a sharp bandpass filter
   * (Q factor of 15), and sweeps the frequency exponentially from 1400Hz to 4500Hz in a half-second swell.
   */
  playStarTrailWhoosh() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createWhiteNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(4500, now + 0.48);
    filter.Q.setValueAtTime(15.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.50);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    noise.start(now);
    noise.stop(now + 0.52);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Backward-Compatibility Aliases
  // ─────────────────────────────────────────────────────────────────────────────
  playChewSound() {
    this.playEatingCandy();
  }

  playCrunchSound() {
    this.playEatingCandy();
  }

  playPurrSound(duration = 1.4) {
    this.playPurr(duration);
  }

  playWaterSound() {
    this.playWaterGulp();
  }

  playPetChime(baseFreq = 660) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const safeFreq = (typeof baseFreq === 'number' && Number.isFinite(baseFreq) && baseFreq > 0) ? baseFreq : 660;
    const now = (this.ctx && Number.isFinite(this.ctx.currentTime)) ? this.ctx.currentTime : 0;
    const intervals = [1.0, 1.25, 1.5]; // Pentatonic happy step

    intervals.forEach((ratio, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = i * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(safeFreq * ratio, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.09, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 0.85);
    });
  }



  playTargetLockSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Sci-Fi Target Acquisition Chime (High-tech rapid harmonic burst: C6 -> E6 -> G6 -> C7)
    const lockPitches = [1046.50, 1318.51, 1567.98, 2093.00];
    lockPitches.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const tStart = now + idx * 0.045;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, tStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, tStart + 0.08);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.2, tStart);
      filter.Q.setValueAtTime(6.0, tStart);

      gain.gain.setValueAtTime(0, tStart);
      gain.gain.linearRampToValueAtTime(0.12, tStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(tStart);
      osc.stop(tStart + 0.30);
    });

    // Sub-harmonic confirmation hum
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(523.25, now + 0.16); // C5
    subGain.gain.setValueAtTime(0, now + 0.16);
    subGain.gain.linearRampToValueAtTime(0.08, now + 0.18);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain || this.masterGain);
    subOsc.start(now + 0.16);
    subOsc.stop(now + 0.60);
  }

  startCosmicAtmosphere() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.atmosphereActive) return;

    this.atmosphereActive = true;
    const now = this.ctx.currentTime;

    this.humOsc = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();
    this.humLfo = this.ctx.createOscillator();
    this.humLfoGain = this.ctx.createGain();

    this.humOsc.type = 'sine';
    this.humOsc.frequency.setValueAtTime(55, now); // A1

    this.humLfo.type = 'sine';
    this.humLfo.frequency.setValueAtTime(0.05, now);
    this.humLfoGain.gain.setValueAtTime(0.04, now);

    this.humGain.gain.setValueAtTime(0.001, now);
    this.humGain.gain.linearRampToValueAtTime(0.09, now + 3.0);

    this.humLfo.connect(this.humLfoGain);
    this.humLfoGain.connect(this.humGain.gain);
    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.ambientGain || this.masterGain);

    this.humOsc.start(now);
    this.humLfo.start(now);

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.createPinkNoiseBuffer();
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(650, now);
    this.windFilter.Q.setValueAtTime(3.8, now);

    this.windLfo = this.ctx.createOscillator();
    this.windLfo.type = 'sine';
    this.windLfo.frequency.setValueAtTime(0.03, now);

    this.windLfoGain = this.ctx.createGain();
    this.windLfoGain.gain.setValueAtTime(450, now);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.001, now);
    this.windGain.gain.linearRampToValueAtTime(0.08, now + 4.0);

    this.windLfo.connect(this.windLfoGain);
    this.windLfoGain.connect(this.windFilter.frequency);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ambientGain || this.masterGain);

    this.windSource.start(now);
    this.windLfo.start(now);
  }

  stopCosmicAtmosphere(fadeDuration = 2.0) {
    if (!this.atmosphereActive || !this.ctx) return;
    this.atmosphereActive = false;

    const now = this.ctx.currentTime;
    if (this.humGain) {
      this.humGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }
    if (this.windGain) {
      this.windGain.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);
    }

    setTimeout(() => {
      try {
        if (this.humOsc) { this.humOsc.stop(); this.humOsc.disconnect(); }
        if (this.humLfo) { this.humLfo.stop(); this.humLfo.disconnect(); }
        if (this.windSource) { this.windSource.stop(); this.windSource.disconnect(); }
        if (this.windLfo) { this.windLfo.stop(); this.windLfo.disconnect(); }
      } catch (e) {
        // Safe disposal
      }
    }, fadeDuration * 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3.5. Minigame Procedural Audio Suite & Non-Blocking Bandpass Synthesizers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Non-Blocking Native BiquadFilterNode Bandpass Sweep (Q=2.5, 100Hz–1500Hz)
   * 0% Main-Thread Overhead via native Web Audio graph scheduling
   */
  playBandpassSweep(startFreq = 100, endFreq = 1500, q = 2.5, duration = 0.28) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + duration);

    filter.type = 'bandpass';
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(Math.max(10, startFreq), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /**
   * Celestial Tetris: Viscoelastic Squish Sound
   * Line clearance soft squish pop with modulated LFO sweep
   */
  playTetrisSquish(isHelixBonus = false) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const duration = isHelixBonus ? 0.35 : 0.22;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320 * mult, now);
    osc.frequency.linearRampToValueAtTime(480 * mult, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(90 * mult, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900 * mult, now);
    filter.Q.setValueAtTime(4.0, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.02);

    // Also fire a crisp bandpass sweep
    this.playBandpassSweep(150, 1400, 2.5, duration);
  }

  /**
   * Starlight Pong: Elastic Body Bounce
   * Ascending chime scaled by the current rally combo streak
   */
  playPongBounce(combo = 0) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const baseFreq = (440 + Math.min(12, combo) * 35) * mult;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.20, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Nebula Dodge: Protective Shield Shockwave Deflection
   */
  playShieldDeflect() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;

    // Dual-harmonic chime + resonant bandpass burst
    [587.33, 880.00, 1174.66].forEach((freq, idx) => {
      const t = now + idx * 0.04;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mult, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.08 * mult, t + 0.25);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);

      osc.start(t);
      osc.stop(t + 0.38);
    });

    this.playBandpassSweep(200, 1800, 3.0, 0.35);
  }

  /**
   * Stardust Shard Pickup (Cosmic Runner / Catch)
   */
  playShardPickup() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const mult = this.cutenessPitchMultiplier || 1.0;
    const freq = (1200 + Math.random() * 400) * mult;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

    osc.connect(gain);
    gain.connect(this.sfxGain || this.masterGain);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Minigame Victory / Stage Clear Chime
   */
  playMinigameVictory() {
    this.playAuraFlare();
    setTimeout(() => this.playHappyChirp(), 350);
  }

  /**
   * Minigame Game Over / Soft Whimper
   */
  playMinigameGameOver() {
    this.playSadWhimper();
  }

  /**
   * Dynamic Wellbeing-Driven LFO Rate Modulation
   * Slower rates (4Hz) during neglect, high-frequency purring (12Hz) when thriving
   */
  getWellbeingLfoRate() {
    const wellbeing = KiroState.get('wellbeing') ?? 100;
    return 4.0 + (wellbeing / 100) * 8.5; // 4.0Hz to 12.5Hz
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Voice Recording Interface
  // ─────────────────────────────────────────────────────────────────────────────

  async startRecordingVoice() {
    try {
      this.recordedChunks = [];
      this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.activeStream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.mediaRecorder.start();
      return true;
    } catch (err) {
      console.warn("[VoiceRecorder] Microphone input not accessible:", err);
      return false;
    }
  }

  stopRecordingVoice() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: "audio/ogg; codecs=opus" });
        const audioURL = URL.createObjectURL(blob);
        if (this.activeStream) {
          this.activeStream.getTracks().forEach(track => track.stop());
        }
        resolve(audioURL);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * 🐣 3D Preloader V6.0: Procedural Egg Hatch Pop & Chime Synesthesia
   * Synthesizes a soft resonant frequency pop sweep with whisper-soft ascending pentatonic sparkle chimes.
   */
  playHatchPopChime() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dest = this.masterGain || this.ctx.destination;

    // 1. Soft Resonant Bubble Pop (Sweeping sine/lowpass from 260Hz to 1520Hz)
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    const popFilter = this.ctx.createBiquadFilter();

    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(260, now);
    popOsc.frequency.exponentialRampToValueAtTime(1520, now + 0.08);

    popFilter.type = 'lowpass';
    popFilter.frequency.setValueAtTime(600, now);
    popFilter.frequency.exponentialRampToValueAtTime(950, now + 0.08);
    popFilter.Q.value = 1.8;

    popGain.gain.setValueAtTime(0.001, now);
    popGain.gain.linearRampToValueAtTime(0.08, now + 0.015);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    popOsc.connect(popFilter);
    popFilter.connect(popGain);
    popGain.connect(dest);

    popOsc.start(now);
    popOsc.stop(now + 0.24);

    // 2. Gentle Ascending Sparkle Chimes (Pentatonic D5 -> G5 -> A5 -> C6)
    const freqs = [587.33, 783.99, 880.00, 1046.50];
    freqs.forEach((f, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeFilter = this.ctx.createBiquadFilter();
      const chimeGain = this.ctx.createGain();
      const chimeTime = now + 0.08 + idx * 0.06;

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(f, chimeTime);

      chimeFilter.type = 'lowpass';
      chimeFilter.frequency.setValueAtTime(1200, chimeTime);

      chimeGain.gain.setValueAtTime(0.0001, chimeTime);
      chimeGain.gain.linearRampToValueAtTime(0.04, chimeTime + 0.012);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 0.45);

      chimeOsc.connect(chimeFilter);
      chimeFilter.connect(chimeGain);
      chimeGain.connect(dest);

      chimeOsc.start(chimeTime);
      chimeOsc.stop(chimeTime + 0.48);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Explicit Teardown & Resource Disposal
  // ─────────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Cor Amoris Scavenger Hunt & Celestial Procedural Audio Suite (01-27-2024)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Trappist-1 Bandpass Static Sweep (Trappist_27_Bandpass_Sweep)
   * Sweeps a BiquadFilterNode (type: bandpass, Q: 2.5) 100Hz -> 1500Hz -> 80Hz
   * Clears cosmic static to reveal the "27" numerical fragment.
   */
  playTrappistBandpassSweep() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const targetDest = this.sfxGain || this.masterGain;

    const noiseBuffer = this.createWhiteNoiseBuffer();
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(2.5, now);
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + 0.8);
    filter.frequency.exponentialRampToValueAtTime(80, now + 1.8);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(targetDest);

    noiseSource.start(now);
    noiseSource.stop(now + 2.0);

    setTimeout(() => {
      try {
        noiseSource.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    }, 2100);
  }

  /**
   * Crystal Harmonic Resonance Chimes (C5 = 523.25Hz, E5 = 659.25Hz, G5 = 783.99Hz)
   * Plays pure crystal tones when fragments align into the Stargate dial.
   * @param {number} freq - Frequency in Hz
   */
  playCrystalChime(freq = 523.25) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const safeFreq = (typeof freq === 'number' && Number.isFinite(freq) && freq > 0) ? freq : 523.25;
    const now = (this.ctx && Number.isFinite(this.ctx.currentTime)) ? this.ctx.currentTime : 0;
    const targetDest = this.sfxGain || this.masterGain;

    const osc = this.ctx.createOscillator();
    const oscHarmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(safeFreq, now);

    // Overtone with slight shimmer
    oscHarmonic.type = 'triangle';
    oscHarmonic.frequency.setValueAtTime(safeFreq * 2.003, now);

    gain.gain.setValueAtTime(0.0, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    osc.connect(gain);
    oscHarmonic.connect(gain);
    gain.connect(targetDest);

    osc.start(now);
    oscHarmonic.start(now);
    osc.stop(now + 2.5);
    oscHarmonic.stop(now + 2.5);

    setTimeout(() => {
      try {
        osc.disconnect();
        oscHarmonic.disconnect();
        gain.disconnect();
      } catch (e) {}
    }, 2600);
  }

  /**
   * Delicate Music-Box Melody Sequence (Post-Trappist 27 Catch)
   */
  playMusicBoxMelody() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // 8-note sweet music box arpeggio: C5, E5, G5, B5, C6, G5, E5, C5
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50, 783.99, 659.25, 523.25];
    const now = this.ctx.currentTime;
    const targetDest = this.sfxGain || this.masterGain;

    notes.forEach((freq, idx) => {
      const noteTime = now + (idx * 0.22);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.0, noteTime);
      gain.gain.linearRampToValueAtTime(0.3, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.7);

      osc.connect(gain);
      gain.connect(targetDest);

      osc.start(noteTime);
      osc.stop(noteTime + 0.75);

      setTimeout(() => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      }, (idx * 220) + 800);
    });
  }

  /**
   * Resonance Gate Shatter FX
   */
  playStargateShatterFX() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime;
    const targetDest = this.sfxGain || this.masterGain;

    // Resonant pop
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(880, now);
    popOsc.frequency.exponentialRampToValueAtTime(120, now + 0.3);
    popGain.gain.setValueAtTime(0.5, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    popOsc.connect(popGain);
    popGain.connect(targetDest);
    popOsc.start(now);
    popOsc.stop(now + 0.4);

    // Crystal chime chords
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      setTimeout(() => {
        this.playCrystalChime(freq);
      }, i * 60);
    });
  }
  /**
   * Procedural Incoming Call Ringtone Synthesis (Starlight Pentatonic Shimmer)
   */
  startCallRinging() {
    if (this.callRingInterval) return;
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const ringPattern = () => {
      if (!this.ctx) return;
      const safeNow = (this.ctx && Number.isFinite(this.ctx.currentTime)) ? this.ctx.currentTime : 0;
      const ringNotes = [587.33, 880.00, 1174.66]; // D5, A5, D6 harmonic chime

      ringNotes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = safeNow + (idx * 0.14);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.3);

        gain.gain.setValueAtTime(0.0, startTime);
        gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    };

    ringPattern();
    this.callRingInterval = setInterval(ringPattern, 2500);
  }

  stopCallRinging() {
    if (this.callRingInterval) {
      clearInterval(this.callRingInterval);
      this.callRingInterval = null;
    }
  }

  /**
   * "Under the Same Sky" — 60 BPM Lo-Fi Ambient Procedural Masterpiece
   */
  playUnderTheSameSky() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.underTheSameSkyActive) return;

    this.underTheSameSkyActive = true;
    const targetDest = this.ambientGain || this.masterGain;

    // 1. Cozy Vinyl Static Floor
    const noiseBuffer = this.createWhiteNoiseBuffer();
    this.vinylNode = this.ctx.createBufferSource();
    this.vinylNode.buffer = noiseBuffer;
    this.vinylNode.loop = true;

    this.vinylFilter = this.ctx.createBiquadFilter();
    this.vinylFilter.type = 'bandpass';
    this.vinylFilter.frequency.setValueAtTime(2200, this.ctx.currentTime);
    this.vinylFilter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.vinylGain = this.ctx.createGain();
    this.vinylGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

    this.vinylNode.connect(this.vinylFilter);
    this.vinylFilter.connect(this.vinylGain);
    this.vinylGain.connect(targetDest);
    this.vinylNode.start();

    // 2. 60 BPM Jazz Progression (Cmaj9 -> Am9 -> Fmaj7 -> G13)
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9
      [220.00, 261.63, 329.63, 392.00, 493.88], // Am9
      [174.61, 220.00, 261.63, 329.63],         // Fmaj7
      [196.00, 246.94, 293.66, 349.23, 440.00]  // G13
    ];
    let chordIdx = 0;

    this.sameSkyInterval = setInterval(() => {
      if (!this.underTheSameSkyActive || !this.ctx) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      const now = this.ctx.currentTime;
      currentChord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.04));

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);

        gain.gain.setValueAtTime(0.0, now + (idx * 0.04));
        gain.gain.linearRampToValueAtTime(0.08, now + (idx * 0.04) + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(targetDest);

        osc.start(now + (idx * 0.04));
        osc.stop(now + 3.8);

        setTimeout(() => {
          try {
            osc.disconnect();
            filter.disconnect();
            gain.disconnect();
          } catch (e) {}
        }, 4000);
      });
    }, 4000); // 1 chord every 4 beats at 60 BPM
  }

  stopUnderTheSameSky() {
    this.underTheSameSkyActive = false;
    if (this.sameSkyInterval) {
      clearInterval(this.sameSkyInterval);
      this.sameSkyInterval = null;
    }
    if (this.vinylNode) {
      try {
        this.vinylGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
        setTimeout(() => {
          this.vinylNode.stop();
          this.vinylNode.disconnect();
          this.vinylFilter.disconnect();
          this.vinylGain.disconnect();
        }, 1100);
      } catch (e) {}
    }
  }

  dispose() {
    this.stopThruster(0.1);
    this.stopCosmicAtmosphere(0.1);
    if (this.thunderTimer) clearTimeout(this.thunderTimer);
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (this.lofiInterval) clearInterval(this.lofiInterval);

    Object.values(this.channels).forEach(channel => {
      try {
        if (channel.node) {
          channel.node.stop();
          channel.node.disconnect();
        }
        if (channel.gainNode) {
          channel.gainNode.disconnect();
        }
      } catch (e) {}
    });

    if (this.masterGain) {
      try { this.masterGain.disconnect(); } catch (e) {}
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) {}
    }

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isPlaying = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Standalone Procedural Mathematical Synthesis Functions (V5.0 / V6.0)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. The Elastic Hatch Pop (Egg Crack & Spring)
 * Rapid pitch sweep up (150Hz -> 800Hz) with snappy amplitude envelope.
 * @param {AudioContext} audioCtx 
 * @param {AudioNode} [dest]
 */
export function playElasticPop(audioCtx, dest = null) {
  if (!audioCtx) return;
  const targetDest = dest || (typeof window !== 'undefined' && window.synthEngine ? window.synthEngine.sfxGain || window.synthEngine.masterGain : null) || audioCtx.destination;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const now = (audioCtx && Number.isFinite(audioCtx.currentTime)) ? audioCtx.currentTime : 0;

  osc.type = 'sine';
  // Rapid pitch sweep up to simulate a bubble pop
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);

  // Snappy amplitude envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(1, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gainNode);
  gainNode.connect(targetDest);
  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * 2. Kiro's Cute Alien Chirp (With Cuteness Pitch Multiplier)
 * Triangle wave frequency modulation with dynamic cuteness pitch scaling (0.4x to 2.4x).
 * @param {AudioContext} audioCtx 
 * @param {number} [pitchMultiplier=1.0]
 * @param {AudioNode} [dest]
 */
export function playAlienChirp(audioCtx, pitchMultiplier = 1.0, dest = null) {
  if (!audioCtx) return;
  const targetDest = dest || (typeof window !== 'undefined' && window.synthEngine ? window.synthEngine.sfxGain || window.synthEngine.masterGain : null) || audioCtx.destination;
  // Safely guard against non-numeric or non-finite pitch multiplier
  const mult = (typeof pitchMultiplier === 'number' && Number.isFinite(pitchMultiplier) && pitchMultiplier > 0) ? pitchMultiplier : 1.0;
  const baseFreq = 440 * mult;
  const now = (audioCtx && Number.isFinite(audioCtx.currentTime)) ? audioCtx.currentTime : 0;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + 0.1);
  osc.frequency.linearRampToValueAtTime(baseFreq * 0.8, now + 0.2);

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.8, now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

  osc.connect(gainNode);
  gainNode.connect(targetDest);
  osc.start(now);
  osc.stop(now + 0.35);
}

/**
 * 3. Viscoelastic Purr (Petting Reaction)
 * Deep 60Hz sawtooth wave amplitude-modulated by a 25Hz sine LFO for authentic purr rattle.
 * @param {AudioContext} audioCtx 
 * @param {AudioNode} [dest]
 */
export function playCozyPurr(audioCtx, dest = null) {
  if (!audioCtx) return;
  const targetDest = dest || (typeof window !== 'undefined' && window.synthEngine ? window.synthEngine.sfxGain || window.synthEngine.masterGain : null) || audioCtx.destination;
  const osc = audioCtx.createOscillator();
  const lfo = audioCtx.createOscillator(); // Low-Frequency Oscillator for the "vibration"
  const lfoGain = audioCtx.createGain();
  const masterGain = audioCtx.createGain();
  const now = (audioCtx && Number.isFinite(audioCtx.currentTime)) ? audioCtx.currentTime : 0;

  osc.type = 'sawtooth';
  osc.frequency.value = 60; // Deep rumble

  lfo.type = 'sine';
  lfo.frequency.value = 25; // Speed of the purr rattle

  // Modulate amplitude to create the vibrating purr effect
  lfo.connect(lfoGain.gain);
  osc.connect(lfoGain);
  lfoGain.connect(masterGain);
  masterGain.connect(targetDest);

  masterGain.gain.setValueAtTime(0.5, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 2.0); // 2-second purr

  osc.start(now);
  lfo.start(now);
  osc.stop(now + 2.0);
  lfo.stop(now + 2.0);
}

/**
 * 4. Sleepy Yawn & Ambient Pink Noise Rain (Eco-Mode)
 * Muffled 500Hz low-pass filtered sine sweep (400Hz -> 150Hz) simulating a gentle bedtime yawn.
 * @param {AudioContext} audioCtx 
 * @param {AudioNode} [dest]
 */
export function playSleepyYawn(audioCtx, dest = null) {
  if (!audioCtx) return;
  const targetDest = dest || (typeof window !== 'undefined' && window.synthEngine ? window.synthEngine.sfxGain || window.synthEngine.masterGain : null) || audioCtx.destination;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter(); // Muffles the sound
  const now = (audioCtx && Number.isFinite(audioCtx.currentTime)) ? audioCtx.currentTime : 0;

  osc.type = 'sine';
  filter.type = 'lowpass';
  filter.frequency.value = 500;

  // Slow downward frequency curve
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 1.2);

  // Smooth, slow envelope
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.6, now + 0.4);
  gainNode.gain.linearRampToValueAtTime(0, now + 1.5);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(targetDest);
  osc.start(now);
  osc.stop(now + 1.6);
}

export const synthEngine = new CosmicSynthEngine();
if (typeof window !== 'undefined') {
  window.synthEngine = synthEngine;
}
