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
import { KiroAgenticOrchestrator } from './orchestrator.js';

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
      KiroState.feed('star');
    });
  }
  if (feedDonutBtn) {
    feedDonutBtn.addEventListener('click', () => {
      orchestrator.executeFeedingSOP('donut');
      KiroState.feed('donut');
    });
  }
  if (drinkWaterBtn) {
    drinkWaterBtn.addEventListener('click', () => {
      orchestrator.executeFeedingSOP('water');
      KiroState.drinkWater();
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
    const startSleepPress = () => {
      sleepProgressVal = 0;
      sleepTimer = setInterval(() => {
        sleepProgressVal += 8;
        sleepHoldRing.style.width = `${sleepProgressVal}%`;
        if (sleepProgressVal >= 100) {
          clearInterval(sleepTimer);
          sleepHoldRing.style.width = '0%';
          const isSleeping = !KiroState.get('isSleeping');
          KiroState.setSleep(isSleeping);
          sleepBtn.classList.toggle('sleeping', isSleeping);
          if (sleepLabel) {
            sleepLabel.textContent = isSleeping ? 'Wake' : 'Sleep';
          }
          flashSleepToast(isSleeping);
        }
      }, 45);
    };

    const cancelSleepPress = () => {
      if (sleepTimer) clearInterval(sleepTimer);
      sleepHoldRing.style.width = '0%';
    };

    sleepBtn.addEventListener('pointerdown', startSleepPress);
    sleepBtn.addEventListener('pointerup', cancelSleepPress);
    sleepBtn.addEventListener('pointerleave', cancelSleepPress);
    sleepBtn.addEventListener('pointercancel', cancelSleepPress);
  }

  // 9. Rigid Viewport Lock — Prevent screen bounce/scrolling
  document.addEventListener('touchmove', (e) => {
    const isScrollable = e.target.closest('.mailbox-feed, .settings-card, .intro-portals-stage, .call-panel');
    if (!isScrollable) {
      e.preventDefault();
    }
  }, { passive: false });
});
