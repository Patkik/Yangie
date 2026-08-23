import KiroWeatherStationV7 from './weather-v7.js';
/**
 * Kiro App Master Orchestrator (js/app-v7.js)
 * Coordinates the upgraded Space Capsule V6.0 ecosystem with Starlight Weather & Sky Simulation.
 * Integrates Kiro's 10 Cute Procedural Sounds and the Sound Settings Panel.
 */

import kiroState from './state.js';
import KiroUnifiedIntro from './intro.js';
import KiroUnifiedSceneV5 from './scene.js';
import KiroSynthEngineV5 from './synth-v5.js';
import KiroUnifiedMailboxV3 from './mailbox.js';

class KiroAppV5 {
    constructor() {
        this.intro = null;
        this.scene = null;
        this.synth = null;
        this.mailbox = null;
        
        this.sleepHoldTimer = null;
        this.sleepHoldProgress = 0;
        this.isHoldActive = false;

        // Steering D-pad update loops
        this.steeringInterval = null;
        this.activeSteerDir = null;

        // Sound WHOOSH throttling
        this.lastWhooshTime = 0;

        this.init();
    }

    init() {
        const activeUser = kiroState.get('currentUser');

        if (activeUser) {
            this.bootstrapDashboard(activeUser);
        } else {
            this.intro = new KiroUnifiedIntro('intro-viewport-root', (chosenUser) => {
                kiroState.setPersona(chosenUser);
                
                gsap.to('#intro-viewport-root', {
                    opacity: 0,
                    duration: 1.0,
                    onComplete: () => {
                        const root = document.getElementById('intro-viewport-root');
                        if (root) root.innerHTML = '';
                        this.bootstrapDashboard(kiroState.get('currentUser'));
                    }
                });
            });
        }
    }

    bootstrapDashboard(user) {
        const hud = document.getElementById('app-ui');
        if (hud) {
            hud.style.display = 'flex';
            gsap.fromTo(hud, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" });
        }

        // Initialize Engine layers (using scene-v4 or current scene module)
        this.scene = new KiroUnifiedSceneV5('canvas-container');
        this.synth = new KiroSynthEngineV5();
        
        // Audio Context Activation Trigger
        const startAudio = () => {
            if (this.synth) {
                this.synth.init();
                this.synth.resume();
                // Play Happy Greeting on boot!
                setTimeout(() => this.synth.playHappyChirp(), 400);
            }
            document.body.removeEventListener('pointerdown', startAudio);
        };
        document.body.addEventListener('pointerdown', startAudio);

        this.mailbox = new KiroUnifiedMailboxV3('mailbox-panel-mount', this.synth);

        // Render & Bind Settings HTML Drawer dynamically to stay asset-free!
        this.injectSettingsUI();
        this.bindHUD();
        this.bindStateEvents();
        this.weatherStation = new KiroWeatherStationV7('app-ui', this.synth);
        this.startAmplitudeAnalysisLoop();
    }

    injectSettingsUI() {
        // Mount Settings Sidebar directly inside DOM
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'settings-panel-mount';
        document.body.appendChild(settingsContainer);

        settingsContainer.innerHTML = `
            <div id="settings-modal" class="interactive-element">
                <div class="settings-header">
                    <div class="settings-header-title">Celestial Sound Core</div>
                    <button type="button" id="settings-close-btn" class="settings-close-btn">❌</button>
                </div>
                <div class="settings-content">
                    
                    <!-- Section 1: Main Audio Busses -->
                    <div class="settings-section-title">Bus Volume Control</div>
                    <div class="settings-card">
                        <div class="slider-group">
                            <div class="slider-label-row">
                                <span class="slider-name">Master Volume</span>
                                <span id="val-master" class="slider-value">85%</span>
                            </div>
                            <input type="range" id="slider-master" class="cozy-slider" min="0" max="1" step="0.05" value="0.85">
                        </div>
                        <div class="slider-group">
                            <div class="slider-label-row">
                                <span class="slider-name">Kiro Cute SFX</span>
                                <span id="val-sfx" class="slider-value">90%</span>
                            </div>
                            <input type="range" id="slider-sfx" class="cozy-slider slider-pink" min="0" max="1" step="0.05" value="0.90">
                        </div>
                        <div class="slider-group">
                            <div class="slider-label-row">
                                <span class="slider-name">Ambiance loops</span>
                                <span id="val-ambient" class="slider-value">65%</span>
                            </div>
                            <input type="range" id="slider-ambient" class="cozy-slider slider-gold" min="0" max="1" step="0.05" value="0.65">
                        </div>
                    </div>

                    <!-- Section 2: Kiro Pitch Tone Scaling -->
                    <div class="settings-section-title">Kiro Pitch Tone Scale</div>
                    <div class="settings-card">
                        <div class="slider-group">
                            <div class="slider-label-row">
                                <span class="slider-name">Cuteness Pitch Multiplier</span>
                                <span id="val-pitch" class="slider-value">1.0x</span>
                            </div>
                            <input type="range" id="slider-pitch" class="cozy-slider slider-pink" min="0.4" max="2.4" step="0.05" value="1.0">
                        </div>
                    </div>

                    <!-- Section 3: Vocal SFX Test Board -->
                    <div class="settings-section-title">Cute SFX Soundboard</div>
                    <div class="sfx-test-grid">
                        <button type="button" class="sfx-test-btn" data-sfx="chirp">🐦 Happy Chirp</button>
                        <button type="button" class="sfx-test-btn" data-sfx="purr">🐱 Cozy Purr</button>
                        <button type="button" class="sfx-test-btn" data-sfx="giggle">🤭 Tickle Giggle</button>
                        <button type="button" class="sfx-test-btn" data-sfx="yawn">🥱 Sleepy Yawn</button>
                        <button type="button" class="sfx-test-btn" data-sfx="bounce">🥎 Joyful Jump</button>
                        <button type="button" class="sfx-test-btn" data-sfx="cry">🥺 Sad Whimper</button>
                        <button type="button" class="sfx-test-btn" data-sfx="magic">✨ Sparkle Flare</button>
                        <button type="button" class="sfx-test-btn" data-sfx="whoosh">☄️ Trail Whoosh</button>
                    </div>
                </div>
            </div>
        `;
    }

    bindHUD() {
        // Toggle Sidebar Messenger Panel
        const mailboxBtn = document.getElementById('mailbox-toggle-btn');
        if (mailboxBtn) {
            mailboxBtn.addEventListener('click', () => {
                const panel = document.getElementById('mailbox-modal');
                if (panel) {
                    panel.classList.toggle('open');
                    // Play tactile whoosh sound on open
                    if (this.synth) this.synth.playStarTrailWhoosh();
                }
            });
        }

        // Toggle Sound Settings Sidebar Panel
        const settingsBtn = document.getElementById('settings-toggle-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const panel = document.getElementById('settings-modal');
                if (panel) {
                    panel.classList.add('open');
                    if (this.synth) this.synth.playChimeSound(660);
                }
            });
        }

        document.getElementById('settings-close-btn').addEventListener('click', () => {
            const panel = document.getElementById('settings-modal');
            if (panel) {
                panel.classList.remove('open');
                if (this.synth) this.synth.playChimeSound(440);
            }
        });

        // Sliders Listeners
        const setupSlider = (sliderId, labelId, stateField, unit = '%', scale = 100) => {
            const slider = document.getElementById(sliderId);
            const label = document.getElementById(labelId);
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const displayVal = scale === 100 ? `${Math.round(val * scale)}${unit}` : `${val.toFixed(2)}${unit}`;
                label.textContent = displayVal;

                // Sync with KiroState, which automatically propagates to synth-v5
                const config = kiroState.get('soundSettings') || {};
                config[stateField] = val;
                kiroState.set('soundSettings', { ...config });
            });
        };

        setupSlider('slider-master', 'val-master', 'masterVolume', '%', 100);
        setupSlider('slider-sfx', 'val-sfx', 'sfxVolume', '%', 100);
        setupSlider('slider-ambient', 'val-ambient', 'ambientVolume', '%', 100);
        setupSlider('slider-pitch', 'val-pitch', 'vocalPitchMultiplier', 'x', 1);

        // Soundboard Quick Test Buttons binding
        document.querySelectorAll('.sfx-test-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const sfxKey = btn.getAttribute('data-sfx');
                if (!this.synth) return;

                switch(sfxKey) {
                    case 'chirp': this.synth.playHappyChirp(); break;
                    case 'purr': this.synth.playPurr(); break;
                    case 'giggle': this.synth.playGiggle(); break;
                    case 'yawn': this.synth.playSleepyYawn(); break;
                    case 'bounce': this.synth.playJoyfulJump(); break;
                    case 'cry': this.synth.playSadWhimper(); break;
                    case 'magic': this.synth.playAuraFlare(); break;
                    case 'whoosh': this.synth.playStarTrailWhoosh(); break;
                }
                this.pulseButtonFeedback(btn);
            });
        });

        // Star Candy Drop Gummy
        document.getElementById('feed-star-btn').addEventListener('click', () => {
            if (this.scene) {
                this.scene.dropCandy('star');
                this.updateVital('food', 12);
            }
        });

        // Donut Candy Drop Gummy
        document.getElementById('feed-donut-btn').addEventListener('click', () => {
            if (this.scene) {
                this.scene.dropCandy('donut');
                this.updateVital('food', 20);
            }
        });

        // Water Gulp Splash
        document.getElementById('feed-water-btn').addEventListener('click', () => {
            if (this.scene) {
                this.scene.triggerWaterSplash();
                this.updateVital('water', 15);
                if (this.synth) this.synth.playWaterGulp();
            }
        });

        // Fallback explicit Pet Kiro button (giggles tickle!)
        const petKiroBtn = document.getElementById('pet-kiro-btn');
        if (petKiroBtn) {
            petKiroBtn.addEventListener('click', () => {
                if (this.scene) {
                    this.scene.triggerPetReaction();
                    this.pulseButtonFeedback(petKiroBtn);
                    if (this.synth) this.synth.playGiggle();
                }
            });
        }

        // Synthesizer loops
        this.bindSynthToggle('toggle-waves-btn', 'ocean', 0.65);
        this.bindSynthToggle('toggle-rain-btn', 'rain', 0.60);
        this.bindSynthToggle('toggle-lofi-btn', 'lofi', 0.45);

        // Pilot Telescope Mode Toggle
        const shuttleBtn = document.getElementById('shuttle-steer-btn');
        if (shuttleBtn) {
            shuttleBtn.addEventListener('click', () => {
                const current = kiroState.get('telescopeActive');
                kiroState.set('telescopeActive', !current);
                
                shuttleBtn.classList.toggle('telescope-active');
                
                // Toggle shuttle navigation cockpit D-pad
                const dpad = document.getElementById('cockpit-joystick-hud');
                if (dpad) {
                    dpad.style.display = !current ? 'flex' : 'none';
                    if (!current) {
                        gsap.fromTo(dpad, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: \"back.out\" });
                    }
                }

                if (current) {
                    this.clearAlignmentOverlay();
                }
            });
        }

        this.setupJoystickControls();

        // Hold-to-Sleep Switch Trigger
        const sleepBtn = document.getElementById('sleep-switch');
        if (sleepBtn) {
            const startHold = (e) => {
                e.preventDefault();
                this.isHoldActive = true;
                this.sleepHoldProgress = 0;
                
                const tickHold = () => {
                    if (!this.isHoldActive) return;
                    this.sleepHoldProgress += 4;
                    const fill = document.getElementById('sleep-progress');
                    if (fill) fill.style.width = `${this.sleepHoldProgress}%`;

                    if (this.sleepHoldProgress >= 100) {
                        this.toggleSleepState();
                        this.releaseHold();
                    } else {
                        this.sleepHoldTimer = setTimeout(tickHold, 40);
                    }
                };
                tickHold();
            };

            const stopHold = () => this.releaseHold();

            sleepBtn.addEventListener('mousedown', startHold);
            sleepBtn.addEventListener('mouseup', stopHold);
            sleepBtn.addEventListener('mouseleave', stopHold);
            sleepBtn.addEventListener('touchstart', startHold, { passive: false });
            sleepBtn.addEventListener('touchend', stopHold, { passive: true });
        }
    }

    bindSynthToggle(btnId, channel, targetVol) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.addEventListener('click', () => {
            const currentVol = kiroState.get(`soundVolumes.${channel}`) || 0;
            const nextVol = currentVol > 0 ? 0.0 : targetVol;
            kiroState.set(`soundVolumes.${channel}`, nextVol);
            
            btn.classList.toggle('synth-active', nextVol > 0);
        });
    }

    pulseButtonFeedback(element) {
        gsap.timeline()
            .to(element, { scale: 0.9, duration: 0.08, ease: \"power1.in\" })
            .to(element, { scale: 1.06, duration: 0.12, ease: \"back.out(2)\" })
            .to(element, { scale: 1, duration: 0.1 });
    }

    setupJoystickControls() {
        const dpad = document.getElementById('cockpit-joystick-hud');
        if (!dpad) return;

        const steer = (dir) => {
            const currentPitch = kiroState.get('cockpitSteering.pitch') || 0;
            const currentYaw = kiroState.get('cockpitSteering.yaw') || 0;

            let nextPitch = currentPitch;
            let nextYaw = currentYaw;

            if (dir === 'up') nextPitch = Math.min(50, currentPitch + 1.5);
            else if (dir === 'down') nextPitch = Math.max(-50, currentPitch - 1.5);
            else if (dir === 'left') nextYaw = Math.max(-50, currentYaw - 1.5);
            else if (dir === 'right') nextYaw = Math.min(50, currentYaw + 1.5);

            kiroState.set('cockpitSteering.pitch', nextPitch);
            kiroState.set('cockpitSteering.yaw', nextYaw);

            // Synthesize subtle thruster hum tone scaling
            if (this.synth) this.synth.playChimeSound(110 + (Math.abs(nextYaw) * 2));
        };

        const startSteer = (dir) => {
            this.activeSteerDir = dir;
            if (this.steeringInterval) clearInterval(this.steeringInterval);
            this.steeringInterval = setInterval(() => steer(this.activeSteerDir), 40);
        };

        const stopSteer = () => {
            this.activeSteerDir = null;
            if (this.steeringInterval) clearInterval(this.steeringInterval);
        };

        dpad.querySelectorAll('.joystick-btn').forEach(btn => {
            const dir = btn.getAttribute('data-dir');
            
            btn.addEventListener('mousedown', () => startSteer(dir));
            btn.addEventListener('mouseup', stopSteer);
            btn.addEventListener('mouseleave', stopSteer);

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                startSteer(dir);
            }, { passive: false });
            btn.addEventListener('touchend', stopSteer);
        });
    }

    bindStateEvents() {
        // Vitals Fill Bars Update
        kiroState.on('change:vitals', () => {
            const vitals = kiroState.get('vitals');
            document.getElementById('vital-food-fill').style.width = `${vitals.food}%`;
            document.getElementById('vital-water-fill').style.width = `${vitals.water}%`;
            document.getElementById('vital-energy-fill').style.width = `${vitals.energy}%`;

            const avg = Math.round((vitals.food + vitals.water + vitals.energy) / 3);
            kiroState.set('wellbeing', avg);
        });

        // Trigger procedural eating sound
        kiroState.on('candyEaten', (info) => {
            if (this.synth && info.type === 'yum') {
                this.synth.playEatingCandy();
                this.updateVital('energy', 8);
            }
        });

        // Trigger star trail whooshes on dragging touch pointers (with 250ms throttle)
        document.body.addEventListener('pointermove', () => {
            const now = Date.now();
            if (this.synth && now - this.lastWhooshTime > 250) {
                this.synth.playStarTrailWhoosh();
                this.lastWhooshTime = now;
            }
        });

        // Wellbeing tracking states
        kiroState.on('change:wellbeing', (data) => {
            const wellbeing = data.newValue;
            if (wellbeing > 80) {
                // Happy chirp on thrive
                if (this.synth) this.synth.playHappyChirp();
            } else if (wellbeing < 35) {
                // Sad whimper on neglect
                if (this.synth) this.synth.playSadWhimper();
            }
        });

        // Telescope target Lock-On Alerts
        kiroState.on('change:cockpitSteering.currentTarget', (data) => {
            const targetId = data.newValue;
            if (targetId) {
                this.displayAlignmentOverlay(targetId);
                // Magical sparkle flare chime on alignment success!
                if (this.synth) this.synth.playAuraFlare();
            }
        });

        // Sleep status synchronizer
        kiroState.on('change:isSleeping', (data) => {
            const isSleeping = data.newValue;
            const currentUser = kiroState.get('currentUser') === 'pat' ? 'Patrick' : 'Yangiee';
            const otherUser = kiroState.get('currentUser') === 'pat' ? 'Yangiee' : 'Patrick';

            if (isSleeping) {
                if (this.synth) this.synth.playSleepyYawn();
                kiroState.set('incomingSleepAlert', {
                    sender: currentUser,
                    message: `💤 ${currentUser} pushed the sleep button! Sweet dreams, ${otherUser}! ✨`
                });
            } else {
                if (this.synth) this.synth.playHappyChirp();
            }
        });

        kiroState.on('change:incomingSleepAlert', (data) => {
            const alertPayload = data.newValue;
            if (alertPayload) {
                this.spawnNetworkAlertBanner(alertPayload.message);
            }
        });
    }

    displayAlignmentOverlay(targetId) {
        const overlay = document.getElementById('telescope-aligned-screen');
        if (!overlay) return;

        const infoMap = {
            butterfly: { name: 'Butterfly Galaxy (NGC 6302)', desc: 'Holographic dust wings spanning 3 lightyears. Hot gas currents are emitting active cosmic wind.', game: 'Nebula Dodge' },
            helix: { name: 'Eye of Helix Nebula (NGC 7293)', desc: 'Glowing envelope planetary nebulae structure. Looks like a giant stellar eye looking back at you.', game: 'Celestial Bounce' },
            sombrero: { name: 'Sombrero Vortex (M104)', desc: 'Flat circular dust lane rings with a massive supermassive black hole spinning inside the core.', game: 'Cosmic Chime' },
            crab: { name: 'Crab Pulsar Core (M1)', desc: 'Dense rotating neutron pulsar. Emitting blue cosmic radiation and high-frequency sound beats.', game: 'Supernova Blast' }
        };

        const target = infoMap[targetId] || { name: 'Unknown System', desc: 'Acquiring optical lens filters...', game: 'Stardust Catcher' };

        overlay.innerHTML = `
            <div class="aligned-system-card glass-card">
                <div class="lock-indicator">📡 LOCK-ON: ALIGNED SUCCESSFUL</div>
                <h3 class="system-title">${target.name}</h3>
                <p class="system-desc">${target.desc}</p>
                <button type="button" id="start-minigame-btn" class="minigame-play-btn">
                    🎮 Launch Mini-Game: ${target.game}
                </button>
            </div>
        `;
        overlay.style.display = 'flex';
        gsap.fromTo(overlay.querySelector('.aligned-system-card'), { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: \"back.out\" });

        document.getElementById('start-minigame-btn').addEventListener('click', () => {
            if (this.synth) this.synth.playChimeSound(523.25);
            
            // Set minigame state active to temporarily suspend background WebGL renders [cite: 300]
            kiroState.set('minigameActive', true);
            
            // Add a floating, stylized exit button to HUD dynamically [cite: 300]
            const exitBtn = document.createElement('button');
            exitBtn.id = 'exit-minigame-btn';
            exitBtn.className = 'hud-circle-btn interactive-element';
            exitBtn.style.position = 'absolute';
            exitBtn.style.top = '110px';
            exitBtn.style.left = '50%';
            exitBtn.style.transform = 'translateX(-50%)';
            exitBtn.style.zIndex = '3000';
            exitBtn.style.color = '#F5C2E7'; // Sweet Pastel Pink [cite: 300]
            exitBtn.style.width = '180px';
            exitBtn.style.borderRadius = '14px';
            exitBtn.style.fontWeight = 'bold';
            exitBtn.style.border = '1px solid rgba(148, 226, 213, 0.4)';
            exitBtn.style.background = 'rgba(30, 30, 46, 0.85)';
            exitBtn.innerHTML = '🚪 Exit Mini-Game';
            document.body.appendChild(exitBtn);

            exitBtn.addEventListener('click', () => {
                kiroState.set('minigameActive', false);
                if (this.synth) this.synth.playChimeSound(380); // sleepy off chime
                exitBtn.remove();
                this.clearAlignmentOverlay();
            });

            alert(`🚀 Mini-Game "${target.game}" initiated! Play with Kiro in real-time.`);
        });
    }

    clearAlignmentOverlay() {
        const overlay = document.getElementById('telescope-aligned-screen');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }
    }

    releaseHold() {
        this.isHoldActive = false;
        if (this.sleepHoldTimer) clearTimeout(this.sleepHoldTimer);
        const fill = document.getElementById('sleep-progress');
        if (fill) fill.style.width = '0%';
    }

    toggleSleepState() {
        const current = kiroState.get('isSleeping');
        kiroState.set('isSleeping', !current);
        
        const label = document.getElementById('sleep-switch-label');
        if (label) {
            label.textContent = current ? 'HOLD TO GO TO BED 🌙' : 'HOLD TO WAKE UP ☀️';
        }
    }

    updateVital(vitalName, delta) {
        const vitals = { ...kiroState.get('vitals') };
        vitals[vitalName] = Math.min(100, Math.max(0, vitals[vitalName] + delta));
        kiroState.set('vitals', vitals);
    }

    
    startAmplitudeAnalysisLoop() {
        const analyze = () => {
            if (this.synth && this.synth.isInitialized) {
                const amp = this.synth.getAudioReactiveLevel();
                kiroState.set('audioReactiveLevel', amp);
            }
            requestAnimationFrame(analyze);
        };
        analyze();
    }

    spawnNetworkAlertBanner(message) {
        const banner = document.createElement('div');
        banner.className = 'network-alert-banner interactive-element';
        banner.textContent = message;
        document.body.appendChild(banner);

        gsap.timeline()
            .to(banner, { top: 24, duration: 0.6, ease: \"back.out\" })
            .to(banner, { top: -60, duration: 0.6, delay: 4.0, ease: \"power2.in\", onComplete: () => banner.remove() });
    }
}

// Start App when script loads
window.addEventListener('DOMContentLoaded', () => {
    window.KiroApp = new KiroAppV5();
});
