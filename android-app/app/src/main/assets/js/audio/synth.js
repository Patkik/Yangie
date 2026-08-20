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

  dispose() {
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
