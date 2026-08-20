/**
 * app.js
 * Master Application Bootstrap, Native Bridge, Lifecycle, & In-Settings Updater (ES6 Module)
 */

import { KiroState } from './state.js';
import { synthEngine } from './audio/synth.js';
import { KiroSceneManager } from './three/scene.js';
import { KiroIntroManager } from './three/intro.js';
import { StarlightMessenger } from './ui/mailbox.js';

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rel = await res.json();
      const current = KiroState.get('installedVersion').replace(/^v/i, '');
      const remote = (rel.tag_name || '1.0.0').replace(/^v/i, '');

      const banner = document.getElementById('settings-status-banner');
      if (remote !== current) {
        if (banner) banner.textContent = `New update ${rel.tag_name} found! Refreshing…`;
        localStorage.setItem('gn_installed_version', rel.tag_name);
        setTimeout(() => window.location.reload(true), 1200);
      } else {
        if (banner) banner.textContent = `Sanctuary is on the latest version (v${current})`;
        const pBox = document.getElementById('settings-progress-box');
        if (pBox) pBox.style.display = 'none';
      }
    } catch (e) {
      const banner = document.getElementById('settings-status-banner');
      if (banner) banner.textContent = 'Could not reach GitHub Releases.';
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
        if (banner) banner.textContent = `Notice: ${event.message}`;
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
  try {
    new KiroIntroManager('intro-overlay', (persona) => {
      document.getElementById('app-ui').classList.add('visible');
    });
  } catch (e) {
    console.error('Failed initializing KiroIntroManager:', e);
  }

  // Live Philippine Standard Time Clock
  function updateClock() {
    const clockEl = document.getElementById('live-clock');
    const greetEl = document.getElementById('time-greeting');
    if (!clockEl) return;

    const now = new Date();
    // UTC+8 calculation
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pst = new Date(utc + (3600000 * 8));

    const hours = pst.getHours();
    const mins = String(pst.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;

    clockEl.textContent = `${h12}:${mins} ${ampm} PST`;

    if (greetEl) {
      if (hours >= 5 && hours < 12) greetEl.textContent = 'GOOD MORNING';
      else if (hours >= 12 && hours < 17) greetEl.textContent = 'GOOD AFTERNOON';
      else if (hours >= 17 && hours < 21) greetEl.textContent = 'GOOD EVENING';
      else greetEl.textContent = 'GOOD NIGHT';
    }
  }

  updateClock();
  setInterval(updateClock, 10000);

  // Quick Action Buttons
  const feedStarBtn = document.getElementById('btn-feed-star');
  const feedDonutBtn = document.getElementById('btn-feed-donut');
  const drinkWaterBtn = document.getElementById('btn-drink-water');
  const mailboxNavBtn = document.getElementById('btn-nav-mailbox');
  const settingsNavBtn = document.getElementById('btn-nav-settings');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const updateNowBtn = document.getElementById('settings-update-now-btn');
  const gyroToggleBtn = document.getElementById('settings-gyro-toggle');
  const soundOceanBtn = document.getElementById('btn-sound-ocean');
  const soundRainBtn = document.getElementById('btn-sound-rain');
  const soundLofiBtn = document.getElementById('btn-sound-lofi');

  if (feedStarBtn) feedStarBtn.addEventListener('click', () => KiroState.feed('star'));
  if (feedDonutBtn) feedDonutBtn.addEventListener('click', () => KiroState.feed('donut'));
  if (drinkWaterBtn) drinkWaterBtn.addEventListener('click', () => KiroState.drinkWater());
  if (mailboxNavBtn) mailboxNavBtn.addEventListener('click', () => messenger?.open());

  // Settings Modal Handlers
  const settingsModal = document.getElementById('settings-modal');
  if (settingsNavBtn) {
    settingsNavBtn.addEventListener('click', () => {
      const verBadge = document.getElementById('settings-current-ver-badge');
      const verVal = document.getElementById('settings-val-version');
      const cur = KiroState.get('installedVersion');
      if (verBadge) verBadge.textContent = cur.startsWith('v') ? cur : `v${cur}`;
      if (verVal) verVal.textContent = cur.startsWith('v') ? cur : `v${cur}`;
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

  if (gyroToggleBtn) {
    gyroToggleBtn.addEventListener('click', () => {
      const current = KiroState.get('gyroEnabled');
      KiroState.setGyro(!current);
      gyroToggleBtn.classList.toggle('active', !current);
      gyroToggleBtn.textContent = !current ? 'ON' : 'OFF';
    });
  }

  // Procedural Sound Toggles
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

  // Sleep Mode Long-Press Switch
  const sleepBtn = document.getElementById('sleep-switch-btn');
  const sleepProgress = document.getElementById('sleep-switch-progress');
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
          sleepBtn.querySelector('.btn-text').innerHTML = isSleeping 
            ? '<svg class="inline-svg-icon spark-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/></svg> Wake Kiro' 
            : '<svg class="inline-svg-icon moon-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.5-11.5 10.4 10.4 0 0 1-9.6-8.3z"/></svg> Hold to Sleep';
          document.getElementById('app-ui').classList.toggle('dissipated', isSleeping);
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
});
