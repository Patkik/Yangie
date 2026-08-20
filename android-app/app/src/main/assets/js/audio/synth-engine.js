/**
 * Pure Web Audio API Sound Synthesizer Module (synth-engine.js)
 * Generates cozy atmospheric ambient soundtracks procedurally with zero external audio assets.
 */

class CosmicSynthEngine {
    constructor() {
        this.ctx = null;
        this.nodes = {};
        this.isPlaying = false;

        // Channel states
        this.channels = {
            rain: { volume: 0, node: null, gainNode: null },
            thunder: { volume: 0, node: null, gainNode: null },
            ocean: { volume: 0, node: null, gainNode: null },
            forest: { volume: 0, node: null, gainNode: null },
            lofi: { volume: 0, node: null, gainNode: null }
        };

        this.masterGain = null;
        this.lofiInterval = null;
    }

    init() {
        if (this.ctx) return; // already initialized

        // Create audio context
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Master Volume
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Initialize sound generators
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

    stopAll() {
        if (!this.ctx) return;
        Object.keys(this.channels).forEach(ch => {
            this.setVolume(ch, 0);
        });
        if (this.ctx.state === 'running') {
            this.ctx.suspend();
        }
        this.isPlaying = false;
    }

    // Helper: Pink noise buffer generator (great for organic rumbling like ocean/thunder)
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
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11; // rescue clipping
            b6 = white * 0.115926;
        }
        return noiseBuffer;
    }

    // Helper: White noise buffer generator (great for static/rain)
    createWhiteNoiseBuffer() {
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    /* 1. Rain Synthesizer: Bandpassed White Noise */
    initRain() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.createWhiteNoiseBuffer();
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1.0;

        const rainGain = this.ctx.createGain();
        rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

        source.connect(filter);
        filter.connect(rainGain);
        rainGain.connect(this.masterGain);

        source.start(0);

        this.channels.rain.node = source;
        this.channels.rain.gainNode = rainGain;
    }

    /* 2. Ocean Synthesizer: Lowpassed Pink Noise modulated by an LFO */
    initOcean() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.createPinkNoiseBuffer();
        source.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;

        // Wave LFO: Modulates filter cutoff and volume to simulate rolling waves
        const lfo = this.ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12; // Slow cycles: ~8 seconds per wave

        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 150; // modulates filter by +-150Hz

        const oceanGain = this.ctx.createGain();
        oceanGain.gain.setValueAtTime(0, this.ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        
        source.connect(filter);
        filter.connect(oceanGain);
        oceanGain.connect(this.masterGain);

        lfo.start(0);
        source.start(0);

        // Also modulate volume with LFO slightly out of phase
        const lfoVol = this.ctx.createOscillator();
        lfoVol.type = 'sine';
        lfoVol.frequency.value = 0.12;
        const lfoVolGain = this.ctx.createGain();
        lfoVolGain.gain.value = 0.15;
        
        lfoVol.connect(lfoVolGain);
        lfoVolGain.connect(oceanGain.gain);

        lfoVol.start(0);

        this.channels.ocean.node = source;
        this.channels.ocean.gainNode = oceanGain;
    }

    /* 3. Thunderstorm Synthesizer: Low rumbles triggered randomly */
    initThunder() {
        const thunderGain = this.ctx.createGain();
        thunderGain.gain.setValueAtTime(0, this.ctx.currentTime);
        thunderGain.connect(this.masterGain);

        this.channels.thunder.gainNode = thunderGain;
        
        // Thunder is triggered via a random scheduler rather than a continuous loop
        this.scheduleThunder();
    }

    triggerThunderStrike() {
        if (!this.ctx || this.channels.thunder.volume === 0) return;

        const source = this.ctx.createBufferSource();
        source.buffer = this.createPinkNoiseBuffer();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, this.ctx.currentTime);
        
        // Rumble fall-off
        filter.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 4.0);

        const strikeGain = this.ctx.createGain();
        strikeGain.gain.setValueAtTime(0, this.ctx.currentTime);
        strikeGain.gain.linearRampToValueAtTime(this.channels.thunder.volume * 0.6, this.ctx.currentTime + 0.1);
        strikeGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4.5);

        source.connect(filter);
        filter.connect(strikeGain);
        strikeGain.connect(this.channels.thunder.gainNode);

        source.start(0);
        source.stop(this.ctx.currentTime + 5.0);
    }

    scheduleThunder() {
        const nextStrike = 8000 + Math.random() * 20000;
        setTimeout(() => {
            this.triggerThunderStrike();
            this.scheduleThunder();
        }, nextStrike);
    }

    /* 4. Forest Synthesizer: Procedural bird chirps & cricket soundscapes */
    initForest() {
        const forestGain = this.ctx.createGain();
        forestGain.gain.setValueAtTime(0, this.ctx.currentTime);
        forestGain.connect(this.masterGain);

        this.channels.forest.gainNode = forestGain;
        
        this.scheduleBirdChirp();
    }

    triggerBirdChirp() {
        if (!this.ctx || this.channels.forest.volume === 0) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const amp = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800 + Math.random() * 1200, now);
        
        // Fast pitch slide (chirp effect)
        osc.frequency.exponentialRampToValueAtTime(2500 + Math.random() * 500, now + 0.15);

        amp.gain.setValueAtTime(0, now);
        amp.gain.linearRampToValueAtTime(this.channels.forest.volume * 0.12, now + 0.02);
        amp.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(amp);
        amp.connect(this.channels.forest.gainNode);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    scheduleBirdChirp() {
        const nextChirp = 3000 + Math.random() * 8000;
        setTimeout(() => {
            this.triggerBirdChirp();
            if (Math.random() > 0.4) {
                setTimeout(() => this.triggerBirdChirp(), 220);
            }
            this.scheduleBirdChirp();
        }, nextChirp);
    }

    /* 5. Cozy Lo-Fi Drum & Chords Synth Engine */
    initLofi() {
        const lofiGain = this.ctx.createGain();
        lofiGain.gain.setValueAtTime(0, this.ctx.currentTime);
        lofiGain.connect(this.masterGain);

        this.channels.lofi.gainNode = lofiGain;
        this.startLofiBeat();
    }

    playLofiSnare(time, vol) {
        const osc = this.ctx.createOscillator();
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createPinkNoiseBuffer();

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1200;

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(vol * 0.18, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        const oscGain = this.ctx.createGain();
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.08);
        oscGain.gain.setValueAtTime(vol * 0.1, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.channels.lofi.gainNode);

        osc.connect(oscGain);
        oscGain.connect(this.channels.lofi.gainNode);

        noise.start(time);
        noise.stop(time + 0.2);
        osc.start(time);
        osc.stop(time + 0.15);
    }

    playLofiKick(time, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

        gain.gain.setValueAtTime(vol * 0.45, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

        osc.connect(gain);
        gain.connect(this.channels.lofi.gainNode);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playLofiChord(time, notes, duration, vol) {
        notes.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lowpass = this.ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.value = freq;

            lowpass.type = 'lowpass';
            lowpass.frequency.setValueAtTime(600, time);

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(vol * 0.06, time + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

            osc.connect(lowpass);
            lowpass.connect(gain);
            gain.connect(this.channels.lofi.gainNode);

            osc.start(time);
            osc.stop(time + duration + 0.1);
        });
    }

    startLofiBeat() {
        let step = 0;
        const tempo = 72;
        const stepTime = 60 / tempo / 2;

        const chordProgression = [
            [174.61, 220.00, 261.63, 329.63], // F3, A3, C4, E4
            [196.00, 246.94, 293.66, 329.63], // G3, B3, D4, E4
            [164.81, 196.00, 246.94, 293.66], // E3, G3, B3, D4
            [220.00, 261.63, 329.63, 392.00]  // A3, C4, E4, G4
        ];

        this.lofiInterval = setInterval(() => {
            if (!this.ctx || this.channels.lofi.volume === 0) return;
            const now = this.ctx.currentTime;
            const currentVol = this.channels.lofi.volume;

            const index = step % 8;
            if (index === 0 || index === 4) {
                this.playLofiKick(now, currentVol);
            }
            if (index === 2 || index === 6) {
                this.playLofiSnare(now, currentVol);
            }

            if (step % 16 === 0) {
                const chordIndex = Math.floor(step / 16) % chordProgression.length;
                this.playLofiChord(now, chordProgression[chordIndex], stepTime * 14, currentVol);
            }

            step++;
        }, stepTime * 1000);
    }

    /* Channel control */
    setVolume(channel, volume) {
        if (!this.ctx) this.init();
        
        const vol = Math.max(0, Math.min(1, volume));
        if (this.channels[channel]) {
            this.channels[channel].volume = vol;

            if (this.channels[channel].gainNode) {
                this.channels[channel].gainNode.gain.linearRampToValueAtTime(
                    vol, 
                    this.ctx.currentTime + 0.2
                );
            }
        }
    }
}

// Global Export and Singleton Initialization
window.CosmicSynthEngine = CosmicSynthEngine;
window.synthEngine = new CosmicSynthEngine();
