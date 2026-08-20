/**
 * mailbox.js (StarlightMessenger V3)
 * Full-featured Starlight Messenger and WebRTC interface for Patrick & Yangiee.
 * Supports Discord-style emojis, inline base64 image sending, voice notes, and screen sharing preview.
 */

import { KiroState } from '../state.js';
import { synthEngine } from '../audio/synth.js';

const DISCORD_EMOJIS = ["✨", "💖", "🌙", "🛸", "🍬", "🐱", "👨‍🚀", "🍩", "🔋", "🪐"];

const SVGS = {
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
      <circle cx="12" cy="12" r="10" stroke="#FFB6C1" stroke-width="1.5" fill="rgba(255, 182, 193, 0.15)"/>
      <path d="M7 10L6 6L10.5 7.5M17 10L18 6L13.5 7.5" stroke="#FFB6C1" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6 11.5C6 15 8.68 17.5 12 17.5C15.32 17.5 18 15 18 11.5C18 8.46 15.32 8 12 8C8.68 8 6 8.46 6 11.5Z" fill="#FFB6C1"/>
      <circle cx="10" cy="11" r="0.8" fill="#1B2A38"/>
      <circle cx="14" cy="11" r="0.8" fill="#1B2A38"/>
    </svg>
  `,
  send: `
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
  `
};

export class StarlightMessenger {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    if (!this.overlay) return;

    this.currentSender = KiroState.get('persona') || 'patrick';
    this.messages = [];
    this.isRecording = false;
    this.recordStartTime = 0;
    this.localScreenStream = null;

    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
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
            <div class="mailbox-sub">
              <svg class="inline-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 7l5 5m-2-7l4 4-1.5 1.5L14.5 6 16 4.5zM2 22l6-6m2-2l4-4-5-5-4 4 5 5z"/></svg>
              Under the same sky • 938 km apart
            </div>
          </div>
          <button class="settings-close-btn" id="mailbox-close-btn" aria-label="Close Mailbox">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- WebRTC Screen Share Picture-In-Picture Overlay Panel -->
        <div id="webrtc-pip-panel" style="display:none; position:relative; background:rgba(0,0,0,0.4); border-bottom:1px solid rgba(148,226,213,0.2); width:100%; height:130px; overflow:hidden; border-radius: 8px; margin: 4px 0;">
          <video id="pip-video-preview" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover;"></video>
          <div style="position:absolute; top:8px; right:8px; display:flex; gap:0.4rem;">
            <button id="webrtc-close-share" style="padding:4px 8px; border-radius:6px; border:none; background:rgba(235,77,75,0.85); color:#FFF; font-size:11px; font-weight:700; cursor:pointer;" title="Stop Broadcast">❌ Stop</button>
          </div>
        </div>

        <div class="mailbox-feed" id="mailbox-feed"></div>

        <!-- Custom Discord-style Emojis Quick Bar -->
        <div class="emoji-quick-bar" style="display:flex; gap:6px; overflow-x:auto; padding:6px 0; border-top:1px solid rgba(255,255,255,0.06);">
          ${DISCORD_EMOJIS.map(emoji => `<span class="emoji-tap-btn" data-emoji="${emoji}" style="cursor:pointer; font-size:18px; padding:2px 5px; border-radius:6px; background:rgba(255,255,255,0.04); transition:all 0.15s ease;">${emoji}</span>`).join('')}
        </div>

        <div class="mailbox-footer">
          <div class="sender-selector">
            <div class="sender-pill patrick-pill ${this.currentSender === 'patrick' ? 'active' : ''}" data-sender="patrick">
              ${SVGS.patrick} Patrick
            </div>
            <div class="sender-pill yangiee-pill ${this.currentSender === 'yangiee' ? 'active' : ''}" data-sender="yangiee">
              ${SVGS.yangiee} Yangiee
            </div>
          </div>

          <div class="input-row" style="display:flex; gap:6px; align-items:center;">
            <!-- Image Picker Button -->
            <button id="attach-img-btn" class="chat-action-btn" title="Send Picture" style="width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              🖼️
              <input type="file" id="attach-img-file" accept="image/*" style="display:none;">
            </button>

            <!-- Voice Message Button -->
            <button id="attach-voice-btn" class="chat-action-btn" title="Hold to record voice note" style="width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              🎤
            </button>

            <!-- WebRTC Screen Share Button -->
            <button id="webrtc-share-btn" class="chat-action-btn" title="Share Screen" style="width:36px; height:36px; border-radius:50%; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.06); color:#FFF; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              🖥️
            </button>

            <input type="text" id="mailbox-input" class="chat-input" placeholder="Whisper something sweet to Yangiee..." autocomplete="off" style="flex:1;">
            
            <button id="mailbox-send-btn" class="send-button" title="Send Note">
              ${SVGS.send}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const input = this.overlay.querySelector('#mailbox-input');
    const sendBtn = this.overlay.querySelector('#mailbox-send-btn');
    const closeBtn = this.overlay.querySelector('#mailbox-close-btn');
    const pills = this.overlay.querySelectorAll('.sender-pill');
    const imgBtn = this.overlay.querySelector('#attach-img-btn');
    const imgInput = this.overlay.querySelector('#attach-img-file');
    const voiceBtn = this.overlay.querySelector('#attach-voice-btn');
    const screenBtn = this.overlay.querySelector('#webrtc-share-btn');
    const closeShareBtn = this.overlay.querySelector('#webrtc-close-share');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (sendBtn) sendBtn.addEventListener('click', () => this.send());
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.send();
      });
    }

    // Discord Emojis Bar
    this.overlay.querySelectorAll('.emoji-tap-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.getAttribute('data-emoji');
        this.addMessageNode(this.currentSender, emoji, 'text');
        synthEngine.playChimeSound(880);
      });
    });

    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentSender = pill.getAttribute('data-sender');
        if (input) {
          input.placeholder = this.currentSender === 'patrick' 
            ? 'Whisper something sweet to Yangiee...' 
            : 'Send an adorable note to Patrick...';
        }
      });
    });

    // Image Picker
    if (imgBtn && imgInput) {
      imgBtn.addEventListener('click', () => imgInput.click());
      imgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          this.addMessageNode(this.currentSender, event.target.result, 'image');
        };
        reader.readAsDataURL(file);
      });
    }

    // Voice Note Recorder
    if (voiceBtn) {
      const startVoice = async (e) => {
        e.preventDefault();
        if (this.isRecording) return;
        this.isRecording = true;
        this.recordStartTime = Date.now();
        voiceBtn.style.background = 'rgba(235, 77, 75, 0.4)';
        const success = await synthEngine.startRecordingVoice();
        if (!success) {
          this.isRecording = false;
          voiceBtn.style.background = 'rgba(255,255,255,0.06)';
        }
      };

      const stopVoice = async () => {
        if (!this.isRecording) return;
        this.isRecording = false;
        voiceBtn.style.background = 'rgba(255,255,255,0.06)';
        const audioUrl = await synthEngine.stopRecordingVoice();
        const duration = Math.round((Date.now() - this.recordStartTime) / 1000);
        if (audioUrl && duration >= 1) {
          this.addMessageNode(this.currentSender, audioUrl, 'audio');
        }
      };

      voiceBtn.addEventListener('mousedown', startVoice);
      voiceBtn.addEventListener('mouseup', stopVoice);
      voiceBtn.addEventListener('mouseleave', stopVoice);
      voiceBtn.addEventListener('touchstart', startVoice, { passive: false });
      voiceBtn.addEventListener('touchend', stopVoice, { passive: true });
    }

    // WebRTC Screen Share
    if (screenBtn) {
      screenBtn.addEventListener('click', () => this.toggleWebRTCScreenShare());
    }
    if (closeShareBtn) {
      closeShareBtn.addEventListener('click', () => this.stopScreenShareStream());
    }

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  }

  async toggleWebRTCScreenShare() {
    const pipPanel = this.overlay.querySelector('#webrtc-pip-panel');
    const video = this.overlay.querySelector('#pip-video-preview');

    if (this.localScreenStream) {
      this.stopScreenShareStream();
      return;
    }

    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      video.srcObject = this.localScreenStream;
      pipPanel.style.display = 'block';
      this.addMessageNode(this.currentSender, "Started live screen broadcast! 🖥️", 'text');
      this.localScreenStream.getVideoTracks()[0].onended = () => this.stopScreenShareStream();
    } catch (err) {
      console.warn("[WebRTC] Screen capture unavailable on device:", err);
    }
  }

  stopScreenShareStream() {
    const pipPanel = this.overlay.querySelector('#webrtc-pip-panel');
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach(track => track.stop());
      this.localScreenStream = null;
    }
    if (pipPanel) pipPanel.style.display = 'none';
  }

  open() {
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

    this.addMessageNode(this.currentSender, text, 'text');
    input.value = '';
  }

  addMessageNode(sender, content, type = 'text') {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (!feed) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    const avatar = sender === 'patrick' ? SVGS.patrick : SVGS.yangiee;

    let contentHTML = '';
    if (type === 'text') {
      contentHTML = `<div class="message-text">${content}</div>`;
    } else if (type === 'image') {
      contentHTML = `<div class="message-media"><img src="${content}" style="width:100%; max-width:180px; border-radius:10px; display:block;"></div>`;
    } else if (type === 'audio') {
      contentHTML = `
        <div class="message-media" style="min-width: 170px;">
          <span style="font-size:10px; display:block; margin-bottom:4px;">🎤 Voice Note</span>
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
      const senderName = sender === 'patrick' ? 'Patrick' : 'Yangiee';
      const preview = type === 'text' ? content : `[Sent a ${type}]`;
      window.AndroidHost.sendNotification(`Note from ${senderName}`, preview);
    }
  }

  scrollToBottom() {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }

  loadMockFeed() {
    this.addMessageNode('patrick', "Hey! Did you see Kiro floating? He looks so happy today.", 'text');
    this.addMessageNode('yangiee', "I know! I fed him a strawberry donut earlier and his sparkles went crazy!", 'text');
    this.addMessageNode('patrick', "Let's steer the telescope towards the Butterfly Galaxy next! 🪐", 'text');
  }
}
