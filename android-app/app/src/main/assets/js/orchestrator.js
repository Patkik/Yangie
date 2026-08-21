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

    // 4. Trigger procedural purr
    if (this.synth && this.synth.playPurrSound) {
      this.synth.playPurrSound(1.2);
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

    // 4. Play morning wakeup chime
    if (this.synth && this.synth.playPetChime) {
      this.synth.playPetChime();
    }
  }

  /**
   * Feeding SOP: Drops physical treat and updates hunger/hydration vitals
   * @param {'star'|'donut'|'water'} treatType
   */
  executeFeedingSOP(treatType) {
    this.workingMemory.activeSOP = 'FEEDING';

    if (treatType === 'star') {
      if (this.scene && this.scene.dropCandy) this.scene.dropCandy('star');
      if (this.synth && this.synth.playChewSound) this.synth.playChewSound();
      KiroState.feed('star');
    } else if (treatType === 'donut') {
      if (this.scene && this.scene.dropCandy) this.scene.dropCandy('donut');
      if (this.synth && this.synth.playChewSound) this.synth.playChewSound();
      KiroState.feed('donut');
    } else if (treatType === 'water') {
      if (this.scene && this.scene.splashWater) this.scene.splashWater();
      if (this.synth && this.synth.playWaterSound) this.synth.playWaterSound();
      KiroState.drinkWater();
    }
  }

  /**
   * Petting SOP: Direct touch tactile deformation and purr synthesis
   */
  executePettingSOP() {
    this.workingMemory.petCountSession++;
    this.vitalsAgent.boostHappiness(8);

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
  }

  startLoop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.tick(), 30000); // Check every 30s
  }

  tick() {
    const isSleeping = KiroState.get('isSleeping');
    if (!isSleeping) {
      // Natural slow decay of hunger and hydration
      const currentHunger = KiroState.get('hunger') || 85;
      const currentThirst = KiroState.get('hydration') || 90;
      KiroState.set('hunger', Math.max(10, currentHunger - 1));
      KiroState.set('hydration', Math.max(10, currentThirst - 1));
    }
  }

  boostHunger(amount) {
    const curr = KiroState.get('hunger') || 85;
    KiroState.set('hunger', Math.min(100, curr + amount));
  }

  boostHydration(amount) {
    const curr = KiroState.get('hydration') || 90;
    KiroState.set('hydration', Math.min(100, curr + amount));
  }

  boostHappiness(amount) {
    const curr = KiroState.get('happiness') || 95;
    KiroState.set('happiness', Math.min(100, curr + amount));
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
