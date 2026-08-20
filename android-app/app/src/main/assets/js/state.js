/**
 * state.js
 * Centralized Event-Driven State Machine (KiroState)
 * Single source of truth across 3D scenes, audio engines, and native notification bridges.
 */

class StateEmitter {
  constructor() {
    this.events = new Map();
  }

  on(event, listener) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    if (this.events.has(event)) {
      this.events.get(event).delete(listener);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (err) {
          console.error(`[KiroState Error in "${event}"]:`, err);
        }
      });
    }
  }
}

class KiroStateManager extends StateEmitter {
  constructor() {
    super();

    // Default State Schema
    this.state = {
      persona: localStorage.getItem('starlight_persona') || null, // 'patrick' | 'yangiee'
      wellbeing: 100, // 0 - 100
      food: 100,
      water: 100,
      energy: 100,
      isSleeping: false,
      hasWellRestedBuff: false,
      mood: 'thriving', // 'thriving' | 'happy' | 'okay' | 'sleeping'
      gyroEnabled: true,
      soundVolumes: {
        rain: 0,
        ocean: 0,
        thunder: 0,
        forest: 0,
        lofi: 0
      },
      installedVersion: localStorage.getItem('gn_installed_version') || '1.2.4',
      isOtaActive: false,
      hasCompletedIntro: localStorage.getItem('kiro_intro_completed') === 'true'
    };

    // Load persisted vitals if available
    this.loadPersistedVitals();
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
        this.state.mood = this.state.wellbeing > 80 ? 'thriving' : (this.state.wellbeing > 50 ? 'happy' : 'okay');
      }
    } catch (e) {
      console.warn('Failed loading persisted vitals:', e);
    }
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

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    // State-write interceptor for persona / user tokens
    if (key === 'persona' || key === 'currentUser' || key === 'user') {
      const normalized = this.normalizePersona(value);
      this.state.persona = normalized;
      this.state[key] = normalized;
      localStorage.setItem('starlight_persona', normalized);
      this.emit('persona:change', normalized);
      return normalized;
    }

    if (key === 'hasCompletedIntro') {
      localStorage.setItem('kiro_intro_completed', String(value));
    }

    this.state[key] = value;
    return value;
  }

  normalizePersona(persona) {
    if (!persona) return 'pat';
    const p = String(persona).toLowerCase();
    if (p === 'pat' || p === 'patrick') return 'pat';
    if (p === 'yang' || p === 'yangiee' || p === 'yangie') return 'yang';
    return 'pat';
  }

  setPersona(persona) {
    const normalized = this.normalizePersona(persona);
    this.state.persona = normalized;
    this.state.hasCompletedIntro = true;
    localStorage.setItem('starlight_persona', normalized);
    localStorage.setItem('kiro_intro_completed', 'true');
    this.emit('persona:change', normalized);
  }

  feed(candyType = 'star') {
    const boost = candyType === 'star' ? 15 : (candyType === 'donut' ? 12 : 8);
    this.state.food = Math.min(100, this.state.food + boost);
    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : 'happy';
    
    this.saveVitals();
    this.emit('vital:feed', { type: candyType, food: this.state.food, wellbeing: this.state.wellbeing });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  drinkWater() {
    this.state.water = Math.min(100, this.state.water + 14);
    this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    this.state.mood = this.state.wellbeing > 80 ? 'thriving' : 'happy';
    
    this.saveVitals();
    this.emit('vital:water', { water: this.state.water, wellbeing: this.state.wellbeing });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  setSleep(isSleeping) {
    this.state.isSleeping = isSleeping;
    this.state.mood = isSleeping ? 'sleeping' : (this.state.wellbeing > 80 ? 'thriving' : 'happy');
    if (!isSleeping) {
      this.state.energy = 100;
      this.state.hasWellRestedBuff = true;
      this.state.wellbeing = Math.min(100, Math.round((this.state.food + this.state.water + this.state.energy) / 3));
    }
    this.saveVitals();
    this.emit('sleep:change', { isSleeping, hasWellRestedBuff: this.state.hasWellRestedBuff });
    this.emit('wellbeing:change', this.state.wellbeing);
  }

  setVolume(channel, volume) {
    if (this.state.soundVolumes[channel] !== undefined) {
      this.state.soundVolumes[channel] = Math.max(0, Math.min(1, volume));
      this.emit('sound:volume', { channel, volume: this.state.soundVolumes[channel] });
    }
  }

  setGyro(enabled) {
    this.state.gyroEnabled = enabled;
    this.emit('gyro:change', enabled);
  }
}

export const KiroState = new KiroStateManager();
window.KiroState = KiroState;
