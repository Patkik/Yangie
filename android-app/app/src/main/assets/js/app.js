/**
 * app.js
 * Core Application Lifecycle, Native AndroidHost Bridge, and Advanced App Updater.
 *
 * Provides bidirectional communication with Kotlin native container,
 * live OTA/APK progress tracking, in-settings updater hooks, and standalone web fallbacks.
 */

// ============================================================================
// 1. Native Notification & Lifecycle Hooks
// ============================================================================

function sendNativeNotification(title, message) {
  if (window.AndroidHost && typeof window.AndroidHost.sendNotification === 'function') {
    try {
      window.AndroidHost.sendNotification(title, message);
    } catch (e) {
      console.warn('Native notification bridge error:', e);
    }
  } else {
    console.log(`[Bridge Simulation] Notification Triggered:\nTitle: ${title}\nMessage: ${message}`);
  }
}

window.appLifecycle = {
  isPaused: false,

  pauseGame: function () {
    this.isPaused = true;
    console.log('[Lifecycle] App minimized: Suspending WebGL and audio rendering.');
    if (window.synthEngine) {
      window.synthEngine.stopAll();
    }
  },

  resumeGame: function () {
    this.isPaused = false;
    console.log('[Lifecycle] App resumed: Restoring WebGL and audio state.');
    if (window.kiroSceneInstance) {
      window.kiroSceneInstance.resize();
    }
  }
};

function onKiroWellRested() {
  sendNativeNotification(
    "Kiro feels amazing! ✨",
    "Kiro is sparkling with a sweet golden aura. Come say hello!"
  );
}

function checkKiroVitals(food, water) {
  if (food <= 10) {
    sendNativeNotification(
      "Tummy Grumbles! 🍬",
      "Kiro is feeling hungry... Feed them some sweet space star candies!"
    );
  } else if (water <= 10) {
    sendNativeNotification(
      "Thirsty Kiro! 💧",
      "Kiro needs some refreshing water! Give them a drink."
    );
  }
}

// ============================================================================
// 2. Advanced App Updater Client (Settings & In-App UI Integration)
// ============================================================================

window.AppUpdater = {
  repoOwner: 'Patkik',
  repoName: 'Yangie',
  currentState: 'IDLE',
  latestRelease: null,

  isNative: function () {
    return Boolean(window.AndroidHost && typeof window.AndroidHost.checkForUpdates === 'function');
  },

  getVersionInfo: function () {
    if (this.isNative() && typeof window.AndroidHost.getAppVersionInfo === 'function') {
      try {
        return JSON.parse(window.AndroidHost.getAppVersionInfo());
      } catch (e) {
        console.warn('Failed parsing native version info:', e);
      }
    }
    return {
      currentVersion: localStorage.getItem('gn_installed_version') || '1.0.5',
      isUsingOta: false,
      nativeVersion: '1.0.0',
      defaultRepo: `${this.repoOwner}/${this.repoName}`
    };
  },

  checkForUpdates: function (force = true) {
    if (this.isNative()) {
      if (typeof showPopToast === 'function') {
        showPopToast('Checking for celestial updates… 🌌', 2500);
      }
      window.AndroidHost.checkForUpdates(force);
      return;
    }

    // Web-only fallback check via GitHub Releases API
    this.checkWebUpdates(force);
  },

  performFullOneClickUpdate: function () {
    if (this.isNative() && typeof window.AndroidHost.performDirectUpdate === 'function') {
      if (typeof showPopToast === 'function') {
        showPopToast('Checking & downloading latest update… ⚡', 3000);
      }
      window.AndroidHost.performDirectUpdate();
    } else if (this.isNative() && typeof window.AndroidHost.startOtaUpdate === 'function') {
      window.AndroidHost.startOtaUpdate();
    } else {
      this.checkWebUpdates(true);
    }
  },

  checkWebUpdates: async function (force = false) {
    if (typeof showPopToast === 'function') {
      showPopToast('Checking GitHub Releases… 🔄', 2500);
    }
    try {
      const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/releases/latest?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const release = await res.json();
      
      const currentVer = (localStorage.getItem('gn_installed_version') || '1.0.5').replace(/^v/i, '');
      const remoteVer = (release.tag_name || '1.0.0').replace(/^v/i, '');

      if (remoteVer !== currentVer || force) {
        this.latestRelease = release;
        this.showUpdateModal({
          tagName: release.tag_name,
          title: release.name || release.tag_name,
          releaseNotes: release.body || 'New celestial update available.',
          hasOta: true,
          hasApk: Array.isArray(release.assets) && release.assets.some(a => a.name.endsWith('.apk'))
        });
      } else {
        if (typeof showPopToast === 'function') {
          showPopToast(`You are on the latest version (v${currentVer}) ✨`, 3000);
        }
      }
    } catch (e) {
      console.warn('Web update check error:', e);
      if (typeof showPopToast === 'function') {
        showPopToast('Could not reach GitHub Releases', 3000);
      }
    }
  },

  startOtaUpdate: function () {
    if (this.isNative() && typeof window.AndroidHost.startOtaUpdate === 'function') {
      window.AndroidHost.startOtaUpdate();
    } else {
      // Standalone web cache clear and reload
      this.simulateWebUpdate();
    }
  },

  startApkUpdate: function () {
    if (this.isNative() && typeof window.AndroidHost.startApkUpdate === 'function') {
      window.AndroidHost.startApkUpdate();
    } else if (this.latestRelease?.html_url) {
      window.open(this.latestRelease.html_url, '_blank');
    }
  },

  applyOtaAndReload: function () {
    if (this.isNative() && typeof window.AndroidHost.applyUpdateAndReload === 'function') {
      window.AndroidHost.applyUpdateAndReload();
    } else {
      window.location.reload(true);
    }
  },

  rollbackToBundled: function () {
    if (this.isNative() && typeof window.AndroidHost.clearOtaUpdates === 'function') {
      window.AndroidHost.clearOtaUpdates();
    } else {
      localStorage.clear();
      window.location.reload(true);
    }
  },

  simulateWebUpdate: async function () {
    this.onNativeEvent({
      type: 'DOWNLOADING',
      target: 'Web Assets',
      progress: { percent: 45, bytesRead: 1450000, totalBytes: 3200000, speedBytesPerSec: 524000 }
    });

    setTimeout(async () => {
      if ('caches' in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        } catch (e) {}
      }
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let r of regs) await r.unregister();
        } catch (e) {}
      }
      if (this.latestRelease?.tag_name) {
        localStorage.setItem('gn_installed_version', this.latestRelease.tag_name);
      }
      this.onNativeEvent({
        type: 'OTA_READY',
        version: this.latestRelease?.tag_name || '1.0.6',
        releaseNotes: 'Web caches refreshed successfully.'
      });
    }, 1200);
  },

  // ==========================================
  // Native Event Handler Dispatcher
  // ==========================================

  onNativeEvent: function (event) {
    console.log('[AppUpdater Event]', event);
    this.currentState = event.type;

    const sBanner = document.getElementById('settings-status-banner');
    const sProgressBox = document.getElementById('settings-progress-box');

    switch (event.type) {
      case 'CHECKING':
        this.updateModalState('checking', 'Connecting to GitHub Releases…');
        if (sBanner) sBanner.textContent = 'Connecting to GitHub Releases… 🔄';
        break;

      case 'AVAILABLE':
        this.latestRelease = event.release;
        if (sBanner) sBanner.textContent = `New update ${event.release.tagName || ''} available! Tap Update Sanctuary Now to install.`;
        this.showUpdateModal(event.release);
        break;

      case 'UP_TO_DATE':
        if (typeof showPopToast === 'function') {
          showPopToast(`App is fully up-to-date (${event.currentVersion}) ✨`, 3000);
        }
        if (sBanner) sBanner.textContent = `App is up-to-date (${event.currentVersion}) ✨`;
        if (sProgressBox) sProgressBox.style.display = 'none';
        this.hideUpdateModal();
        break;

      case 'DOWNLOADING':
        this.updateDownloadProgress(event.target, event.progress);
        break;

      case 'EXTRACTING':
        this.updateModalState('extracting', 'Unpacking celestial assets & validating integrity…');
        if (sBanner) sBanner.textContent = 'Extracting and verifying celestial assets… ✨';
        break;

      case 'OTA_READY':
        if (sBanner) sBanner.textContent = `Update ${event.version} installed! Reloading sanctuary… ✨`;
        this.showReadyState(event.version, event.releaseNotes, 'ota');
        break;

      case 'APK_READY':
        if (sBanner) sBanner.textContent = `APK ${event.version} downloaded! Launching installer…`;
        this.showReadyState(event.version, '', 'apk');
        break;

      case 'ERROR':
        if (sBanner) sBanner.textContent = `Update check notice: ${event.message}`;
        if (sProgressBox) sProgressBox.style.display = 'none';
        this.showErrorState(event.message || 'An error occurred during update.');
        break;
    }
  },

  // ==========================================
  // UI Modal Rendering & Management
  // ==========================================

  ensureModalElements: function () {
    let modal = document.getElementById('updater-dialog-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'updater-dialog-overlay';
      modal.className = 'updater-overlay';
      modal.innerHTML = `
        <div class="updater-card">
          <div class="updater-glow-header">
            <div class="updater-icon-ring">✨</div>
            <div class="updater-title-col">
              <span class="updater-badge" id="updater-version-badge">v1.0.6</span>
              <h3 class="updater-title" id="updater-headline">Celestial Update Available</h3>
            </div>
            <button class="updater-close-btn" id="updater-close-btn" title="Dismiss">✕</button>
          </div>

          <div class="updater-body" id="updater-body">
            <div class="updater-notes-box" id="updater-notes-box">
              <div class="updater-notes-title">Release Notes</div>
              <div class="updater-notes-text" id="updater-notes-text">Loading release details…</div>
            </div>

            <!-- Progress section (hidden by default) -->
            <div class="updater-progress-wrap" id="updater-progress-wrap" style="display: none;">
              <div class="updater-progress-meta">
                <span id="updater-progress-target">Downloading…</span>
                <span id="updater-progress-stats">0%</span>
              </div>
              <div class="updater-progress-bar-track">
                <div class="updater-progress-bar-fill" id="updater-progress-bar-fill"></div>
              </div>
              <div class="updater-speed-text" id="updater-speed-text">0 KB/s</div>
            </div>

            <!-- Action buttons -->
            <div class="updater-actions" id="updater-actions">
              <button class="updater-btn updater-btn-primary" id="updater-btn-ota">
                <span>⚡ Quick OTA Update</span>
                <small>Instant reload</small>
              </button>
              <button class="updater-btn updater-btn-secondary" id="updater-btn-apk">
                <span>📦 Install APK Binary</span>
                <small>Native package</small>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('updater-close-btn').addEventListener('click', () => this.hideUpdateModal());
      document.getElementById('updater-btn-ota').addEventListener('click', () => this.startOtaUpdate());
      document.getElementById('updater-btn-apk').addEventListener('click', () => this.startApkUpdate());
    }
    return modal;
  },

  showUpdateModal: function (release) {
    const modal = this.ensureModalElements();
    const badge = document.getElementById('updater-version-badge');
    const headline = document.getElementById('updater-headline');
    const notesText = document.getElementById('updater-notes-text');
    const progressWrap = document.getElementById('updater-progress-wrap');
    const actions = document.getElementById('updater-actions');
    const btnApk = document.getElementById('updater-btn-apk');

    if (badge) badge.textContent = release.tagName || 'NEW';
    if (headline) headline.textContent = release.title || 'Celestial Update Ready';
    if (notesText) {
      notesText.textContent = release.releaseNotes || 'Updated celestial sanctuary assets and logic.';
    }

    if (btnApk) {
      btnApk.style.display = release.hasApk ? 'flex' : 'none';
    }

    if (progressWrap) progressWrap.style.display = 'none';
    if (actions) actions.style.display = 'flex';

    modal.classList.add('visible');
  },

  hideUpdateModal: function () {
    const modal = document.getElementById('updater-dialog-overlay');
    if (modal) modal.classList.remove('visible');
  },

  updateModalState: function (stateKey, message) {
    this.ensureModalElements();
    const notesText = document.getElementById('updater-notes-text');
    if (notesText) notesText.textContent = message;
  },

  updateDownloadProgress: function (target, progress) {
    this.ensureModalElements();
    const progressWrap = document.getElementById('updater-progress-wrap');
    const targetEl = document.getElementById('updater-progress-target');
    const statsEl = document.getElementById('updater-progress-stats');
    const fillEl = document.getElementById('updater-progress-bar-fill');
    const speedEl = document.getElementById('updater-speed-text');
    const actions = document.getElementById('updater-actions');

    if (actions) actions.style.display = 'none';
    if (progressWrap) progressWrap.style.display = 'block';

    const percent = Math.max(0, Math.min(100, progress.percent >= 0 ? progress.percent : 0));
    if (targetEl) targetEl.textContent = target || 'Downloading update…';
    if (statsEl) statsEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;

    const kbps = (progress.speedBytesPerSec / 1024).toFixed(1);
    const mbRead = (progress.bytesRead / (1024 * 1024)).toFixed(2);
    const mbTotal = progress.totalBytes > 0 ? (progress.totalBytes / (1024 * 1024)).toFixed(2) : '?';

    if (speedEl) {
      speedEl.textContent = `${mbRead} MB / ${mbTotal} MB (${kbps} KB/s)`;
    }

    // Update in Settings modal as well
    const sProgressBox = document.getElementById('settings-progress-box');
    const sTarget = document.getElementById('settings-progress-target');
    const sPct = document.getElementById('settings-progress-pct');
    const sBar = document.getElementById('settings-progress-bar');
    const sSpeed = document.getElementById('settings-progress-speed');
    const sBanner = document.getElementById('settings-status-banner');

    if (sProgressBox) sProgressBox.style.display = 'flex';
    if (sTarget) sTarget.textContent = target || 'Downloading update…';
    if (sPct) sPct.textContent = `${percent}%`;
    if (sBar) sBar.style.width = `${percent}%`;
    if (sSpeed) sSpeed.textContent = `${mbRead} MB / ${mbTotal} MB (${kbps} KB/s)`;
    if (sBanner) sBanner.textContent = `Downloading update: ${percent}% completed. Will reload automatically upon completion.`;
  },

  showReadyState: function (version, notes, type) {
    const modal = this.ensureModalElements();
    const headline = document.getElementById('updater-headline');
    const notesText = document.getElementById('updater-notes-text');
    const progressWrap = document.getElementById('updater-progress-wrap');
    const actions = document.getElementById('updater-actions');

    if (headline) headline.textContent = type === 'apk' ? 'APK Ready to Install' : 'Update Applied ✨';
    if (notesText) {
      notesText.textContent = type === 'apk' 
        ? 'The native APK package has been downloaded. Android Package Installer has been launched.' 
        : `Version ${version} is ready! Tap below to reload the sanctuary.`;
    }

    if (progressWrap) progressWrap.style.display = 'none';
    if (actions) {
      actions.style.display = 'flex';
      actions.innerHTML = `
        <button class="updater-btn updater-btn-primary" id="updater-btn-reload" style="grid-column: 1 / -1;">
          <span>🚀 Reload Sanctuary Now</span>
        </button>
      `;
      document.getElementById('updater-btn-reload').addEventListener('click', () => this.applyOtaAndReload());
    }

    modal.classList.add('visible');
  },

  showErrorState: function (errorMsg) {
    this.ensureModalElements();
    const headline = document.getElementById('updater-headline');
    const notesText = document.getElementById('updater-notes-text');
    const progressWrap = document.getElementById('updater-progress-wrap');
    const actions = document.getElementById('updater-actions');

    if (headline) headline.textContent = 'Update Notice';
    if (notesText) notesText.textContent = `Warning: ${errorMsg}`;
    if (progressWrap) progressWrap.style.display = 'none';

    if (actions) {
      actions.style.display = 'flex';
      actions.innerHTML = `
        <button class="updater-btn updater-btn-secondary" id="updater-btn-retry" style="grid-column: 1 / -1;">
          <span>↺ Try Again</span>
        </button>
      `;
      document.getElementById('updater-btn-retry').addEventListener('click', () => this.checkForUpdates(true));
    }
  }
};

// Global exports
window.sendNativeNotification = sendNativeNotification;
window.onKiroWellRested = onKiroWellRested;
window.checkKiroVitals = checkKiroVitals;
