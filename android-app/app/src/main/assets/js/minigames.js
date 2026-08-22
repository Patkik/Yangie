/**
 * minigames.js — Cozy Minigame Suite & Economic Engine (V5.0)
 * ─────────────────────────────────────────────────────────────────────────────
 * 100% Offline-First, Zero-Asset Procedural Minigames with 200 FPS Architecture:
 * 1. PointerShield — Global UX pointer interaction lock during heavy data sync / transitions.
 * 2. Skeleton UI — Instant structural layout masking async shader & asset initialization.
 * 3. Celestial Tetris — Star-candy blocks with viscoelastic line squish physics.
 * 4. Starlight Pong — Elastic paddle interaction with Kiro soft-body ball deformation.
 * 5. Nebula Dodge — First-person cockpit crosshair navigating fBm plasma jets.
 * 6. Cosmic Runner — Delta-time stardust trail surfer with bio-feedback drag physics.
 * 7. Payout Formula Modal — Displays atomic Payout = (Base * Combo) * Wellbeing.
 */

import { KiroState } from './state.js';
import { synthEngine } from './synth.js';

// ═════════════════════════════════════════════════════════════════════════════
// 1. Pointer Interaction Shield (UX Lock & Anti-Jank Guard)
// ═════════════════════════════════════════════════════════════════════════════

export const PointerShield = {
  element: null,
  lockCount: 0,

  init() {
    this.element = document.getElementById('pointer-shield');
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.id = 'pointer-shield';
      this.element.className = 'pointer-shield';
      document.body.appendChild(this.element);
    }
  },

  activate(durationMs = 0) {
    if (!this.element) this.init();
    this.lockCount++;
    this.element.classList.add('active');
    document.body.classList.add('pointer-locked');

    if (durationMs > 0) {
      setTimeout(() => this.deactivate(), durationMs);
    }
  },

  deactivate() {
    if (!this.element) return;
    this.lockCount = Math.max(0, this.lockCount - 1);
    if (this.lockCount === 0) {
      this.element.classList.remove('active');
      document.body.classList.remove('pointer-locked');
    }
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. Master Minigame Engine & Manager
// ═════════════════════════════════════════════════════════════════════════════

export class KiroMinigameEngine {
  constructor() {
    this.activeGame = null;
    this.currentGameId = null;
    this.modal = null;
    this.canvas = null;
    this.ctx = null;
    this.animId = null;
    this.lastTime = 0;
    this.score = 0;
    this.combo = 0;
    this.shardsEarned = 0;
    this.isPaused = false;
    this.isGameOver = false;

    this.initDOM();
  }

  initDOM() {
    PointerShield.init();

    // Minigame Master Modal
    this.modal = document.getElementById('minigame-modal');
    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.id = 'minigame-modal';
      this.modal.className = 'minigame-overlay';
      this.modal.style.display = 'none';
      document.body.appendChild(this.modal);
    }
  }

  openGame(gameId) {
    PointerShield.activate(400);
    this.currentGameId = gameId || 'tetris';
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.combo = 0;
    this.shardsEarned = 0;

    const gameCatalog = {
      tetris: { title: 'Celestial Tetris', sub: 'Gliese / Helix System • Squish Star-Candies' },
      pong:   { title: 'Starlight Pong', sub: 'Trappist / Crab System • Elastic Kiro Rebound' },
      dodge:  { title: 'Nebula Dodge', sub: 'Butterfly System • Deep Space Plasma Jets' },
      runner: { title: 'Cosmic Runner', sub: 'Kepler / Sombrero System • Stardust Trail Surfer' }
    };
    const meta = gameCatalog[this.currentGameId] || gameCatalog.tetris;

    // Render Skeleton UI instantly to achieve sub-500ms TTI
    this.modal.innerHTML = `
      <div class="minigame-card" id="minigame-card">
        <!-- Skeleton UI Loading Mask -->
        <div class="minigame-skeleton-loader" id="minigame-skeleton">
          <div class="skeleton-shimmer-bar"></div>
          <div class="skeleton-hud-row">
            <div class="skeleton-pill"></div>
            <div class="skeleton-pill"></div>
          </div>
          <div class="skeleton-canvas-box"></div>
        </div>

        <!-- Master Minigame Header -->
        <header class="minigame-header">
          <div class="minigame-title-group">
            <span class="minigame-badge">✦ COSMIC ARCADE ✦</span>
            <h2 class="minigame-title">${meta.title}</h2>
            <div class="minigame-subtitle">${meta.sub}</div>
          </div>
          <div class="minigame-header-actions">
            <button class="minigame-action-btn" id="minigame-pause-btn" title="Pause / Resume">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            </button>
            <button class="minigame-action-btn" id="minigame-close-btn" title="Close Game">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>

        <!-- Live Score & Telemetry HUD -->
        <div class="minigame-hud-bar">
          <div class="minigame-stat-pill">
            <span class="stat-label">SCORE</span>
            <span class="stat-value" id="minigame-hud-score">0</span>
          </div>
          <div class="minigame-stat-pill">
            <span class="stat-label">STREAK</span>
            <span class="stat-value" id="minigame-hud-combo" style="color: #F9E2AF;">0x</span>
          </div>
          <div class="minigame-stat-pill">
            <span class="stat-label">✦ SHARDS</span>
            <span class="stat-value" id="minigame-hud-shards" style="color: #4EC9B0;">+0</span>
          </div>
        </div>

        <!-- 200 FPS Game Canvas Surface -->
        <div class="minigame-canvas-container" id="minigame-canvas-container">
          <canvas id="minigame-canvas"></canvas>
        </div>

        <!-- Touch Controls Bar -->
        <div class="minigame-controls-bar" id="minigame-controls-bar"></div>

        <!-- Payout Calculation & Game Over Overlay -->
        <div class="minigame-payout-overlay" id="minigame-payout-overlay" style="display: none;"></div>
      </div>
    `;

    this.modal.style.display = 'flex';

    // Hook Close & Pause buttons
    const closeBtn = this.modal.querySelector('#minigame-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeGame());

    const pauseBtn = this.modal.querySelector('#minigame-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseBtn.classList.toggle('active', this.isPaused);
        if (!this.isPaused) {
          this.lastTime = performance.now();
          this.tick(this.lastTime);
        }
      });
    }

    this.canvas = this.modal.querySelector('#minigame-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Resize canvas to container
    this.resizeCanvas();

    // Dismiss Skeleton UI and start game engine smoothly
    setTimeout(() => {
      const skeleton = this.modal.querySelector('#minigame-skeleton');
      if (skeleton) skeleton.style.opacity = '0';
      setTimeout(() => { if (skeleton) skeleton.style.display = 'none'; }, 200);

      this.startEngine(this.currentGameId);
    }, 150);
  }

  resizeCanvas() {
    const container = this.modal.querySelector('#minigame-canvas-container');
    if (!container || !this.canvas) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = (rect.width || 340) * dpr;
    this.canvas.height = (rect.height || 420) * dpr;
    this.canvas.style.width = `${rect.width || 340}px`;
    this.canvas.style.height = `${rect.height || 420}px`;
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width || 340;
    this.displayHeight = rect.height || 420;
  }

  startEngine(gameId) {
    if (this.animId) cancelAnimationFrame(this.animId);

    switch (gameId) {
      case 'tetris':
        this.activeGame = new CelestialTetris(this);
        break;
      case 'pong':
        this.activeGame = new StarlightPong(this);
        break;
      case 'dodge':
        this.activeGame = new NebulaDodge(this);
        break;
      case 'runner':
      default:
        this.activeGame = new CosmicRunner(this);
        break;
    }

    this.activeGame.init();
    this.lastTime = performance.now();
    this.tick = (now) => {
      if (this.isPaused || this.isGameOver) return;
      const dt = Math.min(0.1, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.activeGame.update(dt);
      this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);
      this.activeGame.render(this.ctx);

      this.animId = requestAnimationFrame(this.tick);
    };

    this.animId = requestAnimationFrame(this.tick);
  }

  updateHUD(score, combo, pendingShards) {
    this.score = score;
    this.combo = combo;
    this.shardsEarned = pendingShards;

    const sEl = this.modal.querySelector('#minigame-hud-score');
    const cEl = this.modal.querySelector('#minigame-hud-combo');
    const hEl = this.modal.querySelector('#minigame-hud-shards');

    if (sEl) sEl.textContent = Math.round(score);
    if (cEl) cEl.textContent = `${combo}x`;
    if (hEl) hEl.textContent = `+${pendingShards}`;
  }

  showGameOver(baseScore, comboCount) {
    this.isGameOver = true;
    if (this.animId) cancelAnimationFrame(this.animId);

    // Calculate payout using the mathematical formula
    const payoutResult = KiroState.calculatePayout(this.currentGameId, baseScore, comboCount);
    
    // Atomically award the Stardust Shards to KiroState
    KiroState.addStardust(payoutResult.totalPayout, `minigame_${this.currentGameId}`);

    // Play procedural victory SFX
    synthEngine.playMinigameVictory();

    const overlay = this.modal.querySelector('#minigame-payout-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div class="payout-card">
        <div class="payout-sparkle">✦ ✦ ✦</div>
        <h3 class="payout-title">EXPEDITION COMPLETE!</h3>
        <div class="payout-game-name">${this.currentGameId.toUpperCase()} • MISSION REWARD</div>

        <div class="payout-formula-box">
          <div class="formula-header">MATHEMATICAL PAYOUT FORMULA</div>
          <div class="formula-code">Payout = (BaseScore × Combo) × Wellbeing</div>
          
          <div class="formula-breakdown-grid">
            <div class="formula-item">
              <span class="f-lbl">Base Score:</span>
              <span class="f-val">${payoutResult.baseScore} + ${payoutResult.baseDifficulty} (diff)</span>
            </div>
            <div class="formula-item">
              <span class="f-lbl">Combo Multiplier:</span>
              <span class="f-val" style="color:#F9E2AF;">${payoutResult.comboMultiplier.toFixed(1)}x (${payoutResult.comboCount} Streak)</span>
            </div>
            <div class="formula-item">
              <span class="f-lbl">Wellbeing Modifier:</span>
              <span class="f-val" style="color:#4EC9B0;">${payoutResult.wellbeingModifier}x (${payoutResult.wellbeing}% Vitals)</span>
            </div>
            ${payoutResult.squishBonus > 1.0 ? `
              <div class="formula-item">
                <span class="f-lbl">Helix Squish Buff:</span>
                <span class="f-val" style="color:#94E2D5;">${payoutResult.squishBonus}x Active</span>
              </div>
            ` : ''}
            ${payoutResult.sombreroMultiplier > 1.0 ? `
              <div class="formula-item">
                <span class="f-lbl">Sombrero Core Buff:</span>
                <span class="f-val" style="color:#F5C2E7;">${payoutResult.sombreroMultiplier}x Active</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="payout-total-pill">
          <span class="total-label">STARDUST SHARDS EARNED</span>
          <span class="total-value">+${payoutResult.totalPayout} ✦</span>
        </div>

        <div class="payout-actions">
          <button class="payout-btn play-again-btn" id="payout-replay-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            Play Again
          </button>
          <button class="payout-btn return-btn" id="payout-return-btn">
            Return to Sanctuary
          </button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';

    const replayBtn = overlay.querySelector('#payout-replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        this.openGame(this.currentGameId);
      });
    }

    const returnBtn = overlay.querySelector('#payout-return-btn');
    if (returnBtn) {
      returnBtn.addEventListener('click', () => this.closeGame());
    }
  }

  closeGame() {
    PointerShield.activate(300);
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.activeGame && typeof this.activeGame.destroy === 'function') {
      this.activeGame.destroy();
    }
    this.activeGame = null;
    if (this.modal) this.modal.style.display = 'none';
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Game 1: Celestial Tetris ("Frozen Stardust" / Star-Candy Tetris)
// ═════════════════════════════════════════════════════════════════════════════

class CelestialTetris {
  constructor(engine) {
    this.engine = engine;
    this.cols = 10;
    this.rows = 18;
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.colors = ['#4EC9B0', '#FFB6C1', '#F9E2AF', '#CBA6F7', '#94E2D5'];
    this.pieces = [
      [[1,1,1,1]], // I
      [[1,1],[1,1]], // O
      [[0,1,0],[1,1,1]], // T
      [[1,0,0],[1,1,1]], // L
      [[0,0,1],[1,1,1]], // J
      [[0,1,1],[1,1,0]], // S
      [[1,1,0],[0,1,1]]  // Z
    ];
    this.currentPiece = null;
    this.currentX = 0;
    this.currentY = 0;
    this.currentColor = '#4EC9B0';
    this.dropTimer = 0;
    this.dropInterval = 0.55;
    this.score = 0;
    this.combo = 0;
    this.squishRows = []; // Animation state for squishy line clearance
  }

  init() {
    this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
    this.spawnPiece();
    this.initControls();
  }

  initControls() {
    const bar = this.engine.modal.querySelector('#minigame-controls-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="tetris-controls-cluster">
        <button class="arcade-touch-btn" id="tetris-left" title="Move Left">◀</button>
        <button class="arcade-touch-btn" id="tetris-rotate" title="Rotate Piece">↻</button>
        <button class="arcade-touch-btn" id="tetris-right" title="Move Right">▶</button>
        <button class="arcade-touch-btn action-drop-btn" id="tetris-drop" title="Soft Drop">▼</button>
      </div>
    `;

    bar.querySelector('#tetris-left')?.addEventListener('click', () => this.move(-1));
    bar.querySelector('#tetris-right')?.addEventListener('click', () => this.move(1));
    bar.querySelector('#tetris-rotate')?.addEventListener('click', () => this.rotate());
    bar.querySelector('#tetris-drop')?.addEventListener('click', () => this.drop());
  }

  spawnPiece() {
    const idx = Math.floor(Math.random() * this.pieces.length);
    this.currentPiece = this.pieces[idx];
    this.currentColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.currentX = Math.floor((this.cols - this.currentPiece[0].length) / 2);
    this.currentY = 0;

    if (this.collides(this.currentX, this.currentY, this.currentPiece)) {
      this.engine.showGameOver(this.score, this.combo);
    }
  }

  collides(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
      for (let c = 0; c < piece[r].length; c++) {
        if (piece[r][c]) {
          const newX = x + c;
          const newY = y + r;
          if (newX < 0 || newX >= this.cols || newY >= this.rows) return true;
          if (newY >= 0 && this.grid[newY][newX] !== null) return true;
        }
      }
    }
    return false;
  }

  move(dir) {
    if (!this.collides(this.currentX + dir, this.currentY, this.currentPiece)) {
      this.currentX += dir;
      synthEngine.playShardPickup();
    }
  }

  rotate() {
    const rotated = this.currentPiece[0].map((_, i) => this.currentPiece.map(row => row[i]).reverse());
    if (!this.collides(this.currentX, this.currentY, rotated)) {
      this.currentPiece = rotated;
      synthEngine.playShardPickup();
    }
  }

  drop() {
    if (!this.collides(this.currentX, this.currentY + 1, this.currentPiece)) {
      this.currentY += 1;
    } else {
      this.lockPiece();
    }
  }

  lockPiece() {
    for (let r = 0; r < this.currentPiece.length; r++) {
      for (let c = 0; c < this.currentPiece[r].length; c++) {
        if (this.currentPiece[r][c]) {
          const gy = this.currentY + r;
          const gx = this.currentX + c;
          if (gy >= 0 && gy < this.rows) {
            this.grid[gy][gx] = this.currentColor;
          }
        }
      }
    }

    this.checkLines();
    this.spawnPiece();
  }

  checkLines() {
    let cleared = 0;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.grid[r].every(cell => cell !== null)) {
        this.squishRows.push({ row: r, progress: 1.0 });
        this.grid.splice(r, 1);
        this.grid.unshift(Array(this.cols).fill(null));
        cleared++;
        r++; // Re-check same row index
      }
    }

    if (cleared > 0) {
      this.combo += cleared;
      const isHelix = KiroState.hasMilestone('helix');
      const basePoints = cleared * 100 * (isHelix ? 1.5 : 1.0);
      this.score += basePoints;

      // Play procedural viscoelastic squish audio pop
      synthEngine.playTetrisSquish(isHelix);

      const pending = Math.round(this.score / 15);
      this.engine.updateHUD(this.score, this.combo, pending);
    } else {
      this.combo = Math.max(0, this.combo - 1);
      this.engine.updateHUD(this.score, this.combo, Math.round(this.score / 15));
    }
  }

  update(dt) {
    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this.drop();
    }

    // Update squish row animations
    this.squishRows = this.squishRows.filter(sr => {
      sr.progress -= dt * 3.0;
      return sr.progress > 0;
    });
  }

  render(ctx) {
    const cw = this.engine.displayWidth;
    const ch = this.engine.displayHeight;
    const blockSize = Math.min(cw / this.cols, (ch - 20) / this.rows);
    const offsetX = (cw - this.cols * blockSize) / 2;
    const offsetY = (ch - this.rows * blockSize) / 2;

    // Background Grid
    ctx.fillStyle = 'rgba(17, 17, 27, 0.85)';
    ctx.fillRect(offsetX, offsetY, this.cols * blockSize, this.rows * blockSize);

    ctx.strokeStyle = 'rgba(148, 226, 213, 0.08)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * blockSize, offsetY);
      ctx.lineTo(offsetX + c * blockSize, offsetY + this.rows * blockSize);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * blockSize);
      ctx.lineTo(offsetX + this.cols * blockSize, offsetY + r * blockSize);
      ctx.stroke();
    }

    // Draw Locked Cells with rounded candy aesthetic
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const color = this.grid[r][c];
        if (color) {
          this.drawCandyBlock(ctx, offsetX + c * blockSize, offsetY + r * blockSize, blockSize, color);
        }
      }
    }

    // Draw Current Falling Piece
    if (this.currentPiece) {
      for (let r = 0; r < this.currentPiece.length; r++) {
        for (let c = 0; c < this.currentPiece[r].length; c++) {
          if (this.currentPiece[r][c]) {
            const px = offsetX + (this.currentX + c) * blockSize;
            const py = offsetY + (this.currentY + r) * blockSize;
            this.drawCandyBlock(ctx, px, py, blockSize, this.currentColor, true);
          }
        }
      }
    }
  }

  drawCandyBlock(ctx, x, y, size, color, isFalling = false) {
    const pad = 2;
    const r = 6;
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = isFalling ? 10 : 4;

    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, r);
    ctx.fill();

    // Sweet candy glossy highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.35, y + size * 0.35, size * 0.18, size * 0.1, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  destroy() {}
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. Game 2: Starlight Pong ("Elastic Kiro Pong")
// ═════════════════════════════════════════════════════════════════════════════

class StarlightPong {
  constructor(engine) {
    this.engine = engine;
    this.paddleW = 85;
    this.paddleH = 14;
    this.paddleX = 130;
    this.ballX = 170;
    this.ballY = 150;
    this.ballRadius = 18;
    this.ballVx = 160;
    this.ballVy = 200;
    this.squishX = 1.0;
    this.squishY = 1.0;
    this.score = 0;
    this.combo = 0;
    this.dragTargetX = null;
  }

  init() {
    this.paddleX = (this.engine.displayWidth - this.paddleW) / 2;
    this.ballX = this.engine.displayWidth / 2;
    this.ballY = 100;
    this.initTouch();
  }

  initTouch() {
    const c = this.engine.canvas;
    const onMove = (clientX) => {
      const rect = c.getBoundingClientRect();
      const relX = clientX - rect.left;
      this.paddleX = Math.max(0, Math.min(this.engine.displayWidth - this.paddleW, relX - this.paddleW / 2));
    };

    c.addEventListener('mousemove', (e) => onMove(e.clientX));
    c.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    }, { passive: true });
  }

  update(dt) {
    // Dynamic Drag from Kiro's energy level
    const drag = KiroState.getPhysicsDrag();
    this.ballX += this.ballVx * dt / drag;
    this.ballY += this.ballVy * dt / drag;

    // Recover squish elasticity smoothly over time
    this.squishX += (1.0 - this.squishX) * dt * 10;
    this.squishY += (1.0 - this.squishY) * dt * 10;

    const w = this.engine.displayWidth;
    const h = this.engine.displayHeight;

    // Wall Rebounds (Left / Right)
    if (this.ballX - this.ballRadius <= 0) {
      this.ballX = this.ballRadius;
      this.ballVx = Math.abs(this.ballVx);
      this.squishX = 0.65;
      this.squishY = 1.35;
      synthEngine.playPongBounce(this.combo);
    } else if (this.ballX + this.ballRadius >= w) {
      this.ballX = w - this.ballRadius;
      this.ballVx = -Math.abs(this.ballVx);
      this.squishX = 0.65;
      this.squishY = 1.35;
      synthEngine.playPongBounce(this.combo);
    }

    // Top Rebound
    if (this.ballY - this.ballRadius <= 0) {
      this.ballY = this.ballRadius;
      this.ballVy = Math.abs(this.ballVy);
      this.squishY = 0.65;
      this.squishX = 1.35;
      synthEngine.playPongBounce(this.combo);
    }

    // Paddle Rebound (Bottom)
    const paddleY = h - 35;
    if (
      this.ballY + this.ballRadius >= paddleY &&
      this.ballY - this.ballRadius <= paddleY + this.paddleH &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + this.paddleW &&
      this.ballVy > 0
    ) {
      this.ballVy = -Math.abs(this.ballVy) * 1.05; // Accelerate slightly
      // Apply paddle angle deflection
      const hitOffset = (this.ballX - (this.paddleX + this.paddleW / 2)) / (this.paddleW / 2);
      this.ballVx = hitOffset * 220;

      this.squishY = 0.55;
      this.squishX = 1.45;
      this.combo += 1;
      this.score += 50 * this.combo;

      synthEngine.playPongBounce(this.combo);
      this.engine.updateHUD(this.score, this.combo, Math.round(this.score / 20));
    }

    // Bottom Miss -> Game Over
    if (this.ballY - this.ballRadius > h) {
      this.engine.showGameOver(this.score, this.combo);
    }
  }

  render(ctx) {
    const w = this.engine.displayWidth;
    const h = this.engine.displayHeight;

    // Background Arena
    ctx.fillStyle = 'rgba(17, 17, 27, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // Glowing Neon Paddle
    const paddleY = h - 35;
    ctx.save();
    ctx.fillStyle = '#4EC9B0';
    ctx.shadowColor = '#4EC9B0';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(this.paddleX, paddleY, this.paddleW, this.paddleH, 7);
    ctx.fill();
    ctx.restore();

    // Cute Squishy Kiro Ball (with face and soft-body deformation)
    ctx.save();
    ctx.translate(this.ballX, this.ballY);
    ctx.scale(this.squishX, this.squishY);

    // Body
    ctx.fillStyle = '#4EC9B0';
    ctx.shadowColor = 'rgba(78, 201, 176, 0.5)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, this.ballRadius, 0, Math.PI * 2);
    ctx.fill();

    // Blush Cheeks
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.arc(-8, 3, 3.5, 0, Math.PI * 2);
    ctx.arc(8, 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Cute Eyes
    ctx.fillStyle = '#11111b';
    ctx.beginPath();
    ctx.arc(-6, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye Star Highlights
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-5.2, -3, 1, 0, Math.PI * 2);
    ctx.arc(6.8, -3, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  destroy() {}
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. Game 3: Nebula Dodge ("Deep Space Cockpit Dodge")
// ═════════════════════════════════════════════════════════════════════════════

class NebulaDodge {
  constructor(engine) {
    this.engine = engine;
    this.shipX = 170;
    this.shipY = 320;
    this.jets = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.combo = 0;
    this.shieldHp = 3;
    this.targetX = 170;
  }

  init() {
    this.shipX = this.engine.displayWidth / 2;
    this.shipY = this.engine.displayHeight - 70;
    this.targetX = this.shipX;
    this.initControls();
  }

  initControls() {
    const c = this.engine.canvas;
    const onMove = (clientX) => {
      const rect = c.getBoundingClientRect();
      this.targetX = Math.max(25, Math.min(this.engine.displayWidth - 25, clientX - rect.left));
    };

    c.addEventListener('mousemove', (e) => onMove(e.clientX));
    c.addEventListener('touchmove', (e) => {
      if (e.touches[0]) onMove(e.touches[0].clientX);
    }, { passive: true });
  }

  update(dt) {
    // Smooth ship steering
    this.shipX += (this.targetX - this.shipX) * dt * 8;

    this.spawnTimer += dt;
    if (this.spawnTimer >= 0.75) {
      this.spawnTimer = 0;
      this.jets.push({
        x: Math.random() * (this.engine.displayWidth - 40) + 20,
        y: -30,
        radius: Math.random() * 16 + 14,
        speed: Math.random() * 80 + 180,
        color: ['#F5C2E7', '#CBA6F7', '#94E2D5'][Math.floor(Math.random() * 3)]
      });
    }

    const h = this.engine.displayHeight;

    // Update Plasma Jets
    this.jets.forEach(jet => {
      jet.y += jet.speed * dt;

      // Proximity check with ship crosshair
      const dist = Math.hypot(jet.x - this.shipX, jet.y - this.shipY);
      if (dist < jet.radius + 18 && !jet.hit) {
        jet.hit = true;
        this.shieldHp -= 1;
        synthEngine.playShieldDeflect();

        if (this.shieldHp <= 0) {
          this.engine.showGameOver(this.score, this.combo);
        }
      }
    });

    // Remove off-screen jets and increment score
    const remaining = [];
    this.jets.forEach(jet => {
      if (jet.y < h + 40) {
        remaining.push(jet);
      } else if (!jet.hit) {
        this.combo += 1;
        this.score += 25;
        this.engine.updateHUD(this.score, this.combo, Math.round(this.score / 10));
      }
    });
    this.jets = remaining;
  }

  render(ctx) {
    const w = this.engine.displayWidth;
    const h = this.engine.displayHeight;

    // Deep Space Void
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, w, h);

    // Draw Plasma Jets
    this.jets.forEach(jet => {
      ctx.save();
      ctx.fillStyle = jet.color;
      ctx.shadowColor = jet.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(jet.x, jet.y, jet.radius, 0, Math.PI * 2);
      ctx.fill();

      // Ion Jet Stream Tail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(jet.x - jet.radius * 0.6, jet.y);
      ctx.lineTo(jet.x + jet.radius * 0.6, jet.y);
      ctx.lineTo(jet.x, jet.y - jet.radius * 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Cockpit Pilot Crosshair & Energy Shield
    ctx.save();
    ctx.translate(this.shipX, this.shipY);

    // Glowing Shield Dome
    ctx.strokeStyle = this.shieldHp > 1 ? '#4EC9B0' : '#FFB6C1';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair Lines
    ctx.strokeStyle = '#94E2D5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
    ctx.moveTo(0, -16); ctx.lineTo(0, 16);
    ctx.stroke();

    ctx.restore();
  }

  destroy() {}
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. Game 4: Cosmic Runner ("Stardust Surfer")
// ═════════════════════════════════════════════════════════════════════════════

class CosmicRunner {
  constructor(engine) {
    this.engine = engine;
    this.lane = 1; // 0: Left, 1: Center, 2: Right
    this.lanes = [70, 170, 270];
    this.playerX = 170;
    this.playerY = 320;
    this.items = []; // Asteroids & Star Candies
    this.spawnTimer = 0;
    this.score = 0;
    this.combo = 0;
    this.speed = 220;
  }

  init() {
    const w = this.engine.displayWidth;
    this.lanes = [w * 0.22, w * 0.50, w * 0.78];
    this.lane = 1;
    this.playerX = this.lanes[this.lane];
    this.playerY = this.engine.displayHeight - 80;
    this.initControls();
  }

  initControls() {
    const bar = this.engine.modal.querySelector('#minigame-controls-bar');
    if (!bar) return;
    bar.innerHTML = `
      <div class="runner-controls-cluster">
        <button class="arcade-touch-btn" id="runner-left" title="Surf Left">◀ SURF LEFT</button>
        <button class="arcade-touch-btn" id="runner-right" title="Surf Right">SURF RIGHT ▶</button>
      </div>
    `;

    bar.querySelector('#runner-left')?.addEventListener('click', () => {
      this.lane = Math.max(0, this.lane - 1);
      synthEngine.playShardPickup();
    });
    bar.querySelector('#runner-right')?.addEventListener('click', () => {
      this.lane = Math.min(2, this.lane + 1);
      synthEngine.playShardPickup();
    });
  }

  update(dt) {
    // Pure Delta Time Kinematics ensuring rock-solid 60Hz to 240Hz consistency
    const targetX = this.lanes[this.lane];
    this.playerX += (targetX - this.playerX) * dt * 14;

    const drag = KiroState.getPhysicsDrag();
    const effectiveSpeed = this.speed / drag;

    this.spawnTimer += dt;
    if (this.spawnTimer >= 0.65) {
      this.spawnTimer = 0;
      const laneIdx = Math.floor(Math.random() * 3);
      const isCandy = Math.random() > 0.45;
      this.items.push({
        lane: laneIdx,
        x: this.lanes[laneIdx],
        y: -30,
        type: isCandy ? 'candy' : 'asteroid',
        color: isCandy ? '#F9E2AF' : '#CBA6F7',
        radius: isCandy ? 12 : 18
      });
    }

    const h = this.engine.displayHeight;
    const rMult = KiroState.getShardRadiusMultiplier();

    this.items.forEach(item => {
      item.y += effectiveSpeed * dt;

      // Collision detection
      const dist = Math.hypot(item.x - this.playerX, item.y - this.playerY);
      const threshold = (item.radius + 16) * (item.type === 'candy' ? rMult : 1.0);

      if (dist < threshold && !item.collected) {
        item.collected = true;
        if (item.type === 'candy') {
          this.combo += 1;
          this.score += 40 * this.combo;
          synthEngine.playShardPickup();
          this.engine.updateHUD(this.score, this.combo, Math.round(this.score / 15));
        } else {
          // Hit asteroid
          synthEngine.playSadWhimper();
          this.engine.showGameOver(this.score, this.combo);
        }
      }
    });

    this.items = this.items.filter(item => item.y < h + 40 && !item.collected);
  }

  render(ctx) {
    const w = this.engine.displayWidth;
    const h = this.engine.displayHeight;

    // Distant Starlight Horizon
    ctx.fillStyle = '#11111b';
    ctx.fillRect(0, 0, w, h);

    // Stardust Surfer Tracks
    ctx.strokeStyle = 'rgba(78, 201, 176, 0.18)';
    ctx.lineWidth = 2;
    this.lanes.forEach(lx => {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h);
      ctx.stroke();
    });

    // Draw Items
    this.items.forEach(item => {
      ctx.save();
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      if (item.type === 'candy') {
        // Star Candy Shard
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      } else {
        // Low-Poly Asteroid
        ctx.rect(item.x - item.radius, item.y - item.radius, item.radius * 2, item.radius * 2);
      }
      ctx.fill();
      ctx.restore();
    });

    // Kiro Surfer Avatar
    ctx.save();
    ctx.translate(this.playerX, this.playerY);

    // Glowing Trail
    ctx.fillStyle = 'rgba(78, 201, 176, 0.4)';
    ctx.beginPath();
    ctx.moveTo(-14, 15);
    ctx.lineTo(14, 15);
    ctx.lineTo(0, 35);
    ctx.closePath();
    ctx.fill();

    // Surfer Body
    ctx.fillStyle = '#4EC9B0';
    ctx.shadowColor = '#4EC9B0';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();

    // Surfer Eyes
    ctx.fillStyle = '#11111b';
    ctx.beginPath();
    ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  destroy() {}
}

export const minigameEngine = new KiroMinigameEngine();
if (typeof window !== 'undefined') {
  window.minigameEngine = minigameEngine;
  window.PointerShield = PointerShield;
}
export default minigameEngine;
