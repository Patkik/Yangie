---
name: kiro-webaudio-synthesis
description: Pure Web Audio API procedural sound synthesis for cozy atmospheric ambient tracks (rain, ocean, thunder, forest, lofi) and cartoon sound FX with zero external audio assets.
---

# Skill 2: Pure Web Audio API Sound Synthesis

**Target Tech Stack**: JavaScript Web Audio API (`AudioContext`)  
**Scope**: Creating and maintaining Kiro's cozy, interactive, and 100% offline-first ambient generator (Rain, Waves, Thunder, Birdsong, Lo-Fi).

## 1. Engineering Directives

### A. Zero Local Audio Files
- **No Static Audio Assets**: All audio must be synthesized procedurally in real-time. Do not attempt to load `.mp3`, `.wav`, or `.ogg` assets. This guarantees the app works instantly without network connectivity, CORS issues, or APK packaging bloat.

### B. Cozy Procedural Noise Generation
- **Ocean Waves**: Use a custom pink noise buffer modulated by a slow Low-Frequency Oscillator (LFO) set between **0.08Hz and 0.15Hz** (simulating 7 to 12-second rolling wave swells). Connect the LFO to both the filter cutoff and a secondary gain node for natural wave breathing.
- **Rainfall**: Use bandpassed white noise (`center: 1000Hz, Q: 1.0`) paired with a high-pass filter to generate crisp, continuous raindrops without low-end rumble or static hum.
- **Randomized Scheduling**: Avoid static loops. Trigger thunder rolls and bird chirps using randomized timers (`Math.random()`) that compute exponential decays on filter nodes to simulate natural, rolling soundscapes.
- **Lo-Fi Sequencer**: 72-BPM hip-hop beat featuring procedural pitch-decay sine kicks, bandpass noise snares, and 4-bar triangle wave jazz chord progressions (`FM7 -> G6 -> Em7 -> Am7`).

### C. Strict AudioNode Disposal & Memory Management
- Whenever a sound channel or synthesizer track is stopped or replaced, all connected `AudioNode` wrappers, `AudioBufferSourceNode` instances, and filters must be explicitly disconnected (`node.disconnect()`) and stopped (`node.stop()`) to prevent audio thread memory leaks.
- Always manage `ctx.suspend()` when the app enters the background (via lifecycle bridge `appLifecycle.pauseGame()`) and `ctx.resume()` on foreground return.

---

## 2. Interactive Sound FX Synthesizers
- **Chewing / Crunch Munch**: 80ms bandpass white noise burst (`1200Hz, Q: 3.0`) with fast exponential decay.
- **Sweet Gulp / Pop**: Triangle wave with an upward pitch slide from `220Hz` to `440Hz` over `120ms`.
