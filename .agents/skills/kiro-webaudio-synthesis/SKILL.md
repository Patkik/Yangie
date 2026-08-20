---
name: kiro-webaudio-synthesis
description: Pure Web Audio API procedural sound synthesis for cozy atmospheric ambient tracks (rain, ocean, thunder, forest, lofi) and cartoon sound FX with zero external audio assets.
---

# Procedural Sound Synthesis (Web Audio API)

Use this skill when building, modifying, or tuning offline-first procedural sound engines and FX.

## 1. Core Noise Generation
- **Pink Noise Buffer**: Multi-pole filtering (`b0` through `b6`) for organic rumbles, rolling waves, and thunderstorm impacts.
- **White Noise Buffer**: Uniform random samples for rainfall static and cartoon munch/crunch clicks.

## 2. Atmospheric Generators
- **Rain**: White noise connected to a Bandpass BiquadFilter (`frequency: 1000Hz, Q: 1.0`).
- **Ocean Waves**: Pink noise connected to a Lowpass filter (`frequency: 350Hz`) modulated by a slow `0.12Hz` sine LFO for 8-second wave periods.
- **Thunder**: Randomized scheduler (`8-28s`) triggering pink noise lowpass sweeps with exponential decay ramps.
- **Forest & Birds**: Randomized scheduler triggering fast frequency slide sine oscillators (`800Hz -> 2500Hz`).
- **Lo-Fi Sequencer**: 72-BPM eighth-note loop with procedural kick (pitch-decay sine), soft snare (bandpassed pink noise + sine), and 4-bar triangle wave jazz chord progressions (`FM7 -> G6 -> Em7 -> Am7`).

## 3. Cartoon Chewing & UI Sound FX
- **Munch**: 80ms bandpass white noise burst (`1200Hz, Q: 3.0`).
- **Gulp/Pop**: Triangle wave sliding upward from `220Hz` to `440Hz` over `120ms`.
