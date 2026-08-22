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
      installedVersion: localStorage.getItem('gn_installed_version') || '2.0.6',
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

  setGyro(enabled) {
    this.state.gyroEnabled = Boolean(enabled);
    this.emit('gyro:change', this.state.gyroEnabled);
    this.emit('change:gyroEnabled', { newValue: this.state.gyroEnabled });
  }
}

export const KiroState = new KiroStateManager();
if (typeof window !== 'undefined') {
  window.KiroState = KiroState;
}
export default KiroState;
