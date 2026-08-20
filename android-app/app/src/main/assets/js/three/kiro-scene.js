/**
 * Kiro Scene Module (kiro-scene.js)
 * Implements the 3D procedural pet model of Kiro, accessories, animations, and scene environment.
 */

class KiroScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found.`);
            return;
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.kiroGroup = null; // Group holding all Kiro meshes
        this.orbitingStars = null; // Star system
        this.pedestal = null; // Cylinder base
        this.neonRing = null; // Emerald ring

        // Raycasting for direct petting interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Accessories and States
        this.nightcap = null;
        this.goldenAura = null;
        
        // Pet State variables
        this.isSleeping = false;
        this.hasWellRestedBuff = false;
        this.wellbeing = 100; // 0 to 100
        this.mood = "thriving"; // thriving, happy, okay, sleeping

        // Animation timing
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        // 1. Scene setup
        this.scene = new THREE.Scene();

        // 2. Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight || 1;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
        this.camera.position.set(0, 2, 7);

        // 3. Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // 4. Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        const pointLight = new THREE.PointLight(0x94E2D5, 1.2, 10);
        pointLight.position.set(0, -1, 0); // Under-lighting from emerald ring
        this.scene.add(pointLight);

        // 5. Build Environment
        this.buildEnvironment();

        // 6. Build Kiro
        this.buildKiro();

        // 7. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.setupPettingRaycaster();

        // 8. Start loop
        this.animate();
    }

    setupPettingRaycaster() {
        const handlePet = (clientX, clientY) => {
            if (!this.container || !this.camera || !this.kiroGroup) return;
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.kiroGroup.children, true);
            if (intersects.length > 0) {
                this.triggerPetReaction();
            }
        };

        this.container.addEventListener('click', (e) => handlePet(e.clientX, e.clientY));
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches && e.touches.length > 0) {
                handlePet(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: true });
    }

    buildEnvironment() {
        // Pedestal: Floating Dark Cylinder Island (#1B2A38)
        const pedestalGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.4, 32);
        const pedestalMat = new THREE.MeshStandardMaterial({
            color: 0x1B2A38,
            roughness: 0.6,
            metalness: 0.2
        });
        this.pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
        this.pedestal.position.y = -1.6;
        this.pedestal.receiveShadow = true;
        this.scene.add(this.pedestal);

        // Emerald Neon Ring (#94E2D5) around the top of the pedestal
        const ringGeo = new THREE.TorusGeometry(1.85, 0.05, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x94E2D5,
            transparent: true,
            opacity: 0.9
        });
        this.neonRing = new THREE.Mesh(ringGeo, ringMat);
        this.neonRing.rotation.x = Math.PI / 2;
        this.neonRing.position.y = -1.4;
        this.scene.add(this.neonRing);

        // 35 Orbiting Golden Star Sparkles (THREE.Points)
        const starCount = 35;
        const starGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const phases = [];

        for (let i = 0; i < starCount; i++) {
            const r = 2.0 + Math.random() * 1.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 0.2;
            positions[i * 3 + 2] = r * Math.cos(phi);

            phases.push(Math.random() * Math.PI * 2);
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const starMat = new THREE.PointsMaterial({
            color: 0xF9E2AF,
            size: 0.08,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.orbitingStars = new THREE.Points(starGeo, starMat);
        this.orbitingStars.userData = { phases: phases };
        this.scene.add(this.orbitingStars);
    }

    buildKiro() {
        this.kiroGroup = new THREE.Group();
        this.kiroGroup.position.set(0, 0, 0);
        this.scene.add(this.kiroGroup);

        // Common Materials
        const mintMaterial = new THREE.MeshStandardMaterial({
            color: 0x4EC9B0, // Mint/teal (#4EC9B0)
            roughness: 0.85,
            metalness: 0.05
        });

        // A. Body Shape: Cute, round, slightly squashed mint/teal sphere
        const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
        const bodyMesh = new THREE.Mesh(bodyGeo, mintMaterial);
        bodyMesh.scale.set(1.1, 0.95, 1.1);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.kiroGroup.add(bodyMesh);

        // B. Belly: Creamy off-white front patch (#F0EDE8)
        const bellyGeo = new THREE.SphereGeometry(0.72, 32, 32);
        const bellyMat = new THREE.MeshStandardMaterial({
            color: 0xF0EDE8,
            roughness: 0.9,
            metalness: 0.0
        });
        const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
        bellyMesh.scale.set(1.0, 0.85, 0.5);
        bellyMesh.position.set(0, -0.15, 0.72);
        this.kiroGroup.add(bellyMesh);

        // C. Eyes & Highlights: Dark obsidian spherical eyes (#1A3A3A) with bright starlight dots (#FFFFFF)
        const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x1A3A3A,
            roughness: 0.1,
            metalness: 0.9
        });
        const highlightGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const highlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });

        // Left Eye
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.35, 0.18, 0.85);
        const leftHighlight = new THREE.Mesh(highlightGeo, highlightMat);
        leftHighlight.position.set(-0.31, 0.22, 0.95);
        this.kiroGroup.add(leftEye);
        this.kiroGroup.add(leftHighlight);

        // Right Eye
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.35, 0.18, 0.85);
        const rightHighlight = new THREE.Mesh(highlightGeo, highlightMat);
        rightHighlight.position.set(0.39, 0.22, 0.95);
        this.kiroGroup.add(rightEye);
        this.kiroGroup.add(rightHighlight);

        // D. Snout / Nose: Tiny soft pastel pink button nose (#F5B7C0)
        const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
        const noseMat = new THREE.MeshStandardMaterial({
            color: 0xF5B7C0,
            roughness: 0.8
        });
        const noseMesh = new THREE.Mesh(noseGeo, noseMat);
        noseMesh.scale.set(1.2, 1.0, 0.8);
        noseMesh.position.set(0, 0.06, 0.95);
        this.kiroGroup.add(noseMesh);

        // E. Cheeks: Two translucent pastel pink blush discs (#FFB6C1, 55% opacity)
        const cheekGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16);
        const cheekMat = new THREE.MeshBasicMaterial({
            color: 0xFFB6C1,
            transparent: true,
            opacity: 0.55
        });

        // Left Cheek
        const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
        leftCheek.rotation.x = Math.PI / 2.3;
        leftCheek.rotation.y = -Math.PI / 6;
        leftCheek.position.set(-0.55, 0.02, 0.82);
        this.kiroGroup.add(leftCheek);

        // Right Cheek
        const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
        rightCheek.rotation.x = Math.PI / 2.3;
        rightCheek.rotation.y = Math.PI / 6;
        rightCheek.position.set(0.55, 0.02, 0.82);
        this.kiroGroup.add(rightCheek);

        // F. Arms / Flippers: Two mint side paws/flippers angled outward
        const armGeo = new THREE.SphereGeometry(0.24, 16, 16);
        const leftArm = new THREE.Mesh(armGeo, mintMaterial);
        leftArm.scale.set(1.5, 0.8, 0.8);
        leftArm.position.set(-0.9, -0.3, 0.2);
        leftArm.rotation.set(0, -Math.PI / 4, -Math.PI / 6);
        this.kiroGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, mintMaterial);
        rightArm.scale.set(1.5, 0.8, 0.8);
        rightArm.position.set(0.9, -0.3, 0.2);
        rightArm.rotation.set(0, Math.PI / 4, Math.PI / 6);
        this.kiroGroup.add(rightArm);

        // G. Sleeping Nightcap Accessories
        this.buildNightcap();

        // H. Golden Aura
        this.buildGoldenAura();
    }

    buildNightcap() {
        this.nightcap = new THREE.Group();
        this.nightcap.position.set(0, 0.9, 0);

        const capGeo = new THREE.ConeGeometry(0.45, 1.0, 16);
        const capMat = new THREE.MeshStandardMaterial({
            color: 0xCBA6F7,
            roughness: 0.7,
            metalness: 0.1
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.rotation.z = -0.25;
        capMesh.rotation.x = -0.15;
        this.nightcap.add(capMesh);

        const starGeo = new THREE.DodecahedronGeometry(0.12);
        const starMat = new THREE.MeshStandardMaterial({
            color: 0xF9E2AF,
            metalness: 0.5,
            roughness: 0.2
        });
        const starMesh = new THREE.Mesh(starGeo, starMat);
        starMesh.position.set(0.18, 0.55, 0.1);
        this.nightcap.add(starMesh);

        this.kiroGroup.add(this.nightcap);
        this.nightcap.visible = this.isSleeping;
    }

    buildGoldenAura() {
        const auraGeo = new THREE.SphereGeometry(1.4, 32, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: 0xF9E2AF,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide
        });
        this.goldenAura = new THREE.Mesh(auraGeo, auraMat);
        this.kiroGroup.add(this.goldenAura);
        this.goldenAura.visible = this.hasWellRestedBuff;
    }

    updateState(states) {
        if (!states) return;
        if (states.isSleeping !== undefined) {
            this.isSleeping = states.isSleeping;
            if (this.nightcap) this.nightcap.visible = this.isSleeping;
        }
        if (states.hasWellRestedBuff !== undefined) {
            this.hasWellRestedBuff = states.hasWellRestedBuff;
            if (this.goldenAura) this.goldenAura.visible = this.hasWellRestedBuff;
        }
        if (states.wellbeing !== undefined) {
            this.wellbeing = states.wellbeing;
            const scaleFactor = 0.4 + 0.7 * Math.pow(this.wellbeing / 100, 2);
            
            if (window.gsap && this.kiroGroup) {
                gsap.to(this.kiroGroup.scale, {
                    x: scaleFactor,
                    y: scaleFactor,
                    z: scaleFactor,
                    duration: 1.2,
                    ease: "power2.out"
                });
            } else if (this.kiroGroup) {
                this.kiroGroup.scale.set(scaleFactor, scaleFactor, scaleFactor);
            }
        }
        if (states.mood !== undefined) {
            this.mood = states.mood;
        }
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    resize() {
        this.onWindowResize();
    }

    // Direct Petting interaction using GSAP triggers
    triggerPetReaction() {
        if (!window.gsap || !this.kiroGroup) return;

        const jumpTimeline = gsap.timeline();
        
        jumpTimeline.to(this.kiroGroup.position, {
            y: 0.8,
            duration: 0.35,
            ease: "power1.out"
        })
        .to(this.kiroGroup.rotation, {
            y: this.kiroGroup.rotation.y + Math.PI * 2,
            duration: 0.6,
            ease: "sine.inOut"
        }, 0)
        .to(this.kiroGroup.position, {
            y: 0,
            duration: 0.35,
            ease: "power1.in"
        })
        .to(this.kiroGroup.scale, {
            y: 0.85,
            x: 1.15,
            duration: 0.1,
            ease: "power2.out"
        })
        .to(this.kiroGroup.scale, {
            y: 1,
            x: 1,
            duration: 0.2,
            ease: "elastic.out(1, 0.3)"
        });

        this.createHeartsEffect();

        if (typeof onKiroWellRested === 'function' && this.wellbeing >= 90) {
            onKiroWellRested();
        }
    }

    createHeartsEffect() {
        if (!window.gsap) return;
        const sparkleCount = 8;
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleGeo = new THREE.DodecahedronGeometry(0.06);
            const sparkleMat = new THREE.MeshBasicMaterial({
                color: 0xFFB6C1,
                transparent: true,
                opacity: 0.9
            });
            const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
            
            const theta = Math.random() * Math.PI * 2;
            const targetDist = 1.2 + Math.random() * 0.8;
            
            sparkle.position.set(0, 0.2, 0.1);
            this.scene.add(sparkle);

            gsap.to(sparkle.position, {
                x: Math.cos(theta) * targetDist,
                y: 0.5 + Math.random() * 0.8,
                z: Math.sin(theta) * targetDist,
                duration: 0.8,
                ease: "power2.out"
            });

            gsap.to(sparkle.scale, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.8,
                ease: "power2.in",
                onComplete: () => {
                    this.scene.remove(sparkle);
                    sparkleGeo.dispose();
                    sparkleMat.dispose();
                }
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const t = this.clock.getElapsedTime();

        // 1. Idle Bobbing
        let freq = 1.5;
        let amp = 0.08;

        if (this.isSleeping || this.mood === "sleeping") {
            freq = 0.6;
            amp = 0.02;
            this.kiroGroup.rotation.z = Math.sin(t * 0.5) * 0.04;
        } else if (this.mood === "thriving") {
            freq = 2.4;
            amp = 0.12;
            this.kiroGroup.rotation.y = Math.sin(t * 1.2) * 0.15;
        } else if (this.mood === "happy") {
            freq = 1.8;
            amp = 0.08;
            this.kiroGroup.rotation.y = Math.sin(t * 0.8) * 0.08;
        } else if (this.mood === "okay") {
            freq = 1.2;
            amp = 0.05;
        }

        if (window.gsap && !gsap.isAnimating(this.kiroGroup.position)) {
            this.kiroGroup.position.y = Math.sin(t * freq) * amp;
        } else if (!window.gsap) {
            this.kiroGroup.position.y = Math.sin(t * freq) * amp;
        }

        // 2. Orbiting stars animation
        if (this.orbitingStars) {
            const positions = this.orbitingStars.geometry.attributes.position.array;
            const phases = this.orbitingStars.userData.phases;
            const count = positions.length / 3;

            for (let i = 0; i < count; i++) {
                phases[i] += 0.01;
                positions[i * 3 + 1] += Math.sin(phases[i]) * 0.002;
                
                const x = positions[i * 3];
                const z = positions[i * 3 + 2];
                const angle = 0.005;
                positions[i * 3] = x * Math.cos(angle) - z * Math.sin(angle);
                positions[i * 3 + 2] = x * Math.sin(angle) + z * Math.cos(angle);
            }
            this.orbitingStars.geometry.attributes.position.needsUpdate = true;
        }

        // 3. Rotate neon pedestal ring
        if (this.neonRing) {
            this.neonRing.rotation.z += 0.008;
        }

        // 4. Glow aura breathing
        if (this.goldenAura && this.hasWellRestedBuff) {
            this.goldenAura.material.opacity = 0.10 + Math.sin(t * 2) * 0.04;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

window.KiroScene = KiroScene;
