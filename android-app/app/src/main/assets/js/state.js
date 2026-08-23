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

export class KiroStateManager extends StateEmitter {
  constructor() {
    super();
    this.writeDebounceTimers = new Map();

    // Default V3 Master State Schema
    this.state = {
      persona: localStorage.getItem('starlight_persona') || null,
      currentUser: localStorage.getItem('starlight_persona') || 'pat',
      hasCompletedIntro: localStorage.getItem('kiro_intro_completed') === 'true',
      installedVersion: localStorage.getItem('gn_installed_version') || '2.5.3',
      isOtaActive: false,

      // Unified Tri-Vital System (V8.2)
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
      wellRestedBuffExpiresAt: 0,
      sleepSessionStartTime: null,

      // Dual-Currency Economic Framework & Double-Ledger Wallets (Cor Amoris Edition)
      stardustShards: parseInt(localStorage.getItem('kiro_stardust_shards') || '350', 10),
      cosmicEssence: parseInt(localStorage.getItem('kiro_cosmic_essence') || '10', 10),
      essenceCap: 100, // Boosted to 600 by Crab Pulsar milestone

      vault: {
        stardustShards: parseInt(localStorage.getItem('kiro_stardust_shards') || '350', 10),
        cosmicEssence: parseInt(localStorage.getItem('kiro_cosmic_essence') || '10', 10),
        wallets: {
          pat: parseInt(localStorage.getItem('kiro_wallet_pat') || '1240', 10),
          yang: parseInt(localStorage.getItem('kiro_wallet_yang') || '1480', 10)
        }
      },

      // Cor Amoris: The Heart Planet Scavenger Hunt Edition (01-27-2024)
      corAmoris: {
        active: true,
        anniversaryDate: '2024.01.27',
        fragments: JSON.parse(localStorage.getItem('cor_amoris_fragments') || '{"01":false,"27":false,"2024":false}'),
        satchel: JSON.parse(localStorage.getItem('cor_amoris_satchel') || '[]'),
        gateAligned: localStorage.getItem('cor_amoris_gate_aligned') === 'true',
        unlocked: localStorage.getItem('cor_amoris_unlocked') === 'true',
        backdrop: localStorage.getItem('cor_amoris_backdrop') || 'default',
        memorialNotes: JSON.parse(localStorage.getItem('cor_amoris_notes') || '[]')
      },

      // Kepler-186 Outpost Shop & Shared Inventory Stockpile
      inventory: {
        star: 2,   // Stock Cap: 5 (Scarce)
        donut: 8,  // Stock Cap: 15
        water: 12, // Stock Cap: 20
        memory_squishy: 0 // Quest 1: Cosmic Memory Squishy
      },
      inventoryLimits: {
        star: 5,
        donut: 15,
        water: 20,
        memory_squishy: 5
      },
      itemBaseCosts: {
        water: 15,
        donut: 25,
        star: 120,
        memory_squishy: 30
      },
      itemRestorations: {
        donut: { food: 40, water: -5, energy: 0 },
        water: { food: 0, water: 35, energy: 0 },
        star:  { food: 0, water: 0, energy: 30 },
        memory_squishy: { food: 10, water: 10, energy: 10 }
      },
      lastStarCandyRestockTimestamp: parseInt(localStorage.getItem('kiro_last_star_restock') || String(Date.now()), 10),

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
    this.loadPersistedInventory();
    this.refreshMilestoneCaps();
    this.checkStarCandyDailyRestock();
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

  loadPersistedInventory() {
    try {
      const savedInv = localStorage.getItem('kiro_inventory');
      if (savedInv) {
        const parsed = JSON.parse(savedInv);
        this.state.inventory.star = parsed.star ?? 2;
        this.state.inventory.donut = parsed.donut ?? 8;
        this.state.inventory.water = parsed.water ?? 12;
      }
    } catch (e) {
      console.warn('Failed loading persisted inventory:', e);
    }
  }

  refreshMilestoneCaps() {
    if (this.hasMilestone('crab')) {
      this.state.essenceCap = 600;
    } else {
      this.state.essenceCap = 100;
    }
  }

  debounceStorageWrite(key, value, delay = 800) {
    if (this.writeDebounceTimers && this.writeDebounceTimers.has(key)) {
      clearTimeout(this.writeDebounceTimers.get(key));
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      } catch (e) {
        console.warn(`[KiroState] Debounced disk write error for "${key}":`, e);
      }
      if (this.writeDebounceTimers) this.writeDebounceTimers.delete(key);
    }, delay);
    if (this.writeDebounceTimers) this.writeDebounceTimers.set(key, timer);
  }

  saveInventory() {
    this.debounceStorageWrite('kiro_inventory', this.state.inventory);
    this.debounceStorageWrite('kiro_stardust_shards', this.state.stardustShards);
    this.debounceStorageWrite('kiro_cosmic_essence', this.state.cosmicEssence);
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
    this.debounceStorageWrite('kiro_stardust_shards', this.state.stardustShards);
    this.debounceStorageWrite('kiro_cosmic_essence', this.state.cosmicEssence);
    this.debounceStorageWrite('kiro_unlocked_planets', this.state.unlockedPlanets);
    this.debounceStorageWrite('kiro_current_planet', this.state.currentPlanet);

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
  // Double-Ledger Wallets (Pats: Mint-Teal | Yang: Pastel-Pink)
  // ─────────────────────────────────────────────────────────────────────────

  getWallet(persona = null) {
    const target = persona ? this.normalizePersona(persona) : this.getPersona();
    if (!this.state.vault.wallets) {
      this.state.vault.wallets = { pat: 1240, yang: 1480 };
    }
    return this.state.vault.wallets[target] ?? (target === 'yang' ? 1480 : 1240);
  }

  addWalletStardust(persona, amount) {
    const target = this.normalizePersona(persona || this.getPersona());
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (!this.state.vault.wallets) {
      this.state.vault.wallets = { pat: 1240, yang: 1480 };
    }
    this.state.vault.wallets[target] = (this.state.vault.wallets[target] || 0) + qty;
    try {
      localStorage.setItem(`kiro_wallet_${target}`, String(this.state.vault.wallets[target]));
    } catch (e) {}
    this.emit('wallet:change', { persona: target, amount: this.state.vault.wallets[target], delta: qty });
    this.emit(`change:vault.wallets.${target}`, { newValue: this.state.vault.wallets[target] });
    return this.state.vault.wallets[target];
  }

  spendWalletStardust(persona, amount) {
    const target = this.normalizePersona(persona || this.getPersona());
    const qty = Math.max(0, parseInt(amount, 10) || 0);
    if (!this.state.vault.wallets) {
      this.state.vault.wallets = { pat: 1240, yang: 1480 };
    }
    if ((this.state.vault.wallets[target] || 0) < qty) return false;
    this.state.vault.wallets[target] -= qty;
    try {
      localStorage.setItem(`kiro_wallet_${target}`, String(this.state.vault.wallets[target]));
    } catch (e) {}
    this.emit('wallet:change', { persona: target, amount: this.state.vault.wallets[target], delta: -qty });
    this.emit(`change:vault.wallets.${target}`, { newValue: this.state.vault.wallets[target] });
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cor Amoris: The Heart Planet Scavenger Hunt Engine (01-27-2024)
  // ─────────────────────────────────────────────────────────────────────────

  getCorAmorisState() {
    return this.state.corAmoris;
  }

  unlockCorAmorisFragment(fragmentId) {
    const fid = String(fragmentId);
    if (!['01', '27', '2024'].includes(fid)) return false;
    if (this.state.corAmoris.fragments[fid]) return true;

    this.state.corAmoris.fragments[fid] = true;
    if (!this.state.corAmoris.satchel.includes(fid)) {
      this.state.corAmoris.satchel.push(fid);
    }

    try {
      localStorage.setItem('cor_amoris_fragments', JSON.stringify(this.state.corAmoris.fragments));
      localStorage.setItem('cor_amoris_satchel', JSON.stringify(this.state.corAmoris.satchel));
    } catch (e) {}

    this.emit('cor_amoris:fragment_unlocked', { fragmentId: fid, satchel: this.state.corAmoris.satchel });
    this.emit('change:corAmoris', { newValue: this.state.corAmoris });

    const allCollected = this.state.corAmoris.fragments['01'] && this.state.corAmoris.fragments['27'] && this.state.corAmoris.fragments['2024'];
    if (allCollected) {
      this.emit('cor_amoris:all_fragments_collected', { satchel: this.state.corAmoris.satchel });
    }

    return true;
  }

  alignStargate() {
    this.state.corAmoris.gateAligned = true;
    try {
      localStorage.setItem('cor_amoris_gate_aligned', 'true');
    } catch (e) {}
    this.emit('cor_amoris:gate_aligned');
    this.emit('change:corAmoris', { newValue: this.state.corAmoris });
    return true;
  }

  completeCorAmorisQuest() {
    this.state.corAmoris.unlocked = true;
    this.state.corAmoris.backdrop = 'cor-amoris';
    try {
      localStorage.setItem('cor_amoris_unlocked', 'true');
      localStorage.setItem('cor_amoris_backdrop', 'cor-amoris');
    } catch (e) {}
    this.emit('cor_amoris:completed');
    this.emit('change:corAmoris', { newValue: this.state.corAmoris });
    return true;
  }

  setBackdrop(backdropId) {
    if (!['default', 'kepler', 'trappist', 'cor-amoris'].includes(backdropId)) return;
    this.state.corAmoris.backdrop = backdropId;
    try {
      localStorage.setItem('cor_amoris_backdrop', backdropId);
    } catch (e) {}
    this.emit('cor_amoris:backdrop_change', backdropId);
    this.emit('change:corAmoris.backdrop', { newValue: backdropId });
  }

  addMemorialNote(note) {
    if (!note || !note.text) return false;
    const newNote = {
      id: `note_${Date.now()}`,
      author: this.getPersona(),
      text: String(note.text).trim(),
      timestamp: Date.now(),
      image: note.image || null
    };
    this.state.corAmoris.memorialNotes.unshift(newNote);
    try {
      localStorage.setItem('cor_amoris_notes', JSON.stringify(this.state.corAmoris.memorialNotes));
    } catch (e) {}
    this.emit('cor_amoris:note_added', newNote);
    return newNote;
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

    // Well-Rested Golden Buff: 1.5x score and stardust multiplier
    const wellRestedMultiplier = this.hasWellRestedBuffActive() ? 1.5 : 1.0;

    const calculatedPayout = Math.max(1, Math.round(
      (baseScore + baseDifficulty) * comboMultiplier * wellbeingModifier * squishBonus * sombreroMultiplier * waterMultiplier * wellRestedMultiplier
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
      wellRestedMultiplier,
      hasWellRestedBuff: this.hasWellRestedBuffActive(),
      totalPayout: calculatedPayout
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Bio-Feedback Vitals Active Gameplay Consequences & Physics Modifiers
  // ─────────────────────────────────────────────────────────────────────────

  getPhysicsDrag() {
    const energy = this.state.energy ?? 100;
    if (energy < 30) return 1.65; // Sluggish physics (increased drag & input latency)
    if (this.hasWellRestedBuffActive() || energy > 85) return 0.85; // Agile fast physics
    return 1.0;
  }

  getViscoelasticParameters() {
    const energy = this.state.energy ?? 100;
    if (energy < 30) {
      return {
        viscosity: 0.72,
        elasticity: 0.012,
        isCrisis: true,
        dragMultiplier: 1.65
      };
    }
    return {
      viscosity: 0.93,
      elasticity: 0.045,
      isCrisis: false,
      dragMultiplier: this.hasWellRestedBuffActive() ? 0.85 : 1.0
    };
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

  hasWellRestedBuffActive() {
    return Boolean(this.state.hasWellRestedBuff && Date.now() < (this.state.wellRestedBuffExpiresAt || 0));
  }

  checkStarCandyDailyRestock() {
    const now = Date.now();
    const last = this.state.lastStarCandyRestockTimestamp || 0;
    const DAY_MS = 24 * 3600 * 1000;
    if (now - last >= DAY_MS) {
      if ((this.state.inventory.star || 0) < (this.state.inventoryLimits.star || 5)) {
        this.state.inventory.star = Math.min(this.state.inventoryLimits.star || 5, (this.state.inventory.star || 0) + 1);
        this.saveInventory();
        this.emit('inventory:change', { itemId: 'star', count: this.state.inventory.star, inventory: this.state.inventory });
      }
      this.state.lastStarCandyRestockTimestamp = now;
      try {
        localStorage.setItem('kiro_last_star_restock', String(now));
      } catch (e) {}
    }
  }

  getItemCost(itemId) {
    const base = this.state.itemBaseCosts[itemId] || 25;
    const count = this.state.inventory[itemId] || 0;
    const limit = this.state.inventoryLimits[itemId] || 15;
    // Cost-Scarcity Index: Cost Factor = Base Cost * (1.0 + Current Inventory Count / Inventory Limit)
    return Math.round(base * (1.0 + (count / limit)));
  }

  buyItem(itemId) {
    const count = this.state.inventory[itemId] || 0;
    const limit = this.state.inventoryLimits[itemId] || 15;
    if (count >= limit) {
      return { success: false, reason: `Stock cap reached (${limit} max).` };
    }
    const cost = this.getItemCost(itemId);
    if (this.state.stardustShards < cost) {
      return { success: false, reason: `Requires ${cost} Shards (You have ${this.state.stardustShards}).` };
    }

    this.spendStardust(cost, `buy_${itemId}`);
    this.state.inventory[itemId] = count + 1;
    this.saveInventory();
    this.emit('inventory:change', { itemId, count: this.state.inventory[itemId], inventory: this.state.inventory });
    this.emit('change:inventory', { newValue: this.state.inventory });
    return { success: true, count: this.state.inventory[itemId], cost };
  }

  consumeItem(itemId) {
    const count = this.state.inventory[itemId] || 0;
    if (count <= 0) {
      return { success: false, reason: `No ${itemId} in inventory! Visit Kepler-186 Outpost Shop.` };
    }

    this.state.inventory[itemId] = count - 1;
    this.saveInventory();

    const rest = this.state.itemRestorations[itemId] || { food: 15, water: 0, energy: 0 };
    this.state.food = Math.min(100, Math.max(0, this.state.food + (rest.food || 0)));
    this.state.water = Math.min(100, Math.max(0, this.state.water + (rest.water || 0)));
    this.state.energy = Math.min(100, Math.max(0, this.state.energy + (rest.energy || 0)));
    this.state.vitals.food = this.state.food;
    this.state.vitals.water = this.state.water;
    this.state.vitals.energy = this.state.energy;

    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : (this.state.wellbeing > 50 ? 'happy' : 'okay');
    this.saveVitals();

    this.emit('inventory:change', { itemId, count: this.state.inventory[itemId], inventory: this.state.inventory });
    this.emit('change:inventory', { newValue: this.state.inventory });
    this.emit('vital:consume', { itemId, vitals: this.state.vitals, wellbeing: this.state.wellbeing, delta: rest });
    this.emit('change:vitals', { newValue: this.state.vitals });
    this.emit('change:wellbeing', { newValue: this.state.wellbeing });

    if (itemId === 'water') {
      this.emit('vital:water', { water: this.state.water, wellbeing: this.state.wellbeing });
    } else {
      this.emit('vital:feed', { type: itemId, food: this.state.food, wellbeing: this.state.wellbeing });
    }

    return { success: true, count: this.state.inventory[itemId], vitals: this.state.vitals };
  }

  applyMinigameVitalTax() {
    this.state.food = Math.max(0, this.state.food - 10);
    this.state.water = Math.max(0, this.state.water - 15);
    this.state.energy = Math.max(0, this.state.energy - 12);
    this.state.vitals.food = this.state.food;
    this.state.vitals.water = this.state.water;
    this.state.vitals.energy = this.state.energy;
    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : (this.state.wellbeing > 50 ? 'happy' : 'okay');
    this.saveVitals();
    this.emit('change:vitals', { newValue: this.state.vitals });
    this.emit('change:wellbeing', { newValue: this.state.wellbeing });
  }

  saveVitals() {
    this.debounceStorageWrite('kiro_vitals', {
      wellbeing: this.state.wellbeing,
      food: this.state.food,
      water: this.state.water,
      energy: this.state.energy
    });
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
    if (path === 'vault.stardustShards' || path === 'stardustShards') {
      this.state.stardustShards = value;
      this.state.vault.stardustShards = value;
    }
    if (path === 'vault.cosmicEssence' || path === 'cosmicEssence') {
      this.state.cosmicEssence = value;
      this.state.vault.cosmicEssence = value;
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
    return this.consumeItem(candyType);
  }

  drinkWater() {
    return this.consumeItem('water');
  }

  setSleep(isSleeping) {
    const wasSleeping = this.state.isSleeping;
    this.state.isSleeping = Boolean(isSleeping);
    this.state.mood = isSleeping ? 'sleeping' : (this.state.wellbeing > 80 ? 'thriving' : 'happy');

    if (isSleeping) {
      this.state.sleepSessionStartTime = Date.now();
    } else if (wasSleeping) {
      const sleepDurationMs = this.state.sleepSessionStartTime ? (Date.now() - this.state.sleepSessionStartTime) : 0;
      const sleepHours = sleepDurationMs / (3600 * 1000);
      
      // 6-hour complete sleep block awards 3-hour Well-Rested Buff (1.5x multiplier)
      if (sleepHours >= 6.0) {
        this.state.hasWellRestedBuff = true;
        this.state.wellRestedBuffExpiresAt = Date.now() + (3 * 3600 * 1000);
        this.emit('buff:well_rested', { durationHours: 3, multiplier: 1.5 });
      }
      this.state.sleepSessionStartTime = null;
      this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    }

    this.saveVitals();
    this.emit('sleep:change', { isSleeping: this.state.isSleeping, hasWellRestedBuff: this.hasWellRestedBuffActive() });
    this.emit('change:isSleeping', { newValue: this.state.isSleeping });
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
