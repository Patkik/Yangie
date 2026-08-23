/**
 * 🛰️ Kiro's Cosmic Haven — Unified 3D Engine & Physics (v5.0)
 * Upgraded with 100% GPU-bound Starfield Twinkling & Swirling shaders (eliminating CPU stutters),
 * hard pointer-down guards to freeze the galaxy on clicks, and anime-realistic cel materials.
 */

import kiroState from './state.js';
import { 
    createPlanetShaderMaterial, 
    createNebulaShaderMaterial, 
    createAnimeStarfieldShaderMaterial,
    createAnimeCometShaderMaterial,
    createAnimeAsteroidShaderMaterial
} from './anime-shader-pipeline-v3.js';

export default class KiroUnifiedSceneV5 {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found.`);
            return;
        }

        // WebGL Core
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Group anchors
        this.backgroundCelestialGroup = null; // parent group to stabilize and align parallax [cite: 300]
        this.kiroGroup = null;
        this.galaxyPoints = null;
        this.pedestal = null;
        this.neonRing = null;
        this.goldenAura = null;
        this.nightcap = null;

        // Shaders & Materials
        this.backgroundPlane = null;
        this.starfieldMaterial = null;

        // 3D Cockpit HUD Overlays for Telescope Mode
        this.cockpitGroup = null;
        this.crosshairMesh = null;
        this.targetSystemMeshes = []; // Butterfly, Helix, Sombrero, Crab

        // Interactive states
        this.activeCandies = [];
        this.activeComets = [];
        this.trailParticles = [];
        this.maxTrailCount = 35;
        this.gravity = -4.8;
        this.pointerInCanvas = false;

        // Alignment coordinate vectors for unique space systems
        this.spaceSystems = [
            { id: 'butterfly', name: 'Butterfly Galaxy (NGC 6302)', x: 12, y: -8, z: -15, size: 0.45, color: '#F5C2E7' },
            { id: 'helix', name: 'Eye of Helix Nebula (NGC 7293)', x: -14, y: 15, z: -18, size: 0.55, color: '#94E2D5' },
            { id: 'sombrero', name: 'Sombrero Vortex (M104)', x: 22, y: 14, z: -25, size: 0.6, color: '#F9E2AF' },
            { id: 'crab', name: 'Crab Pulsar Core (M1)', x: -18, y: -16, z: -20, size: 0.5, color: '#CBA6F7' }
        ];

        // Raycasting and timing
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();
        this.animationFrameId = null;
        this.cometInterval = null;

        this.lightDirection = new THREE.Vector3(5, 12, 6).normalize();

        // Thermal Capping
        this.targetFPS = 60;
        this.lastFrameTime = 0;
        this.ecoModeActive = false;

        this.init();
        this.bindState();
    }

    init() {
        this.scene = new THREE.Scene();

        // High-end camera set directly at pilot height
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
        this.camera.position.set(0, 0.4, 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Capped ratio [cite: 33]
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Core Lights Setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
        dirLight.position.copy(this.lightDirection);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        this.ringLight = new THREE.PointLight(0x94E2D5, 1.5, 10);
        this.ringLight.position.set(0, -1.3, 0);
        this.scene.add(this.ringLight);

        // Single parent group for background celestial objects to lock coordinates [cite: 300]
        this.backgroundCelestialGroup = new THREE.Group();
        this.scene.add(this.backgroundCelestialGroup);

        // Build Multi-Layer Universe
        this.buildBackground();
        this.buildGalaxy();
        this.buildEnvironment();
        this.buildAsteroids();
        this.buildKiro();
        this.buildCockpitHUD();

        // Listeners
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.container.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.container.addEventListener('pointerleave', () => { this.pointerInCanvas = false; });
        this.container.addEventListener('pointerenter', () => { this.pointerInCanvas = true; });

        this.animate(0);
    }

    buildBackground() {
        // Large flat background plane carrying our dynamic watercolor fBm nebula
        const bgGeo = new THREE.PlaneGeometry(38, 26);
        const bgMat = createNebulaShaderMaterial();
        this.backgroundPlane = new THREE.Mesh(bgGeo, bgMat);
        this.backgroundPlane.position.set(0, 0, -22.0); // deep background plane
        this.backgroundCelestialGroup.add(this.backgroundPlane);
    }

    buildGalaxy() {
        // 100% GPU-bound Starfield Twinkling & Swirling
        // Completely eliminates CPU Float32Array re-writes to solve stuttering intervals [cite: 300]
        const galaxyCount = 800;
        const galaxyGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(galaxyCount * 3);
        const phases = new Float32Array(galaxyCount);
        const sizes = new Float32Array(galaxyCount);

        for (let i = 0; i < galaxyCount; i++) {
            const arm = i % 2;
            const r = 0.5 + Math.pow(Math.random(), 2.0) * 8.5;
            const angle = (r * 0.45) + (arm * Math.PI) + (Math.random() - 0.5) * 0.45;

            positions[i * 3] = Math.cos(angle) * r;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 2] = Math.sin(angle) * r - 15.0; // depth

            phases[i] = Math.random() * Math.PI * 2;
            sizes[i] = 0.4 + Math.random() * 1.6;
        }

        galaxyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        galaxyGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        galaxyGeo.setAttribute('aSizeMultiplier', new THREE.BufferAttribute(sizes, 1));

        this.starfieldMaterial = createAnimeStarfieldShaderMaterial();
        this.galaxyPoints = new THREE.Points(galaxyGeo, this.starfieldMaterial);
        this.backgroundCelestialGroup.add(this.galaxyPoints);
    }

    buildEnvironment() {
        // Floating pedestal base
        const pedestalGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.32, 32);
        const pedestalMat = new THREE.MeshStandardMaterial({
            color: 0x1E1E2E,
            roughness: 0.8,
            metalness: 0.2
        });
        this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        this.pedestal.position.y = -1.45;
        this.pedestal.receiveShadow = true;
        this.scene.add(this.pedestal);

        // Neon Emerald Ring
        const ringGeo = new THREE.TorusGeometry(1.55, 0.035, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x94E2D5,
            transparent: true,
            opacity: 0.95
        });
        this.neonRing = new THREE.Mesh(ringGeo, ringMat);
        this.neonRing.rotation.x = Math.PI / 2;
        this.neonRing.position.y = -1.28;
        this.scene.add(this.neonRing);
    }

    buildAsteroids() {
        this.asteroids = [];
        const astColors = [0xCDD6F4, 0x94E2D5, 0xCBA6F7];

        for (let i = 0; i < 6; i++) {
            const size = 0.08 + Math.random() * 0.12;
            const astGeo = new THREE.IcosahedronGeometry(size, 1);
            
            // Skyrim-inspired Glowing Auric Cel-Shaded Asteroid [cite: 300]
            const astMat = createAnimeAsteroidShaderMaterial(this.lightDirection);
            astMat.uniforms.uColorLit.value.setHex(astColors[i % astColors.length]);

            const mesh = new THREE.Mesh(astGeo, astMat);
            const radius = 3.5 + Math.random() * 2.5;
            const angle = Math.random() * Math.PI * 2;

            mesh.position.set(Math.cos(angle) * radius, -0.2 + (Math.random() - 0.5) * 0.5, Math.sin(angle) * radius);
            this.scene.add(mesh);

            this.asteroids.push({
                mesh,
                radius,
                angle,
                speed: 0.0015 + Math.random() * 0.002,
                spinX: (Math.random() - 0.5) * 0.02,
                spinY: (Math.random() - 0.5) * 0.02
            });
        }
    }

    buildKiro() {
        this.kiroGroup = new THREE.Group();
        this.kiroGroup.position.set(0, -0.05, 0);
        this.scene.add(this.kiroGroup);

        const mintMaterial = new THREE.MeshStandardMaterial({
            color: 0x4EC9B0,
            roughness: 0.85,
            metalness: 0.05
        });

        // A. Body Mesh
        const bodyGeo = new THREE.SphereGeometry(0.9, 32, 32);
        this.kiroMesh = new THREE.Mesh(bodyGeo, mintMaterial);
        this.kiroMesh.scale.set(1.12, 0.95, 1.12);
        this.kiroMesh.castShadow = true;
        this.kiroMesh.receiveShadow = true;
        this.kiroGroup.add(this.kiroMesh);

        // B. Front White Belly
        const bellyGeo = new THREE.SphereGeometry(0.66, 32, 32);
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xF0EDE8, roughness: 0.9 });
        const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
        bellyMesh.scale.set(1.02, 0.84, 0.45);
        bellyMesh.position.set(0, -0.16, 0.65);
        this.kiroGroup.add(bellyMesh);

        // C. Eyes (Animatable eyelids/shapes)
        const eyeGeo = new THREE.SphereGeometry(0.11, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x11111b, roughness: 0.1, metalness: 0.9 });
        const highlightGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.leftEye.position.set(-0.32, 0.16, 0.78);
        this.leftHighlight = new THREE.Mesh(highlightGeo, highlightMat);
        this.leftHighlight.position.set(-0.28, 0.2, 0.87);
        this.kiroGroup.add(this.leftEye);
        this.kiroGroup.add(this.leftHighlight);

        this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        this.rightEye.position.set(0.32, 0.16, 0.78);
        this.rightHighlight = new THREE.Mesh(highlightGeo, highlightMat);
        this.rightHighlight.position.set(0.36, 0.2, 0.87);
        this.kiroGroup.add(this.rightEye);
        this.kiroGroup.add(this.rightHighlight);

        // D. Snout Pink Button
        const noseGeo = new THREE.SphereGeometry(0.055, 16, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.8 });
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.scale.set(1.2, 0.9, 0.7);
        noseMesh.position.set(0, 0.05, 0.86);
        this.kiroGroup.add(noseMesh);

        // E. Translucent Blush
        const cheekGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16);
        const cheekMat = new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.55 });

        const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
        leftCheek.rotation.x = Math.PI / 2.3;
        leftCheek.rotation.y = -Math.PI / 6;
        leftCheek.position.set(-0.5, 0.02, 0.76);
        this.kiroGroup.add(leftCheek);

        const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
        rightCheek.rotation.x = Math.PI / 2.3;
        rightCheek.rotation.y = Math.PI / 6;
        rightCheek.position.set(0.5, 0.02, 0.76);
        this.kiroGroup.add(rightCheek);

        // F. Side Arms
        const armGeo = new THREE.SphereGeometry(0.22, 16, 16);
        this.leftArm = new THREE.Mesh(armGeo, mintMaterial);
        this.leftArm.scale.set(1.4, 0.75, 0.75);
        this.leftArm.position.set(-0.8, -0.28, 0.18);
        this.leftArm.rotation.set(0, -Math.PI / 4, -Math.PI / 6);
        this.kiroGroup.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, mintMaterial);
        this.rightArm.scale.set(1.4, 0.75, 0.75);
        this.rightArm.position.set(0.8, -0.28, 0.18);
        this.rightArm.rotation.set(0, Math.PI / 4, Math.PI / 6);
        this.kiroGroup.add(this.rightArm);

        // G. Sleeping Nightcap
        this.nightcap = new THREE.Group();
        this.nightcap.position.set(0, 0.8, 0);

        const capGeo = new THREE.ConeGeometry(0.4, 0.9, 16);
        const capMat = new THREE.MeshStandardMaterial({ color: 0xCBA6F7, roughness: 0.7 });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.rotation.z = -0.25;
        this.nightcap.add(capMesh);

        const starPompom = new THREE.Mesh(
            new THREE.DodecahedronGeometry(0.1),
            new THREE.MeshStandardMaterial({ color: 0xF9E2AF, roughness: 0.2 })
        );
        starPompom.position.set(0.16, 0.5, 0.08);
        this.nightcap.add(starPompom);
        this.kiroGroup.add(this.nightcap);
        this.nightcap.visible = kiroState.get('isSleeping');

        // H. Golden Well-Rested Aura Sphere
        const auraGeo = new THREE.SphereGeometry(1.3, 32, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xF9E2AF,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        });
        this.goldenAura = new THREE.Mesh(auraGeo, auraMat);
        this.kiroGroup.add(this.goldenAura);
        this.goldenAura.visible = false;
    }

    buildCockpitHUD() {
        this.cockpitGroup = new THREE.Group();
        this.cockpitGroup.visible = false;
        this.scene.add(this.cockpitGroup);

        // Ring Crosshair Target Reticle
        const ringGeo = new THREE.RingGeometry(0.45, 0.48, 32);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0x4EC9B0, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        this.crosshairMesh = new THREE.Mesh(ringGeo, lineMat);
        this.crosshairMesh.position.set(0, 0.4, -4);
        this.cockpitGroup.add(this.crosshairMesh);

        // Draw HUD alignment lines
        const vertGeo = new THREE.PlaneGeometry(0.012, 1.2);
        const horGeo = new THREE.PlaneGeometry(1.2, 0.012);
        const hLine = new THREE.Mesh(horGeo, lineMat);
        const vLine = new THREE.Mesh(vertGeo, lineMat);
        hLine.position.set(0, 0.4, -4.1);
        vLine.position.set(0, 0.4, -4.1);
        this.cockpitGroup.add(hLine);
        this.cockpitGroup.add(vLine);

        // Build target galaxies with custom planet/cel shaders
        this.spaceSystems.forEach(sys => {
            const planetGeo = new THREE.SphereGeometry(sys.size, 16, 16);
            const meshMat = createPlanetShaderMaterial(sys.color, this.lightDirection);
            const mesh = new THREE.Mesh(planetGeo, meshMat);
            mesh.position.set(sys.x, sys.y, sys.z);
            mesh.userData = { id: sys.id, name: sys.name, material: meshMat, basePos: new THREE.Vector3(sys.x, sys.y, sys.z) };
            
            this.scene.add(mesh);
            this.targetSystemMeshes.push(mesh);
        });
    }

    bindState() {
        kiroState.on('change:isSleeping', (data) => {
            this.nightcap.visible = data.newValue;
            // Sleep eye animation
            const scaleY = data.newValue ? 0.15 : 1.0;
            gsap.to(this.leftEye.scale, { y: scaleY, duration: 0.5 });
            gsap.to(this.rightEye.scale, { y: scaleY, duration: 0.5 });
            gsap.to(this.leftHighlight.scale, { y: scaleY, duration: 0.3 });
            gsap.to(this.rightHighlight.scale, { y: scaleY, duration: 0.3 });
            
            if (data.newValue) {
                this.cometInterval = setInterval(() => this.spawnComet(), 4500);
            } else if (this.cometInterval) {
                clearInterval(this.cometInterval);
            }
        });

        kiroState.on('change:wellbeing', (data) => {
            const scaleFactor = 0.4 + 0.7 * Math.pow(data.newValue / 100, 2);
            gsap.to(this.kiroGroup.scale, {
                x: scaleFactor,
                y: scaleFactor,
                z: scaleFactor,
                duration: 1.0,
                ease: 'power2.out'
            });
        });

        kiroState.on('change:minigameActive', (data) => {
            const isActive = data.newValue;
            if (isActive) {
                // Instantly clean up trail particles to free memory
                this.trailParticles.forEach(part => {
                    this.scene.remove(part.mesh);
                    part.mesh.geometry.dispose();
                    part.mesh.material.dispose();
                });
                this.trailParticles = [];
            }
        });

        kiroState.on('change:telescopeActive', (data) => {
            const isActive = data.newValue;
            this.cockpitGroup.visible = isActive;
            
            gsap.to(this.kiroGroup.position, {
                y: isActive ? -4 : -0.05,
                duration: 1.2,
                ease: "power2.inOut"
            });
            gsap.to(this.pedestal.position, {
                y: isActive ? -5 : -1.45,
                duration: 1.2,
                ease: "power2.inOut"
            });
            gsap.to(this.neonRing.position, {
                y: isActive ? -5 : -1.28,
                duration: 1.2,
                ease: "power2.inOut"
            });
        });
    }

    // Trigger dynamic anime comets (sinusoidal GPU tail wave ribbon)
    spawnComet() {
        const cometCount = 25;
        const cometGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(cometCount * 3);
        const indices = new Float32Array(cometCount);

        const startX = -6.0 - Math.random() * 2.0;
        const startY = 2.0 + Math.random() * 1.5;
        const startZ = -12.0 - Math.random() * 4.0;

        for (let i = 0; i < cometCount; i++) {
            positions[i * 3] = startX - i * 0.12;
            positions[i * 3 + 1] = startY + i * 0.08;
            positions[i * 3 + 2] = startZ;
            indices[i] = i / cometCount;
        }

        cometGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        cometGeo.setAttribute('aIndex', new THREE.BufferAttribute(indices, 1));

        const cometMat = createAnimeCometShaderMaterial();
        const cometPoints = new THREE.Points(cometGeo, cometMat);
        
        this.scene.add(cometPoints);
        
        this.activeComets.push({
            mesh: cometPoints,
            material: cometMat,
            age: 0,
            maxAge: 180,
            speedX: 0.075 + Math.random() * 0.035,
            speedY: -0.045 - Math.random() * 0.025
        });
    }

    dropCandy(type) {
        if (kiroState.get('isSleeping')) return;

        let candyGeo, candyMat;
        if (type === 'star') {
            candyGeo = new THREE.DodecahedronGeometry(0.14);
            candyMat = new THREE.MeshStandardMaterial({ color: 0xF9E2AF, metalness: 0.4, roughness: 0.2 });
        } else if (type === 'donut') {
            candyGeo = new THREE.TorusGeometry(0.12, 0.05, 8, 24);
            candyMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.4 });
        }

        const candyMesh = new THREE.Mesh(candyGeo, candyMat);
        candyMesh.position.set((Math.random() - 0.5) * 1.4, 3.0, 0.5 + (Math.random() - 0.5) * 0.4);
        candyMesh.castShadow = true;
        this.scene.add(candyMesh);

        this.activeCandies.push({
            mesh: candyMesh,
            velocityY: -1.0,
            spinX: (Math.random() - 0.5) * 0.05,
            spinY: (Math.random() - 0.5) * 0.05,
            spinZ: (Math.random() - 0.5) * 0.05
        });

        gsap.to(this.kiroGroup.rotation, { x: -0.15, duration: 0.2, yoyo: true, repeat: 1 });
    }

    triggerWaterSplash() {
        if (kiroState.get('isSleeping')) return;

        const count = 12;
        for (let i = 0; i < count; i++) {
            const dropGeo = new THREE.SphereGeometry(0.04, 8, 8);
            const dropMat = new THREE.MeshBasicMaterial({ color: 0x94E2D5, transparent: true, opacity: 0.85 });
            const drop = new THREE.Mesh(dropGeo, dropMat);
            drop.position.set(0, 0.2, 0.5);
            this.scene.add(drop);

            const theta = Math.random() * Math.PI * 2;
            const hDist = 0.5 + Math.random() * 0.8;
            const duration = 0.5 + Math.random() * 0.4;

            gsap.to(drop.position, {
                x: Math.cos(theta) * hDist,
                y: -1.2 + (Math.random() - 0.5) * 0.3,
                z: Math.sin(theta) * hDist,
                duration: duration,
                ease: 'power1.out'
            });

            gsap.to(drop.scale, {
                x: 0.1, y: 0.1, z: 0.1,
                duration: duration,
                ease: 'power2.in',
                onComplete: () => {
                    this.scene.remove(drop);
                    drop.geometry.dispose();
                    drop.material.dispose();
                }
            });
        }

        const tl = gsap.timeline();
        tl.to(this.kiroGroup.scale, { y: 0.82, x: 1.15, duration: 0.12, ease: \"power2.out\" })
          .to(this.kiroGroup.scale, { y: 1.15, x: 0.88, duration: 0.18, ease: \"power1.inOut\" })
          .to(this.kiroGroup.scale, { y: 1, x: 1, duration: 0.25, ease: \"elastic.out(1, 0.3)\" });
    }

    onPointerDown(event) {
        // HARD POINTER-DOWN GUARD: Disables any coordinate translation of the deep galaxy points [cite: 300]
        if (kiroState.get('telescopeActive')) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.kiroGroup.children, true);

        if (intersects.length > 0) {
            this.triggerPetReaction();
        } else {
            this.triggerTouchTrail(event.clientX, event.clientY);
        }
    }

    onPointerMove(event) {
        // Ignore dragging translating the background galaxy in normal view
        if (this.pointerInCanvas && !kiroState.get('telescopeActive')) {
            this.triggerTouchTrail(event.clientX, event.clientY);
        }

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    triggerPetReaction() {
        if (gsap.isAnimating(this.kiroGroup.position)) return;

        kiroState.emit('petReact', true);

        const tl = gsap.timeline();
        tl.to(this.kiroGroup.position, { y: 0.8, duration: 0.28, ease: 'power1.out' })
          .to(this.kiroGroup.rotation, { y: this.kiroGroup.rotation.y + Math.PI * 2, duration: 0.45, ease: 'power2.inOut' }, 0)
          .to(this.kiroGroup.position, { y: 0, duration: 0.28, ease: 'power1.in' })
          .to(this.kiroGroup.scale, { y: 0.82, x: 1.18, duration: 0.08, ease: 'power2.out' })
          .to(this.kiroGroup.scale, { y: 1, x: 1, duration: 0.22, ease: 'elastic.out(1, 0.3)' });

        this.spawnStarburstParticles();
    }

    spawnStarburstParticles() {
        const pCount = 8;
        for (let i = 0; i < pCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.045),
                new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.95 })
            );
            particle.position.copy(this.kiroGroup.position);
            particle.position.y += 0.15;
            this.scene.add(particle);

            const theta = Math.random() * Math.PI * 2;
            const dist = 1.0 + Math.random() * 0.6;

            gsap.to(particle.position, {
                x: Math.cos(theta) * dist,
                y: 0.6 + Math.random() * 0.6,
                z: Math.sin(theta) * dist,
                duration: 0.75,
                ease: 'power2.out'
            });

            gsap.to(particle.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.75,
                onComplete: () => {
                    this.scene.remove(particle);
                    particle.geometry.dispose();
                    particle.material.dispose();
                }
            });
        }
    }

    triggerTouchTrail(clientX, clientY) {
        if (this.trailParticles.length >= this.maxTrailCount) {
            const oldest = this.trailParticles.shift();
            this.scene.remove(oldest.mesh);
            oldest.mesh.geometry.dispose();
            oldest.mesh.material.dispose();
        }

        const rect = this.renderer.domElement.getBoundingClientRect();
        const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -((clientY - rect.top) / rect.height) * 2 + 1;

        const tempVector = new THREE.Vector3(normX, normY, 0.5);
        tempVector.unproject(this.camera);
        const dir = tempVector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const spawnPos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        const colors = [0x4EC9B0, 0xFFB6C1, 0xF9E2AF, 0x94E2D5];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const pGeo = new THREE.DodecahedronGeometry(0.04);
        const pMat = new THREE.MeshBasicMaterial({ color: randomColor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.copy(spawnPos);
        this.scene.add(pMesh);

        this.trailParticles.push({
            mesh: pMesh,
            velocityY: 0.4 + Math.random() * 0.6,
            velocityX: (Math.random() - 0.5) * 0.5,
            age: 0,
            maxAge: 45
        });
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate(timestamp) {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

        // Enforce solid, cool 60 FPS rate limits to prevent heating issues [cite: 140]
        const delta = timestamp - this.lastFrameTime;
        const interval = 1000 / this.targetFPS;
        if (delta < interval - 0.1) return; // let hardware sleep [cite: 140]
        this.lastFrameTime = timestamp - (delta % interval);

        const t = this.clock.getElapsedTime();

        const isSleeping = kiroState.get('isSleeping');
        const isTelescope = kiroState.get('telescopeActive');
        const isGameActive = kiroState.get('minigameActive') || false;

        // 0. TEMPORARILY PAUSE THE BACKGROUND RENDERING FOR PEAK PERFORMANCE [cite: 300]
        if (isGameActive) {
            if (this.backgroundCelestialGroup && this.backgroundCelestialGroup.visible) {
                this.backgroundCelestialGroup.visible = false;
                
                // Hide asteroids
                if (this.asteroids) {
                    this.asteroids.forEach(ast => ast.mesh.visible = false);
                }
                
                // Cancel active background comet spawn timers
                if (this.cometInterval) {
                    clearInterval(this.cometInterval);
                    this.cometInterval = null;
                }
                
                // Clean up any remaining shooting comets to free WebGL registers
                this.activeComets.forEach(comet => {
                    this.scene.remove(comet.mesh);
                    comet.mesh.geometry.dispose();
                    comet.mesh.material.dispose();
                });
                this.activeComets = [];
            }

            // Render ONLY Kiro, his pedestal base, and core light rings
            if (this.neonRing) this.neonRing.rotation.z -= 0.004;

            this.renderer.render(this.scene, this.camera);
            return; // EXIT EARLY - Bypasses stars, orbits, comets, and steering math! [cite: 300]
        } else {
            // Restore beautiful scenery when exiting the game
            if (this.backgroundCelestialGroup && !this.backgroundCelestialGroup.visible) {
                this.backgroundCelestialGroup.visible = true;
                
                if (this.asteroids) {
                    this.asteroids.forEach(ast => ast.mesh.visible = true);
                }
                
                if (isSleeping) {
                    this.cometInterval = setInterval(() => this.spawnComet(), 4500);
                }
            }
        }
        const steering = kiroState.get('cockpitSteering') || { pitch: 0, yaw: 0 };

        // 1. Interactive Telescope Steering Logic with Parallax Alignment
        if (isTelescope) {
            const steerX = steering.yaw * 0.08;
            const steerY = steering.pitch * 0.08;

            // Smoothly pan elements on navigation (Telescope is Active)
            if (this.backgroundPlane) {
                this.backgroundPlane.position.x = steerX * 0.35;
                this.backgroundPlane.position.y = steerY * 0.35;
            }

            if (this.galaxyPoints) {
                this.galaxyPoints.position.x = steerX;
                this.galaxyPoints.position.y = steerY;
            }

            // Translate 3D planet positions
            this.targetSystemMeshes.forEach(mesh => {
                const base = mesh.userData.basePos;
                mesh.position.x = base.x + (steering.yaw * 0.15);
                mesh.position.y = base.y + (steering.pitch * 0.15);

                mesh.rotation.y += 0.008;
                mesh.rotation.x += 0.003;

                if (mesh.userData.material && mesh.userData.material.uniforms) {
                    mesh.userData.material.uniforms.uTime.value = t;
                }

                // Crosshair lock-on evaluation
                const distanceToHUD = Math.sqrt(Math.pow(mesh.position.x, 2) + Math.pow(mesh.position.y - 0.4, 2));
                if (distanceToHUD < 0.65) {
                    if (kiroState.get('cockpitSteering.currentTarget') !== mesh.userData.id) {
                        kiroState.set('cockpitSteering.currentTarget', mesh.userData.id);
                        kiroState.set('cockpitSteering.aligned', true);
                    }
                }
            });
        } else {
            // HARD POINTER GUARD: Force background coordinates to reset and freeze in place [cite: 300]
            if (this.backgroundPlane) {
                this.backgroundPlane.position.x += (0 - this.backgroundPlane.position.x) * 0.1;
                this.backgroundPlane.position.y += (0 - this.backgroundPlane.position.y) * 0.1;
            }
            if (this.galaxyPoints) {
                this.galaxyPoints.position.x += (0 - this.galaxyPoints.position.x) * 0.1;
                this.galaxyPoints.position.y += (0 - this.galaxyPoints.position.y) * 0.1;
            }
        }

        // 2. Kiro Idle Bobbing Animations
        if (!isTelescope && !gsap.isAnimating(this.kiroGroup.position)) {
            const mood = kiroState.get('mood');
            let freq = isSleeping ? 0.55 : (mood === 'thriving' ? 2.4 : 1.7);
            let amp = isSleeping ? 0.012 : (mood === 'thriving' ? 0.11 : 0.075);
            this.kiroGroup.position.y = Math.sin(t * freq) * amp;
        }

        // 3. Candy Falling Physics updates
        for (let i = this.activeCandies.length - 1; i >= 0; i--) {
            const candy = this.activeCandies[i];
            candy.velocityY += this.gravity * 0.016;
            candy.mesh.position.y += candy.velocityY * 0.016;
            candy.mesh.rotation.x += candy.spinX;
            candy.mesh.rotation.y += candy.spinY;

            const snoutPos = new THREE.Vector3(0, 0.04, 0.82).applyMatrix4(this.kiroGroup.matrixWorld);
            const dist = candy.mesh.position.distanceTo(snoutPos);

            if (dist < 0.35) {
                this.scene.remove(candy.mesh);
                candy.mesh.geometry.dispose();
                candy.mesh.material.dispose();
                this.activeCandies.splice(i, 1);

                kiroState.emit('candyEaten', { type: 'yum' });
                this.triggerPetReaction();
                continue;
            }

            if (candy.mesh.position.y <= -1.4) {
                this.scene.remove(candy.mesh);
                candy.mesh.geometry.dispose();
                candy.mesh.material.dispose();
                this.activeCandies.splice(i, 1);
                kiroState.emit('candyEaten', { type: 'splat' });
            }
        }

        // 4. Stardust Pointer Trail
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            const part = this.trailParticles[i];
            part.age++;
            part.mesh.position.y += part.velocityY * 0.016;
            part.mesh.position.x += part.velocityX * 0.016;

            const life = 1.0 - (part.age / part.maxAge);
            part.mesh.scale.set(life, life, life);

            if (part.age >= part.maxAge) {
                this.scene.remove(part.mesh);
                part.mesh.geometry.dispose();
                part.mesh.material.dispose();
                this.trailParticles.splice(i, 1);
            }
        }

        // 5. 100% GPU-bound star and background updates
        if (this.backgroundPlane) {
            this.backgroundPlane.material.uniforms.uTime.value = t;
        }

        if (this.starfieldMaterial) {
            this.starfieldMaterial.uniforms.uTime.value = t;
        }

        // 6. Update Active Comets ( Sinusoidal tail waved on GPU )
        for (let i = this.activeComets.length - 1; i >= 0; i--) {
            const comet = this.activeComets[i];
            comet.age++;

            comet.mesh.position.x += comet.speedX;
            comet.mesh.position.y += comet.speedY;

            comet.material.uniforms.uTime.value = t;

            if (comet.age >= comet.maxAge) {
                this.scene.remove(comet.mesh);
                comet.mesh.geometry.dispose();
                comet.mesh.material.dispose();
                this.activeComets.splice(i, 1);
            }
        }

        // 7. Update Asteroids orbits
        this.asteroids.forEach(ast => {
            ast.angle += ast.speed;
            ast.mesh.position.x = Math.cos(ast.angle) * ast.radius;
            ast.mesh.position.z = Math.sin(ast.angle) * ast.radius;
            
            ast.mesh.rotation.x += ast.spinX;
            ast.mesh.rotation.y += ast.spinY;

            if (ast.mesh.material && ast.mesh.material.uniforms && ast.mesh.material.uniforms.uTime) {
                ast.mesh.material.uniforms.uTime.value = t;
            }
        });

        // 8. Pedestal and Audio Synesthesia
        if (this.neonRing) this.neonRing.rotation.z -= 0.004;

        const audioLevel = kiroState.get('audioReactiveLevel') || 0;
        const auraColor = isSleeping ? 0xCBA6F7 : 0xF9E2AF;

        if (this.goldenAura) {
            this.goldenAura.material.color.setHex(auraColor);
            const scale = 1.0 + audioLevel * 0.35;
            this.goldenAura.scale.set(scale, scale, scale);
            this.goldenAura.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.02 + audioLevel * 0.15;
        }

        if (this.ringLight) {
            this.ringLight.intensity = (isSleeping ? 0.6 : 1.5) + audioLevel * 1.2;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('resize', this.onWindowResize);
        this.container.removeEventListener('pointerdown', this.onPointerDown);
        this.container.removeEventListener('pointermove', this.onPointerMove);
        if (this.cometInterval) clearInterval(this.cometInterval);

        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }
}
