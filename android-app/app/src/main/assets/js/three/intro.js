/**
 * intro.js
 * Cinematic Lightspeed Warp Sequence & Persona Selection Stage (ES6 Module)
 */

import { KiroState } from '../state.js';

export class KiroIntroManager {
  constructor(overlayId, onCompleteCallback) {
    this.overlay = document.getElementById(overlayId);
    this.onComplete = onCompleteCallback;
    this.selectedPersona = KiroState.get('persona') || 'yangiee';
    this.init();
  }

  init() {
    if (!this.overlay) return;

    // Check if persona already set and not requesting replay
    if (KiroState.get('persona')) {
      this.overlay.classList.add('hidden');
      if (this.onComplete) this.onComplete(KiroState.get('persona'));
      return;
    }

    this.render();
    this.bindEvents();
  }

  render() {
    this.overlay.innerHTML = `
      <div class="intro-content">
        <div class="intro-badge">✨ Starlight Haven v2.0</div>
        <h1 class="intro-title">Welcome to Kiro's Sanctuary</h1>
        <p class="intro-subtitle">Select your celestial persona to calibrate the cockpit dashboard and begin your cosmic journey.</p>
        
        <div class="persona-selection-row">
          <!-- Patrick Card -->
          <div class="persona-card patrick ${this.selectedPersona === 'patrick' ? 'selected' : ''}" data-persona="patrick">
            <div class="persona-avatar">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#4EC9B0" stroke-width="1.5" fill="rgba(78, 201, 176, 0.15)"/>
                <rect x="7" y="8" width="10" height="7" rx="3.5" fill="#4EC9B0"/>
                <rect x="8.5" y="9.5" width="7" height="4" rx="2" fill="#1B2A38"/>
                <circle cx="10" cy="11.5" r="1" fill="#FFF" opacity="0.8"/>
              </svg>
            </div>
            <div class="persona-name">Patrick</div>
            <div class="persona-role">The Anchor • Malaybalay</div>
          </div>

          <!-- Yangiee Card -->
          <div class="persona-card yangiee ${this.selectedPersona === 'yangiee' ? 'selected' : ''}" data-persona="yangiee">
            <div class="persona-avatar">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#FFB6C1" stroke-width="1.5" fill="rgba(255, 182, 193, 0.15)"/>
                <path d="M7 10L6 6L10.5 7.5M17 10L18 6L13.5 7.5" stroke="#FFB6C1" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M6 11.5C6 15 8.68 17.5 12 17.5C15.32 17.5 18 15 18 11.5C18 8.46 15.32 8 12 8C8.68 8 6 8.46 6 11.5Z" fill="#FFB6C1"/>
                <circle cx="10" cy="11" r="0.8" fill="#1B2A38"/>
                <circle cx="14" cy="11" r="0.8" fill="#1B2A38"/>
              </svg>
            </div>
            <div class="persona-name">Yangiee</div>
            <div class="persona-role">The Catalyst • Capas</div>
          </div>
        </div>

        <button class="intro-start-btn" id="intro-enter-btn">
          Enter Space Capsule 🚀
        </button>
      </div>
    `;
  }

  bindEvents() {
    const cards = this.overlay.querySelectorAll('.persona-card');
    const enterBtn = this.overlay.querySelector('#intro-enter-btn');

    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedPersona = card.getAttribute('data-persona');
      });
    });

    if (enterBtn) {
      enterBtn.addEventListener('click', () => {
        KiroState.setPersona(this.selectedPersona);
        this.overlay.classList.add('hidden');
        if (this.onComplete) this.onComplete(this.selectedPersona);
      });
    }
  }

  replay() {
    this.overlay.classList.remove('hidden');
    this.render();
    this.bindEvents();
  }
}
