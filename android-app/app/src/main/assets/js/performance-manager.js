/**
 * performance-manager.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Kiro's Cosmic Haven — Adaptive Quality & Hardware Tiering Engine (V11.0)
 * ─────────────────────────────────────────────────────────────────────────────
 * Detects device hardware profile (CPU cores, memory, GPU renderer) and dynamically
 * adapts WebGL pixel ratio, particle counts, shader complexity, and glassmorphic
 * backdrop filters. Provides 3 calibrated tiers (High, Mid, Low) with manual override.
 */

export const QUALITY_TIERS = {
  HIGH: 'high',
  MID: 'mid',
  LOW: 'low'
};

export const TIER_PROFILES = {
  high: {
    id: 'high',
    label: 'Starlight Ultra',
    dprLimit: 1.75,
    starCount: 3200,
    dustCount: 700,
    blurMode: 'full',      // CSS backdrop-filter: blur(14px)
    enableShadows: true,
    fbmOctaves: 4,
    lodFactor: 1.0,
    meteorFrequency: 1.0,
    renderFpsCap: 120
  },
  mid: {
    id: 'mid',
    label: 'Balanced Cosmic',
    dprLimit: 1.35,
    starCount: 1800,
    dustCount: 350,
    blurMode: 'light',     // CSS backdrop-filter: blur(6px)
    enableShadows: false,
    fbmOctaves: 3,
    lodFactor: 0.8,
    meteorFrequency: 0.75,
    renderFpsCap: 60
  },
  low: {
    id: 'low',
    label: 'Eco Sanctuary',
    dprLimit: 1.0,
    starCount: 900,
    dustCount: 120,
    blurMode: 'none',      // Pure solid/tinted surfaces (0ms GPU readback tax)
    enableShadows: false,
    fbmOctaves: 2,
    lodFactor: 0.6,
    meteorFrequency: 0.5,
    renderFpsCap: 60
  }
};

export class PerformanceManager {
  constructor() {
    this.storageKey = 'kiro_quality_tier_override';
    this.tier = this.detectOptimalTier();
    this.override = localStorage.getItem(this.storageKey) || 'auto';
    this.activeProfile = TIER_PROFILES[this.override !== 'auto' ? this.override : this.tier];
    this.listeners = new Set();

    this.applyDomTokens();
  }

  /**
   * Profiling heuristic: hardwareConcurrency, deviceMemory, & GPU vendor strings
   */
  detectOptimalTier() {
    const cores = navigator.hardwareConcurrency || 4;
    const memoryGb = navigator.deviceMemory || 4;

    // Detect GPU renderer if WebGL context can be queried
    let isLowTierGpu = false;
    let isHighTierGpu = false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL).toLowerCase();
          if (renderer.includes('mali-g5') || renderer.includes('mali-t') || renderer.includes('adreno (tm) 5') || renderer.includes('adreno (tm) 61')) {
            isLowTierGpu = true;
          } else if (renderer.includes('adreno 7') || renderer.includes('mali-g7') || renderer.includes('apple') || renderer.includes('nvidia') || renderer.includes('radeon')) {
            isHighTierGpu = true;
          }
        }
      }
    } catch (e) {}

    // Low-Tier heuristic: <= 4 cores, <= 3GB RAM, or slow GPU
    if (cores <= 4 || memoryGb <= 3 || isLowTierGpu) {
      return QUALITY_TIERS.LOW;
    }

    // High-Tier heuristic: >= 8 cores, >= 6GB RAM, or flagship GPU
    if ((cores >= 8 && memoryGb >= 6) || isHighTierGpu) {
      return QUALITY_TIERS.HIGH;
    }

    // Mid-tier default (e.g. Snapdragon 7-series, 6-8 cores, 4GB RAM)
    return QUALITY_TIERS.MID;
  }

  setQualityTier(tierKey) {
    if (tierKey === 'auto') {
      this.override = 'auto';
      localStorage.removeItem(this.storageKey);
      this.activeProfile = TIER_PROFILES[this.detectOptimalTier()];
    } else if (TIER_PROFILES[tierKey]) {
      this.override = tierKey;
      localStorage.setItem(this.storageKey, tierKey);
      this.activeProfile = TIER_PROFILES[tierKey];
    }

    this.applyDomTokens();
    this.notifyListeners();
  }

  getProfile() {
    return this.activeProfile;
  }

  getDpr(targetDpr = window.devicePixelRatio || 1) {
    return Math.min(targetDpr, this.activeProfile.dprLimit);
  }

  applyDomTokens() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('tier-high', 'tier-mid', 'tier-low');
    root.classList.add(`tier-${this.activeProfile.id}`);
  }

  onProfileChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notifyListeners() {
    for (const fn of this.listeners) {
      try {
        fn(this.activeProfile);
      } catch (e) {
        console.error('[PerformanceManager] Listener error:', e);
      }
    }
  }
}

export const performanceManager = new PerformanceManager();

if (typeof window !== 'undefined') {
  window.performanceManager = performanceManager;
}
