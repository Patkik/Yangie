/**
 * Kiro Weather, Clock & Sky Simulation Station (js/weather-v7.js)
 * Live ticking unified chronometer, double-persona localized weather modules (Pat & Yang),
 * automatic Kiro "Umbrella" rain alarm triggers, and a fully interactive Sky Simulator.
 * Integrates directly with state volumes to drive synesthetic audio environments.
 */

import { KiroState } from './state.js';

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
        this.currentAlertMessage = null;

        this.init();
    }

    init() {
        this.injectStylesheet();
        this.injectWeatherHUD();
        this.startClock();
        this.startKiroRainAudit();
        this.bindSimEvents();
        this.bindStateObservers();
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

        let mountPoint = document.getElementById('hero-center') || 
                         document.getElementById('starlight-weather-mount') ||
                         document.getElementById('center-sanctuary-stage') ||
                         this.container;

        const weatherCard = document.createElement('div');
        weatherCard.id = 'starlight-telemetry-station';
        weatherCard.className = 'glass-card telemetry-station-card interactive-element';

        const patWeather = KiroState.get('weather.pat') || { temp: '24°C', condition: 'Cosmic Rain' };
        const yangWeather = KiroState.get('weather.yang') || { temp: '26°C', condition: 'Nebula Fog' };

        weatherCard.innerHTML = `
            <!-- Live Ticking Chronometer -->
            <div class="telemetry-clock-row">
                <span class="clock-label">CAPSULE CORE TIME</span>
                <span id="telemetry-live-clock" class="clock-value">00:00:00 AM</span>
                <span id="telemetry-live-date" class="clock-date">STARDATE 2026.08.22</span>
            </div>

            <div class="weather-separator"></div>

            <!-- Double-Persona Weather Stations -->
            <div class="weather-telemetry-grid">
                <!-- Patrick (Pats) Station -->
                <div class="weather-station-pillar pat-station">
                    <div class="pillar-header">
                        <span class="pillar-dot pat-dot"></span>
                        <span class="pillar-name">Pats (Pat)</span>
                    </div>
                    <div class="pillar-stats">
                        <span id="pat-temp" class="pillar-temp">${patWeather.temp}</span>
                        <span id="pat-cond" class="pillar-cond">${patWeather.condition}</span>
                    </div>
                </div>

                <div class="pillar-divider"></div>

                <!-- Yangiee (Yang) Station -->
                <div class="weather-station-pillar yang-station">
                    <div class="pillar-header">
                        <span class="pillar-dot yang-dot"></span>
                        <span class="pillar-name">Yangiee (Yang)</span>
                    </div>
                    <div class="pillar-stats">
                        <span id="yang-temp" class="pillar-temp">${yangWeather.temp}</span>
                        <span id="yang-cond" class="pillar-cond">${yangWeather.condition}</span>
                    </div>
                </div>
            </div>

            <div class="weather-separator"></div>

            <!-- Expandable Weather Simulator Controls -->
            <div class="simulate-toggle-row">
                <button type="button" id="simulate-sky-toggle" class="simulate-toggle-btn">
                    🌌 Simulate Sky State ▾
                </button>
            </div>

            <div id="simulate-drawer" class="simulate-drawer-panel">
                <div class="weather-separator"></div>
                
                <!-- Pat Sky Simulator -->
                <div class="pat-pills-col">
                    <div class="simulate-section-header">Pats' Local Sky</div>
                    <div class="simulate-pills-row">
                        <span class="sim-pill pat-sim" data-persona="pat" data-cond="Sunny" data-temp="25°C" data-text="Sunny Nebula">☀️ Sunny</span>
                        <span class="sim-pill pat-sim" data-persona="pat" data-cond="Rain" data-temp="21°C" data-text="Cosmic Rain">🌧️ Rain</span>
                        <span class="sim-pill pat-sim" data-persona="pat" data-cond="Blizzard" data-temp="-5°C" data-text="Stardust Blizzard">❄️ Blizzard</span>
                        <span class="sim-pill pat-sim" data-persona="pat" data-cond="Gale" data-temp="32°C" data-text="Supernova Gale">🌀 Gale</span>
                    </div>
                </div>

                <!-- Yangiee Sky Simulator -->
                <div class="yang-pills-col">
                    <div class="simulate-section-header">Yangiee's Local Sky</div>
                    <div class="simulate-pills-row">
                        <span class="sim-pill yang-sim" data-persona="yang" data-cond="Sunny" data-temp="27°C" data-text="Sunny Nebula">☀️ Sunny</span>
                        <span class="sim-pill yang-sim" data-persona="yang" data-cond="Rain" data-temp="22°C" data-text="Cosmic Rain">🌧️ Rain</span>
                        <span class="sim-pill yang-sim" data-persona="yang" data-cond="Blizzard" data-temp="-3°C" data-text="Stardust Blizzard">❄️ Blizzard</span>
                        <span class="sim-pill yang-sim" data-persona="yang" data-cond="Gale" data-temp="34°C" data-text="Supernova Gale">🌀 Gale</span>
                    </div>
                </div>
            </div>

            <!-- Hidden, slide-down Kiro dynamic bubble alert -->
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

        if (mountPoint.firstChild) {
            mountPoint.insertBefore(weatherCard, mountPoint.firstChild);
        } else {
            mountPoint.appendChild(weatherCard);
        }

        if (window.gsap) {
            gsap.fromTo(weatherCard, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" });
        }
    }

    startClock() {
        const clockEl = document.getElementById('telemetry-live-clock');
        const dateEl = document.getElementById('telemetry-live-date');
        
        const updateTime = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const pst = new Date(utc + (3600000 * 8));

            const hours = pst.getHours();
            const mins = pst.getMinutes();
            const secs = pst.getSeconds();

            const hours12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const hStr = String(hours12).padStart(2, '0');
            const mStr = String(mins).padStart(2, '0');
            const sStr = String(secs).padStart(2, '0');

            if (clockEl) clockEl.textContent = `${hStr}:${mStr}:${sStr} ${ampm}`;

            const year = pst.getFullYear();
            const month = String(pst.getMonth() + 1).padStart(2, '0');
            const day = String(pst.getDate()).padStart(2, '0');
            if (dateEl) dateEl.textContent = `STARDATE ${year}.${month}.${day}`;
        };

        updateTime();
        if (this.clockInterval) clearInterval(this.clockInterval);
        this.clockInterval = setInterval(updateTime, 1000);
    }

    startKiroRainAudit() {
        const auditRain = () => {
            const patWeather = KiroState.get('weather.pat') || {};
            const yangWeather = KiroState.get('weather.yang') || {};
            
            const patRain = (patWeather.condition || "").toLowerCase().includes('rain') || 
                           (patWeather.condition || "").toLowerCase().includes('storm');
            const yangRain = (yangWeather.condition || "").toLowerCase().includes('rain') || 
                            (yangWeather.condition || "").toLowerCase().includes('storm');

            if (patRain || yangRain) {
                let alertMsg = "";
                if (patRain && yangRain) {
                    alertMsg = "It's going to rain under BOTH of your skies! 🌧️ Don't forget your starry umbrellas Pats & Yangiee! ☔";
                } else if (patRain) {
                    alertMsg = "Pats! It's going to rain under your sky soon! 🌧️ Please bring an umbrella with you! ☔";
                } else {
                    alertMsg = "Yangiee! It's going to rain under your sky soon! 🌧️ Please bring an umbrella with you! ☔";
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

    bindSimEvents() {
        const toggleBtn = document.getElementById('simulate-sky-toggle');
        const drawer = document.getElementById('simulate-drawer');

        if (toggleBtn && drawer) {
            toggleBtn.addEventListener('click', () => {
                const isOpen = drawer.classList.toggle('open');
                toggleBtn.textContent = isOpen ? '🌌 Simulate Sky State ▴' : '🌌 Simulate Sky State ▾';
                if (this.synth && typeof this.synth.playChimeSound === 'function') {
                    this.synth.playChimeSound(660);
                }
            });
        }

        // Sim pill click handlers
        const card = document.getElementById('starlight-telemetry-station');
        if (!card) return;

        card.querySelectorAll('.sim-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const persona = pill.getAttribute('data-persona');
                const cond = pill.getAttribute('data-cond');
                const temp = pill.getAttribute('data-temp');
                const condText = pill.getAttribute('data-text');

                // Trigger state updates
                KiroState.set(`weather.${persona}`, { temp, condition: condText });

                // Synchronize corresponding synesthetic audio channels
                this.updateSoundscapeFromClimate(cond);
            });
        });
    }

    bindStateObservers() {
        // Monitor weather state updates dynamically
        KiroState.on('change:weather.pat', (data) => {
            const weather = data.newValue || data;
            const tempEl = document.getElementById('pat-temp');
            const condEl = document.getElementById('pat-cond');
            if (tempEl && weather) tempEl.textContent = weather.temp;
            if (condEl && weather) condEl.textContent = weather.condition;
            if (weather) this.updateActivePill('pat', weather.condition);
            this.syncTopBarBeaconWeather();
        });

        KiroState.on('change:weather.yang', (data) => {
            const weather = data.newValue || data;
            const tempEl = document.getElementById('yang-temp');
            const condEl = document.getElementById('yang-cond');
            if (tempEl && weather) tempEl.textContent = weather.temp;
            if (condEl && weather) condEl.textContent = weather.condition;
            if (weather) this.updateActivePill('yang', weather.condition);
            this.syncTopBarBeaconWeather();
        });
    }

    syncTopBarBeaconWeather() {
        const persona = KiroState.get('persona') || 'pat';
        const weather = KiroState.get(`weather.${persona}`);
        if (!weather) return;

        const weatherBadgeEl = document.getElementById('beacon-weather-badge');
        const umbrellaPillEl = document.getElementById('beacon-umbrella-pill');

        if (weatherBadgeEl) {
            const isRaining = (weather.condition || "").toLowerCase().includes('rain') || 
                             (weather.condition || "").toLowerCase().includes('storm');
            weatherBadgeEl.textContent = `${weather.temp} ${isRaining ? '🌧️' : '⛅'}`;
        }

        if (umbrellaPillEl) {
            const isRaining = (weather.condition || "").toLowerCase().includes('rain') || 
                             (weather.condition || "").toLowerCase().includes('storm');
            if (isRaining) {
                umbrellaPillEl.style.display = 'inline-flex';
                umbrellaPillEl.textContent = '☂️ Rain • Umbrella';
            } else {
                umbrellaPillEl.style.display = 'none';
            }
        }
    }

    updateActivePill(persona, conditionText) {
        const card = document.getElementById('starlight-telemetry-station');
        if (!card) return;

        const containerClass = persona === 'pat' ? '.pat-pills-col' : '.yang-pills-col';
        const pillsCol = card.querySelector(containerClass);
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
        const card = document.getElementById('starlight-telemetry-station');
        if (card) card.remove();
    }
}
