/**
 * synth.js
 * Pure Web Audio API Sound Synthesizer Engine (ES6 Module)
 * Procedural ambient generators, live frequency analyser for 3D synesthesia, and clean disposal.
 */

import { KiroState } from '../state.js';

export class CosmicSynthEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.analyserData = null;
    this.isPlaying = false;

    this.channels = {
      rain: { volume: 0, node: null, gainNode: null },
      thunder: { volume: 0, node: null, gainNode: null },
      ocean: { volume: 0, node: null, gainNode: null },
      forest: { volume: 0, node: null, gainNode: null },
      lofi: { volume: 0, node: null, gainNode: null }
    };

    this.thunderTimer = null;
    this.birdTimer = null;
    this.lofiInterval = null;

    // Listen to KiroState volume events
    KiroState.on('sound:volume', ({ channel, volume }) => {
      this.setVolume(channel, volume);
    });
  }

  init() {
    if (this.ctx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Audio-Reactive Analyser Node for 3D Synesthesia
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Initialize procedural generators
    this.initRain();
    this.initOcean();
    this.initThunder();
    this.initForest();
    this.initLofi();

    this.isPlaying = true;
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

  getAudioReactiveLevel() {
    if (!this.analyser || !this.analyserData || !this.isPlaying) return 0;
    this.analyser.getByteFrequencyData(this.analyserData);
    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      sum += this.analyserData[i];
    }
    return sum / (this.analyserData.length * 255); // 0.0 to 1.0
  }

  // Pink Noise generator for organic wave and thunder swells
  createPinkNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
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

  // White Noise generator
  createWhiteNoiseBuffer() {
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  /* 1. Rain Synthesizer */
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
    gain.connect(this.masterGain);

    source.start(0);
    this.channels.rain.node = source;
    this.channels.rain.gainNode = gain;
  }

  /* 2. Ocean Waves Synthesizer: 0.12Hz LFO Modulation */
  initOcean() {
    const source = this.ctx.createBufferSource();
    source.buffer = this.createPinkNoiseBuffer();
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12; // ~8 second wave swells

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 160;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    lfo.start(0);
    source.start(0);

    this.channels.ocean.node = source;
    this.channels.ocean.gainNode = gain;
  }

  /* 3. Thunder Synthesizer */
  initThunder() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.masterGain);

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

  /* 4. Forest Synthesizer */
  initForest() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.masterGain);

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

  /* 5. Lo-Fi Hip-Hop Sequencer */
  initLofi() {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.connect(this.masterGain);

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

      // Kick on 0, 4
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

      // Snare on 2, 6
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

  // Cartoon Chewing Sound FX
  playChewSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(g);
    g.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Crisp Glass-like Water Splash & Chime Sound FX
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

    // Soft Water Droplet Plop
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

  // ============================================================================
  // Cinematic Intro Sequence Procedural Audio Synthesizers
  // ============================================================================

  // Act I: Warm spaceship engine boot-up drone
  playEngineDrone(duration = 2.5) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(42, now);
    osc1.frequency.linearRampToValueAtTime(58, now + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(84, now);
    osc2.frequency.linearRampToValueAtTime(116, now + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(90, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + duration);
    filter.Q.value = 3.0;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 1.2);
    gain.gain.linearRampToValueAtTime(0.15, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);
  }

  // Ultra-Fast Non-Blocking White Noise Sweep (Native C++ Audio Thread Biquad Sweep, 0% Main Thread CPU)
  playCinematicSwoosh(duration = 2.2) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Instant flat random noise (< 1ms generation)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Native C++ Biquad Filter sweep (Hardware accelerated)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.5;
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(1500, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(80, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32, now + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.05);
  }

  // Act II: Lightspeed warp white-noise swoosh & sub rumble
  playWarpSwoosh(duration = 3.0) {
    this.playCinematicSwoosh(duration);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Sub-bass rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(50, now);
    subOsc.frequency.linearRampToValueAtTime(95, now + duration * 0.6);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + duration);

    subGain.gain.setValueAtTime(0.01, now);
    subGain.gain.linearRampToValueAtTime(0.3, now + 1.0);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + duration + 0.1);
  }

  // Act III: Cosmic orbit arrival chime chord
  playArrivalChime() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const chimeFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

    chimeFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.08, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + delay);
      osc.stop(now + delay + 2.3);
    });
  }

  // Act IV: Patrick's Portal Warm E Major Chord (329.63Hz)
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
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 1.2);

      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.09, now + i * 0.03 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 1.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 1.5);
    });
  }

  // Act IV: Yangiee's Portal Sweet Airy A Major Chord (440Hz)
  playYangieeChord() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;
    const freqs = [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5

    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.03);

      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.03 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 1.6);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + 1.7);
    });
  }

  // Act IV: Mini-Supernova Burst on selection
  playSupernovaSound() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime;

    // Burst sparkle
    const burstFreqs = [587.33, 880.00, 1174.66, 1760.00];
    burstFreqs.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.2);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.85);
    });

    // Dispersion noise whoosh
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.9);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 0.95);
  }

  // ============================================================================
  // Deep-Space Hum & Solar Wind Atmosphere Generator
  // ============================================================================

  startCosmicAtmosphere() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.atmosphereActive) return;

    this.atmosphereActive = true;
    const now = this.ctx.currentTime;

    // 1. Deep-Space Orbital Hum (55Hz Sub-bass carrier + 0.05Hz LFO)
    this.humOsc = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();
    this.humLfo = this.ctx.createOscillator();
    this.humLfoGain = this.ctx.createGain();

    this.humOsc.type = 'sine';
    this.humOsc.frequency.setValueAtTime(55, now); // A1 note

    this.humLfo.type = 'sine';
    this.humLfo.frequency.setValueAtTime(0.05, now); // 20-second gentle breathing cycle
    this.humLfoGain.gain.setValueAtTime(0.04, now);

    this.humGain.gain.setValueAtTime(0.001, now);
    this.humGain.gain.linearRampToValueAtTime(0.09, now + 3.0);

    this.humLfo.connect(this.humLfoGain);
    this.humLfoGain.connect(this.humGain.gain);
    this.humOsc.connect(this.humGain);
    this.humGain.connect(this.masterGain);

    this.humOsc.start(now);
    this.humLfo.start(now);

    // 2. Solar Wind Sweep (Resonant Pink Noise + 0.03Hz Filter Sweeper)
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.createPinkNoiseBuffer();
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(650, now);
    this.windFilter.Q.setValueAtTime(3.8, now);

    this.windLfo = this.ctx.createOscillator();
    this.windLfo.type = 'sine';
    this.windLfo.frequency.setValueAtTime(0.03, now); // ~33 second undulating breeze

    this.windLfoGain = this.ctx.createGain();
    this.windLfoGain.gain.setValueAtTime(450, now);

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.001, now);
    this.windGain.gain.linearRampToValueAtTime(0.08, now + 4.0);

    this.windLfo.connect(this.windLfoGain);
    this.windLfoGain.connect(this.windFilter.frequency);

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

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
        // Node already stopped
      }
    }, fadeDuration * 1000 + 100);
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

  playChewSound() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(320, this.ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  playChimeSound(frequency = 880) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, this.ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.81);
  }

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

  dispose() {
    this.stopCosmicAtmosphere(0.1);
    if (this.thunderTimer) clearTimeout(this.thunderTimer);
    if (this.birdTimer) clearTimeout(this.birdTimer);
    if (this.lofiInterval) clearInterval(this.lofiInterval);
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.isPlaying = false;
  }
}

export const synthEngine = new CosmicSynthEngine();
window.synthEngine = synthEngine;
