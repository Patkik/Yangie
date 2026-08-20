/**
 * Starlight Messenger Engine (kiro-mailbox.js)
 * Manages the real-time conversational UI layout for Patrick and Yangiee.
 * Implements high-performance, responsive SVG assets instead of emojis.
 */

// 1. Core SVGs as inline constants
const SVGS = {
    // Patrick Avatar (Minimal Astronaut Helmet)
    patrick: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#4EC9B0" stroke-width="1.5" fill="rgba(78, 201, 176, 0.1)"/>
            <rect x="7" y="8" width="10" height="7" rx="3.5" fill="#4EC9B0" fill-opacity="0.9"/>
            <rect x="8.5" y="9.5" width="7" height="4" rx="2" fill="#1B2A38"/>
            <circle cx="10" cy="11.5" r="1" fill="#FFF" opacity="0.8"/>
            <path d="M5 15C5 17.5 7 19.5 9.5 19.5M19 15C19 17.5 17 19.5 14.5 19.5" stroke="#4EC9B0" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
    `,

    // Yangiee Avatar (Cozy Neko Kitty)
    yangiee: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#FFB6C1" stroke-width="1.5" fill="rgba(255, 182, 193, 0.1)"/>
            <path d="M7 10L6 6L10.5 7.5M17 10L18 6L13.5 7.5" stroke="#FFB6C1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 11.5C6 15 8.68 17.5 12 17.5C15.32 17.5 18 15 18 11.5C18 8.46 15.32 8 12 8C8.68 8 6 8.46 6 11.5Z" fill="#FFB6C1" fill-opacity="0.9"/>
            <circle cx="10" cy="11" r="0.8" fill="#1B2A38"/>
            <circle cx="14" cy="11" r="0.8" fill="#1B2A38"/>
            <path d="M11 13.5L12 14.2L13 13.5" stroke="#1B2A38" stroke-width="0.8" stroke-linecap="round"/>
        </svg>
    `,

    // Paper Airplane Send Button
    send: `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
    `,

    // Satellite Orbiting (Distance Indicator)
    satellite: `
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;vertical-align:middle;margin-right:4px;">
            <path d="M12 3C7.03 3 3 7.03 3 12c0 2.22.81 4.25 2.15 5.82l1.41-1.41C5.61 15.17 5 13.66 5 12c0-3.87 3.13-7 7-7s7 3.13 7 7c0 1.66-.61 3.17-1.56 4.41l1.41 1.41C20.19 16.25 21 14.22 21 12c0-4.97-4.03-9-9-9zm0 4c-2.76 0-5 2.24-5 5 0 1.25.46 2.39 1.22 3.28l1.41-1.41C9.23 13.31 9 12.68 9 12c0-1.66 1.34-3 3-3s3 1.34 3 3c0 .68-.23 1.31-.63 1.88l1.41 1.41C16.54 14.39 17 13.25 17 12c0-2.76-2.24-5-5-5zm0 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
        </svg>
    `,

    // Double-tap Reactions SVGs
    reactions: {
        star: `
            <svg viewBox="0 0 24 24" fill="#F9E2AF" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
        `,
        heart: `
            <svg viewBox="0 0 24 24" fill="#F5C2E7" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
        `,
        moon: `
            <svg viewBox="0 0 24 24" fill="#89B4FA" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.5-11.5 10.4 10.4 0 0 1-9.6-8.3z"/>
            </svg>
        `,
        planet: `
            <svg viewBox="0 0 24 24" fill="#FAB387" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.67 15.46C12.19 18.23 10.4 18 9 17.15c-2.45-1.5-3.15-4.52-2-6.85 1.15-2.33 3.84-3.45 6.3-2.6.72.25 1.34.66 1.83 1.2.6.66.97 1.49 1.04 2.41a4.992 4.992 0 0 1-2.5 6.15z"/>
                <path d="M3.5 14.5c4.5-2 12.5-2 17 0" stroke="#FFF" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
        `,
        rocket: `
            <svg viewBox="0 0 24 24" fill="#A6E3A1" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2s-5 3.5-5 10c0 2 1 4 1.5 5h7c.5-1 1.5-3 1.5-5 0-6.5-5-10-5-10zm-1.5 16h3L12 21l-1.5-3zM5 16s-.5 2 1 4 4-1 4-1-1.5-2.5-2-3-3 0-3 0zm14 0s.5 2-1 4-4-1-4-1 1.5-2.5 2-3 3 0 3 0z"/>
            </svg>
        `
    }
};

class StarlightMessenger {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn(`Messenger container #${containerId} not found yet.`);
            return;
        }

        this.currentSender = 'patrick'; // default sender toggled by bottom pill
        this.messages = [];
        this.pickerOpen = false;
        this.activeBubbleTarget = null;

        this.init();
    }

    init() {
        this.renderShell();
        this.bindEvents();
        this.loadMockWelcomeFeed();
    }

    // 2. Render initial glassmorphic structure
    renderShell() {
        this.container.innerHTML = `
            <div class="starlight-messenger">
                <!-- Header -->
                <div class="messenger-header">
                    <div class="messenger-info">
                        <div class="messenger-title">
                            Starlight Mailbox
                            <div class="connection-dot"></div>
                        </div>
                        <div class="messenger-subtitle">
                            ${SVGS.satellite} Under the same sky • 938 km apart
                        </div>
                    </div>
                </div>

                <!-- Chat Feed -->
                <div class="messenger-feed" id="msg-feed"></div>

                <!-- Footer controls & Inputs -->
                <div class="messenger-footer">
                    <!-- Toggle who is sending -->
                    <div class="sender-selector">
                        <div class="sender-pill patrick-pill active" data-sender="patrick">
                            ${SVGS.patrick} Patrick
                        </div>
                        <div class="sender-pill yangiee-pill" data-sender="yangiee">
                            ${SVGS.yangiee} Yangiee
                        </div>
                    </div>

                    <!-- Interactive text area -->
                    <div class="input-row">
                        <input type="text" id="msg-input" class="chat-input" placeholder="Whisper something sweet to Yangiee..." autocomplete="off">
                        <button id="msg-send-btn" class="send-button" title="Send Message">
                            ${SVGS.send}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 3. Bind UI Interactivity
    bindEvents() {
        const input = document.getElementById('msg-input');
        const sendBtn = document.getElementById('msg-send-btn');
        const pills = this.container.querySelectorAll('.sender-pill');

        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }

        // Switch Senders
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.currentSender = pill.getAttribute('data-sender');
                
                if (input) {
                    if (this.currentSender === 'patrick') {
                        input.placeholder = "Whisper something sweet to Yangiee...";
                    } else {
                        input.placeholder = "Send an adorable note to Patrick...";
                    }
                }
            });
        });

        // Close reaction picker on clicking outside
        document.addEventListener('click', (e) => {
            if (this.pickerOpen && !e.target.closest('.reaction-picker-modal') && !e.target.closest('.message-bubble')) {
                this.closeReactionPicker();
            }
        });
    }

    // 4. Send Message Logic with springy GSAP Pop-in animations
    sendMessage() {
        const input = document.getElementById('msg-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageObj = {
            id: 'msg-' + Date.now(),
            sender: this.currentSender,
            content: text,
            timestamp: timeString,
            reactions: []
        };

        this.messages.push(messageObj);
        this.renderMessageRow(messageObj);
        
        input.value = '';
        this.scrollToBottom();

        // Native notification hook
        if (typeof sendNativeNotification === 'function') {
            const senderName = this.currentSender === 'patrick' ? 'Patrick' : 'Yangiee';
            sendNativeNotification(`💌 Note from ${senderName}`, text);
        }
    }

    // Render an individual message row
    renderMessageRow(msg) {
        const feed = document.getElementById('msg-feed');
        if (!feed) return;
        const row = document.createElement('div');
        row.className = `message-row ${msg.sender}`;
        row.id = msg.id;

        const avatarSvg = msg.sender === 'patrick' ? SVGS.patrick : SVGS.yangiee;

        row.innerHTML = `
            <div class="avatar-wrapper">${avatarSvg}</div>
            <div class="message-bubble" data-msg-id="${msg.id}">
                <div class="message-text">${msg.content}</div>
                <span class="message-time">${msg.timestamp}</span>
                <div class="reaction-container" style="display: none;"></div>
            </div>
        `;

        feed.appendChild(row);

        // Springy entrance animation
        if (window.gsap) {
            gsap.fromTo(row, { opacity: 0, y: 15 }, {
                opacity: 1,
                y: 0,
                duration: 0.45,
                ease: "back.out(1.4)"
            });
        }

        // Setup double-click reaction trigger
        const bubble = row.querySelector('.message-bubble');
        if (bubble) {
            bubble.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.openReactionPicker(bubble, msg.id, e.clientX, e.clientY);
            });
        }
    }

    // 5. Interactive SVG Reaction Picker
    openReactionPicker(bubbleElement, msgId, clickX, clickY) {
        this.closeReactionPicker();

        this.pickerOpen = true;
        this.activeBubbleTarget = bubbleElement;

        const picker = document.createElement('div');
        picker.className = 'reaction-picker-modal';
        picker.style.left = `${Math.max(10, clickX - 80)}px`;
        picker.style.top = `${Math.max(10, clickY - 60)}px`;

        // Render the reaction options as SVGs
        picker.innerHTML = `
            <div class="reaction-option" data-reaction="star">${SVGS.reactions.star}</div>
            <div class="reaction-option" data-reaction="heart">${SVGS.reactions.heart}</div>
            <div class="reaction-option" data-reaction="moon">${SVGS.reactions.moon}</div>
            <div class="reaction-option" data-reaction="planet">${SVGS.reactions.planet}</div>
            <div class="reaction-option" data-reaction="rocket">${SVGS.reactions.rocket}</div>
        `;

        document.body.appendChild(picker);

        // Bind clicks to reaction options
        picker.querySelectorAll('.reaction-option').forEach(option => {
            option.addEventListener('click', () => {
                const type = option.getAttribute('data-reaction');
                this.applyReactionToMessage(msgId, type);
                this.closeReactionPicker();
            });
        });
    }

    closeReactionPicker() {
        const picker = document.querySelector('.reaction-picker-modal');
        if (picker) picker.remove();
        this.pickerOpen = false;
        this.activeBubbleTarget = null;
    }

    // Apply the active reaction badge to the bubble
    applyReactionToMessage(msgId, type) {
        const message = this.messages.find(m => m.id === msgId);
        if (!message) return;

        // Toggle reaction or append
        if (!message.reactions.includes(type)) {
            message.reactions.push(type);
        } else {
            // Remove if clicked again
            message.reactions = message.reactions.filter(r => r !== type);
        }

        const bubble = document.querySelector(`.message-bubble[data-msg-id="${msgId}"]`);
        if (!bubble) return;

        // Find or create badge container inside bubble
        let badgeBox = bubble.querySelector('.reaction-container');
        if (!badgeBox) {
            badgeBox = document.createElement('div');
            badgeBox.className = 'reaction-container';
            bubble.appendChild(badgeBox);
        }

        if (message.reactions.length > 0) {
            badgeBox.style.display = 'flex';
            // Render selected SVG badge shapes
            badgeBox.innerHTML = message.reactions.map(r => `
                <div class="reaction-badge" title="${r}">
                    ${SVGS.reactions[r]}
                </div>
            `).join('');

            // Apply a sweet dynamic pop animation to the newly reacted badge
            if (window.gsap) {
                gsap.from(badgeBox, {
                    scale: 0.3,
                    opacity: 0,
                    duration: 0.3,
                    ease: "back.out(1.7)"
                });
            }
        } else {
            badgeBox.style.display = 'none';
        }
    }

    // Scroll to the bottom of the conversational feed
    scrollToBottom() {
        const feed = document.getElementById('msg-feed');
        if (!feed) return;
        if (window.gsap) {
            gsap.to(feed, {
                scrollTop: feed.scrollHeight,
                duration: 0.35,
                ease: "power2.out"
            });
        } else {
            feed.scrollTop = feed.scrollHeight;
        }
    }

    // Mock initial welcoming conversation for Patrick & Yangiee context
    loadMockWelcomeFeed() {
        const welcomes = [
            { id: 'm1', sender: 'patrick', content: "Hey! Did you see Kiro floating? He looks so happy today.", timestamp: "10:14 AM", reactions: ['star'] },
            { id: 'm2', sender: 'yangiee', content: "I know! I fed him a strawberry donut earlier and his sparkles went crazy 💖", timestamp: "10:15 AM", reactions: ['heart'] },
            { id: 'm3', sender: 'patrick', content: "Let's put on the Lo-Fi synth, I think it's storming over here.", timestamp: "10:16 AM", reactions: ['moon'] }
        ];

        this.messages = welcomes;
        welcomes.forEach(w => {
            this.renderMessageRow(w);
            if (w.reactions.length > 0) {
                w.reactions.forEach(r => this.applyReactionToMessage(w.id, r));
            }
        });
        this.scrollToBottom();
    }
}

window.StarlightMessenger = StarlightMessenger;
