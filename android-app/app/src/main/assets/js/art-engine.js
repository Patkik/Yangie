/**
 * 🌌 KIRO'S COSMIC HAVEN — ADAPTIVE RESOURCE THROTTLING (ART) ENGINE (V1.0)
 * ─────────────────────────────────────────────────────────────────────────────
 * Predictive, self-optimizing telemetry & resource management engine.
 * Continuously evaluates 5 real-time device telemetry signals:
 *   1. Device Model & Hardware Baseline (CPU Cores, RAM tier, GPU profile)
 *   2. Available Memory & Heap Pressure (Performance.memory, ComponentCallbacks2)
 *   3. Battery Thermal & Power State (Level, charging state, thermal proxy)
 *   4. User Visibility & Usage Patterns (Page visibility, idle interaction timer)
 *   5. Network Quality & Throughput (Effective connection type, RTT, downlink)
 *
 * Automatically executes graduated quality interventions:
 *   - Internal Resolution Scaling (DPR: 1.0x -> 0.85x -> 0.70x -> 0.50x)
 *   - Dynamic Celestial Geometry Pruning (Active particle buffer setDrawRange)
 *   - Sub-stepped Physics & Soft-Body Simulation Rates (120Hz -> 60Hz -> 30Hz)
 *   - Aggressive State & Retained DOM Cache Pruning
 *
 * Pure Vanilla JavaScript ES6 Module • Zero External Dependencies • 120 FPS
 */

import KiroState from './state.js';

export const ART_TIERS = {
  OPTIMAL: {
    id: 'OPTIMAL',
    name: 'Optimal (Native)',
    dprScale: 1.0,
    particleScale: 1.0,
    physicsSubstep: 1,
    audioFftRate: 1,
    label: '120/90 FPS • Native'
  },
  BALANCED: {
    id: 'BALANCED',
    name: 'Balanced (0.85x)',
    dprScale: 0.85,
    particleScale: 0.80,
    physicsSubstep: 1,
    audioFftRate: 1,
    label: '60 FPS • High'
  },
  PERFORMANCE: {
    id: 'PERFORMANCE',
    name: 'Performance (0.70x)',
    dprScale: 0.70,
    particleScale: 0.60,
    physicsSubstep: 2,
    audioFftRate: 2,
    label: '60 FPS • Performance'
  },
  ECO: {
    id: 'ECO',
    name: 'Eco Saver (0.50x)',
    dprScale: 0.50,
    particleScale: 0.40,
    physicsSubstep: 3,
    audioFftRate: 4,
    label: '30 FPS • Eco Saver'
  }
};

export class AdaptiveResourceThrottlingEngine {
  constructor() {
    // Current Active Tier
    this.currentTier = ART_TIERS.OPTIMAL;
    this.mode = localStorage.getItem('kiro_art_mode') || 'auto'; // 'auto' | 'optimal' | 'balanced' | 'performance' | 'eco'

    // Rolling Frame Time Monitor
    this.frameTimes = [];
    this.maxFrameSamples = 60;
    this.lastTimestamp = performance.now();
    this.rollingAverageMs = 16.6;
    this.fps = 60;

    // Hysteresis State (Anti-Oscillation Guard)
    this.consecutiveStableFrames = 0;
    this.consecutiveDropFrames = 0;
    this.upgradeFrameThreshold = 180; // ~3.0s at 60 FPS of stable execution before upgrading
    this.downgradeFrameThreshold = 30; // ~0.5s of struggle before downgrading

    // Telemetry Cache
    this.telemetry = {
      deviceMemoryGb: 4,
      hardwareConcurrency: 4,
      heapUsedMb: 0,
      heapTotalMb: 0,
      batteryLevel: 1.0,
      isBatteryCharging: true,
      isThermalStrained: false,
      isDocumentHidden: false,
      userIdleSeconds: 0,
      networkEffectiveType: '4g',
      networkRtt: 50,
      fps: 60,
      avgFrameMs: 16.6,
      currentTierId: 'OPTIMAL',
      dprScale: 1.0,
      particleScale: 1.0
    };

    // User Activity Tracking
    this.lastUserInteractionTime = Date.now();

    this.initHardwareBaseline();
    this.initListeners();
    this.initBatteryMonitoring();
    this.initPeriodicTelemetryScanner();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     1. Telemetry Signal Collectors
     ───────────────────────────────────────────────────────────────────────── */

  initHardwareBaseline() {
    if (typeof navigator !== 'undefined') {
      this.telemetry.hardwareConcurrency = navigator.hardwareConcurrency || 4;
      this.telemetry.deviceMemoryGb = navigator.deviceMemory || (navigator.hardwareConcurrency >= 8 ? 8 : 4);
    }
  }

  initListeners() {
    // Document Visibility Signal
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.telemetry.isDocumentHidden = document.hidden;
        if (document.hidden) {
          this.applyImmediateIntervention(ART_TIERS.ECO, 'Background Tab Isolation');
        } else {
          this.recalculateTier();
        }
      });

      // User Interaction Signal (Touch, Click, Key)
      const markInteraction = () => {
        if (this.telemetry.userIdleSeconds >= 120) {
          KiroState.emit('sound:duty_cycle_wake');
        }
        this.lastUserInteractionTime = Date.now();
        this.telemetry.userIdleSeconds = 0;
      };
      window.addEventListener('pointerdown', markInteraction, { passive: true });
      window.addEventListener('pointermove', markInteraction, { passive: true });
      window.addEventListener('keydown', markInteraction, { passive: true });
    }

    // Android Native Memory Trim Bridge Listener
    if (typeof window !== 'undefined') {
      window.addEventListener('kiro:trim_memory', (e) => {
        const level = e.detail?.level || 80;
        this.handleMemoryPressureTrim(level);
      });
    }

    KiroState.on('memory:trim', () => {
      this.handleMemoryPressureTrim(80);
    });

    KiroState.on('change:artMode', ({ newValue }) => {
      this.setMode(newValue);
    });
  }

  async initBatteryMonitoring() {
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        const updateBattery = () => {
          this.telemetry.batteryLevel = battery.level;
          this.telemetry.isBatteryCharging = battery.charging;
          this.checkThermalStrain();

          // 1. Automated Battery-Level Trigger (Auto-Eco under 20% on discharge)
          if (!battery.charging && battery.level <= 0.20) {
            if (!KiroState.get('ecoModeActive')) {
              console.log('[ART] Auto-activating Eco Mode: Battery <= 20% discharging');
              KiroState.setEcoMode(true);
            }
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      } catch (e) {
        // Battery API not supported or permissions restricted
      }
    }
  }

  initPeriodicTelemetryScanner() {
    this.telemetryInterval = setInterval(() => {
      this.scanMemoryPressure();
      this.scanNetworkQuality();
      this.scanUserIdleState();
      this.checkThermalStrain();
      this.emitTelemetryUpdate();
    }, 2000);
  }

  scanMemoryPressure() {
    if (typeof performance !== 'undefined' && performance.memory) {
      this.telemetry.heapUsedMb = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
      this.telemetry.heapTotalMb = Math.round(performance.memory.totalJSHeapSize / (1024 * 1024));

      // Heap usage ratio check
      const ratio = performance.memory.usedJSHeapSize / (performance.memory.jsHeapSizeLimit || 1);
      if (ratio > 0.85) {
        this.triggerStateCachePruning('High JS Heap Ratio');
      }
    }
  }

  scanNetworkQuality() {
    if (typeof navigator !== 'undefined' && navigator.connection) {
      const conn = navigator.connection;
      this.telemetry.networkEffectiveType = conn.effectiveType || '4g';
      this.telemetry.networkRtt = conn.rtt || 50;
    }
  }

  scanUserIdleState() {
    const idleMs = Date.now() - this.lastUserInteractionTime;
    this.telemetry.userIdleSeconds = Math.floor(idleMs / 1000);

    // 4. Web Audio Duty-Cycle Sleeping & Idle Interventions (> 2 mins)
    if (this.telemetry.userIdleSeconds >= 120) {
      KiroState.emit('sound:duty_cycle_sleep');
      if (this.mode === 'auto' && this.currentTier !== ART_TIERS.ECO) {
        this.applyImmediateIntervention(ART_TIERS.ECO, 'User Inactive > 2m (CPU Duty Cycle Sleep)');
      }
    }
  }

  checkThermalStrain() {
    // Thermal stress proxy: high frame time + discharging battery < 20%
    const isLowBattery = !this.telemetry.isBatteryCharging && this.telemetry.batteryLevel <= 0.20;
    const isFrameLagging = this.rollingAverageMs > 24.0;
    this.telemetry.isThermalStrained = Boolean(isLowBattery && isFrameLagging);
  }

  /* ─────────────────────────────────────────────────────────────────────────
     2. Rolling Frame Time Monitor & Predictive Evaluation Loop
     ───────────────────────────────────────────────────────────────────────── */

  /**
   * Called on every requestAnimationFrame tick from scene.js
   * @param {number} currentTimestamp - performance.now()
   */
  recordFrameTick(currentTimestamp) {
    const frameMs = currentTimestamp - this.lastTimestamp;
    this.lastTimestamp = currentTimestamp;

    // Ignore extreme spikes caused by tab switching or background pause
    if (frameMs > 0.5 && frameMs < 300) {
      this.frameTimes.push(frameMs);
      if (this.frameTimes.length > this.maxFrameSamples) {
        this.frameTimes.shift();
      }

      // Compute Rolling Average Frame Time
      const sum = this.frameTimes.reduce((acc, val) => acc + val, 0);
      this.rollingAverageMs = sum / this.frameTimes.length;
      this.fps = Math.round(1000 / (this.rollingAverageMs || 16.6));
      this.telemetry.avgFrameMs = this.rollingAverageMs;
      this.telemetry.fps = this.fps;

      // Predictive Evaluation in Auto Mode
      if (this.mode === 'auto') {
        this.evaluatePredictiveThrottling();
      }
    }
  }

  evaluatePredictiveThrottling() {
    if (this.telemetry.isDocumentHidden) {
      return; // Handled by visibility listener
    }

    const avgMs = this.rollingAverageMs;

    // Condition A: Heavy Frame Lag or Thermal Strain -> Downgrade candidate
    if (avgMs > 24.0 || this.telemetry.isThermalStrained) {
      this.consecutiveDropFrames++;
      this.consecutiveStableFrames = 0;

      if (this.consecutiveDropFrames >= this.downgradeFrameThreshold) {
        this.consecutiveDropFrames = 0;
        this.stepDownTier('High Frame Latency / Thermal Strain');
      }
    }
    // Condition B: Silky Smooth Performance -> Upgrade candidate
    else if (avgMs < 16.8 && !this.telemetry.isThermalStrained) {
      this.consecutiveStableFrames++;
      this.consecutiveDropFrames = 0;

      if (this.consecutiveStableFrames >= this.upgradeFrameThreshold) {
        this.consecutiveStableFrames = 0;
        this.stepUpTier('Sustained High Frame Rate');
      }
    } else {
      // Neutral zone (16.8ms - 24.0ms)
      this.consecutiveStableFrames = Math.max(0, this.consecutiveStableFrames - 1);
      this.consecutiveDropFrames = Math.max(0, this.consecutiveDropFrames - 1);
    }
  }

  stepDownTier(reason) {
    if (this.currentTier === ART_TIERS.OPTIMAL) {
      this.applyImmediateIntervention(ART_TIERS.BALANCED, reason);
    } else if (this.currentTier === ART_TIERS.BALANCED) {
      this.applyImmediateIntervention(ART_TIERS.PERFORMANCE, reason);
    } else if (this.currentTier === ART_TIERS.PERFORMANCE) {
      this.applyImmediateIntervention(ART_TIERS.ECO, reason);
    }
  }

  stepUpTier(reason) {
    if (this.currentTier === ART_TIERS.ECO) {
      this.applyImmediateIntervention(ART_TIERS.PERFORMANCE, reason);
    } else if (this.currentTier === ART_TIERS.PERFORMANCE) {
      this.applyImmediateIntervention(ART_TIERS.BALANCED, reason);
    } else if (this.currentTier === ART_TIERS.BALANCED) {
      this.applyImmediateIntervention(ART_TIERS.OPTIMAL, reason);
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
     3. Throttling Interventions & Reactive Dispatch
     ───────────────────────────────────────────────────────────────────────── */

  applyImmediateIntervention(targetTier, reason = 'Direct Policy') {
    if (this.currentTier === targetTier) return;
    const previousTier = this.currentTier;
    this.currentTier = targetTier;

    this.telemetry.currentTierId = targetTier.id;
    this.telemetry.dprScale = targetTier.dprScale;
    this.telemetry.particleScale = targetTier.particleScale;

    // 1. Notify KiroState & Subscribers
    KiroState.emit('art:tier_change', {
      tier: targetTier,
      previousTier,
      reason,
      telemetry: this.getTelemetrySnapshot()
    });

    KiroState.emit('art:scale_change', {
      dprScale: targetTier.dprScale,
      particleScale: targetTier.particleScale,
      physicsSubstep: targetTier.physicsSubstep,
      audioFftRate: targetTier.audioFftRate
    });

    // 2. If entering ECO or PERFORMANCE, trigger proactive cache pruning
    if (targetTier.id === 'ECO' || targetTier.id === 'PERFORMANCE') {
      this.triggerStateCachePruning(reason);
    }

    this.emitTelemetryUpdate();
  }

  handleMemoryPressureTrim(level) {
    // Force immediate downgrade to ECO or PERFORMANCE during native Android memory pressure
    if (level >= 80) {
      this.applyImmediateIntervention(ART_TIERS.ECO, `Native Memory Pressure (Level ${level})`);
    } else if (level >= 40) {
      this.applyImmediateIntervention(ART_TIERS.PERFORMANCE, `Native Memory Pressure (Level ${level})`);
    }
    this.triggerStateCachePruning(`Memory Trim Event (${level})`);
  }

  triggerStateCachePruning(reason) {
    KiroState.emit('art:prune_state', { reason });
  }

  setMode(newMode) {
    if (!['auto', 'optimal', 'balanced', 'performance', 'eco'].includes(newMode)) return;
    this.mode = newMode;
    try {
      localStorage.setItem('kiro_art_mode', newMode);
    } catch (e) {}

    if (newMode === 'auto') {
      this.recalculateTier();
    } else if (newMode === 'optimal') {
      this.applyImmediateIntervention(ART_TIERS.OPTIMAL, 'Manual User Override');
    } else if (newMode === 'balanced') {
      this.applyImmediateIntervention(ART_TIERS.BALANCED, 'Manual User Override');
    } else if (newMode === 'performance') {
      this.applyImmediateIntervention(ART_TIERS.PERFORMANCE, 'Manual User Override');
    } else if (newMode === 'eco') {
      this.applyImmediateIntervention(ART_TIERS.ECO, 'Manual User Override');
    }
  }

  recalculateTier() {
    if (this.telemetry.isDocumentHidden) {
      this.applyImmediateIntervention(ART_TIERS.ECO, 'Document Hidden');
      return;
    }

    if (this.telemetry.isThermalStrained || this.rollingAverageMs > 24.0) {
      this.applyImmediateIntervention(ART_TIERS.PERFORMANCE, 'Baseline Recalculation');
    } else if (this.rollingAverageMs > 18.0) {
      this.applyImmediateIntervention(ART_TIERS.BALANCED, 'Baseline Recalculation');
    } else {
      this.applyImmediateIntervention(ART_TIERS.OPTIMAL, 'Baseline Recalculation');
    }
  }

  emitTelemetryUpdate() {
    KiroState.emit('art:telemetry_update', this.getTelemetrySnapshot());
  }

  getTelemetrySnapshot() {
    return {
      ...this.telemetry,
      mode: this.mode,
      tier: this.currentTier
    };
  }

  dispose() {
    if (this.telemetryInterval) {
      clearInterval(this.telemetryInterval);
      this.telemetryInterval = null;
    }
  }
}

export const ARTEngine = new AdaptiveResourceThrottlingEngine();
if (typeof window !== 'undefined') {
  window.ARTEngine = ARTEngine;
}
export default ARTEngine;
