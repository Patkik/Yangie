/**
 * Kiro Weather, Clock & Sky Simulation Station (js/weather-v7.js)
 * Live ticking unified chronometer, double-persona localized weather modules (Pat & Yang),
 * Open-Meteo World Meteorological Organization (WMO) live radar sync,
 * automatic Kiro "Umbrella" rain alarm triggers, and a fully interactive Sky Simulator.
 * Integrates directly with state volumes to drive synesthetic audio environments.
 */

import { KiroState } from './state.js';

// Coordinates for Patrick & Yangiee's Sanctuaries
export const SANCTUARY_COORDINATES = {
    pat: {
        name: 'Patrick',
        label: 'Pats (Pat)',
        location: 'Malaybalay',
        subregion: 'Bukidnon, Mindanao',
        elevation: '622m Highland',
        latitude: 8.1575,
        longitude: 125.1278
    },
    yang: {
        name: 'Yangiee',
        label: 'Yangiee (Yang)',
        location: 'Capas',
        subregion: 'Tarlac, Central Luzon',
        elevation: '40m Plains',
        latitude: 15.3333,
        longitude: 120.5833
    }
};

// WMO Standard Meteorological Weather Interpretation Codes
export const WMO_CODE_MAP = {
    0: { text: 'Clear Sky', dayIcon: '☀️', nightIcon: '✨', condition: 'Clear Sky', isRain: false },
    1: { text: 'Mostly Clear', dayIcon: '🌤️', nightIcon: '🌙', condition: 'Mostly Clear', isRain: false },
    2: { text: 'Partly Cloudy', dayIcon: '⛅', nightIcon: '☁️', condition: 'Partly Cloudy', isRain: false },
    3: { text: 'Overcast', dayIcon: '☁️', nightIcon: '☁️', condition: 'Overcast', isRain: false },
    45: { text: 'Misty Fog', dayIcon: '🌫️', nightIcon: '🌫️', condition: 'Misty Fog', isRain: false },
    48: { text: 'Rime Fog', dayIcon: '🌫️', nightIcon: '🌫️', condition: 'Rime Fog', isRain: false },
    51: { text: 'Light Drizzle', dayIcon: '🌦️', nightIcon: '🌦️', condition: 'Light Drizzle', isRain: true },
    53: { text: 'Moderate Drizzle', dayIcon: '🌦️', nightIcon: '🌦️', condition: 'Moderate Drizzle', isRain: true },
    55: { text: 'Dense Drizzle', dayIcon: '🌧️', nightIcon: '🌧️', condition: 'Dense Drizzle', isRain: true },
    56: { text: 'Light Freezing Drizzle', dayIcon: '❄️', nightIcon: '❄️', condition: 'Freezing Drizzle', isRain: true },
    57: { text: 'Dense Freezing Drizzle', dayIcon: '❄️', nightIcon: '❄️', condition: 'Dense Freezing Drizzle', isRain: true },
    61: { text: 'Slight Rain', dayIcon: '🌧️', nightIcon: '🌧️', condition: 'Slight Rain', isRain: true },
    63: { text: 'Moderate Rain', dayIcon: '🌧️', nightIcon: '🌧️', condition: 'Moderate Rain', isRain: true },
    65: { text: 'Heavy Rain', dayIcon: '🌧️', nightIcon: '🌧️', condition: 'Heavy Rain', isRain: true },
    66: { text: 'Freezing Rain', dayIcon: '🌨️', nightIcon: '🌨️', condition: 'Freezing Rain', isRain: true },
    67: { text: 'Heavy Freezing Rain', dayIcon: '🌨️', nightIcon: '🌨️', condition: 'Heavy Freezing Rain', isRain: true },
    71: { text: 'Slight Snow', dayIcon: '❄️', nightIcon: '❄️', condition: 'Slight Snow', isRain: false },
    73: { text: 'Moderate Snow', dayIcon: '❄️', nightIcon: '❄️', condition: 'Moderate Snow', isRain: false },
    75: { text: 'Heavy Snow', dayIcon: '❄️', nightIcon: '❄️', condition: 'Heavy Snow', isRain: false },
    77: { text: 'Snow Grains', dayIcon: '❄️', nightIcon: '❄️', condition: 'Snow Grains', isRain: false },
    80: { text: 'Passing Showers', dayIcon: '🌦️', nightIcon: '🌧️', condition: 'Passing Showers', isRain: true },
    81: { text: 'Moderate Showers', dayIcon: '🌧️', nightIcon: '🌧️', condition: 'Moderate Showers', isRain: true },
    82: { text: 'Violent Showers', dayIcon: '⛈️', nightIcon: '⛈️', condition: 'Violent Showers', isRain: true },
    85: { text: 'Slight Snow Showers', dayIcon: '🌨️', nightIcon: '🌨️', condition: 'Snow Showers', isRain: false },
    86: { text: 'Heavy Snow Showers', dayIcon: '🌨️', nightIcon: '🌨️', condition: 'Heavy Snow Showers', isRain: false },
    95: { text: 'Thunderstorm', dayIcon: '⛈️', nightIcon: '⚡', condition: 'Thunderstorm', isRain: true },
    96: { text: 'Thunderstorm w/ Hail', dayIcon: '⛈️', nightIcon: '⚡', condition: 'Hail Thunderstorm', isRain: true },
    99: { text: 'Severe Thunderstorm', dayIcon: '⛈️', nightIcon: '⚡', condition: 'Severe Thunderstorm', isRain: true }
};

export default class KiroWeatherStationV7 {
    constructor(hudContainerId = 'app-ui', synthInstance = null) {
        if (typeof hudContainerId === 'string') {
            this.container = document.getElementById(hudContainerId) || document.body;
        } else {
            this.container = hudContainerId || document.body;
        }
        this.synth = synthInstance || window.synthEngine;
        this.clockInterval = null;
        this.reminderInterval = null;
        this.weatherSyncInterval = null;
        this.currentAlertMessage = null;
        this.isSyncingWeather = false;
        this.simulatedPersonas = new Set(); // Tracks if a persona was manually simulated

        this.init();
    }

    init() {
        this.injectStylesheet();
        this.injectWeatherHUD();
        this.startClock();
        this.startKiroRainAudit();
        this.bindSimEvents();
        this.bindStateObservers();
        this.startLiveWeatherSync();
    }

    injectStylesheet() {
        if (!document.getElementById('kiro-weather-station-styles')) {
            const link = document.createElement('link');
            link.id = 'kiro-weather-station-styles';
            link.rel = 'stylesheet';
            link.href = 'css/weather-v7.css';
            document.head.appendChild(link);
        }
    }

    injectWeatherHUD() {
        // Prevent duplicate injections
        const existing = document.getElementById('starlight-telemetry-station');
        if (existing) existing.remove();

        const existingSheet = document.getElementById('capsule-core-bottom-sheet');
        if (existingSheet) existingSheet.remove();

        // Add the swipeable bottom sheet globally to body
        const bottomSheet = document.createElement('div');
        bottomSheet.id = 'capsule-core-bottom-sheet';
        bottomSheet.className = 'capsule-core-bottom-sheet';
        
        const patWeather = KiroState.get('weather.pat') || { 
            temp: '23°C', 
            condition: 'Loading Radar...', 
            apparentTemp: '24°C',
            humidity: '80%',
            rainAlert: 'Syncing live satellite...',
            provider: 'Open-Meteo WMO'
        };
        const yangWeather = KiroState.get('weather.yang') || { 
            temp: '27°C', 
            condition: 'Loading Radar...', 
            apparentTemp: '29°C',
            humidity: '82%',
            rainAlert: 'Syncing live satellite...',
            provider: 'Open-Meteo WMO'
        };

        bottomSheet.innerHTML = `
            <div class="bottom-sheet-handle"></div>
            
            <div class="bottom-sheet-content">
                <div class="simulate-section-header" style="text-align: center; margin-bottom: 6px; font-size: 0.8rem; letter-spacing: 1px;">
                    🛰️ Capsule Dual-Sanctuary Live Radar
                </div>
                <div id="radar-live-indicator" style="text-align: center; font-size: 0.65rem; color: #94e2d5; margin-bottom: 12px; font-weight: 600; opacity: 0.9;">
                    Source: Open-Meteo High-Resolution ECMWF / NOAA Model
                </div>
                
                <!-- Double-Persona Weather Stations -->
                <div class="weather-telemetry-grid">
                    <!-- Patrick (Pats) Station -->
                    <div class="weather-station-pillar pat-station">
                        <div class="pillar-header">
                            <span class="pillar-dot pat-dot"></span>
                            <span class="pillar-name">Pats (Malaybalay)</span>
                        </div>
                        <div class="pillar-stats">
                            <span id="pat-temp" class="pillar-temp">${patWeather.temp}</span>
                            <span id="pat-cond" class="pillar-cond">${patWeather.condition}</span>
                            <span id="pat-substats" class="pillar-substats" style="font-size: 0.68rem; color: #94e2d5; margin-top: 2px;">
                                Feels ${patWeather.apparentTemp || patWeather.temp} • 💧 ${patWeather.humidity || '80%'}
                            </span>
                            <span id="pat-alert-badge" class="pillar-alert-text" style="font-size: 0.65rem; color: #f9e2af; margin-top: 3px;">
                                ${patWeather.rainAlert || 'Clear Skies'}
                            </span>
                        </div>
                    </div>

                    <div class="pillar-divider"></div>

                    <!-- Yangiee (Yang) Station -->
                    <div class="weather-station-pillar yang-station">
                        <div class="pillar-header">
                            <span class="pillar-dot yang-dot"></span>
                            <span class="pillar-name">Yangiee (Capas)</span>
                        </div>
                        <div class="pillar-stats">
                            <span id="yang-temp" class="pillar-temp">${yangWeather.temp}</span>
                            <span id="yang-cond" class="pillar-cond">${yangWeather.condition}</span>
                            <span id="yang-substats" class="pillar-substats" style="font-size: 0.68rem; color: #94e2d5; margin-top: 2px;">
                                Feels ${yangWeather.apparentTemp || yangWeather.temp} • 💧 ${yangWeather.humidity || '82%'}
                            </span>
                            <span id="yang-alert-badge" class="pillar-alert-text" style="font-size: 0.65rem; color: #f5c2e7; margin-top: 3px;">
                                ${yangWeather.rainAlert || 'Clear Skies'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="weather-separator" style="margin: 14px 0;"></div>
                
                <!-- Action Controls: Refresh Live & Expandable Simulator -->
                <div class="simulate-toggle-row" style="display: flex; gap: 8px; justify-content: center;">
                    <button type="button" id="refresh-live-weather-btn" class="simulate-toggle-btn" style="border-color: rgba(148, 226, 213, 0.35); color: #94e2d5;">
                        🔄 Sync Live Radar
                    </button>
                    <button type="button" id="simulate-sky-toggle" class="simulate-toggle-btn" style="border-color: rgba(255, 255, 255, 0.2); color: #fff;">
                        🌌 Simulate Sky State ▾
                    </button>
                </div>

                <div id="simulate-drawer" class="simulate-drawer-panel">
                    <div class="weather-separator" style="margin: 10px 0;"></div>
                    
                    <!-- Pat Sky Simulator -->
                    <div class="pat-pills-col">
                        <div class="simulate-section-header">Pats' Local Sky (Simulate)</div>
                        <div class="simulate-pills-row">
                            <span class="sim-pill pat-sim" data-persona="pat" data-cond="Sunny" data-temp="25°C" data-text="Sunny Nebula ☀️">☀️ Sunny</span>
                            <span class="sim-pill pat-sim" data-persona="pat" data-cond="Rain" data-temp="21°C" data-text="Cosmic Rain 🌧️">🌧️ Rain</span>
                            <span class="sim-pill pat-sim" data-persona="pat" data-cond="Blizzard" data-temp="-5°C" data-text="Stardust Blizzard ❄️">❄️ Blizzard</span>
                            <span class="sim-pill pat-sim" data-persona="pat" data-cond="Gale" data-temp="32°C" data-text="Supernova Gale 🌀">🌀 Gale</span>
                        </div>
                    </div>

                    <!-- Yangiee Sky Simulator -->
                    <div class="yang-pills-col">
                        <div class="simulate-section-header" style="margin-top: 10px;">Yangiee's Local Sky (Simulate)</div>
                        <div class="simulate-pills-row">
                            <span class="sim-pill yang-sim" data-persona="yang" data-cond="Sunny" data-temp="27°C" data-text="Sunny Nebula ☀️">☀️ Sunny</span>
                            <span class="sim-pill yang-sim" data-persona="yang" data-cond="Rain" data-temp="22°C" data-text="Cosmic Rain 🌧️">🌧️ Rain</span>
                            <span class="sim-pill yang-sim" data-persona="yang" data-cond="Blizzard" data-temp="-3°C" data-text="Stardust Blizzard ❄️">❄️ Blizzard</span>
                            <span class="sim-pill yang-sim" data-persona="yang" data-cond="Gale" data-temp="34°C" data-text="Supernova Gale 🌀">🌀 Gale</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 6px;">
                        <button type="button" id="reset-sim-btn" style="background: transparent; border: none; font-size: 0.65rem; color: #94e2d5; text-decoration: underline; cursor: pointer;">
                            ↩️ Reset All to Live Meteorological Radar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Hidden, slide-down Kiro dynamic bubble alert (attached to bottom sheet) -->
            <div id="kiro-rain-warning-bubble" class="kiro-alert-bubble">
                <div class="bubble-triangle"></div>
                <div class="bubble-content">
                    <span class="kiro-emoji">☔</span>
                    <div class="bubble-text-col">
                        <div class="bubble-title">Kiro Reminds You!</div>
                        <div id="kiro-alert-text" class="bubble-desc">It's going to rain under your sky, don't forget an umbrella!</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(bottomSheet);

        // Bind the top partner beacon pill click to open the bottom sheet
        const beaconPill = document.getElementById('partner-beacon-pill');
        if (beaconPill) {
            beaconPill.addEventListener('click', (e) => {
                e.stopPropagation();
                bottomSheet.classList.add('open');
                this.syncBottomSheetUI();
            });
        }

        // Bind the handle and background area to close the sheet
        const handle = bottomSheet.querySelector('.bottom-sheet-handle');
        if (handle) {
            handle.addEventListener('click', () => {
                bottomSheet.classList.remove('open');
            });
            // Handle basic swipe-down to close
            let startY = 0;
            handle.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
            }, { passive: true });
            handle.addEventListener('touchend', (e) => {
                const endY = e.changedTouches[0].clientY;
                if (endY - startY > 30) {
                    bottomSheet.classList.remove('open');
                }
            }, { passive: true });
        }
    }

    startClock() {
        // Redundant giant clock has been completely removed to keep Kiro visible.
        // Clock functionality is handled in the top-left widget and synchronizer.
    }

    // =========================================================================
    // 1. OPEN-METEO CREDIBLE LIVE WEATHER INTEGRATION
    // =========================================================================

    /**
     * Fetches high-accuracy meteorological forecast for given coordinates via Open-Meteo
     */
    async fetchLocationWeather(personaKey) {
        const config = SANCTUARY_COORDINATES[personaKey];
        if (!config) return null;

        const cacheKey = `kiro_weather_cache_${personaKey}`;
        const cacheTtlMs = 15 * 60 * 1000; // 15-minute cache

        // 1. Check local storage cache
        try {
            const cachedStr = localStorage.getItem(cacheKey);
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                if (Date.now() - cached.timestamp < cacheTtlMs) {
                    return cached.data;
                }
            }
        } catch (e) {
            console.warn(`[KiroWeather] Cache read failed for ${personaKey}:`, e);
        }

        // 2. Fetch fresh high-precision data from Open-Meteo API
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${config.latitude}&longitude=${config.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m&hourly=precipitation_probability,rain,weather_code&timezone=Asia%2FManila&forecast_days=1`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            const current = json.current || {};
            const hourly = json.hourly || {};

            const tempVal = current.temperature_2m !== undefined ? Math.round(current.temperature_2m) : 24;
            const apparentTempVal = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : tempVal;
            const humidityVal = current.relative_humidity_2m !== undefined ? `${Math.round(current.relative_humidity_2m)}%` : '80%';
            const isDay = current.is_day === 1;
            const weatherCode = current.weather_code !== undefined ? current.weather_code : 2;

            const wmoInfo = WMO_CODE_MAP[weatherCode] || { 
                text: 'Partly Cloudy', 
                dayIcon: '⛅', 
                nightIcon: '🌙', 
                condition: 'Partly Cloudy', 
                isRain: false 
            };
            const icon = isDay ? wmoInfo.dayIcon : wmoInfo.nightIcon;
            const conditionStr = `${wmoInfo.text} ${icon}`;

            // Determine rain status & forecast upcoming rain from hourly data
            const currentRainMm = current.rain || current.precipitation || 0;
            const isCurrentlyRaining = currentRainMm > 0.1 || wmoInfo.isRain;

            // Hourly analysis for umbrella alerts
            let rainInHours = 0;
            let upcomingRainProb = 0;
            let willRainSoon = false;

            if (isCurrentlyRaining) {
                rainInHours = 0;
                willRainSoon = true;
            } else if (Array.isArray(hourly.time) && Array.isArray(hourly.precipitation_probability)) {
                const nowManila = new Date();
                const nowHour = nowManila.getHours();

                for (let i = nowHour; i < Math.min(nowHour + 12, hourly.time.length); i++) {
                    const prob = hourly.precipitation_probability[i] || 0;
                    const rainAmount = (hourly.rain && hourly.rain[i]) || 0;

                    if (prob >= 40 || rainAmount >= 0.1) {
                        rainInHours = i - nowHour;
                        upcomingRainProb = prob;
                        willRainSoon = true;
                        break;
                    }
                }
            }

            let rainAlert = 'Clear Skies (No rain in sight)';
            if (isCurrentlyRaining) {
                rainAlert = 'Raining now • Bring Umbrella! ☔';
            } else if (willRainSoon) {
                if (rainInHours === 0) {
                    rainAlert = 'Rain starting shortly • Bring Umbrella! ☔';
                } else {
                    rainAlert = `Rain in ${rainInHours}h (${upcomingRainProb}% chance) • Bring Umbrella! ☂️`;
                }
            }

            const needsUmbrella = isCurrentlyRaining || (willRainSoon && rainInHours <= 3);

            const result = {
                persona: personaKey,
                location: config.location,
                subregion: config.subregion,
                elevation: config.elevation,
                temp: `${tempVal}°C`,
                apparentTemp: `${apparentTempVal}°C`,
                humidity: humidityVal,
                condition: conditionStr,
                rawCondition: wmoInfo.text,
                weatherCode: weatherCode,
                isRaining: isCurrentlyRaining,
                rainInHours: rainInHours,
                rainAlert: rainAlert,
                needsUmbrella: needsUmbrella,
                isDay: isDay,
                windSpeed: `${current.wind_speed_10m || 5} km/h`,
                provider: 'Open-Meteo ECMWF',
                updatedAt: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            };

            // Cache result
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
            } catch (e) {}

            return result;

        } catch (err) {
            console.warn(`[KiroWeather] Live fetch failed for ${personaKey}, checking cache fallback:`, err);

            // Fallback to existing cache if available
            try {
                const cachedStr = localStorage.getItem(cacheKey);
                if (cachedStr) {
                    return JSON.parse(cachedStr).data;
                }
            } catch (e) {}

            // Graceful astronomical/seasonal offline fallback
            return this.getOfflineEstimatedWeather(personaKey);
        }
    }

    /**
     * Graceful offline calculation when no network & no cache
     */
    getOfflineEstimatedWeather(personaKey) {
        const config = SANCTUARY_COORDINATES[personaKey];
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const pst = new Date(utc + (3600000 * 8));
        const hour = pst.getHours();

        const isPat = personaKey === 'pat';
        const isRain = isPat ? ((hour >= 13 && hour <= 19) || (hour >= 21 && hour <= 23)) : (hour >= 16 && hour <= 18);
        const baseTemp = isPat ? (hour >= 10 && hour <= 16 ? 25 : 21) : (hour >= 10 && hour <= 16 ? 31 : 26);
        const cond = isRain ? 'Rain Showers 🌧️' : (hour >= 6 && hour <= 17 ? 'Partly Cloudy ⛅' : 'Starry Night ✨');

        return {
            persona: personaKey,
            location: config.location,
            subregion: config.subregion,
            elevation: config.elevation,
            temp: `${baseTemp}°C`,
            apparentTemp: `${baseTemp + 2}°C`,
            humidity: '80%',
            condition: cond,
            rawCondition: isRain ? 'Rain' : 'Partly Cloudy',
            weatherCode: isRain ? 80 : 2,
            isRaining: isRain,
            rainInHours: isRain ? 0 : 4,
            rainAlert: isRain ? 'Raining now • Bring Umbrella! ☔' : 'Clear Skies (Offline Model)',
            needsUmbrella: isRain,
            isDay: hour >= 6 && hour <= 18,
            provider: 'Offline Model'
        };
    }

    /**
     * Triggers live fetch for both Patrick & Yangiee and broadcasts to KiroState
     */
    async syncLiveSanctuaryWeather() {
        if (this.isSyncingWeather) return;
        this.isSyncingWeather = true;

        const refreshBtn = document.getElementById('refresh-live-weather-btn');
        if (refreshBtn) {
            refreshBtn.textContent = '⏳ Radar Syncing...';
            refreshBtn.style.opacity = '0.7';
        }

        try {
            const [patResult, yangResult] = await Promise.all([
                this.fetchLocationWeather('pat'),
                this.fetchLocationWeather('yang')
            ]);

            if (patResult && !this.simulatedPersonas.has('pat')) {
                KiroState.set('weather.pat', patResult);
            }
            if (yangResult && !this.simulatedPersonas.has('yang')) {
                KiroState.set('weather.yang', yangResult);
            }

            const indicator = document.getElementById('radar-live-indicator');
            if (indicator && patResult) {
                indicator.textContent = `🛰️ Radar Synced: ${patResult.updatedAt || 'Just now'} • Open-Meteo ECMWF High-Res`;
            }

        } catch (e) {
            console.error('[KiroWeather] Sanctuary weather sync error:', e);
        } finally {
            this.isSyncingWeather = false;
            if (refreshBtn) {
                refreshBtn.textContent = '🔄 Sync Live Radar';
                refreshBtn.style.opacity = '1';
            }
            this.syncBottomSheetUI();
        }
    }

    startLiveWeatherSync() {
        // 1. Initial live fetch
        this.syncLiveSanctuaryWeather();

        // 2. Periodic sync every 15 minutes (900,000 ms)
        if (this.weatherSyncInterval) clearInterval(this.weatherSyncInterval);
        this.weatherSyncInterval = setInterval(() => {
            this.syncLiveSanctuaryWeather();
        }, 15 * 60 * 1000);

        // 3. Online reconnect trigger
        window.addEventListener('online', () => {
            console.log('[KiroWeather] Network restored, syncing live meteorological radar...');
            this.syncLiveSanctuaryWeather();
        });
    }

    // =========================================================================
    // 2. KIRO RAIN AUDIT & UMBRELLA ALERTS
    // =========================================================================

    startKiroRainAudit() {
        const auditRain = () => {
            const patWeather = KiroState.get('weather.pat') || {};
            const yangWeather = KiroState.get('weather.yang') || {};
            
            const patRain = patWeather.isRaining || (patWeather.condition || "").toLowerCase().includes('rain') || (patWeather.condition || "").toLowerCase().includes('storm');
            const yangRain = yangWeather.isRaining || (yangWeather.condition || "").toLowerCase().includes('rain') || (yangWeather.condition || "").toLowerCase().includes('storm');

            if (patRain || yangRain) {
                let alertMsg = "";
                if (patRain && yangRain) {
                    alertMsg = "It's raining under BOTH of your skies! 🌧️ Don't forget starry umbrellas Pats & Yangiee! ☔";
                } else if (patRain) {
                    alertMsg = "Pats! Rain detected in Malaybalay! 🌧️ Please bring an umbrella with you! ☔";
                } else {
                    alertMsg = "Yangiee! Rain detected in Capas! 🌧️ Please bring an umbrella with you! ☔";
                }
                this.triggerKiroAlert(alertMsg);
            } else {
                this.dismissKiroAlert();
            }
        };

        setTimeout(auditRain, 1200);
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        this.reminderInterval = setInterval(auditRain, 15000);
    }

    triggerKiroAlert(message) {
        const bubble = document.getElementById('kiro-rain-warning-bubble');
        const textEl = document.getElementById('kiro-alert-text');
        
        if (!bubble || !textEl) return;
        if (bubble.classList.contains('active') && this.currentAlertMessage === message) return;

        this.currentAlertMessage = message;
        textEl.textContent = message;
        bubble.classList.add('active');

        // Play warning chimes
        if (this.synth) {
            if (typeof this.synth.playChimeSound === 'function') {
                this.synth.playChimeSound(660); // Mi
                setTimeout(() => this.synth.playChimeSound(880), 120); // La
            }
        }

        if (window.gsap) {
            gsap.killTweensOf(bubble);
            gsap.fromTo(bubble, 
                { opacity: 0, scale: 0.8, y: 15 }, 
                { opacity: 1, scale: 1, y: 0, duration: 0.75, ease: "elastic.out(1.2, 0.4)" }
            );

            // Gentle floating loop animation
            gsap.to(bubble, {
                y: -5,
                duration: 1.5,
                yoyo: true,
                repeat: -1,
                ease: "power1.inOut"
            });
        }
    }

    dismissKiroAlert() {
        const bubble = document.getElementById('kiro-rain-warning-bubble');
        if (bubble && bubble.classList.contains('active')) {
            this.currentAlertMessage = null;
            if (window.gsap) {
                gsap.killTweensOf(bubble);
                gsap.to(bubble, {
                    opacity: 0,
                    scale: 0.8,
                    y: 15,
                    duration: 0.45,
                    ease: "power2.in",
                    onComplete: () => {
                        bubble.classList.remove('active');
                    }
                });
            } else {
                bubble.classList.remove('active');
            }
        }
    }

    // =========================================================================
    // 3. SKY SIMULATION & EVENTS
    // =========================================================================

    bindSimEvents() {
        const toggleBtn = document.getElementById('simulate-sky-toggle');
        const drawer = document.getElementById('simulate-drawer');
        const refreshLiveBtn = document.getElementById('refresh-live-weather-btn');
        const resetSimBtn = document.getElementById('reset-sim-btn');

        if (toggleBtn && drawer) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = drawer.classList.toggle('open');
                toggleBtn.textContent = isOpen ? '🌌 Simulate Sky State ▴' : '🌌 Simulate Sky State ▾';
                if (this.synth && typeof this.synth.playChimeSound === 'function') {
                    this.synth.playChimeSound(660);
                }
            });
        }

        if (refreshLiveBtn) {
            refreshLiveBtn.addEventListener('click', () => {
                this.simulatedPersonas.clear();
                this.syncLiveSanctuaryWeather();
                if (this.synth && typeof this.synth.playChimeSound === 'function') {
                    this.synth.playChimeSound(784); // Sol
                }
            });
        }

        if (resetSimBtn) {
            resetSimBtn.addEventListener('click', () => {
                this.simulatedPersonas.clear();
                this.syncLiveSanctuaryWeather();
                if (drawer) {
                    drawer.classList.remove('open');
                    if (toggleBtn) toggleBtn.textContent = '🌌 Simulate Sky State ▾';
                }
            });
        }

        // Sim pill click handlers
        const bottomSheet = document.getElementById('capsule-core-bottom-sheet');
        if (!bottomSheet) return;

        bottomSheet.querySelectorAll('.sim-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const persona = pill.getAttribute('data-persona');
                const cond = pill.getAttribute('data-cond');
                const temp = pill.getAttribute('data-temp');
                const condText = pill.getAttribute('data-text');

                this.simulatedPersonas.add(persona);

                const isRain = cond === 'Rain' || cond === 'Gale';
                const simulatedData = {
                    persona: persona,
                    location: SANCTUARY_COORDINATES[persona].location,
                    temp: temp,
                    apparentTemp: temp,
                    humidity: isRain ? '95%' : '65%',
                    condition: condText,
                    rawCondition: cond,
                    weatherCode: isRain ? 80 : 0,
                    isRaining: isRain,
                    rainInHours: isRain ? 0 : 6,
                    rainAlert: isRain ? 'Simulated Rain • Umbrella Alert! ☔' : 'Simulated Sky',
                    needsUmbrella: isRain,
                    isDay: true,
                    provider: 'Manual Simulation'
                };

                // Trigger state updates
                KiroState.set(`weather.${persona}`, simulatedData);

                // Synchronize corresponding synesthetic audio channels
                this.updateSoundscapeFromClimate(cond);
                this.syncBottomSheetUI();
            });
        });
    }

    bindStateObservers() {
        // Monitor weather state updates dynamically
        KiroState.on('change:weather.pat', (data) => {
            this.syncBottomSheetUI();
            this.syncTopBarBeaconWeather();
        });

        KiroState.on('change:weather.yang', (data) => {
            this.syncBottomSheetUI();
            this.syncTopBarBeaconWeather();
        });
    }

    syncBottomSheetUI() {
        const patWeather = KiroState.get('weather.pat');
        const yangWeather = KiroState.get('weather.yang');

        const patTempEl = document.getElementById('pat-temp');
        const patCondEl = document.getElementById('pat-cond');
        const patSubstatsEl = document.getElementById('pat-substats');
        const patAlertEl = document.getElementById('pat-alert-badge');

        const yangTempEl = document.getElementById('yang-temp');
        const yangCondEl = document.getElementById('yang-cond');
        const yangSubstatsEl = document.getElementById('yang-substats');
        const yangAlertEl = document.getElementById('yang-alert-badge');

        if (patTempEl && patWeather) patTempEl.textContent = patWeather.temp;
        if (patCondEl && patWeather) patCondEl.textContent = patWeather.condition;
        if (patSubstatsEl && patWeather) {
            patSubstatsEl.textContent = `Feels ${patWeather.apparentTemp || patWeather.temp} • 💧 ${patWeather.humidity || '80%'}`;
        }
        if (patAlertEl && patWeather) {
            patAlertEl.textContent = patWeather.rainAlert || 'Clear Skies';
        }

        if (yangTempEl && yangWeather) yangTempEl.textContent = yangWeather.temp;
        if (yangCondEl && yangWeather) yangCondEl.textContent = yangWeather.condition;
        if (yangSubstatsEl && yangWeather) {
            yangSubstatsEl.textContent = `Feels ${yangWeather.apparentTemp || yangWeather.temp} • 💧 ${yangWeather.humidity || '82%'}`;
        }
        if (yangAlertEl && yangWeather) {
            yangAlertEl.textContent = yangWeather.rainAlert || 'Clear Skies';
        }

        if (patWeather) this.updateActivePill('pat', patWeather.condition);
        if (yangWeather) this.updateActivePill('yang', yangWeather.condition);
    }

    syncTopBarBeaconWeather() {
        const rawPersona = KiroState.get('persona') || 'pat';
        const persona = (rawPersona === 'yang' || rawPersona === 'yangiee') ? 'yang' : 'pat';
        const weather = KiroState.get(`weather.${persona}`);
        if (!weather) return;

        const weatherBadgeEl = document.getElementById('beacon-weather-badge');
        const umbrellaPillEl = document.getElementById('beacon-umbrella-pill');

        if (weatherBadgeEl) {
            const isRaining = weather.isRaining || (weather.condition || "").toLowerCase().includes('rain') || (weather.condition || "").toLowerCase().includes('storm');
            weatherBadgeEl.textContent = `${weather.temp} ${isRaining ? '🌧️' : (weather.isDay === false ? '✨' : '⛅')}`;
        }

        if (umbrellaPillEl) {
            if (weather.needsUmbrella || weather.isRaining) {
                umbrellaPillEl.style.display = 'inline-flex';
                umbrellaPillEl.textContent = weather.isRaining ? '☂️ Rain • Umbrella' : `☂️ Rain in ${weather.rainInHours || 2}h`;
            } else {
                umbrellaPillEl.style.display = 'none';
            }
        }
    }

    updateActivePill(persona, conditionText) {
        const bottomSheet = document.getElementById('capsule-core-bottom-sheet');
        if (!bottomSheet) return;

        const containerClass = persona === 'pat' ? '.pat-pills-col' : '.yang-pills-col';
        const pillsCol = bottomSheet.querySelector(containerClass);
        if (!pillsCol) return;

        pillsCol.querySelectorAll('.sim-pill').forEach(pill => {
            const pillText = pill.getAttribute('data-text');
            pill.classList.toggle('active', pillText === conditionText);
        });
    }

    updateSoundscapeFromClimate(condition) {
        if (!this.synth) return;

        // Structured Audio SOP: Match sound sweeps to weather environments
        switch(condition) {
            case 'Sunny':
                // Clear out storms, play peaceful lo-fi pads
                KiroState.set('soundVolumes.rain', 0.0);
                KiroState.set('soundVolumes.ocean', 0.0);
                KiroState.set('soundVolumes.thunder', 0.0);
                KiroState.set('soundVolumes.lofi', 0.45);
                if (typeof this.synth.playHappyChirp === 'function') {
                    this.synth.playHappyChirp();
                }
                break;

            case 'Rain':
                // Turn on rich, cozy water drops and deep thunder rolls
                KiroState.set('soundVolumes.rain', 0.60);
                KiroState.set('soundVolumes.ocean', 0.15);
                KiroState.set('soundVolumes.thunder', 0.35);
                if (typeof this.synth.playSadWhimper === 'function') {
                    this.synth.playSadWhimper();
                }
                break;

            case 'Blizzard':
                // Turn on cold howling winds (pink noise ocean filter sweeps)
                KiroState.set('soundVolumes.rain', 0.0);
                KiroState.set('soundVolumes.ocean', 0.55);
                KiroState.set('soundVolumes.thunder', 0.0);
                if (typeof this.synth.playSleepyYawn === 'function') {
                    this.synth.playSleepyYawn();
                }
                break;

            case 'Gale':
                // High winds & intense storm, Kiro leaps elastically riding the current
                KiroState.set('soundVolumes.rain', 0.15);
                KiroState.set('soundVolumes.ocean', 0.70);
                KiroState.set('soundVolumes.thunder', 0.45);
                if (typeof this.synth.playJoyfulJump === 'function') {
                    this.synth.playJoyfulJump();
                }
                break;
        }
    }

    dispose() {
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        if (this.weatherSyncInterval) clearInterval(this.weatherSyncInterval);
        const card = document.getElementById('starlight-telemetry-station');
        if (card) card.remove();
        const sheet = document.getElementById('capsule-core-bottom-sheet');
        if (sheet) sheet.remove();
    }
}
