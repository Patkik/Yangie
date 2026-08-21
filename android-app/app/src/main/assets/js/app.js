/**
 * app.js (Space Capsule V3)
 * Master Application Bootstrap, Native Bridge, Lifecycle, & In-Settings Updater (ES6 Module)
 * Connects KiroState V3, Web Audio Synthesizer, 3D Galaxy & Cockpit HUD, Starlight Messenger, and OTA Updater.
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';
import { KiroSceneManager } from './scene.js';
import { KiroIntroManager } from './intro.js';
import { StarlightMessenger } from './mailbox.js';

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

  if (KiroState.get('hasCompletedIntro')) {
    revealDashboard();
  }

  try {
    introManager = new KiroIntroManager('intro-overlay', () => {
      revealDashboard();
    });
  } catch (e) {
    console.error('Failed initializing KiroIntroManager:', e);
    revealDashboard();
  }

  // 1. Dynamic Single-Identity Profile Architecture
  function updatePersonaProfile() {
    const rawPersona = KiroState.get('persona') || 'pat';
    const persona = (rawPersona === 'yang' || rawPersona === 'yangiee') ? 'yang' : 'pat';
    const partner = persona === 'pat' ? 'yang' : 'pat';
    const personaName = persona === 'pat' ? 'Patrick' : 'Yangiee';
    const partnerName = persona === 'pat' ? 'Yangiee' : 'Patrick';

    // A. Update Top Header Connected Subtitle
    const brandSub = document.getElementById('brand-connected-sub');
    if (brandSub) {
      brandSub.textContent = `CONNECTED TO ${partnerName.toUpperCase()}`;
    }

    // B. Update Weather/Telemetry Hub
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
    const greetEl = document.getElementById('time-greeting');

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pst = new Date(utc + (3600000 * 8));

    const hours = pst.getHours();
    const mins = pst.getMinutes();
    const secs = pst.getSeconds();
    const totalMins = hours * 60 + mins;

    if (clockEl) {
      const hours12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const hStr = String(hours12).padStart(2, '0');
      const mStr = String(mins).padStart(2, '0');
      const sStr = String(secs).padStart(2, '0');
      clockEl.textContent = `${hStr}:${mStr}:${sStr} ${ampm} PST`;
    }

    if (greetEl) {
      const GREETING_SVGS = {
        morning: `<svg class="greeting-svg-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
        afternoon: `<svg class="greeting-svg-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/></svg>`,
        evening: `<svg class="greeting-svg-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
        deepNight: `<svg class="greeting-svg-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg>`
      };

      // 06:00 - 11:59: GOOD MORNING
      // 12:00 - 17:59: GOOD AFTERNOON
      // 18:00 - 02:30: GOOD EVENING
      // 02:31 - 05:59: GOODMORNIGHT
      if (totalMins >= 360 && totalMins < 720) {
        greetEl.innerHTML = `${GREETING_SVGS.morning} <span>GOOD MORNING</span>`;
      } else if (totalMins >= 720 && totalMins < 1080) {
        greetEl.innerHTML = `${GREETING_SVGS.afternoon} <span>GOOD AFTERNOON</span>`;
      } else if (totalMins >= 1080 || totalMins <= 150) {
        greetEl.innerHTML = `${GREETING_SVGS.evening} <span>GOOD EVENING</span>`;
      } else {
        greetEl.innerHTML = `${GREETING_SVGS.deepNight} <span>GOODMORNIGHT</span>`;
      }
    }
  }

  updateClockAndGreeting();
  setInterval(updateClockAndGreeting, 1000);

  // 2. Vitals HUD Progress Update Binding
  function updateVitalsHUD() {
    const foodFill = document.getElementById('vital-food-fill');
    const waterFill = document.getElementById('vital-water-fill');
    const energyFill = document.getElementById('vital-energy-fill');

    if (foodFill) foodFill.style.width = `${KiroState.get('food') ?? 100}%`;
    if (waterFill) waterFill.style.width = `${KiroState.get('water') ?? 100}%`;
    if (energyFill) energyFill.style.width = `${KiroState.get('energy') ?? 100}%`;
  }

  updateVitalsHUD();
  KiroState.on('change', updateVitalsHUD);
  KiroState.on('vital:feed', updateVitalsHUD);
  KiroState.on('vital:water', updateVitalsHUD);
  KiroState.on('sleep:change', updateVitalsHUD);

  // 3. Quick Action Buttons (Candy, Donut, Water)
  const feedStarBtn = document.getElementById('btn-feed-star');
  const feedDonutBtn = document.getElementById('btn-feed-donut');
  const drinkWaterBtn = document.getElementById('btn-feed-water') || document.getElementById('btn-drink-water');
  const mailboxNavBtn = document.getElementById('btn-nav-mailbox');
  const settingsNavBtn = document.getElementById('btn-nav-settings');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const updateNowBtn = document.getElementById('settings-update-now-btn');
  const gyroToggleBtn = document.getElementById('settings-gyro-toggle');
  const replayIntroBtn = document.getElementById('settings-replay-intro-btn');
  const soundOceanBtn = document.getElementById('btn-audio-waves') || document.getElementById('btn-sound-ocean');
  const soundRainBtn = document.getElementById('btn-audio-rain') || document.getElementById('btn-sound-rain');
  const soundLofiBtn = document.getElementById('btn-audio-lofi') || document.getElementById('btn-sound-lofi');
  const shuttleSteerBtn = document.getElementById('shuttle-steer-btn');
  const joystickHud = document.getElementById('cockpit-joystick-hud');
  const telescopeAlignedScreen = document.getElementById('telescope-aligned-screen');
  const sleepBanner = document.getElementById('shared-sleep-banner');

  if (feedStarBtn) feedStarBtn.addEventListener('click', () => KiroState.feed('star'));
  if (feedDonutBtn) feedDonutBtn.addEventListener('click', () => KiroState.feed('donut'));
  if (drinkWaterBtn) drinkWaterBtn.addEventListener('click', () => KiroState.drinkWater());
  if (mailboxNavBtn) mailboxNavBtn.addEventListener('click', () => messenger?.open());

  // 4. Pilot Cockpit Telescope & D-Pad Steering Controls
  if (shuttleSteerBtn) {
    shuttleSteerBtn.addEventListener('click', () => {
      const active = !KiroState.get('telescopeActive');
      KiroState.set('telescopeActive', active);
      shuttleSteerBtn.classList.toggle('active', active);
      if (joystickHud) joystickHud.style.display = active ? 'flex' : 'none';
      if (!active && telescopeAlignedScreen) {
        telescopeAlignedScreen.style.display = 'none';
        KiroState.set('cockpitSteering.aligned', false);
        KiroState.set('cockpitSteering.currentTarget', null);
      }
    });
  }

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

  // Telescope Lock-On Target Alert Card
  KiroState.on('change:cockpitSteering.aligned', ({ newValue }) => {
    if (newValue && telescopeAlignedScreen) {
      const targetId = KiroState.get('cockpitSteering.currentTarget');
      const systemNames = {
        butterfly: { name: 'Butterfly Galaxy (NGC 6302)', game: 'Nebula Dodge' },
        helix: { name: 'Eye of Helix Nebula (NGC 7293)', game: 'Celestial Bounce' },
        sombrero: { name: 'Sombrero Vortex (M104)', game: 'Cosmic Chimes' },
        crab: { name: 'Crab Pulsar Core (M1)', game: 'Supernova Blast' }
      };
      const sys = systemNames[targetId] || { name: 'Unknown Celestial System', game: 'Star Pulse' };

      telescopeAlignedScreen.innerHTML = `
        <div style="font-size:10px; color:var(--color-mint); font-weight:700; text-transform:uppercase; letter-spacing:1px;">✦ Target Locked ✦</div>
        <div style="font-size:13px; font-weight:700; color:#FFF; margin: 4px 0;">${sys.name}</div>
        <button id="btn-play-minigame" style="margin-top:6px; padding:6px 14px; border-radius:12px; border:none; background:linear-gradient(90deg, var(--color-pink-blush), var(--color-mint)); color:#0D1622; font-weight:700; font-size:11px; cursor:pointer;">
          Play ${sys.game}
        </button>
      `;
      telescopeAlignedScreen.style.display = 'block';

      const playBtn = telescopeAlignedScreen.querySelector('#btn-play-minigame');
      if (playBtn) {
        playBtn.addEventListener('click', () => {
          synthEngine.playChimeSound(1080);
          alert(`✨ Launching ${sys.game} mini-game with Kiro!`);
        });
      }
    }
  });

  // 5. Sleep Alert
  function showSleepAlert(sender) {
    if (!sleepBanner) return;
    const senderName = sender === 'pat' ? 'Patrick' : 'Yangiee';
    const partnerName = sender === 'pat' ? 'Yangiee' : 'Patrick';
    sleepBanner.innerHTML = `
      <svg class="inline-svg-icon moon-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.5-11.5 10.4 10.4 0 0 1-9.6-8.3z"/></svg>
      <span>${senderName} is now sleeping. Good night, ${partnerName}!</span>
    `;
    sleepBanner.style.display = 'flex';
    setTimeout(() => {
      sleepBanner.style.display = 'none';
    }, 4000);
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
      document.getElementById('app-ui').classList.remove('visible');
      if (introManager) {
        introManager.replay();
      } else {
        introManager = new KiroIntroManager('intro-overlay', () => {
          document.getElementById('app-ui').classList.add('visible');
        });
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

  // 7. Procedural Sound Toggles
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

  // 8. Sleep Mode Long-Press Switch
  const sleepBtn = document.getElementById('sleep-pill-btn') || document.getElementById('sleep-switch-btn');
  const sleepProgress = document.getElementById('sleep-pill-progress') || document.getElementById('sleep-switch-progress');
  let sleepTimer = null;
  let sleepProgressVal = 0;

  if (sleepBtn && sleepProgress) {
    const startSleepPress = () => {
      sleepProgressVal = 0;
      sleepTimer = setInterval(() => {
        sleepProgressVal += 4;
        sleepProgress.style.width = `${sleepProgressVal}%`;
        if (sleepProgressVal >= 100) {
          clearInterval(sleepTimer);
          const isSleeping = !KiroState.get('isSleeping');
          KiroState.setSleep(isSleeping);
          const contentEl = sleepBtn.querySelector('.sleep-pill-content') || sleepBtn.querySelector('.btn-text');
          if (contentEl) {
            contentEl.innerHTML = isSleeping 
              ? '<svg class="sleep-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg><span id="sleep-pill-label">WAKE KIRO</span>' 
              : '<svg class="sleep-pill-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="rgba(203, 166, 247, 0.3)"/></svg><span id="sleep-pill-label">HOLD TO SLEEP</span>';
          }
          document.getElementById('app-ui').classList.toggle('dissipated', isSleeping);
          if (isSleeping) {
            showSleepAlert(KiroState.get('persona') || 'pat');
          }
        }
      }, 50);
    };

    const cancelSleepPress = () => {
      if (sleepTimer) clearInterval(sleepTimer);
      sleepProgress.style.width = '0%';
    };

    sleepBtn.addEventListener('mousedown', startSleepPress);
    sleepBtn.addEventListener('touchstart', startSleepPress, { passive: true });
    sleepBtn.addEventListener('mouseup', cancelSleepPress);
    sleepBtn.addEventListener('mouseleave', cancelSleepPress);
    sleepBtn.addEventListener('touchend', cancelSleepPress);
  }

  // 9. Rigid Viewport Lock — Prevent screen bounce/scrolling
  document.addEventListener('touchmove', (e) => {
    const isScrollable = e.target.closest('.mailbox-feed, .settings-card, .intro-portals-stage, .call-panel');
    if (!isScrollable) {
      e.preventDefault();
    }
  }, { passive: false });
});
