/**
 * mailbox.js (StarlightMessenger V3 + Starlight Call Engine v1.5.1)
 * ──────────────────────────────────────────────────────────────────────────
 * Full-featured Starlight Messenger and Discord-grade Video Call interface for Patrick & Yangiee.
 * 100% Vector SVG-driven UI & Dynamic Single-Identity Profile Architecture:
 * - When Persona is Patrick ('pat'): Local user is Patrick (You), Partner is Yangiee.
 * - When Persona is Yangiee ('yang'): Local user is Yangiee (You), Partner is Patrick.
 * - Single-Identity locked messaging, directional chat bubbles, and dynamic call labels.
 *
 * Complies with Master Walkthrough Audit v1.2.1 (token normalization via KiroState).
 */

import { KiroState } from '../state.js';
import { synthEngine } from '../audio/synth.js';
import { kiroCallEngine, CallState } from '../rtc/call-engine.js';
import { kiroCryptoEngine } from '../rtc/crypto-engine.js';

const DISCORD_EMOJIS = ["✨", "💖", "🌙", "🛸", "🍬", "🐱", "👨‍🚀", "🍩", "🔋", "🪐"];

export const SVGS = {
  patrick: `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#4EC9B0" stroke-width="1.5" fill="rgba(78, 201, 176, 0.15)"/>
      <rect x="7" y="8" width="10" height="7" rx="3.5" fill="#4EC9B0"/>
      <rect x="8.5" y="9.5" width="7" height="4" rx="2" fill="#1B2A38"/>
      <circle cx="10" cy="11.5" r="1" fill="#FFF" opacity="0.8"/>
    </svg>
  `,
  yangiee: `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#F5B7C0" stroke-width="1.5" fill="rgba(245, 183, 192, 0.15)"/>
      <path d="M7 10L6 6L10.5 7.5M17 10L18 6L13.5 7.5" stroke="#F5B7C0" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6 11.5C6 15 8.68 17.5 12 17.5C15.32 17.5 18 15 18 11.5C18 8.46 15.32 8 12 8C8.68 8 6 8.46 6 11.5Z" fill="#F5B7C0"/>
      <circle cx="10" cy="11" r="0.8" fill="#1B2A38"/>
      <circle cx="14" cy="11" r="0.8" fill="#1B2A38"/>
    </svg>
  `,
  send: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  `,
  image: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" ry="4"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  `,
  mic: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  `,
  micMuted: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  `,
  camera: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 7l-7 5 7 5V7z"/>
      <rect x="1" y="5" width="15" height="14" rx="3" ry="3"/>
    </svg>
  `,
  cameraOff: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M21 21l-3.34-3.34L16 16.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1.5l1-1h5.86l2 2H19a2 2 0 0 1 2 2v6.5l3 3V7l-4.5 3.21"/>
    </svg>
  `,
  phoneCall: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.54a16 16 0 0 0 6.55 6.55l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  `,
  phoneEnd: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
      <line x1="23" y1="1" x2="1" y2="23"/>
    </svg>
  `,
  screenShare: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <polyline points="7 9 12 4 17 9"/>
    </svg>
  `,
  e2eeLock: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <circle cx="12" cy="11" r="1.5" fill="currentColor"/>
    </svg>
  `,
  radarPulse: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 0 1 10 10"/>
      <path d="M12 6a6 6 0 0 1 6 6"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  `
};

export class StarlightMessenger {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    if (!this.overlay) return;

    this.messages = [];
    this.isRecording = false;
    this.recordStartTime = 0;
    this.localScreenStream = null;

    /** @type {boolean} Call UI state trackers */
    this._isMuted     = false;
    this._isCamOff    = false;
    this._isSharing   = false;

    this.syncPersonaProfile();
    this.init();

    // Listen to identity changes across the entire app
    KiroState.on('persona:change', () => this.syncPersonaProfile());
    KiroState.on('change:persona', () => this.syncPersonaProfile());
  }

  syncPersonaProfile() {
    const rawPersona = KiroState.get('persona') || 'pat';
    this.currentPersona = (rawPersona === 'yang' || rawPersona === 'yangiee') ? 'yang' : 'pat';
    this.localUser      = this.currentPersona === 'pat' ? 'patrick' : 'yangiee';
    this.partnerUser    = this.currentPersona === 'pat' ? 'yangiee' : 'patrick';
    this.localName      = this.currentPersona === 'pat' ? 'Patrick' : 'Yangiee';
    this.partnerName    = this.currentPersona === 'pat' ? 'Yangiee' : 'Patrick';
    this.currentSender  = this.localUser;

    this.updateProfileUI();
  }

  init() {
    this.render();
    this.bindEvents();
    this._initCallEngine();
    this.loadMockFeed();
  }

  render() {
    this.overlay.innerHTML = `
      <div class="mailbox-card">
        <div class="mailbox-header">
          <div class="mailbox-title-col">
            <div class="mailbox-title">
              Starlight Mailbox
              <div class="connection-dot"></div>
            </div>
            <div class="mailbox-sub" id="mailbox-connection-sub">
              <svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
              Celestial Telemetry • Connected with ${this.partnerName} • 938 km apart
            </div>
          </div>
          <button class="settings-close-btn" id="mailbox-close-btn" aria-label="Close Mailbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Call Session Panel (full-chrome video call UI, hidden when no call) -->
        <div id="call-session-panel" style="display:none; position:relative; background:rgba(3,7,18,0.88); border-bottom:1px solid rgba(148,226,213,0.2); width:100%; border-radius:16px; margin:4px 0; overflow:hidden;">

          <!-- Remote Video Full-Bleed -->
          <div style="position:relative; width:100%; height:200px; background:#060d18;">
            <video id="call-remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>

            <!-- Remote Placeholder (shown when no remote stream) -->
            <div id="call-remote-placeholder" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;">
              <div class="call-awaiting-ring">
                <div class="call-awaiting-ring-inner">
                  ${SVGS.radarPulse}
                </div>
              </div>
              <span id="call-status-badge" class="call-status-badge idle">IDLE</span>
              <span id="call-remote-name-label" style="font-size:10px; color:#A6ADC8; font-weight:600; text-transform:uppercase;">Awaiting ${this.partnerName}…</span>
            </div>

            <!-- Self-View PiP Bubble -->
            <div class="call-self-pip">
              <video id="call-self-video" autoplay playsinline muted style="width:100%;height:100%;object-fit:cover;display:block;transform:scaleX(-1);"></video>
              <div class="call-self-label" id="call-self-label">${this.localName} (You)</div>
            </div>

            <!-- E2EE Lock Badge -->
            <div id="call-e2ee-badge" class="e2ee-badge" style="position:absolute;top:10px;left:10px;">
              <span class="lock-icon">${SVGS.e2eeLock}</span>
              <span>ZERO-TRUST E2EE</span>
            </div>
          </div>

          <!-- Call HUD Controls -->
          <div class="call-hud" style="padding:10px 16px 12px;background:rgba(6,13,24,0.92);display:flex;align-items:center;justify-content:center;gap:12px;">
            <div class="call-hud-label-group">
              <button id="call-btn-mute" class="call-hud-btn" title="Mute Microphone">${SVGS.mic}</button>
              <span class="call-hud-label">Mute</span>
            </div>
            <div class="call-hud-label-group">
              <button id="call-btn-camera" class="call-hud-btn" title="Toggle Camera">${SVGS.camera}</button>
              <span class="call-hud-label">Camera</span>
            </div>
            <div class="call-hud-label-group">
              <button id="call-btn-end" class="call-hud-btn end-call-btn" title="End Call">${SVGS.phoneEnd}</button>
              <span class="call-hud-label">End</span>
            </div>
            <div class="call-hud-label-group">
              <button id="call-btn-screen" class="call-hud-btn" title="Share Screen">${SVGS.screenShare}</button>
              <span class="call-hud-label">Screen</span>
            </div>
            <div class="call-hud-label-group">
              <button id="call-btn-answer" class="call-hud-btn" title="Answer Incoming Call" style="background:rgba(78,201,176,0.22);border-color:rgba(78,201,176,0.5);">${SVGS.phoneCall}</button>
              <span class="call-hud-label">Answer</span>
            </div>
          </div>
        </div>

        <div class="mailbox-feed" id="mailbox-feed"></div>

        <!-- Custom Discord-style Emojis Quick Bar -->
        <div class="emoji-quick-bar" style="display:flex; gap:6px; overflow-x:auto; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06);">
          ${DISCORD_EMOJIS.map(emoji => `<span class="emoji-tap-btn" data-emoji="${emoji}" style="cursor:pointer; font-size:18px; padding:3px 6px; border-radius:8px; background:rgba(255,255,255,0.05); transition:all 0.15s ease;">${emoji}</span>`).join('')}
        </div>

        <div class="mailbox-footer">
          <!-- Exclusive Locked Single-Identity Badge (No 2 Pats or 2 Yangs) -->
          <div class="single-identity-indicator">
            <div class="active-identity-badge ${this.currentPersona === 'pat' ? 'patrick' : 'yangiee'}" id="mailbox-identity-badge">
              ${this.currentPersona === 'pat' ? SVGS.patrick : SVGS.yangiee}
              <span id="mailbox-identity-label">You: ${this.localName}</span>
            </div>
          </div>

          <div class="input-row" style="display:flex; gap:8px; align-items:center;">
            <!-- Image Picker Button -->
            <button id="attach-img-btn" class="chat-action-btn" title="Send Picture" style="width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              ${SVGS.image}
              <input type="file" id="attach-img-file" accept="image/*" style="display:none;">
            </button>

            <!-- Voice Message Button -->
            <button id="attach-voice-btn" class="chat-action-btn" title="Hold to record voice note" style="width:38px; height:38px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              ${SVGS.mic}
            </button>

            <!-- Start Call Button -->
            <button id="mailbox-call-btn" class="chat-action-btn" title="Start Video Call" style="width:38px; height:38px; border-radius:50%; border:1px solid rgba(148,226,213,0.4); background:rgba(148,226,213,0.12); color:#4EC9B0; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              ${SVGS.phoneCall}
            </button>

            <input type="text" id="mailbox-input" class="chat-input" placeholder="${this.currentPersona === 'pat' ? 'Whisper something sweet to Yangiee...' : 'Send an adorable note to Patrick...'}" autocomplete="off" style="flex:1;">
            
            <button id="mailbox-send-btn" class="send-button" title="Send Note">
              ${SVGS.send}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  updateProfileUI() {
    if (!this.overlay) return;

    const subEl = this.overlay.querySelector('#mailbox-connection-sub');
    if (subEl) {
      subEl.innerHTML = `
        <svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
        Celestial Telemetry • Connected with ${this.partnerName} • 938 km apart
      `;
    }

    const badgeEl = this.overlay.querySelector('#mailbox-identity-badge');
    if (badgeEl) {
      badgeEl.className = `active-identity-badge ${this.currentPersona === 'pat' ? 'patrick' : 'yangiee'}`;
      badgeEl.innerHTML = `
        ${this.currentPersona === 'pat' ? SVGS.patrick : SVGS.yangiee}
        <span id="mailbox-identity-label">You: ${this.localName}</span>
      `;
    }

    const inputEl = this.overlay.querySelector('#mailbox-input');
    if (inputEl) {
      inputEl.placeholder = this.currentPersona === 'pat'
        ? 'Whisper something sweet to Yangiee...'
        : 'Send an adorable note to Patrick...';
    }

    const selfLabel = this.overlay.querySelector('#call-self-label');
    if (selfLabel) selfLabel.textContent = `${this.localName} (You)`;

    const remoteLabel = this.overlay.querySelector('#call-remote-name-label');
    if (remoteLabel) remoteLabel.textContent = `Awaiting ${this.partnerName}…`;
  }

  bindEvents() {
    const input      = this.overlay.querySelector('#mailbox-input');
    const sendBtn    = this.overlay.querySelector('#mailbox-send-btn');
    const closeBtn   = this.overlay.querySelector('#mailbox-close-btn');
    const imgBtn     = this.overlay.querySelector('#attach-img-btn');
    const imgInput   = this.overlay.querySelector('#attach-img-file');
    const voiceBtn   = this.overlay.querySelector('#attach-voice-btn');
    const callBtn    = this.overlay.querySelector('#mailbox-call-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (sendBtn)  sendBtn.addEventListener('click',  () => this.send());
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.send();
      });
    }

    // Discord Emojis Bar
    this.overlay.querySelectorAll('.emoji-tap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        this.addMessageNode(this.localUser, emoji, 'text');
        synthEngine.playChimeSound(880);
      });
    });

    // Image Picker
    if (imgBtn && imgInput) {
      imgBtn.addEventListener('click', () => imgInput.click());
      imgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => this.addMessageNode(this.localUser, ev.target.result, 'image');
        reader.readAsDataURL(file);
      });
    }

    // Voice Note Recorder (press-and-hold)
    if (voiceBtn) {
      const startVoice = async (e) => {
        e.preventDefault();
        if (this.isRecording) return;
        this.isRecording = true;
        this.recordStartTime = Date.now();
        voiceBtn.style.background = 'rgba(235, 77, 75, 0.4)';
        const success = await synthEngine.startRecordingVoice();
        if (!success) { this.isRecording = false; voiceBtn.style.background = 'rgba(255,255,255,0.06)'; }
      };
      const stopVoice = async () => {
        if (!this.isRecording) return;
        this.isRecording = false;
        voiceBtn.style.background = 'rgba(255,255,255,0.06)';
        const audioUrl = await synthEngine.stopRecordingVoice();
        const duration = Math.round((Date.now() - this.recordStartTime) / 1000);
        if (audioUrl && duration >= 1) this.addMessageNode(this.localUser, audioUrl, 'audio');
      };
      voiceBtn.addEventListener('mousedown',  startVoice);
      voiceBtn.addEventListener('mouseup',    stopVoice);
      voiceBtn.addEventListener('mouseleave', stopVoice);
      voiceBtn.addEventListener('touchstart', startVoice, { passive: false });
      voiceBtn.addEventListener('touchend',   stopVoice,  { passive: true  });
    }

    // Call Panel HUD buttons
    const bindHud = (id, fn) => {
      const el = this.overlay.querySelector(id);
      if (el) el.addEventListener('click', fn);
    };
    bindHud('#call-btn-mute',   () => this._onMuteToggle());
    bindHud('#call-btn-camera', () => this._onCameraToggle());
    bindHud('#call-btn-end',    () => this._onEndCall());
    bindHud('#call-btn-screen', () => this._onScreenShare());
    bindHud('#call-btn-answer', () => this._onAnswerCall());

    // Start call button in messenger footer
    if (callBtn) callBtn.addEventListener('click', () => this._onStartCall());

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Call Engine Initialization
  // ──────────────────────────────────────────────────────────────────────────

  _initCallEngine() {
    kiroCallEngine.setCallbacks({
      onStateChange: (state) => this._onCallStateChange(state),
      onLocalStream:  (stream) => this._onLocalStream(stream),
      onRemoteStream: (stream) => this._onRemoteStream(stream),
      onError: (msg, err) => {
        console.error('[Messenger] Call error:', msg, err);
        this.addMessageNode(this.localUser, `Call error: ${msg}`, 'text');
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Call HUD Button Handlers
  // ──────────────────────────────────────────────────────────────────────────

  async _onStartCall() {
    const panel = this.overlay.querySelector('#call-session-panel');
    if (panel) panel.style.display = 'block';

    await kiroCryptoEngine.generateEpochKeyPair();
    kiroCallEngine.cryptoEngine = kiroCryptoEngine;

    await kiroCallEngine.startCall({ video: true, audio: true });
    this.addMessageNode(this.localUser, `Initiating Starlight Video Call with ${this.partnerName}…`, 'text');
    synthEngine.playChimeSound(660);
  }

  async _onAnswerCall() {
    const panel = this.overlay.querySelector('#call-session-panel');
    if (panel) panel.style.display = 'block';

    await kiroCryptoEngine.generateEpochKeyPair();
    kiroCallEngine.cryptoEngine = kiroCryptoEngine;

    await kiroCallEngine.answerCall({ video: true, audio: true });
    this.addMessageNode(this.localUser, `Answering incoming call from ${this.partnerName}…`, 'text');
    synthEngine.playChimeSound(770);
  }

  _onEndCall() {
    kiroCallEngine.endCall();
    kiroCryptoEngine.reset();
    this._isMuted  = false;
    this._isCamOff = false;
    this._isSharing = false;

    const panel = this.overlay.querySelector('#call-session-panel');
    if (panel) setTimeout(() => { panel.style.display = 'none'; }, 1200);

    this.addMessageNode(this.localUser, 'Call ended.', 'text');
    synthEngine.playChimeSound(330);
  }

  _onMuteToggle() {
    this._isMuted = kiroCallEngine.toggleMute();
    const btn = this.overlay.querySelector('#call-btn-mute');
    if (btn) {
      btn.innerHTML = this._isMuted ? SVGS.micMuted : SVGS.mic;
      btn.classList.toggle('active-red', this._isMuted);
    }
  }

  _onCameraToggle() {
    this._isCamOff = kiroCallEngine.toggleCamera();
    const btn = this.overlay.querySelector('#call-btn-camera');
    if (btn) {
      btn.innerHTML = this._isCamOff ? SVGS.cameraOff : SVGS.camera;
      btn.classList.toggle('active-red', this._isCamOff);
    }
  }

  async _onScreenShare() {
    if (this._isSharing) {
      await kiroCallEngine.stopScreenShare();
      this._isSharing = false;
      const btn = this.overlay.querySelector('#call-btn-screen');
      if (btn) { btn.innerHTML = SVGS.screenShare; btn.classList.remove('active-red'); }
      this.addMessageNode(this.localUser, 'Screen sharing stopped.', 'text');
    } else {
      const stream = await kiroCallEngine.startScreenShare();
      if (stream) {
        this._isSharing = true;
        const btn = this.overlay.querySelector('#call-btn-screen');
        if (btn) { btn.innerHTML = SVGS.screenShare; btn.classList.add('active-red'); }
        this.addMessageNode(this.localUser, 'Started screen broadcast.', 'text');
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Call Engine Callbacks
  // ──────────────────────────────────────────────────────────────────────────

  _onCallStateChange(state) {
    const badge       = this.overlay.querySelector('#call-status-badge');
    const placeholder = this.overlay.querySelector('#call-remote-placeholder');

    if (!badge) return;

    const labels = {
      [CallState.IDLE]:              'IDLE',
      [CallState.AWAITING_ENDPOINT]: `AWAITING ${this.partnerName.toUpperCase()}`,
      [CallState.NEGOTIATING]:       'NEGOTIATING',
      [CallState.CONNECTED]:         'VOICE CONNECTED',
      [CallState.ENDED]:             'CALL ENDED',
    };
    const cssClass = state.toLowerCase().replace('_', '-');

    badge.textContent = labels[state] || state;
    badge.className = `call-status-badge ${cssClass}`;

    if (placeholder) {
      placeholder.style.display = (state === CallState.CONNECTED) ? 'none' : 'flex';
    }

    // Show E2EE badge on connection if crypto is active
    if (state === CallState.CONNECTED && kiroCryptoEngine.isEncrypted) {
      const e2eeBadge = this.overlay.querySelector('#call-e2ee-badge');
      if (e2eeBadge) e2eeBadge.classList.add('visible');
    }
  }

  _onLocalStream(stream) {
    const selfVideo = this.overlay.querySelector('#call-self-video');
    if (selfVideo) {
      selfVideo.srcObject = stream;
      selfVideo.play().catch(() => {});
    }
  }

  _onRemoteStream(stream) {
    const remoteVideo = this.overlay.querySelector('#call-remote-video');
    if (remoteVideo) {
      remoteVideo.srcObject = stream;
      remoteVideo.play().catch(() => {});
    }
  }

  open() {
    this.syncPersonaProfile();
    this.overlay.classList.add('open');
  }

  close() {
    this.overlay.classList.remove('open');
  }

  send() {
    const input = this.overlay.querySelector('#mailbox-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    this.addMessageNode(this.localUser, text, 'text');
    input.value = '';
  }

  addMessageNode(sender, content, type = 'text') {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (!feed) return;

    const normSender = (sender === 'yang' || sender === 'yangiee') ? 'yangiee' : 'patrick';
    const isOutgoing = (normSender === this.localUser);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'} ${normSender}`;

    const avatar = normSender === 'patrick' ? SVGS.patrick : SVGS.yangiee;

    let contentHTML = '';
    if (type === 'text') {
      contentHTML = `<div class="message-text">${content}</div>`;
    } else if (type === 'image') {
      contentHTML = `<div class="message-media"><img src="${content}" style="width:100%; max-width:180px; border-radius:10px; display:block;"></div>`;
    } else if (type === 'audio') {
      contentHTML = `
        <div class="message-media" style="min-width: 170px;">
          <span style="font-size:10px; display:flex; align-items:center; gap:4px; margin-bottom:4px;">
            ${SVGS.mic} Voice Note
          </span>
          <audio src="${content}" controls style="width:100%; height:30px; outline:none; filter: invert(0.85);"></audio>
        </div>`;
    }

    row.innerHTML = `
      <div class="avatar-wrapper">${avatar}</div>
      <div class="message-bubble">
        ${contentHTML}
        <span class="message-time">${time}</span>
      </div>
    `;

    feed.appendChild(row);
    this.scrollToBottom();

    if (window.AndroidHost && typeof window.AndroidHost.sendNotification === 'function') {
      const senderName = normSender === 'patrick' ? 'Patrick' : 'Yangiee';
      const preview = type === 'text' ? content : `[Sent a ${type}]`;
      window.AndroidHost.sendNotification(`Note from ${senderName}`, preview);
    }
  }

  scrollToBottom() {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }

  loadMockFeed() {
    this.addMessageNode('patrick', "Did you see Kiro floating across the nebula? He looks so happy today.", 'text');
    this.addMessageNode('yangiee', "I fed him a star treat earlier and his sparkles went into high gear!", 'text');
  }
}
