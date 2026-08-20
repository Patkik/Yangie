/**
 * mailbox.js
 * Starlight Messenger UI & Conversational Component (ES6 Module)
 * Inline-SVG avatars, double-tap SVG reactions, and real-time message dispatching.
 */

import { KiroState } from '../state.js';

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
  `,
  reactions: {
    star: `<svg viewBox="0 0 24 24" fill="#F9E2AF" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="#F5C2E7" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="#89B4FA" xmlns="http://www.w3.org/2000/svg"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.5-11.5 10.4 10.4 0 0 1-9.6-8.3z"/></svg>`,
    planet: `<svg viewBox="0 0 24 24" fill="#FAB387" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.67 15.46C12.19 18.23 10.4 18 9 17.15c-2.45-1.5-3.15-4.52-2-6.85 1.15-2.33 3.84-3.45 6.3-2.6.72.25 1.34.66 1.83 1.2.6.66.97 1.49 1.04 2.41a4.992 4.992 0 0 1-2.5 6.15z"/><path d="M3.5 14.5c4.5-2 12.5-2 17 0" stroke="#FFF" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    rocket: `<svg viewBox="0 0 24 24" fill="#A6E3A1" xmlns="http://www.w3.org/2000/svg"><path d="M12 2s-5 3.5-5 10c0 2 1 4 1.5 5h7c.5-1 1.5-3 1.5-5 0-6.5-5-10-5-10zm-1.5 16h3L12 21l-1.5-3zM5 16s-.5 2 1 4 4-1 4-1-1.5-2.5-2-3-3 0-3 0zm14 0s.5 2-1 4-4-1-4-1 1.5-2.5 2-3 3 0 3 0z"/></svg>`
  }
};

export class StarlightMessenger {
  constructor(overlayId) {
    this.overlay = document.getElementById(overlayId);
    if (!this.overlay) return;

    this.currentSender = KiroState.get('persona') || 'patrick';
    this.messages = [];
    this.pickerOpen = false;

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

        <div class="mailbox-feed" id="mailbox-feed"></div>

        <div class="mailbox-footer">
          <div class="sender-selector">
            <div class="sender-pill patrick-pill ${this.currentSender === 'patrick' ? 'active' : ''}" data-sender="patrick">
              ${SVGS.patrick} Patrick
            </div>
            <div class="sender-pill yangiee-pill ${this.currentSender === 'yangiee' ? 'active' : ''}" data-sender="yangiee">
              ${SVGS.yangiee} Yangiee
            </div>
          </div>

          <div class="input-row">
            <input type="text" id="mailbox-input" class="chat-input" placeholder="Whisper something sweet to Yangiee..." autocomplete="off">
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

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (sendBtn) sendBtn.addEventListener('click', () => this.send());
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.send();
      });
    }

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

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
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

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = { id: `m-${Date.now()}`, sender: this.currentSender, content: text, timestamp: time, reactions: [] };
    this.messages.push(msg);
    this.renderRow(msg);

    input.value = '';
    this.scrollToBottom();

    if (window.AndroidHost && typeof window.AndroidHost.sendNotification === 'function') {
      const sender = this.currentSender === 'patrick' ? 'Patrick' : 'Yangiee';
      window.AndroidHost.sendNotification(`Note from ${sender}`, text);
    }
  }

  renderRow(msg) {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (!feed) return;

    const row = document.createElement('div');
    row.className = `message-row ${msg.sender}`;
    row.id = msg.id;

    const avatar = msg.sender === 'patrick' ? SVGS.patrick : SVGS.yangiee;

    row.innerHTML = `
      <div class="avatar-wrapper">${avatar}</div>
      <div class="message-bubble" data-id="${msg.id}">
        <div class="message-text">${msg.content}</div>
        <span class="message-time">${msg.timestamp}</span>
        <div class="reaction-container" style="display: none;"></div>
      </div>
    `;

    feed.appendChild(row);

    const bubble = row.querySelector('.message-bubble');
    bubble.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.openPicker(bubble, msg.id, e.clientX, e.clientY);
    });
  }

  openPicker(bubble, msgId, x, y) {
    this.closePicker();
    this.pickerOpen = true;

    const picker = document.createElement('div');
    picker.className = 'reaction-picker-modal';
    picker.style.left = `${Math.max(10, x - 80)}px`;
    picker.style.top = `${Math.max(10, y - 60)}px`;

    picker.innerHTML = `
      <div class="reaction-option" data-reaction="star">${SVGS.reactions.star}</div>
      <div class="reaction-option" data-reaction="heart">${SVGS.reactions.heart}</div>
      <div class="reaction-option" data-reaction="moon">${SVGS.reactions.moon}</div>
      <div class="reaction-option" data-reaction="planet">${SVGS.reactions.planet}</div>
      <div class="reaction-option" data-reaction="rocket">${SVGS.reactions.rocket}</div>
    `;

    document.body.appendChild(picker);

    picker.querySelectorAll('.reaction-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const type = opt.getAttribute('data-reaction');
        this.react(msgId, type);
        this.closePicker();
      });
    });
  }

  closePicker() {
    const p = document.querySelector('.reaction-picker-modal');
    if (p) p.remove();
    this.pickerOpen = false;
  }

  react(msgId, type) {
    const msg = this.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (msg.reactions.includes(type)) {
      msg.reactions = msg.reactions.filter(r => r !== type);
    } else {
      msg.reactions.push(type);
    }

    const bubble = this.overlay.querySelector(`.message-bubble[data-id="${msgId}"]`);
    if (!bubble) return;

    let badgeBox = bubble.querySelector('.reaction-container');
    if (!badgeBox) {
      badgeBox = document.createElement('div');
      badgeBox.className = 'reaction-container';
      bubble.appendChild(badgeBox);
    }

    if (msg.reactions.length > 0) {
      badgeBox.style.display = 'flex';
      badgeBox.innerHTML = msg.reactions.map(r => `
        <div class="reaction-badge">${SVGS.reactions[r]}</div>
      `).join('');
    } else {
      badgeBox.style.display = 'none';
    }
  }

  scrollToBottom() {
    const feed = this.overlay.querySelector('#mailbox-feed');
    if (feed) feed.scrollTop = feed.scrollHeight;
  }

  loadMockFeed() {
    const welcomes = [
      { id: 'm1', sender: 'patrick', content: "Hey! Did you see Kiro floating? He looks so happy today.", timestamp: "10:14 AM", reactions: ['star'] },
      { id: 'm2', sender: 'yangiee', content: "I know! I fed him a strawberry donut earlier and his sparkles went crazy!", timestamp: "10:15 AM", reactions: ['heart'] },
      { id: 'm3', sender: 'patrick', content: "Let's put on the Lo-Fi synth, I think it's storming over here.", timestamp: "10:16 AM", reactions: ['moon'] }
    ];

    this.messages = welcomes;
    welcomes.forEach(w => {
      this.renderRow(w);
      if (w.reactions.length > 0) {
        w.reactions.forEach(r => this.react(w.id, r));
      }
    });
    this.scrollToBottom();
  }
}
