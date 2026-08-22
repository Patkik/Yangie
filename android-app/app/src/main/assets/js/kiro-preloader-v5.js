/**
 * 🛰️ Kiro's Cosmic Haven — WebGL Shader Preloader & Cinematic Transition Engine (V5.0)
 * Implements CPU-to-GPU shader warming, procedural 3D running cycles, and seamless transitions.
 * Eliminates compilation stutter (jank) inside mobile Android WebView containers.
 *
 * Grounded in the Twilight Celestial Color Space:
 *   Midnight: #11111b, Mint-Teal: #4ec9b0, Pastel-Pink: #f5c2e7, Gold-Glow: #f9e2af
 */

import { createPlanetShaderMaterial, createNebulaShaderMaterial } from './scene.js';

export default class KiroPreloaderV5 {
    constructor(overlayId, onCompleteCallback) {
        this.overlay = document.getElementById(overlayId);
        this.onComplete = onCompleteCallback;

        if (!this.overlay) {
            console.error(`[KiroPreloaderV5] Preloader overlay #${overlayId} not found.`);
            if (typeof this.onComplete === 'function') this.onComplete();
            return;
        }

        // WebGL Preloading Context
        this.canvasContainer = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Animated Loader Mesh
        this.kiroRunGroup = null;
        this.leftArm = null;
        this.rightArm = null;
        this.clock = (typeof THREE !== 'undefined') ? new THREE.Clock() : null;
        this.animationFrameId = null;

        this.progress = 0;
        this.isComplete = false;

        this.initDOM();
        if (typeof THREE !== 'undefined') {
            this.initWebGL();
            this.warmupShaders();
        } else {
            // Safe fallback if Three.js is not yet available
            this.triggerFallbackBoot();
        }
    }

    initDOM() {
        // Assemble CSS loading overlay glass card dynamically
        this.overlay.innerHTML = `
            <div class="preloader-glass-card">
                <div class="preloader-title-row">
                    <h2 class="preloader-brand">KIRO'S HAVEN</h2>
                    <span class="preloader-subtitle">Acquiring Orbital Coordinates...</span>
                </div>
                
                <!-- WebGL 3D Running Kiro Canvas Frame -->
                <div id="preloader-canvas-mount" class="preloader-canvas-mount"></div>

                <!-- Starry-Gold Progress Bar HUD -->
                <div class="preloader-progress-track">
                    <div id="preloader-bar-fill" class="preloader-bar-fill" style="width: 0%;"></div>
                </div>
                <div class="preloader-status-text" id="preloader-status-label">Compiling Celestial Matrix: 0%</div>
            </div>
            
            <!-- Animated background stardust clouds -->
            <div class="preloader-cosmic-cloud cloud-pink"></div>
            <div class="preloader-cosmic-cloud cloud-teal"></div>
        `;

        this.canvasContainer = document.getElementById('preloader-canvas-mount');
        this.barFill = document.getElementById('preloader-bar-fill');
        this.statusLabel = document.getElementById('preloader-status-label');
        this.overlay.style.display = 'flex';
        this.overlay.style.clipPath = 'circle(100% at 50% 50%)';
    }

    initWebGL() {
        if (!this.canvasContainer) return;
        this.scene = new THREE.Scene();

        // Focused camera centered on Kiro
        const width = this.canvasContainer.clientWidth || 180;
        const height = this.canvasContainer.clientHeight || 180;
        const aspect = width / height;
        this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
        this.camera.position.set(0, 0, 4.5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.canvasContainer.appendChild(this.renderer.domElement);

        // Core lighting to cast on Kiro's body
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        dirLight.position.set(2, 4, 3);
        this.scene.add(dirLight);

        // Build a simplified 3D Kiro optimized for the running animation
        this.buildRunningKiro();
        this.animate();
    }

    buildRunningKiro() {
        this.kiroRunGroup = new THREE.Group();
        this.scene.add(this.kiroRunGroup);

        const mintMaterial = new THREE.MeshStandardMaterial({
            color: 0x4EC9B0,
            roughness: 0.8,
            metalness: 0.1
        });

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.75, 16, 16);
        const bodyMesh = new THREE.Mesh(bodyGeo, mintMaterial);
        bodyMesh.scale.set(1.1, 0.9, 1.1);
        this.kiroRunGroup.add(bodyMesh);

        // White Belly
        const bellyGeo = new THREE.SphereGeometry(0.55, 16, 16);
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xF0EDE8, roughness: 0.95 });
        const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
        bellyMesh.scale.set(1.0, 0.8, 0.4);
        bellyMesh.position.set(0, -0.12, 0.55);
        this.kiroRunGroup.add(bellyMesh);

        // Eyes (focused forward!)
        const eyeGeo = new THREE.SphereGeometry(0.09, 8, 8);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x11111b, roughness: 0.1 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.25, 0.15, 0.65);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.25, 0.15, 0.65);
        this.kiroRunGroup.add(leftEye);
        this.kiroRunGroup.add(rightEye);

        // Arms (running anchors)
        const armGeo = new THREE.SphereGeometry(0.18, 12, 12);
        this.leftArm = new THREE.Mesh(armGeo, mintMaterial);
        this.leftArm.scale.set(1.3, 0.65, 0.65);
        this.leftArm.position.set(-0.65, -0.15, 0.1);
        this.kiroRunGroup.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, mintMaterial);
        this.rightArm.scale.set(1.3, 0.65, 0.65);
        this.rightArm.position.set(0.65, -0.15, 0.1);
        this.kiroRunGroup.add(this.rightArm);
    }

    /**
     * 📐 WebGL Shader Warming Engine
     * Instantiates materials offscreen and compiles them to prevent mid-game stutter.
     */
    async warmupShaders() {
        this.updateProgress(15, 'Synthesizing Atmospheric Shaders...');

        // Dummy group to hold compilation targets (hidden from camera)
        const compileGroup = new THREE.Group();
        compileGroup.position.set(0, -100, 0); // Hide deep below camera frustum
        this.scene.add(compileGroup);

        try {
            // Material 1: Custom Cel-Shaded Planet Shader
            const dummyLight = new THREE.Vector3(1, 1, 1);
            const planetMat = createPlanetShaderMaterial('#4ec9b0', dummyLight);
            const planetGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const planetMesh = new THREE.Mesh(planetGeo, planetMat);
            compileGroup.add(planetMesh);
            this.updateProgress(45, 'Compiling Cel-Shaded Planets...');

            // Material 2: Custom Watercolor Nebula Shader
            const nebulaMat = createNebulaShaderMaterial();
            const nebulaGeo = new THREE.PlaneGeometry(0.1, 0.1);
            const nebulaMesh = new THREE.Mesh(nebulaGeo, nebulaMat);
            compileGroup.add(nebulaMesh);
            this.updateProgress(75, 'Compiling Volumetric Cosmic Nebulae...');

            // Force GPU compilation pass
            await new Promise(resolve => {
                setTimeout(() => {
                    if (this.renderer && this.scene && this.camera) {
                        this.renderer.compile(this.scene, this.camera);
                    }
                    resolve();
                }, 250);
            });

            this.updateProgress(95, 'Shaders Warmed! Locking Coordinates...');

            // Clear dummy objects to free GPU registers
            this.scene.remove(compileGroup);
            planetGeo.dispose();
            planetMat.dispose();
            nebulaGeo.dispose();
            nebulaMat.dispose();

            setTimeout(() => this.triggerTransition(), 400);

        } catch (err) {
            console.warn('[Preloader] Shader warming error, entering fallback boot:', err);
            this.updateProgress(100, 'Synchronizing Sanctuary...');
            setTimeout(() => this.triggerTransition(), 300);
        }
    }

    triggerFallbackBoot() {
        this.updateProgress(100, 'Synchronizing Sanctuary...');
        setTimeout(() => this.triggerTransition(), 300);
    }

    updateProgress(pct, label) {
        this.progress = pct;
        if (this.barFill) this.barFill.style.width = `${pct}%`;
        if (this.statusLabel) this.statusLabel.textContent = `${label} (${pct}%)`;
    }

    /**
     * 🏃 3D Procedural Running Loop
     * Simulates a cheerful, bouncy running cycle using sine transformations.
     */
    animate() {
        if (this.isComplete) return;
        this.animationFrameId = requestAnimationFrame(() => this.animate());

        const t = this.clock ? this.clock.getElapsedTime() : (performance.now() * 0.001);
        const runSpeed = 14.0; // Dynamic run frequency

        if (this.kiroRunGroup) {
            // Vertical bounding/bobbing
            this.kiroRunGroup.position.y = Math.abs(Math.sin(t * runSpeed)) * 0.12 - 0.05;
            
            // Forward body tilting
            this.kiroRunGroup.rotation.z = Math.sin(t * runSpeed) * 0.04;
            this.kiroRunGroup.rotation.y = Math.sin(t * runSpeed * 0.5) * 0.08;
            
            // Squish the body elastically as he hits the ground
            const squish = 1.0 - Math.abs(Math.sin(t * runSpeed)) * 0.06;
            this.kiroRunGroup.scale.set(1.0 + (1.0 - squish) * 0.5, squish, 1.0);
        }

        // Rotate running arms back and forth asynchronously
        if (this.leftArm && this.rightArm) {
            this.leftArm.rotation.x = Math.sin(t * runSpeed) * 0.65;
            this.leftArm.position.z = Math.sin(t * runSpeed) * 0.15;

            this.rightArm.rotation.x = -Math.sin(t * runSpeed) * 0.65;
            this.rightArm.position.z = -Math.sin(t * runSpeed) * 0.15;
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * 🌌 Cinematic Leap Forward Transition
     * Seamlessly leaps Kiro "into" the viewport and wipes the loading overlay.
     */
    triggerTransition() {
        if (this.isComplete) return;
        this.isComplete = true;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        this.updateProgress(100, 'Welcome to Sanctuary!');

        if (typeof gsap !== 'undefined') {
            const tl = gsap.timeline({
                onComplete: () => {
                    this.dispose();
                    if (typeof this.onComplete === 'function') {
                        this.onComplete();
                    }
                }
            });

            // 1. Kiro leaps forward toward camera
            if (this.camera) {
                tl.to(this.camera.position, {
                    z: 1.5,
                    duration: 0.8,
                    ease: "power2.in"
                }, 0);
            }

            // 2. Rotate Kiro rapidly into the warp
            if (this.kiroRunGroup) {
                tl.to(this.kiroRunGroup.rotation, {
                    y: Math.PI * 4,
                    duration: 0.8,
                    ease: "power2.in"
                }, 0);
            }

            // 3. Fade and scale glass card
            const card = this.overlay.querySelector('.preloader-glass-card');
            if (card) {
                tl.to(card, {
                    scale: 0.85,
                    opacity: 0,
                    duration: 0.5,
                    ease: "power2.inOut"
                }, 0.2);
            }

            // 4. Radial wipe of full preloader screen
            tl.to(this.overlay, {
                clipPath: "circle(0% at 50% 50%)",
                duration: 0.85,
                ease: "power3.inOut"
            }, 0.4);
        } else {
            // Immediate fallback
            this.overlay.style.display = 'none';
            this.dispose();
            if (typeof this.onComplete === 'function') {
                this.onComplete();
            }
        }
    }

    dispose() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }
        if (this.renderer) {
            this.renderer.dispose();
            if (this.canvasContainer) {
                this.canvasContainer.innerHTML = '';
            }
        }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}
