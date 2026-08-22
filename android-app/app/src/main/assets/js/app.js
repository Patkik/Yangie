/**
 * app.js (Space Capsule V3)
 * Master Application Bootstrap, Native Bridge, Lifecycle, & In-Settings Updater (ES6 Module)
 * Connects KiroState V3, Web Audio Synthesizer, 3D Galaxy & Cockpit HUD, Starlight Messenger, and OTA Updater.
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';
import { KiroSceneManager } from './scene.js';
import { KiroIntroManager } from './intro.js';
import KiroPreloaderV5 from './kiro-preloader-v5.js';
import { StarlightMessenger } from './mailbox.js';
import { KiroAgenticOrchestrator } from './orchestrator.js';
import { ARTEngine } from './art-engine.js';
import { minigameEngine, PointerShield } from './minigames.js';

// ============================================================================
// 1. Native Lifecycle & Notification Bridges
// ============================================================================

window.appLifecycle = {
  isPaused: false,
  pauseGame: () => {
    window.appLifecycle.isPaused = true;
    synthEngine.suspend();
  },
  resumeGame: () => {
    window.appLifecycle.isPaused = false;
    synthEngine.resume();
  }
};

export function sendNativeNotification(title, message) {
  if (window.AndroidHost && typeof window.AndroidHost.sendNotification === 'function') {
    try {
      window.AndroidHost.sendNotification(title, message);
    } catch (e) {
      console.warn('Native notification bridge error:', e);
    }
  }
}

// ============================================================================
// 2. In-Settings App Updater Client
// ============================================================================

export const AppUpdater = {
  repoOwner: 'Patkik',
  repoName: 'Yangie',

  isNative: () => Boolean(window.AndroidHost && typeof window.AndroidHost.checkForUpdates === 'function'),

  performFullUpdate: function() {
    const banner = document.getElementById('settings-status-banner');
    const pBox = document.getElementById('settings-progress-box');
    if (banner) banner.textContent = 'Connecting to GitHub Releases…';
    if (pBox) pBox.style.display = 'flex';

    if (this.isNative() && typeof window.AndroidHost.performDirectUpdate === 'function') {
      window.AndroidHost.performDirectUpdate();
    } else if (this.isNative() && typeof window.AndroidHost.startOtaUpdate === 'function') {
      window.AndroidHost.startOtaUpdate();
    } else {
      this.checkWeb();
    }
  },

  checkWeb: async function() {
    try {
      const res = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest?t=${Date.now()}`);
      const current = KiroState.get('installedVersion').replace(/^v/i, '');
      const banner = document.getElementById('settings-status-banner');
      const pBox = document.getElementById('settings-progress-box');

      if (res.status === 404) {
        if (banner) banner.textContent = `Sanctuary is on the latest version (v${current})`;
        if (pBox) pBox.style.display = 'none';
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rel = await res.json();
      const remote = (rel.tag_name || '1.0.0').replace(/^v/i, '');

      if (remote !== current) {
        if (banner) banner.textContent = `New update ${rel.tag_name} found! Refreshing…`;
        localStorage.setItem('gn_installed_version', rel.tag_name);
        setTimeout(() => window.location.reload(true), 1200);
      } else {
        if (banner) banner.textContent = `Sanctuary is on the latest version (v${current})`;
        if (pBox) pBox.style.display = 'none';
      }
    } catch (e) {
      const banner = document.getElementById('settings-status-banner');
      if (banner) banner.textContent = 'Sanctuary is on the latest version.';
    }
  },

  onNativeEvent: function(event) {
    const banner = document.getElementById('settings-status-banner');
    const pBox = document.getElementById('settings-progress-box');
    const pTarget = document.getElementById('settings-progress-target');
    const pPct = document.getElementById('settings-progress-pct');
    const pBar = document.getElementById('settings-progress-bar');
    const pSpeed = document.getElementById('settings-progress-speed');

    switch (event.type) {
      case 'CHECKING':
        if (banner) banner.textContent = 'Checking for updates on GitHub…';
        break;

      case 'AVAILABLE':
        if (banner) banner.textContent = `Update ${event.release.tagName} available! Downloading…`;
        break;

      case 'UP_TO_DATE':
        if (banner) banner.textContent = `You are on the latest version (${event.currentVersion})`;
        if (pBox) pBox.style.display = 'none';
        break;

      case 'DOWNLOADING':
        if (pBox) pBox.style.display = 'flex';
        const pct = Math.max(0, Math.min(100, event.progress.percent || 0));
        if (pTarget) pTarget.textContent = event.target || 'Downloading…';
        if (pPct) pPct.textContent = `${pct}%`;
        if (pBar) pBar.style.width = `${pct}%`;
        const kbps = (event.progress.speedBytesPerSec / 1024).toFixed(1);
        if (pSpeed) pSpeed.textContent = `${kbps} KB/s`;
        break;

      case 'OTA_READY':
        if (banner) banner.textContent = `Update ${event.version} installed! Reloading sanctuary…`;
        break;

      case 'ERROR':
        const msg = event.message || 'Unable to connect to GitHub. Please check your internet connection.';
        if (banner) banner.textContent = msg.startsWith('Notice:') ? msg : `Notice: ${msg}`;
        if (pBox) pBox.style.display = 'none';
        break;
    }
  }
};

window.AppUpdater = AppUpdater;

// ============================================================================
// 3. UI Controller & Bootstrap Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  let sceneManager = null;
  let messenger = null;

  // Initialize 3D Scene Manager
  try {
    sceneManager = new KiroSceneManager('webgl-canvas-container');
  } catch (e) {
    console.error('Failed initializing KiroSceneManager:', e);
  }

  // Initialize Starlight Messenger
  try {
    messenger = new StarlightMessenger('mailbox-modal');
  } catch (e) {
    console.error('Failed initializing StarlightMessenger:', e);
  }

  // Initialize Persona Selection Intro
  let introManager = null;
  const revealDashboard = () => {
    const appUi = document.getElementById('app-ui');
    if (appUi) appUi.classList.add('visible');
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.pointerEvents = 'none';
    }
    // Cinematic Boot Warp: quick starburst acceleration on dashboard reveal
    if (sceneManager && typeof sceneManager.triggerBootWarp === 'function') {
      sceneManager.triggerBootWarp();
    }
  };

  // 3D WebGL Shader Preloader & Warm-Up Engine (V5.0)
  let preloader = null;
  const introRoot = document.getElementById('intro-viewport-root');
  if (introRoot) {
    introRoot.style.display = 'flex';
    preloader = new KiroPreloaderV5('intro-viewport-root', () => {
      console.log('Sanctuary initialized and fully warmed! ✨');
      if (KiroState.get('hasCompletedIntro')) {
        revealDashboard();
      }
    });
  } else {
    if (KiroState.get('hasCompletedIntro')) {
      revealDashboard();
    }
  }

  try {
    introManager = new KiroIntroManager('intro-overlay', () => {
      revealDashboard();
    });
  } catch (e) {
    console.error('Failed initializing KiroIntroManager:', e);
    revealDashboard();
  }

  // 0. Boot Kiro's Agentic Orchestration Engine (Supervisor-Specialist MAS)
  const orchestrator = new KiroAgenticOrchestrator(synthEngine, sceneManager);

  // 1. Dynamic Single-Identity Profile Architecture (Twin Sanctuary Beacon)
  function updatePersonaProfile() {
    const rawPersona = KiroState.get('persona') || 'pat';
    const persona = (rawPersona === 'yang' || rawPersona === 'yangiee') ? 'yang' : 'pat';
    const partner = persona === 'pat' ? 'yang' : 'pat';
    const personaName = persona === 'pat' ? 'Patrick' : 'Yangiee';
    const partnerName = persona === 'pat' ? 'Yangiee' : 'Patrick';
    const partnerLocation = partner === 'yang' ? 'Capas' : 'Malaybalay';

    // A. Update Top Header Twin Sanctuary Beacon
    const partnerNameEl = document.getElementById('partner-status-name');
    const partnerLocEl = document.getElementById('partner-status-location');
    const beaconPulseEl = document.getElementById('partner-beacon-pulse');
    if (partnerNameEl) partnerNameEl.textContent = partnerName;
    if (partnerLocEl) partnerLocEl.textContent = partnerLocation;
    if (beaconPulseEl) {
      const coreDot = beaconPulseEl.querySelector('.beacon-core-dot');
      const ringWave = beaconPulseEl.querySelector('.beacon-ring-wave');
      const color = partner === 'yang' ? 'var(--color-pink-blush)' : 'var(--color-mint)';
      if (coreDot) {
        coreDot.style.background = color;
        coreDot.style.boxShadow = `0 0 8px ${color}`;
      }
      if (ringWave) {
        ringWave.style.borderColor = color;
      }
    }

    // B. Update Weather/Telemetry Hub if present
    const localStationEl = document.getElementById('telemetry-local-station');
    const partnerStationEl = document.getElementById('telemetry-partner-station');
    if (localStationEl) {
      localStationEl.innerHTML = `
        <svg class="inline-svg-icon ${persona === 'pat' ? 'galaxy-icon' : 'moon-icon'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${persona === 'pat' 
            ? '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' 
            : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'}
        </svg>
        <span style="font-weight:700; color:var(--color-mint);">${persona === 'pat' ? 'Malaybalay (You)' : 'Capas (You)'} • ${persona === 'pat' ? '24°C' : '28°C'}</span>
      `;
    }
    if (partnerStationEl) {
      partnerStationEl.innerHTML = `
        <svg class="inline-svg-icon ${partner === 'pat' ? 'galaxy-icon' : 'moon-icon'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${partner === 'pat' 
            ? '<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>' 
            : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'}
        </svg>
        <span>${partner === 'pat' ? 'Malaybalay (Patrick)' : 'Capas (Yangiee)'} • ${partner === 'pat' ? '24°C' : '28°C'}</span>
      `;
    }

    // C. Update Settings Modal Persona Card
    const settingsBadge = document.getElementById('settings-current-persona-badge');
    const settingsTitle = document.getElementById('settings-persona-title');
    const settingsStation = document.getElementById('settings-persona-station');
    if (settingsBadge) {
      settingsBadge.textContent = personaName.toUpperCase();
      settingsBadge.style.color = persona === 'pat' ? 'var(--color-mint)' : 'var(--color-pink-blush)';
      settingsBadge.style.borderColor = persona === 'pat' ? 'rgba(78, 201, 176, 0.35)' : 'rgba(245, 183, 192, 0.35)';
      settingsBadge.style.background = persona === 'pat' ? 'rgba(78, 201, 176, 0.15)' : 'rgba(245, 183, 192, 0.15)';
    }
    if (settingsTitle) settingsTitle.textContent = personaName;
    if (settingsStation) settingsStation.textContent = `Location: ${persona === 'pat' ? 'Malaybalay' : 'Capas'}`;
  }

  updatePersonaProfile();
  KiroState.on('persona:change', updatePersonaProfile);
  KiroState.on('change:persona', updatePersonaProfile);

  // 2. Dynamic Timezone Greeting & Live Clock (Philippine Standard Time UTC+8)
  function updateClockAndGreeting() {
    const clockEl = document.getElementById('live-clock');
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pst = new Date(utc + (3600000 * 8));

    const hours = pst.getHours();
    const mins = pst.getMinutes();
    const secs = pst.getSeconds();

    if (clockEl) {
      const hours12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hStr = String(hours12).padStart(2, '0');
      const mStr = String(mins).padStart(2, '0');
      const sStr = String(secs).padStart(2, '0');
      clockEl.textContent = `${hStr}:${mStr}:${sStr} ${ampm} PST`;
    }
  }

  updateClockAndGreeting();
  setInterval(updateClockAndGreeting, 1000);

  // 3. Satellite Orbital Dock (2-Tier Spatial Hierarchy Interactions)
  const masterCareBtn = document.getElementById('btn-master-care');
  const masterVibeBtn = document.getElementById('btn-master-vibe');
  const rackCarePetals = document.getElementById('rack-care-petals');
  const rackVibePetals = document.getElementById('rack-vibe-petals');

  function closeAllPetals() {
    if (rackCarePetals) rackCarePetals.style.display = 'none';
    if (rackVibePetals) rackVibePetals.style.display = 'none';
    if (masterCareBtn) masterCareBtn.classList.remove('active');
    if (masterVibeBtn) masterVibeBtn.classList.remove('active');
  }

  if (masterCareBtn) {
    masterCareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = rackCarePetals && rackCarePetals.style.display !== 'none';
      closeAllPetals();
      if (!isVisible && rackCarePetals) {
        rackCarePetals.style.display = 'flex';
        masterCareBtn.classList.add('active');
        synthEngine.playChimeSound(660);
      }
    });
  }

  if (masterVibeBtn) {
    masterVibeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = rackVibePetals && rackVibePetals.style.display !== 'none';
      closeAllPetals();
      if (!isVisible && rackVibePetals) {
        rackVibePetals.style.display = 'flex';
        masterVibeBtn.classList.add('active');
        synthEngine.playChimeSound(520);
      }
    });
  }

  // Collapse open petals when touching canvas or outside dock
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#satellite-orbital-dock')) {
      closeAllPetals();
    }
  });

  // Ephemeral Care Treat Petal Buttons
  const feedStarBtn = document.getElementById('btn-feed-star');
  const feedDonutBtn = document.getElementById('btn-feed-donut');
  const drinkWaterBtn = document.getElementById('btn-feed-water');

  if (feedStarBtn) {
    feedStarBtn.addEventListener('click', () => {
      orchestrator.executeFeedingSOP('star');
    });
  }
  if (feedDonutBtn) {
    feedDonutBtn.addEventListener('click', () => {
      orchestrator.executeFeedingSOP('donut');
    });
  }
  if (drinkWaterBtn) {
    drinkWaterBtn.addEventListener('click', () => {
      orchestrator.executeFeedingSOP('water');
    });
  }

  // Comms Hub Navigation Buttons
  const mailboxNavBtn = document.getElementById('btn-nav-mailbox');
  const settingsNavBtn = document.getElementById('btn-nav-settings');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const updateNowBtn = document.getElementById('settings-update-now-btn');
  const gyroToggleBtn = document.getElementById('settings-gyro-toggle');
  const replayIntroBtn = document.getElementById('settings-replay-intro-btn');
  const shuttleSteerBtn = document.getElementById('shuttle-steer-btn');
  const joystickHud = document.getElementById('cockpit-joystick-hud');
  const telescopeAlignedScreen = document.getElementById('telescope-aligned-screen');

  if (mailboxNavBtn) mailboxNavBtn.addEventListener('click', () => messenger?.open());

  // 4. Pilot Cockpit Telescope & D-Pad Steering Controls
  if (shuttleSteerBtn) {
    shuttleSteerBtn.addEventListener('click', () => {
      const active = !KiroState.get('telescopeActive');
      KiroState.set('telescopeActive', active);
    });
  }

  // Reactive Telescope Mode Synchronization
  KiroState.on('change:telescopeActive', ({ newValue }) => {
    const active = Boolean(newValue);
    if (shuttleSteerBtn) shuttleSteerBtn.classList.toggle('active', active);
    if (joystickHud) joystickHud.style.display = active ? 'flex' : 'none';
    if (!active && telescopeAlignedScreen) {
      telescopeAlignedScreen.style.display = 'none';
      KiroState.set('cockpitSteering.aligned', false);
      KiroState.set('cockpitSteering.currentTarget', null);
    }
  });

  // D-Pad Steering Joystick Handlers
  if (joystickHud) {
    joystickHud.querySelectorAll('.joystick-btn[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-dir');
        let steering = KiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };
        const step = 8;

        if (dir === 'up') steering.pitch = Math.min(50, (steering.pitch || 0) + step);
        if (dir === 'down') steering.pitch = Math.max(-50, (steering.pitch || 0) - step);
        if (dir === 'left') steering.yaw = Math.max(-50, (steering.yaw || 0) - step);
        if (dir === 'right') steering.yaw = Math.min(50, (steering.yaw || 0) + step);

        KiroState.set('cockpitSteering', { ...steering });
        const speed = Math.min(1.0, (Math.abs(steering.pitch || 0) + Math.abs(steering.yaw || 0)) / 60);
        synthEngine.updateThrusterSpeed(speed);
      });
    });
  }

  // Telescope Lock-On Target Alert Card (Sci-Fi Movie System HUD)
  KiroState.on('change:cockpitSteering.aligned', ({ newValue }) => {
    const isTelescope = KiroState.get('telescopeActive');
    if (newValue && isTelescope && telescopeAlignedScreen) {
      const targetId = KiroState.get('cockpitSteering.currentTarget') || 'gliese';
      const catalog = KiroState.get('exoplanetCatalog') || {};
      const sys = catalog[targetId] || { name: 'Celestial Sanctuary', type: 'PLAYABLE SYSTEM', dist: '1.42 AU', game: 'tetris', gameTitle: 'Celestial Tetris' };

      telescopeAlignedScreen.innerHTML = `
        <div class="target-lock-header">
          <svg class="target-radar-icon" viewBox="0 0 24 24" fill="none" stroke="#94E2D5" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#94E2D5"/>
            <line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/>
          </svg>
          <span>✦ TARGET ACQUIRED // SYSTEM LOCKED ✦</span>
        </div>
        <div class="target-lock-title">${sys.name}</div>
        <div class="target-lock-meta">
          <span>${sys.type}</span> • <span style="color:#F9E2AF;">RANGE: ${sys.dist}</span> • <span style="color:#94E2D5;">STATUS: PLAYABLE</span>
        </div>
        <div class="target-lock-actions">
          <button id="btn-play-minigame" class="target-lock-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:13px;height:13px;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Engage Warp to ${sys.gameTitle || sys.game}
          </button>
        </div>
      `;
      telescopeAlignedScreen.style.display = 'block';

      const playBtn = telescopeAlignedScreen.querySelector('#btn-play-minigame');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          PointerShield.activate(1200);
          synthEngine.playSupernovaSound();
          if (sceneManager && typeof sceneManager.triggerWarpJump === 'function') {
            sceneManager.triggerWarpJump(sys);
          }
          setTimeout(() => {
            const gameId = sys.game || 'tetris';
            minigameEngine.openGame(gameId);
          }, 1100);
        });
      }
    } else if (telescopeAlignedScreen) {
      telescopeAlignedScreen.style.display = 'none';
    }
  });

  // 5. Sleep Mode Greeting Flash Toast
  function flashSleepToast(isSleeping) {
    const overlay = document.getElementById('sleep-greeting-overlay');
    const icon = document.getElementById('sleep-greeting-icon');
    const title = document.getElementById('sleep-greeting-title');
    const sub = document.getElementById('sleep-greeting-sub');
    const rawPersona = KiroState.get('persona') || 'pat';
    const partnerName = (rawPersona === 'pat' || rawPersona === 'patrick') ? 'Yangiee' : 'Patrick';

    if (!overlay || !title) return;

    if (isSleeping) {
      if (icon) icon.textContent = '🌙';
      title.textContent = 'Goodnight, Starlight ✨';
      if (sub) sub.textContent = `Sweet dreams in Capas & Malaybalay`;
    } else {
      if (icon) icon.textContent = '☀️';
      title.textContent = 'Good morning, Sunshine ✨';
      if (sub) sub.textContent = `Awakened with ${partnerName}`;
    }

    overlay.style.display = 'flex';
    const card = document.getElementById('sleep-greeting-card');
    if (card) {
      card.style.animation = 'none';
      void card.offsetHeight; // trigger reflow
      card.style.animation = 'sleepToastFlash 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    }

    setTimeout(() => {
      overlay.style.display = 'none';
    }, 2400);
  }

  // 6. Settings Modal Handlers
  const settingsModal = document.getElementById('settings-modal');
  const switchPersonaBtn = document.getElementById('settings-switch-persona-btn');

  if (switchPersonaBtn) {
    switchPersonaBtn.addEventListener('click', () => {
      const current = KiroState.get('persona') || 'pat';
      const next = (current === 'pat' || current === 'patrick') ? 'yang' : 'pat';
      KiroState.setPersona(next);
      synthEngine.playChimeSound(next === 'pat' ? 520 : 680);
    });
  }

  if (settingsNavBtn) {
    settingsNavBtn.addEventListener('click', () => {
      const verBadge = document.getElementById('settings-current-ver-badge');
      const verVal = document.getElementById('settings-val-version');
      const cur = KiroState.get('installedVersion');
      if (verBadge) verBadge.textContent = cur.startsWith('v') ? cur : `v${cur}`;
      if (verVal) verVal.textContent = cur.startsWith('v') ? cur : `v${cur}`;
      updatePersonaProfile();
      syncSoundSettingsUI();
      if (settingsModal) settingsModal.classList.add('open');
    });
  }

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.remove('open');
    });
  }

  if (updateNowBtn) {
    updateNowBtn.addEventListener('click', () => AppUpdater.performFullUpdate());
  }

  if (replayIntroBtn) {
    replayIntroBtn.addEventListener('click', () => {
      if (settingsModal) settingsModal.classList.remove('open');
      const appUi = document.getElementById('app-ui');
      if (appUi) {
        appUi.classList.remove('visible');
        appUi.style.opacity = '0';
        appUi.style.pointerEvents = 'none';
      }
      if (introManager) {
        introManager.replay();
      } else {
        introManager = new KiroIntroManager('intro-overlay', () => {
          revealDashboard();
        });
        introManager.replay();
      }
    });
  }

  if (gyroToggleBtn) {
    gyroToggleBtn.addEventListener('click', () => {
      const current = KiroState.get('gyroEnabled');
      KiroState.setGyro(!current);
      gyroToggleBtn.classList.toggle('active', !current);
      gyroToggleBtn.textContent = !current ? 'ON' : 'OFF';
    });
  }

  // 6.1 Sound & Vocal Matrix Handlers (3-Bus Mixer & Vocal Soundboard)
  const masterVolSlider = document.getElementById('slider-master-vol');
  const sfxVolSlider = document.getElementById('slider-sfx-vol');
  const ambientVolSlider = document.getElementById('slider-ambient-vol');
  const pitchMultSlider = document.getElementById('slider-pitch-mult');

  const lblMasterVol = document.getElementById('lbl-val-master-vol');
  const lblSfxVol = document.getElementById('lbl-val-sfx-vol');
  const lblAmbientVol = document.getElementById('lbl-val-ambient-vol');
  const lblPitchMult = document.getElementById('lbl-val-pitch-mult');

  const updatePitchLabel = (val) => {
    if (!lblPitchMult) return;
    const num = val / 100;
    let label = 'Normal';
    if (num < 0.65) label = 'Deep Beast';
    else if (num < 0.90) label = 'Playful Dino';
    else if (num <= 1.15) label = 'Normal';
    else if (num <= 1.65) label = 'Cute Alien';
    else label = 'Squeaky Baby';

    lblPitchMult.textContent = `${num.toFixed(1)}x (${label})`;
  };

  const syncSoundSettingsUI = () => {
    const audio = KiroState.get('audioSettings') || {};
    const master = Math.round((audio.masterVolume ?? 0.85) * 100);
    const sfx = Math.round((audio.sfxVolume ?? 0.90) * 100);
    const ambient = Math.round((audio.ambientVolume ?? 0.75) * 100);
    const pitch = Math.round((audio.pitchMultiplier ?? 1.0) * 100);

    if (masterVolSlider) masterVolSlider.value = master;
    if (lblMasterVol) lblMasterVol.textContent = `${master}%`;

    if (sfxVolSlider) sfxVolSlider.value = sfx;
    if (lblSfxVol) lblSfxVol.textContent = `${sfx}%`;

    if (ambientVolSlider) ambientVolSlider.value = ambient;
    if (lblAmbientVol) lblAmbientVol.textContent = `${ambient}%`;

    if (pitchMultSlider) pitchMultSlider.value = pitch;
    updatePitchLabel(pitch);
  };

  syncSoundSettingsUI();

  if (masterVolSlider) {
    masterVolSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (lblMasterVol) lblMasterVol.textContent = `${val}%`;
      KiroState.setAudioSetting('masterVolume', val / 100);
    });
  }

  if (sfxVolSlider) {
    sfxVolSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (lblSfxVol) lblSfxVol.textContent = `${val}%`;
      KiroState.setAudioSetting('sfxVolume', val / 100);
    });
  }

  if (ambientVolSlider) {
    ambientVolSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (lblAmbientVol) lblAmbientVol.textContent = `${val}%`;
      KiroState.setAudioSetting('ambientVolume', val / 100);
    });
  }

  if (pitchMultSlider) {
    pitchMultSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      updatePitchLabel(val);
      KiroState.setAudioSetting('pitchMultiplier', val / 100);
    });
  }

  // Vocal Soundboard Buttons
  document.querySelectorAll('.soundboard-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      synthEngine.init();
      synthEngine.resume();
      const sound = btn.getAttribute('data-sound');
      switch (sound) {
        case 'chirp': synthEngine.playHappyChirp(); break;
        case 'purr': synthEngine.playPurr(1.4); break;
        case 'candy': synthEngine.playEatingCandy(); break;
        case 'water': synthEngine.playWaterGulp(); break;
        case 'yawn': synthEngine.playSleepyYawn(); break;
        case 'aura': synthEngine.playAuraFlare(); break;
        case 'jump': synthEngine.playJoyfulJump(); break;
        case 'whimper': synthEngine.playSadWhimper(); break;
        case 'giggle': synthEngine.playGiggle(); break;
        case 'whoosh': synthEngine.playStarTrailWhoosh(); break;
        default: synthEngine.playHappyChirp(); break;
      }
    });
  });

  // Stardust Trail Whoosh Event Listener
  KiroState.on('audio:whoosh', () => {
    synthEngine.playStarTrailWhoosh();
  });

  // 6.2 Adaptive Resource Throttling (ART) UI Controls & Live Telemetry
  const artModeButtons = document.querySelectorAll('.art-mode-btn');
  const artBadge = document.getElementById('art-live-tier-badge');
  const valFps = document.getElementById('art-val-fps');
  const valFrameTime = document.getElementById('art-val-frametime');
  const valDpr = document.getElementById('art-val-dpr');
  const valResTier = document.getElementById('art-val-res-tier');
  const valParticles = document.getElementById('art-val-particles');
  const valParticlesPct = document.getElementById('art-val-particles-pct');
  const valMemory = document.getElementById('art-val-memory');
  const valThermal = document.getElementById('art-val-thermal');

  const updateArtModeUI = (currentMode) => {
    artModeButtons.forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      btn.classList.toggle('active', mode === currentMode);
    });
  };

  const updateArtTelemetryUI = (telemetry) => {
    if (!telemetry) return;
    if (artBadge) {
      artBadge.textContent = telemetry.currentTierId || 'OPTIMAL';
      const isOptimal = telemetry.currentTierId === 'OPTIMAL';
      const isEco = telemetry.currentTierId === 'ECO';
      artBadge.style.color = isEco ? '#F5C2E7' : (isOptimal ? '#4EC9B0' : '#F9E2AF');
      artBadge.style.borderColor = isEco ? 'rgba(245, 194, 231, 0.35)' : (isOptimal ? 'rgba(78, 201, 176, 0.35)' : 'rgba(249, 226, 175, 0.35)');
    }

    if (valFps) valFps.textContent = `${telemetry.fps || 60} FPS`;
    if (valFrameTime) valFrameTime.textContent = `${(telemetry.avgFrameMs || 16.6).toFixed(1)} ms`;
    if (valDpr) valDpr.textContent = `${(telemetry.dprScale || 1.0).toFixed(2)}x DPR`;
    if (valResTier) valResTier.textContent = `${Math.round((telemetry.dprScale || 1.0) * 100)}% Fill-Rate`;
    if (valParticles) {
      const stars = Math.round(1400 * (telemetry.particleScale || 1.0));
      valParticles.textContent = `${stars} Stars`;
    }
    if (valParticlesPct) valParticlesPct.textContent = `${Math.round((telemetry.particleScale || 1.0) * 100)}% Geometry`;

    if (valMemory) {
      if (telemetry.heapUsedMb > 0) {
        valMemory.textContent = `Heap: ${telemetry.heapUsedMb}MB`;
      } else {
        valMemory.textContent = `RAM: ${telemetry.deviceMemoryGb || 4}GB`;
      }
    }

    if (valThermal) {
      if (telemetry.isThermalStrained) {
        valThermal.textContent = '⚠️ Thermal Strain';
        valThermal.style.color = '#F5C2E7';
      } else if (!telemetry.isBatteryCharging && telemetry.batteryLevel < 0.2) {
        valThermal.textContent = `Battery: ${Math.round(telemetry.batteryLevel * 100)}%`;
        valThermal.style.color = '#F9E2AF';
      } else {
        valThermal.textContent = 'Optimal Temp';
        valThermal.style.color = '#94E2D5';
      }
    }
  };

  artModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      KiroState.setArtMode(mode);
      updateArtModeUI(mode);
      synthEngine.playChimeSound(660);
    });
  });

  const initialArtMode = KiroState.get('artMode') || 'auto';
  updateArtModeUI(initialArtMode);
  if (ARTEngine) {
    updateArtTelemetryUI(ARTEngine.getTelemetrySnapshot());
  }

  KiroState.on('change:artMode', ({ newValue }) => {
    updateArtModeUI(newValue);
  });

  KiroState.on('art:telemetry_update', (telemetry) => {
    updateArtTelemetryUI(telemetry);
  });

  KiroState.on('art:tier_change', ({ tier, telemetry }) => {
    updateArtTelemetryUI(telemetry);
  });

  // 6.3 Cozy Eco-Battery Mode & Thermal Saver HUD Controller
  const ecoToggleBtn = document.getElementById('eco-toggle-btn');
  const ecoStatusBadge = document.getElementById('settings-eco-status-badge');

  const updateEcoUI = (isEco) => {
    if (ecoToggleBtn) {
      ecoToggleBtn.classList.toggle('eco-active', isEco);
      ecoToggleBtn.textContent = isEco ? '🔋 ECO MODE ON (COZY)' : '⚡ PERFORMANCE MODE';
    }
    if (ecoStatusBadge) {
      ecoStatusBadge.textContent = isEco ? 'ECO 30 FPS' : '60 FPS CAP';
      ecoStatusBadge.style.color = isEco ? '#F9E2AF' : '#4EC9B0';
      ecoStatusBadge.style.borderColor = isEco ? 'rgba(249, 226, 175, 0.35)' : 'rgba(78, 201, 176, 0.35)';
      ecoStatusBadge.style.background = isEco ? 'rgba(249, 226, 175, 0.15)' : 'rgba(78, 201, 176, 0.15)';
    }
  };

  if (ecoToggleBtn) {
    ecoToggleBtn.addEventListener('click', () => {
      const nextEco = !KiroState.get('ecoModeActive');
      KiroState.setEcoMode(nextEco);
      synthEngine.playChimeSound(nextEco ? 440 : 880);
    });
  }

  updateEcoUI(Boolean(KiroState.get('ecoModeActive')));
  KiroState.on('change:ecoModeActive', ({ newValue }) => {
    updateEcoUI(Boolean(newValue));
  });

  // 7. Ephemeral Vibe Soundscape Petals
  const soundOceanBtn = document.getElementById('btn-audio-waves') || document.getElementById('btn-sound-ocean');
  const soundRainBtn = document.getElementById('btn-audio-rain') || document.getElementById('btn-sound-rain');
  const soundLofiBtn = document.getElementById('btn-audio-lofi') || document.getElementById('btn-sound-lofi');

  let oceanVol = 0;
  let rainVol = 0;
  let lofiVol = 0;

  if (soundOceanBtn) {
    soundOceanBtn.addEventListener('click', () => {
      synthEngine.init();
      oceanVol = oceanVol > 0 ? 0 : 0.6;
      KiroState.setVolume('ocean', oceanVol);
      soundOceanBtn.classList.toggle('active', oceanVol > 0);
    });
  }

  if (soundRainBtn) {
    soundRainBtn.addEventListener('click', () => {
      synthEngine.init();
      rainVol = rainVol > 0 ? 0 : 0.5;
      KiroState.setVolume('rain', rainVol);
      soundRainBtn.classList.toggle('active', rainVol > 0);
    });
  }

  if (soundLofiBtn) {
    soundLofiBtn.addEventListener('click', () => {
      synthEngine.init();
      lofiVol = lofiVol > 0 ? 0 : 0.5;
      KiroState.setVolume('lofi', lofiVol);
      soundLofiBtn.classList.toggle('active', lofiVol > 0);
    });
  }

  // 8. Sleep Mode Hold-to-Toggle Segment (with Ring Fill Animation & Toast Flash)
  const sleepBtn = document.getElementById('sleep-pill-btn') || document.getElementById('sleep-switch-btn');
  const sleepHoldRing = document.getElementById('sleep-hold-ring') || document.getElementById('sleep-pill-progress');
  const sleepLabel = document.getElementById('sleep-pill-label');
  let sleepTimer = null;
  let sleepProgressVal = 0;

  if (sleepBtn && sleepHoldRing) {
    const isSleepActive = () => KiroState.get('isSleeping') === true;

    const updateSleepButtonUI = (sleeping) => {
      sleepBtn.classList.toggle('sleeping', sleeping);
      if (sleepLabel) {
        sleepLabel.textContent = sleeping ? 'Wake' : 'Sleep';
      }
    };

    // Initial state sync & SSOT listener
    updateSleepButtonUI(isSleepActive());
    KiroState.on('change:isSleeping', ({ newValue }) => updateSleepButtonUI(Boolean(newValue)));

    const triggerSleepToggle = () => {
      const nextSleep = !KiroState.get('isSleeping');
      if (nextSleep) {
        orchestrator.executeBedtimeSOP();
      } else {
        orchestrator.executeWakeupSOP();
      }
      flashSleepToast(nextSleep);
    };

    const startSleepPress = (e) => {
      closeAllPetals();
      sleepProgressVal = 0;
      if (sleepLabel) sleepLabel.textContent = isSleepActive() ? 'Waking...' : 'Sleeping...';
      sleepTimer = setInterval(() => {
        sleepProgressVal += 10;
        sleepHoldRing.style.width = `${sleepProgressVal}%`;
        if (sleepProgressVal >= 100) {
          clearInterval(sleepTimer);
          sleepTimer = null;
          sleepHoldRing.style.width = '0%';
          triggerSleepToggle();
        }
      }, 50);
    };

    const cancelSleepPress = () => {
      if (sleepTimer) {
        clearInterval(sleepTimer);
        sleepTimer = null;
      }
      sleepHoldRing.style.width = '0%';
      updateSleepButtonUI(isSleepActive());
    };

    sleepBtn.addEventListener('pointerdown', startSleepPress);
    sleepBtn.addEventListener('pointerup', cancelSleepPress);
    sleepBtn.addEventListener('pointerleave', cancelSleepPress);
    sleepBtn.addEventListener('pointercancel', cancelSleepPress);
  }

  // 8.5 Exoplanet Sanctuary & Milestones Modal Controller
  const currencyPill = document.getElementById('sanctuary-currency-pill');
  const exoplanetModal = document.getElementById('exoplanet-modal');
  const exoplanetCloseBtn = document.getElementById('exoplanet-close-btn');
  const exoplanetGrid = document.getElementById('exoplanet-systems-grid');
  const topbarStardustVal = document.getElementById('topbar-stardust-val');
  const topbarEssenceVal = document.getElementById('topbar-essence-val');
  const vaultStardustVal = document.getElementById('vault-stardust-val');
  const vaultEssenceVal = document.getElementById('vault-essence-val');

  const updateCurrencyUI = () => {
    const shards = KiroState.get('stardustShards') ?? 0;
    const essence = KiroState.get('cosmicEssence') ?? 0;
    const essenceCap = KiroState.get('essenceCap') ?? 100;

    if (topbarStardustVal) topbarStardustVal.textContent = shards;
    if (topbarEssenceVal) topbarEssenceVal.textContent = essence;
    if (vaultStardustVal) vaultStardustVal.textContent = `✦ ${shards}`;
    if (vaultEssenceVal) vaultEssenceVal.textContent = `⬡ ${essence} / ${essenceCap}`;
  };

  const renderExoplanetModal = () => {
    updateCurrencyUI();
    if (!exoplanetGrid) return;

    const catalog = KiroState.get('exoplanetCatalog') || {};
    const unlocked = KiroState.get('unlockedPlanets') || ['gliese'];
    const current = KiroState.get('currentPlanet') || 'gliese';
    const userShards = KiroState.get('stardustShards') || 0;

    exoplanetGrid.innerHTML = Object.values(catalog).map(sys => {
      const isUnlocked = unlocked.includes(sys.id);
      const isActive = current === sys.id;
      const canUnlock = !isUnlocked && userShards >= sys.cost;

      return `
        <div class="exoplanet-card-item ${isUnlocked ? 'unlocked' : ''} ${isActive ? 'active-world' : ''}" data-planet="${sys.id}">
          <div class="exo-info-col">
            <div class="exo-name-row">
              <span class="exo-name">${sys.name}</span>
              ${isActive ? '<span class="minigame-badge" style="color:#4EC9B0;">[CURRENT]</span>' : ''}
            </div>
            <div class="exo-type">${sys.type} • <span class="exo-dist">${sys.dist}</span></div>
            <div class="exo-buff">✦ ${sys.buffTitle} (${sys.buffMultiplier}x)</div>
          </div>
          <div class="exo-action-col">
            ${isUnlocked ? `
              <button class="exo-action-btn exo-play-btn" data-action="play" data-game="${sys.game}">
                Play ${sys.gameTitle || 'Arcade'}
              </button>
            ` : `
              <button class="exo-action-btn exo-unlock-btn" data-action="unlock" data-planet="${sys.id}" ${canUnlock ? '' : 'style="opacity:0.5;"'}>
                Unlock (${sys.cost} ✦)
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Attach unlock and play action listeners
    exoplanetGrid.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.getAttribute('data-action');
        if (action === 'play') {
          const game = btn.getAttribute('data-game') || 'tetris';
          if (exoplanetModal) exoplanetModal.style.display = 'none';
          minigameEngine.openGame(game);
        } else if (action === 'unlock') {
          const pid = btn.getAttribute('data-planet');
          const res = KiroState.unlockExoplanet(pid);
          if (res.success) {
            synthEngine.playAuraFlare();
            renderExoplanetModal();
          } else {
            synthEngine.playSadWhimper();
            alert(res.reason || 'Not enough Stardust Shards to unlock this sanctuary.');
          }
        }
      });
    });
  };

  if (currencyPill) {
    currencyPill.addEventListener('click', () => {
      renderExoplanetModal();
      if (exoplanetModal) exoplanetModal.style.display = 'flex';
      synthEngine.playShardPickup();
    });
  }

  if (exoplanetCloseBtn) {
    exoplanetCloseBtn.addEventListener('click', () => {
      if (exoplanetModal) exoplanetModal.style.display = 'none';
    });
  }

  // Reactive State Sync for Currencies & Exoplanets
  updateCurrencyUI();
  KiroState.on('change:stardustShards', () => updateCurrencyUI());
  KiroState.on('change:cosmicEssence', () => updateCurrencyUI());
  KiroState.on('change:unlockedPlanets', () => renderExoplanetModal());

  // 9. Rigid Viewport Lock — Prevent screen bounce/scrolling
  document.addEventListener('touchmove', (e) => {
    const isScrollable = e.target.closest('.mailbox-feed, .settings-card, .intro-portals-stage, .call-panel, .exoplanet-systems-grid, .minigame-card');
    if (!isScrollable) {
      e.preventDefault();
    }
  }, { passive: false });
});
