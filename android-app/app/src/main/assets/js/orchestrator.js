/**
 * orchestrator.js (Kiro Autonomous Agentic Orchestration Engine v5.0)
 * ─────────────────────────────────────────────────────────────────────
 * Implements the Supervisor-Specialist Multi-Agent System (MAS) pattern
 * with deterministic Standard Operating Procedures (SOPs):
 *
 * 1. Supervisor Agent:
 *    - Global state observer & task delegator
 *    - 3-tier memory management (Working, Session, Long-Term)
 *
 * 2. Specialist Sub-Agents:
 *    - Vitals Agent: Monitors hunger, hydration, and sleepiness metrics
 *    - Soundscape Agent: Sweeps Web Audio filters and LFO modulations
 *    - Astrogation Agent: Coordinates 3D celestial coordinates, comets, & warp
 *
 * 3. SOP Graph State Machine:
 *    - Bedtime SOP (Sleep Mode transition)
 *    - Wakeup SOP (Morning Awaken transition)
 *    - Feeding SOP (Treat gravity drop & chewing reaction)
 *    - Warp Navigation SOP (Telescope observatory target lock)
 *
 * Complies with Antigravity Flat ESM architecture & Twilight design tokens.
 */

import { KiroState } from './state.js';

export class KiroAgenticOrchestrator {
  /**
   * @param {import('./synth.js').synthEngine} synth
   * @param {import('./scene.js').KiroSceneManager} scene
   */
  constructor(synth, scene) {
    this.synth = synth;
    this.scene = scene;

    // Working Memory (Immediate context & active timers)
    this.workingMemory = {
      activeSOP: null,
      holdTimer: null,
      petCountSession: 0,
      lastFeedTimestamp: Date.now(),
      lastHydrateTimestamp: Date.now(),
      activeSoundscapePreset: null,
    };

    // Sub-agent specialist delegates
    this.vitalsAgent = new VitalsSpecialist(this);
    this.soundscapeAgent = new SoundscapeSpecialist(this, synth);
    this.astrogationAgent = new AstrogationSpecialist(this, scene);

    this.init();
  }

  init() {
    // Subscribe to global KiroState events
    KiroState.subscribe('isSleeping', (isSleeping) => {
      if (isSleeping) {
        this.executeBedtimeSOP();
      } else {
        this.executeWakeupSOP();
      }
    });

    KiroState.subscribe('telescopeActive', (isActive) => {
      if (isActive) {
        this.astrogationAgent.enterObservatoryMode();
      } else {
        this.astrogationAgent.exitObservatoryMode();
      }
    });

    // Start background cognitive tick (vitals decay & wellbeing evaluation)
    this.vitalsAgent.startLoop();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     Standard Operating Procedures (SOP-Driven Engine)
     ───────────────────────────────────────────────────────────────────────── */

  /**
   * Bedtime SOP: Triggered when user enters sleep mode
   */
  executeBedtimeSOP() {
    this.workingMemory.activeSOP = 'BEDTIME';

    // 1. Vitals update via SSOT
    if (KiroState.get('isSleeping') !== true) {
      KiroState.setSleep(true);
    }

    // 2. Soundscape muffling (lowpass filter down to 180Hz)
    this.soundscapeAgent.applyBedtimeFilter(true);

    // 3. Astrogation & 3D scene adjustments
    this.astrogationAgent.applySleepCosmology(true);

    // 4. Trigger procedural sleepy yawn & purr
    if (this.synth) {
      if (typeof this.synth.playSleepyYawn === 'function') {
        this.synth.playSleepyYawn();
      } else if (typeof this.synth.playPurrSound === 'function') {
        this.synth.playPurrSound(1.4);
      }
    }
  }

  /**
   * Wakeup SOP: Triggered when user wakes Kiro
   */
  executeWakeupSOP() {
    this.workingMemory.activeSOP = 'WAKEUP';

    // 1. Vitals update via SSOT
    if (KiroState.get('isSleeping') !== false) {
      KiroState.setSleep(false);
    }

    // 2. Soundscape restore
    this.soundscapeAgent.applyBedtimeFilter(false);

    // 3. Astrogation & 3D scene adjustments
    this.astrogationAgent.applySleepCosmology(false);

    // 4. Play morning wakeup chirp
    if (this.synth) {
      if (typeof this.synth.playHappyChirp === 'function') {
        this.synth.playHappyChirp();
      } else if (typeof this.synth.playPetChime === 'function') {
        this.synth.playPetChime();
      }
    }
  }

  /**
   * Feeding SOP: Drops physical treat and updates hunger/hydration vitals
   * @param {'star'|'donut'|'water'} treatType
   */
  executeFeedingSOP(treatType) {
    this.workingMemory.activeSOP = 'FEEDING';

    const result = KiroState.consumeItem(treatType);
    if (!result.success) {
      if (this.synth && typeof this.synth.playSadWhimper === 'function') {
        this.synth.playSadWhimper();
      }
      if (typeof window !== 'undefined' && window.KiroApp && typeof window.KiroApp.spawnNetworkAlertBanner === 'function') {
        window.KiroApp.spawnNetworkAlertBanner(`⚠️ ${result.reason}`);
      }
      return result;
    }

    if (treatType === 'star') {
      if (this.scene && this.scene.dropCandy) this.scene.dropCandy('star');
      if (this.synth) {
        if (typeof this.synth.playEatingCandy === 'function') this.synth.playEatingCandy();
        else if (typeof this.synth.playChewSound === 'function') this.synth.playChewSound();
      }
    } else if (treatType === 'donut') {
      if (this.scene && this.scene.dropCandy) this.scene.dropCandy('donut');
      if (this.synth) {
        if (typeof this.synth.playEatingCandy === 'function') this.synth.playEatingCandy();
        else if (typeof this.synth.playChewSound === 'function') this.synth.playChewSound();
      }
    } else if (treatType === 'water') {
      if (this.scene && this.scene.splashWater) this.scene.splashWater();
      if (this.synth) {
        if (typeof this.synth.playWaterGulp === 'function') this.synth.playWaterGulp();
        else if (typeof this.synth.playWaterSound === 'function') this.synth.playWaterSound();
      }
    }

    return result;
  }

  /**
   * Petting SOP: Direct touch tactile deformation and purr/giggle synthesis
   */
  executePettingSOP() {
    this.workingMemory.petCountSession++;
    this.vitalsAgent.boostHappiness(8);

    if (this.synth) {
      if (this.workingMemory.petCountSession % 2 === 0 && typeof this.synth.playGiggle === 'function') {
        this.synth.playGiggle();
      } else if (typeof this.synth.playPurr === 'function') {
        this.synth.playPurr(1.2);
      } else if (typeof this.synth.playPetChime === 'function') {
        this.synth.playPetChime();
      }
    }

    if (this.scene && this.scene.triggerPetReaction) {
      this.scene.triggerPetReaction();
    }
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Specialist Sub-Agents
   ───────────────────────────────────────────────────────────────────────── */

class VitalsSpecialist {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.intervalId = null;
    this.lastSoundAlert = 0;
    this.lastTickTime = Date.now();
  }

  startLoop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.lastTickTime = Date.now();
    this.intervalId = setInterval(() => this.tick(), 5000); // 5s high-frequency delta evaluation
  }

  tick() {
    const now = Date.now();
    const dtSec = Math.max(0.1, (now - this.lastTickTime) / 1000);
    this.lastTickTime = now;
    const dtHr = dtSec / 3600;

    const isSleeping = KiroState.get('isSleeping');
    let food = KiroState.get('vitals.food') ?? 100;
    let water = KiroState.get('vitals.water') ?? 100;
    let energy = KiroState.get('vitals.energy') ?? 100;

    if (!isSleeping) {
      // 1. Natural Passive Decay (awake)
      // dF/dt = -1.5%/hr, dH/dt = -2.0%/hr, base dE/dt = -1.0%/hr
      food -= 1.5 * dtHr;
      water -= 2.0 * dtHr;

      // 2. Starvation & Dehydration Metabolic Crisis Drag on Energy
      let deltaEDrag = 0;
      if (food < 30 || water < 30) {
        const hungerPenalty = Math.max(0, 1.0 - (food / 30.0));
        const thirstPenalty = Math.max(0, 1.0 - (water / 30.0));
        deltaEDrag = -1.5 * (hungerPenalty + thirstPenalty); // % per hour
      }

      let energyRatePerHour = -1.0 + deltaEDrag;

      // 3. Space Shuttle Cockpit Piloting Exhaustion
      const isTelescope = KiroState.get('telescopeActive');
      if (isTelescope) {
        const steering = KiroState.get('cockpitSteering') || {};
        const isSteering = Math.abs(steering.pitch || 0) > 0 || Math.abs(steering.yaw || 0) > 0;
        const isAligned = Boolean(steering.aligned);

        if (isAligned) {
          // Lock-On Thruster Burn: -1.25%/min = -75%/hr
          energyRatePerHour -= 75.0;
        } else if (isSteering) {
          // Slow Steering: -0.50%/min = -30%/hr
          energyRatePerHour -= 30.0;
        }

        // Check Pilot Exhaustion Collapse (< 10% Energy)
        if (energy < 10.0) {
          KiroState.set('telescopeActive', false);
          KiroState.setSleep(true);
          if (this.orchestrator.synth && typeof this.orchestrator.synth.playSleepyYawn === 'function') {
            this.orchestrator.synth.playSleepyYawn();
          }
          if (typeof window !== 'undefined' && window.KiroApp && typeof window.KiroApp.spawnNetworkAlertBanner === 'function') {
            window.KiroApp.spawnNetworkAlertBanner('😴 Kiro is exhausted from piloting and fell asleep at the console!');
          }
        }
      }

      energy += energyRatePerHour * dtHr;
    } else {
      // Active Restoration Sleeping Cycle
      // Halved Food & Hydration decays
      food -= 0.75 * dtHr;
      water -= 1.0 * dtHr;
      // Rapid Energy Recovery (+15%/hr)
      energy += 15.0 * dtHr;
    }

    // Clamp to [0, 100]
    food = Math.max(0, Math.min(100, food));
    water = Math.max(0, Math.min(100, water));
    energy = Math.max(0, Math.min(100, energy));

    KiroState.state.food = food;
    KiroState.state.water = water;
    KiroState.state.energy = energy;
    KiroState.state.vitals.food = food;
    KiroState.state.vitals.water = water;
    KiroState.state.vitals.energy = energy;

    const avg = Math.round((food + water + energy) / 3);
    KiroState.state.wellbeing = avg;
    KiroState.state.mood = isSleeping ? 'sleeping' : (avg > 80 ? 'thriving' : (avg > 50 ? 'happy' : 'okay'));

    KiroState.saveVitals();
    KiroState.emit('change:vitals', { newValue: KiroState.state.vitals });
    KiroState.emit('change:wellbeing', { newValue: avg });

    // Periodic Star Candy Stock Check
    KiroState.checkStarCandyDailyRestock();

    // Throttled Vocal Feedback
    if (avg < 35 && now - this.lastSoundAlert > 60000) {
      if (this.orchestrator.synth && typeof this.orchestrator.synth.playSadWhimper === 'function') {
        this.orchestrator.synth.playSadWhimper();
        this.lastSoundAlert = now;
      }
    } else if (avg > 85 && Math.random() < 0.25 && now - this.lastSoundAlert > 90000) {
      if (this.orchestrator.synth && typeof this.orchestrator.synth.playPurr === 'function') {
        this.orchestrator.synth.playPurr(1.0);
        this.lastSoundAlert = now;
      }
    }
  }

  boostHunger(amount) {
    KiroState.consumeItem('donut');
  }

  boostHydration(amount) {
    KiroState.consumeItem('water');
  }

  boostHappiness(amount) {
    const curr = KiroState.get('wellbeing') || 95;
    KiroState.set('wellbeing', Math.min(100, curr + amount));
  }
}

class SoundscapeSpecialist {
  constructor(orchestrator, synth) {
    this.orchestrator = orchestrator;
    this.synth = synth;
  }

  applyBedtimeFilter(isBedtime) {
    if (!this.synth || !this.synth.ambientFilter) return;
    try {
      const targetFreq = isBedtime ? 180 : 2400;
      const now = this.synth.ctx.currentTime;
      this.synth.ambientFilter.frequency.cancelScheduledValues(now);
      this.synth.ambientFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + 1.2);
    } catch (e) {
      // Audio context might be idle
    }
  }
}

class AstrogationSpecialist {
  constructor(orchestrator, scene) {
    this.orchestrator = orchestrator;
    this.scene = scene;
  }

  applySleepCosmology(isSleeping) {
    if (!this.scene) return;
    if (this.scene.setSleepMode) {
      this.scene.setSleepMode(isSleeping);
    }
  }

  enterObservatoryMode() {
    if (this.scene && this.scene.setTelescopeMode) {
      this.scene.setTelescopeMode(true);
    }
  }

  exitObservatoryMode() {
    if (this.scene && this.scene.setTelescopeMode) {
      this.scene.setTelescopeMode(false);
    }
  }
}

export default KiroAgenticOrchestrator;
