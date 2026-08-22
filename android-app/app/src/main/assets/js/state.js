/**
 * state.js (KiroState V3)
 * Master reactive state machine for Space Capsule V3.
 * Supports centralized SSOT vitals, telescope cockpit steering, sleep alerts, and token normalization.
 */

class StateEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  subscribe(path, callback) {
    // Allows subscribing either to a state path or custom event
    if (path.startsWith('change:') || path.includes(':')) {
      return this.on(path, callback);
    }
    return this.on(`change:${path}`, (data) => {
      const val = data && data.newValue !== undefined ? data.newValue : data;
      callback(val);
    });
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, callbacks);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[KiroState Error in "${event}"]:`, e);
        }
      });
    }
  }
}

class KiroStateManager extends StateEmitter {
  constructor() {
    super();

    // Default V3 Master State Schema
    this.state = {
      persona: localStorage.getItem('starlight_persona') || null,
      currentUser: localStorage.getItem('starlight_persona') || 'pat',
      hasCompletedIntro: localStorage.getItem('kiro_intro_completed') === 'true',
      installedVersion: localStorage.getItem('gn_installed_version') || '2.3.5',
      isOtaActive: false,

      // Wellbeing & Real-time Vitals
      wellbeing: 100,
      food: 100,
      water: 100,
      energy: 100,
      vitals: {
        food: 100,
        water: 100,
        energy: 100
      },
      mood: 'thriving', // 'thriving' | 'happy' | 'okay' | 'sleeping'
      isSleeping: false,
      hasWellRestedBuff: false,

      // Dual-Currency Economic Framework (V5.0)
      stardustShards: parseInt(localStorage.getItem('kiro_stardust_shards') || '120', 10),
      cosmicEssence: parseInt(localStorage.getItem('kiro_cosmic_essence') || '10', 10),
      essenceCap: 100, // Boosted to 600 by Crab Pulsar milestone

      // Exoplanet Progression Milestones (7 Celestial Destinations)
      currentPlanet: localStorage.getItem('kiro_current_planet') || 'gliese',
      unlockedPlanets: JSON.parse(localStorage.getItem('kiro_unlocked_planets') || '["gliese"]'),
      exoplanetCatalog: {
        gliese:    { id: 'gliese', name: 'Gliese 667', type: 'Mint Ice World', dist: '23.6 ly', game: 'tetris', gameTitle: 'Celestial Tetris', buffTitle: 'Base Sanctuary Operational', buffMultiplier: 1.0, cost: 0 },
        trappist:  { id: 'trappist', name: 'Trappist 1', type: 'Pastel Star Sanctuary', dist: '39.6 ly', game: 'pong', gameTitle: 'Starlight Catch', buffTitle: 'Auto-collects +1 Stardust Shard', buffMultiplier: 1.1, cost: 150 },
        kepler:    { id: 'kepler', name: 'Kepler 186', type: 'Lavender Ring Giant', dist: '582 ly', game: 'runner', gameTitle: 'Orbital Rings', buffTitle: '50% Slower Water Decay', buffMultiplier: 1.25, cost: 350 },
        helix:     { id: 'helix', name: 'Eye of Helix Nebula', type: 'Ionized Nebula', dist: '655 ly', game: 'tetris', gameTitle: 'Celestial Bounce', buffTitle: '1.5x Squish Multiplier in Tetris', buffMultiplier: 1.5, cost: 600 },
        butterfly: { id: 'butterfly', name: 'Butterfly Galaxy', type: 'Galactic Sanctuary', dist: '3.80 kly', game: 'dodge', gameTitle: 'Nebula Dodge', buffTitle: 'Glassmorphic UI Aurora Theme', buffMultiplier: 1.75, cost: 1000 },
        crab:      { id: 'crab', name: 'Crab Pulsar Core', type: 'Neutron Pulsar', dist: '6.50 kly', game: 'pong', gameTitle: 'Supernova Blast', buffTitle: 'Cosmic Essence Cap +500', buffMultiplier: 2.0, cost: 1500 },
        sombrero:  { id: 'sombrero', name: 'Sombrero Vortex', type: 'Spiral Core', dist: '29.3 Mly', game: 'runner', gameTitle: 'Starlight Sequencer', buffTitle: 'Permanent Thriving Aura & 3x Multiplier', buffMultiplier: 3.0, cost: 2500 }
      },

      // Pilot Cockpit & Advanced Telescope Navigation
      telescopeActive: false,
      cockpitSteering: {
        pitch: 0,
        yaw: 0,
        aligned: false,
        currentTarget: null
      },

      // Shared Sleep Notification Alerts
      incomingSleepAlert: null,

      // Synthesizer & Sensor Preferences
      gyroEnabled: true,
      ecoModeActive: localStorage.getItem('kiro_eco_mode') === 'true',
      artMode: localStorage.getItem('kiro_art_mode') || 'auto', // 'auto' | 'optimal' | 'balanced' | 'performance' | 'eco'
      artTelemetry: {
        currentTierId: 'OPTIMAL',
        fps: 60,
        avgFrameMs: 16.6,
        dprScale: 1.0,
        particleScale: 1.0
      },
      audioSettings: {
        masterVolume: parseFloat(localStorage.getItem('kiro_audio_master') || '0.85'),
        sfxVolume: parseFloat(localStorage.getItem('kiro_audio_sfx') || '0.90'),
        ambientVolume: parseFloat(localStorage.getItem('kiro_audio_ambient') || '0.75'),
        pitchMultiplier: parseFloat(localStorage.getItem('kiro_audio_pitch') || '1.0')
      },
      soundVolumes: {
        rain: 0,
        ocean: 0,
        thunder: 0,
        forest: 0,
        lofi: 0
      },
      audioReactiveLevel: 0.0,
      distanceApart: 938,
      weather: {
        pat: { temp: '24°C', location: 'Malaybalay', condition: 'Cosmic Sky' },
        yang: { temp: '28°C', location: 'Capas', condition: 'Starlight Veil' }
      }
    };

    this.loadPersistedVitals();
    this.refreshMilestoneCaps();
    this.startPassiveStardustTick();
  }

  loadPersistedVitals() {
    try {
      const saved = localStorage.getItem('kiro_vitals');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state.wellbeing = parsed.wellbeing ?? 100;
        this.state.food = parsed.food ?? 100;
        this.state.water = parsed.water ?? 100;
        this.state.energy = parsed.energy ?? 100;
        this.state.vitals.food = this.state.food;
        this.state.vitals.water = this.state.water;
        this.state.vitals.energy = this.state.energy;
        this.state.mood = this.state.wellbeing > 80 ? 'thriving' : (this.state.wellbeing > 50 ? 'happy' : 'okay');
      }
    } catch (e) {
      console.warn('Failed loading persisted vitals:', e);
    }
  }

  refreshMilestoneCaps() {
    if (this.hasMilestone('crab')) {
      this.state.essenceCap = 600;
    }
  }

  startPassiveStardustTick() {
    if (typeof window === 'undefined') return;
    setInterval(() => {
      // Trappist milestone unlocks auto-collection (+1 shard every 15s)
      if (this.hasMilestone('trappist')) {
        this.addStardust(1, 'passive_trappist');
      }
    }, 15000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Economic Engine: Stardust Shards & Cosmic Essence Operations
  // ─────────────────────────────────────────────────────────────────────────

  addStardust(amount, source = 'game') {
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (qty <= 0) return this.state.stardustShards;

    this.state.stardustShards += qty;
    this.syncCurrencyToStorageAndBridge();
    this.emit('currency:stardust', { amount: qty, total: this.state.stardustShards, source });
    this.emit('change:stardustShards', { newValue: this.state.stardustShards, delta: qty });
    return this.state.stardustShards;
  }

  spendStardust(amount) {
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (this.state.stardustShards < qty) return false;

    this.state.stardustShards -= qty;
    this.syncCurrencyToStorageAndBridge();
    this.emit('currency:stardust_spent', { amount: qty, total: this.state.stardustShards });
    this.emit('change:stardustShards', { newValue: this.state.stardustShards, delta: -qty });
    return true;
  }

  addCosmicEssence(amount, source = 'milestone') {
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (qty <= 0) return this.state.cosmicEssence;

    this.refreshMilestoneCaps();
    this.state.cosmicEssence = Math.min(this.state.essenceCap, this.state.cosmicEssence + qty);
    this.syncCurrencyToStorageAndBridge();
    this.emit('currency:essence', { amount: qty, total: this.state.cosmicEssence, source });
    this.emit('change:cosmicEssence', { newValue: this.state.cosmicEssence, delta: qty });
    return this.state.cosmicEssence;
  }

  spendCosmicEssence(amount) {
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (this.state.cosmicEssence < qty) return false;

    this.state.cosmicEssence -= qty;
    this.syncCurrencyToStorageAndBridge();
    this.emit('currency:essence_spent', { amount: qty, total: this.state.cosmicEssence });
    this.emit('change:cosmicEssence', { newValue: this.state.cosmicEssence, delta: -qty });
    return true;
  }

  syncCurrencyToStorageAndBridge() {
    try {
      localStorage.setItem('kiro_stardust_shards', String(this.state.stardustShards));
      localStorage.setItem('kiro_cosmic_essence', String(this.state.cosmicEssence));
      localStorage.setItem('kiro_unlocked_planets', JSON.stringify(this.state.unlockedPlanets));
      localStorage.setItem('kiro_current_planet', this.state.currentPlanet);
    } catch (e) {}

    // Safe Serialized Token Bridge to Kotlin Host
    if (typeof window !== 'undefined' && window.AndroidHost && typeof window.AndroidHost.onCurrencyUpdate === 'function') {
      try {
        window.AndroidHost.onCurrencyUpdate(this.state.stardustShards, this.state.cosmicEssence);
      } catch (e) {
        console.warn('Kotlin Currency Bridge error:', e);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Exoplanet Progression & Milestone Multipliers
  // ─────────────────────────────────────────────────────────────────────────

  hasMilestone(planetId) {
    if (!planetId) return false;
    return this.state.unlockedPlanets.includes(planetId.toLowerCase());
  }

  unlockExoplanet(planetId) {
    const pid = String(planetId).toLowerCase();
    const planet = this.state.exoplanetCatalog[pid];
    if (!planet) return { success: false, reason: 'Invalid Exoplanet' };
    if (this.hasMilestone(pid)) return { success: true, alreadyUnlocked: true };

    if (this.state.stardustShards < planet.cost) {
      return { success: false, reason: `Requires ${planet.cost} Stardust Shards (You have ${this.state.stardustShards})` };
    }

    this.spendStardust(planet.cost);
    this.state.unlockedPlanets.push(pid);
    this.state.currentPlanet = pid;
    this.refreshMilestoneCaps();
    this.syncCurrencyToStorageAndBridge();

    // Reward 2 Cosmic Essence per milestone discovery!
    this.addCosmicEssence(2, 'planet_unlock');

    this.emit('exoplanet:unlock', { planetId: pid, planet });
    this.emit('change:unlockedPlanets', { newValue: this.state.unlockedPlanets });
    this.emit('change:currentPlanet', { newValue: pid });
    return { success: true, planet };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mathematical Payout Formula Engine
  // Payout = (BaseScore * ComboMultiplier) * WellbeingModifier
  // ─────────────────────────────────────────────────────────────────────────

  calculatePayout(gameId, baseScore, comboCount = 0) {
    const wellbeing = this.state.wellbeing ?? 100;
    const baseDifficulty = {
      tetris: 25,
      pong: 20,
      dodge: 15,
      runner: 10
    }[gameId] || 15;

    // Combo Multiplier: 1.0 + (combo * 0.1), capped at 3.0x
    const comboMultiplier = Math.min(3.0, 1.0 + (Math.max(0, comboCount) * 0.1));
    
    // Wellbeing Modifier: bio-feedback coefficient (thriving Kiro gives 1.3x, neglected gives 0.5x)
    const wellbeingModifier = parseFloat((0.5 + (wellbeing / 100) * 0.8).toFixed(2));
    
    // Squish multiplier from Helix milestone in Tetris
    const squishBonus = (gameId === 'tetris' && this.hasMilestone('helix')) ? 1.5 : 1.0;
    
    // Sombrero vortex permanent milestone multiplier
    const sombreroMultiplier = this.hasMilestone('sombrero') ? 1.25 : 1.0;

    // Water hydration bonus/penalty
    const waterLevel = this.state.water ?? 100;
    const waterMultiplier = waterLevel < 30 ? 0.7 : (waterLevel > 70 ? 1.15 : 1.0);

    const calculatedPayout = Math.max(1, Math.round(
      (baseScore + baseDifficulty) * comboMultiplier * wellbeingModifier * squishBonus * sombreroMultiplier * waterMultiplier
    ));
    
    return {
      gameId,
      baseScore,
      baseDifficulty,
      comboCount,
      comboMultiplier,
      wellbeing,
      wellbeingModifier,
      squishBonus,
      sombreroMultiplier,
      waterMultiplier,
      totalPayout: calculatedPayout
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bio-Feedback Vitals Active Gameplay Consequences & Physics Modifiers
  // ─────────────────────────────────────────────────────────────────────────

  getPhysicsDrag() {
    const energy = this.state.energy ?? 100;
    if (energy < 30) return 1.6; // Sluggish physics (increased drag & input latency)
    if (this.state.hasWellRestedBuff || energy > 85) return 0.85; // Agile fast physics
    return 1.0;
  }

  getShardRadiusMultiplier() {
    const water = this.state.water ?? 100;
    if (water < 30) return 0.7; // Dehydrated: reduced collection radius
    if (water > 75) return 1.5; // Thriving: enhanced collection radius
    return 1.0;
  }

  getShardMultiplier() {
    const water = this.state.water ?? 100;
    return water < 30 ? 0.7 : 1.0;
  }

  saveVitals() {
    try {
      localStorage.setItem('kiro_vitals', JSON.stringify({
        wellbeing: this.state.wellbeing,
        food: this.state.food,
        water: this.state.water,
        energy: this.state.energy
      }));
    } catch (e) {}
  }

  get(path) {
    if (!path) return this.state;
    const parts = path.split('.');
    let current = this.state;
    for (const part of parts) {
      if (current === undefined || current === null || current[part] === undefined) {
        return undefined;
      }
      current = current[part];
    }
    return current;
  }

  set(path, value) {
    if (!path) return value;

    // State-write interceptor for persona / user tokens
    if (path === 'persona' || path === 'currentUser' || path === 'user') {
      const normalized = this.normalizePersona(value);
      this.state.persona = normalized;
      this.state.currentUser = normalized;
      localStorage.setItem('starlight_persona', normalized);
      this.emit('persona:change', normalized);
      this.emit('change:persona', { newValue: normalized });
      this.emit('change:currentUser', { newValue: normalized });
      return normalized;
    }

    if (path === 'hasCompletedIntro') {
      this.state.hasCompletedIntro = Boolean(value);
      localStorage.setItem('kiro_intro_completed', String(value));
      return value;
    }

    const parts = path.split('.');
    let current = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const lastPart = parts[parts.length - 1];
    const oldValue = current[lastPart];
    current[lastPart] = value;

    // Sync flat vitals with nested vitals object
    if (path === 'vitals.food' || path === 'food') {
      this.state.food = value;
      this.state.vitals.food = value;
    }
    if (path === 'vitals.water' || path === 'water') {
      this.state.water = value;
      this.state.vitals.water = value;
    }
    if (path === 'vitals.energy' || path === 'energy') {
      this.state.energy = value;
      this.state.vitals.energy = value;
    }

    // Emit granular change event and generalized change event
    this.emit(`change:${path}`, { newValue: value, oldValue });
    if (parts.length > 1) {
      const parentPath = parts.slice(0, -1).join('.');
      this.emit(`change:${parentPath}`, { path, newValue: value, oldValue });
    }
    this.emit('change', { path, newValue: value, oldValue });

    return value;
  }

  normalizePersona(rawPersona) {
    if (!rawPersona) return 'pat';
    const normalized = String(rawPersona).toLowerCase().trim();
    if (normalized === 'patrick' || normalized === 'pat') return 'pat';
    if (normalized === 'yangiee' || normalized === 'yang' || normalized === 'yangie') return 'yang';
    return 'pat';
  }

  setPersona(rawPersona) {
    const normalized = this.normalizePersona(rawPersona);
    this.state.persona = normalized;
    this.state.currentUser = normalized;
    this.state.hasCompletedIntro = true;
    localStorage.setItem('starlight_persona', normalized);
    localStorage.setItem('kiro_intro_completed', 'true');
    this.emit('persona:change', normalized);
    this.emit('change:persona', { newValue: normalized });
    this.emit('change:currentUser', { newValue: normalized });
    return normalized;
  }

  getPersona() {
    const raw = this.state.persona || localStorage.getItem('starlight_persona') || 'pat';
    return this.normalizePersona(raw);
  }

  isYangiee() {
    return this.getPersona() === 'yang';
  }

  isPatrick() {
    return this.getPersona() === 'pat';
  }

  feed(candyType = 'star') {
    const boost = candyType === 'star' ? 15 : (candyType === 'donut' ? 12 : 8);
    this.state.food = Math.min(100, this.state.food + boost);
    this.state.vitals.food = this.state.food;
    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : 'happy';

    this.saveVitals();
    this.emit('vital:feed', { type: candyType, food: this.state.food, wellbeing: this.state.wellbeing });
    this.emit('change:wellbeing', { newValue: this.state.wellbeing });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  drinkWater() {
    this.state.water = Math.min(100, this.state.water + 14);
    this.state.vitals.water = this.state.water;
    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : 'happy';

    this.saveVitals();
    this.emit('vital:water', { water: this.state.water, wellbeing: this.state.wellbeing });
    this.emit('change:wellbeing', { newValue: this.state.wellbeing });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  setSleep(isSleeping) {
    this.state.isSleeping = isSleeping;
    this.state.mood = isSleeping ? 'sleeping' : (this.state.wellbeing > 80 ? 'thriving' : 'happy');
    if (!isSleeping) {
      this.state.energy = 100;
      this.state.vitals.energy = 100;
      this.state.hasWellRestedBuff = true;
      this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    }
    this.saveVitals();
    this.emit('sleep:change', { isSleeping, hasWellRestedBuff: this.state.hasWellRestedBuff });
    this.emit('change:isSleeping', { newValue: isSleeping });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  setVolume(channel, volume) {
    if (this.state.soundVolumes[channel] !== undefined) {
      this.state.soundVolumes[channel] = Math.max(0, Math.min(1, volume));
      this.emit('sound:volume', { channel, volume: this.state.soundVolumes[channel] });
      this.emit('change:soundVolumes', { channel, volume: this.state.soundVolumes[channel] });
    }
  }

  setAudioSetting(key, val) {
    if (!this.state.audioSettings) this.state.audioSettings = {};
    const parsed = parseFloat(val) || 0;
    this.state.audioSettings[key] = parsed;

    const storageKeys = {
      masterVolume: 'kiro_audio_master',
      sfxVolume: 'kiro_audio_sfx',
      ambientVolume: 'kiro_audio_ambient',
      pitchMultiplier: 'kiro_audio_pitch'
    };

    if (storageKeys[key]) {
      try {
        localStorage.setItem(storageKeys[key], parsed.toString());
      } catch (e) {}
    }

    this.emit(`audio:${key}`, parsed);
    this.emit('change:audioSettings', { key, value: parsed });
  }

  setGyro(enabled) {
    this.state.gyroEnabled = Boolean(enabled);
    this.emit('gyro:change', this.state.gyroEnabled);
    this.emit('change:gyroEnabled', { newValue: this.state.gyroEnabled });
  }

  setArtMode(mode) {
    if (!['auto', 'optimal', 'balanced', 'performance', 'eco'].includes(mode)) return;
    this.state.artMode = mode;
    try {
      localStorage.setItem('kiro_art_mode', mode);
    } catch (e) {}
    this.emit('art:mode', mode);
    this.emit('change:artMode', { newValue: mode });
  }

  setEcoMode(enabled) {
    const isEco = Boolean(enabled);
    this.state.ecoModeActive = isEco;
    try {
      localStorage.setItem('kiro_eco_mode', isEco ? 'true' : 'false');
    } catch (e) {}
    this.emit('eco:change', isEco);
    this.emit('change:ecoModeActive', { newValue: isEco });

    // Synchronize ART tier mode
    if (isEco) {
      this.setArtMode('eco');
    } else if (this.state.artMode === 'eco') {
      this.setArtMode('auto');
    }
  }
}

export const KiroState = new KiroStateManager();
if (typeof window !== 'undefined') {
  window.KiroState = KiroState;
}
export default KiroState;
