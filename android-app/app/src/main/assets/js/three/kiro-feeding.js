/**
 * Kiro Feeding Module (kiro-feeding.js)
 * Extends the KiroScene to add interactive 3D feeding mechanics, candy physics,
 * chewing animations, sweet particles, and procedural sound effects.
 */

class KiroFeedingManager {
    constructor(kiroScene, synthEngine = null) {
        if (!kiroScene) {
            console.error("KiroFeedingManager requires an active KiroScene instance.");
            return;
        }
        this.kiroScene = kiroScene;
        this.synthEngine = synthEngine || window.synthEngine;
        this.activeCandies = [];
        
        // Setup internal update loop integration
        this.patchSceneLoop();
    }

    /**
     * Intercepts and extends KiroScene's animation loop to update falling candies.
     */
    patchSceneLoop() {
        const originalAnimate = this.kiroScene.animate;
        const self = this;

        this.kiroScene.animate = function() {
            self.updateCandies();
            originalAnimate.call(this);
        };
    }

    /**
     * Spawns a 3D candy at the top of the viewport and lets it fall towards Kiro.
     * @param {string} candyType - 'star' (golden star), 'donut' (strawberry donut), or 'gummy' (translucent jelly bean)
     */
    dropCandy(candyType = 'star') {
        if (this.kiroScene.isSleeping) {
            this.showFloatingText("Zzz...", 0x89DCEB);
            return;
        }

        // 1. Create Candy Mesh based on type
        let candyMesh;
        const candyGroup = new THREE.Group();

        switch (candyType) {
            case 'donut':
                const donutGeo = new THREE.TorusGeometry(0.12, 0.05, 8, 24);
                const donutMat = new THREE.MeshStandardMaterial({
                    color: 0xFFB6C1,
                    roughness: 0.3,
                    metalness: 0.1
                });
                const donut = new THREE.Mesh(donutGeo, donutMat);
                donut.rotation.x = Math.PI / 2;
                candyGroup.add(donut);

                const sprinkleMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
                const sprinkleGeo = new THREE.BoxGeometry(0.02, 0.01, 0.05);
                for (let i = 0; i < 6; i++) {
                    const sprinkle = new THREE.Mesh(sprinkleGeo, sprinkleMat);
                    const angle = (i / 6) * Math.PI * 2;
                    sprinkle.position.set(Math.cos(angle) * 0.12, 0.02, Math.sin(angle) * 0.12);
                    sprinkle.rotation.y = -angle + (Math.random() * 0.5 - 0.25);
                    candyGroup.add(sprinkle);
                }
                candyMesh = candyGroup;
                break;

            case 'gummy':
                const gummyGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.08, 0.14, 8, 16) : new THREE.CylinderGeometry(0.08, 0.08, 0.14, 16);
                const gummyMat = new THREE.MeshStandardMaterial({
                    color: 0x94E2D5,
                    roughness: 0.1,
                    metalness: 0.1,
                    transparent: true,
                    opacity: 0.85
                });
                candyMesh = new THREE.Mesh(gummyGeo, gummyMat);
                break;

            case 'star':
            default:
                const starShape = new THREE.Shape();
                const spikes = 5;
                const outerRadius = 0.16;
                const innerRadius = 0.07;
                let rot = Math.PI / 2 * 3;
                let cx = 0, cy = 0;
                const step = Math.PI / spikes;

                starShape.moveTo(cx, cy - outerRadius);
                for (let i = 0; i < spikes; i++) {
                    cx = Math.cos(rot) * outerRadius;
                    cy = Math.sin(rot) * outerRadius;
                    starShape.lineTo(cx, cy);
                    rot += step;

                    cx = Math.cos(rot) * innerRadius;
                    cy = Math.sin(rot) * innerRadius;
                    starShape.lineTo(cx, cy);
                    rot += step;
                }
                starShape.lineTo(0, -outerRadius);

                const extrudeSettings = {
                    depth: 0.05,
                    bevelEnabled: true,
                    bevelSegments: 2,
                    steps: 1,
                    bevelSize: 0.01,
                    bevelThickness: 0.01
                };

                const starGeo = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
                const starMat = new THREE.MeshStandardMaterial({
                    color: 0xF9E2AF,
                    roughness: 0.2,
                    metalness: 0.4
                });
                candyMesh = new THREE.Mesh(starGeo, starMat);
                candyMesh.geometry.center();
                break;
        }

        candyMesh.position.set(
            (Math.random() * 0.4 - 0.2),
            4.0,
            0.85
        );
        candyMesh.castShadow = true;
        
        candyMesh.userData = {
            vy: -0.06,
            ay: -0.004,
            rotSpeedX: Math.random() * 0.04 - 0.02,
            rotSpeedY: Math.random() * 0.04 - 0.02,
            rotSpeedZ: Math.random() * 0.04 - 0.02,
            type: candyType
        };

        this.kiroScene.scene.add(candyMesh);
        this.activeCandies.push(candyMesh);
    }

    /**
     * Updates physics, collision boundaries, and animation updates for falling candies.
     */
    updateCandies() {
        const collisionRadius = 0.65;

        for (let i = this.activeCandies.length - 1; i >= 0; i--) {
            const candy = this.activeCandies[i];
            
            // 1. Apply Gravitational Physics
            candy.userData.vy += candy.userData.ay;
            candy.position.y += candy.userData.vy;

            // Apply spin
            candy.rotation.x += candy.userData.rotSpeedX;
            candy.rotation.y += candy.userData.rotSpeedY;
            candy.rotation.z += candy.userData.rotSpeedZ;

            // 2. Collision Detection
            if (this.kiroScene.kiroGroup) {
                const dx = candy.position.x - this.kiroScene.kiroGroup.position.x;
                const dy = candy.position.y - (this.kiroScene.kiroGroup.position.y + 0.15);
                const dz = candy.position.z - (this.kiroScene.kiroGroup.position.z + 0.8);
                const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

                if (distance < collisionRadius && candy.position.y > -0.2) {
                    this.kiroEatsCandy(candy);
                    this.activeCandies.splice(i, 1);
                    continue;
                }
            }

            // 3. Pedestal/Floor collision fallback
            if (candy.position.y < -1.4) {
                this.candySplashesOnPedestal(candy);
                this.activeCandies.splice(i, 1);
            }
        }
    }

    /**
     * Triggered when a candy successfully reaches Kiro's mouth.
     */
    kiroEatsCandy(candy) {
        this.kiroScene.scene.remove(candy);
        
        // 1. Play Procedural Chewing Sound FX
        this.playChewingSound();

        // 2. Trigger Cute Chewing Squash-and-Stretch Animation using GSAP
        this.triggerChewingAnimation();

        // 3. Emit delicious candy crumb particles
        this.emitCandyCrumbs(candy.position, candy.userData.type);

        // 4. Update state values & boost happiness
        const happinessBoost = candy.userData.type === 'star' ? 12 : 8;
        const newWellbeing = Math.min(100, (this.kiroScene.wellbeing || 80) + happinessBoost);
        
        this.kiroScene.updateState({
            wellbeing: newWellbeing,
            mood: newWellbeing > 80 ? 'thriving' : 'happy'
        });

        // 5. Spawn "Yum!" sweet text popup
        const expressions = ["Yum! ♥", "Oishi!", "Sweet! ✨", "Nom Nom!"];
        const phrase = expressions[Math.floor(Math.random() * expressions.length)];
        const textColor = candy.userData.type === 'donut' ? 0xFFB6C1 : (candy.userData.type === 'gummy' ? 0x94E2D5 : 0xF9E2AF);
        this.showFloatingText(phrase, textColor);
    }

    /**
     * Fallback for missed candies landing on the pedestal cylinder.
     */
    candySplashesOnPedestal(candy) {
        if (!window.gsap) {
            this.kiroScene.scene.remove(candy);
            return;
        }
        gsap.to(candy.scale, {
            x: 0.1,
            y: 0.01,
            z: 0.1,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => {
                this.kiroScene.scene.remove(candy);
                if (candy.geometry) candy.geometry.dispose();
                if (candy.material) {
                    if (Array.isArray(candy.material)) {
                        candy.material.forEach(m => m.dispose());
                    } else {
                        candy.material.dispose();
                    }
                }
            }
        });
    }

    /**
     * Generates physical candy crumb particles bursting from Kiro's mouth.
     */
    emitCandyCrumbs(position, candyType) {
        if (!window.gsap) return;
        const crumbCount = 10;
        let color = 0xF9E2AF;
        if (candyType === 'donut') color = 0xFFB6C1;
        if (candyType === 'gummy') color = 0x94E2D5;

        for (let i = 0; i < crumbCount; i++) {
            const crumbGeo = new THREE.DodecahedronGeometry(0.04);
            const crumbMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.95
            });
            const crumb = new THREE.Mesh(crumbGeo, crumbMat);
            crumb.position.copy(position);
            this.kiroScene.scene.add(crumb);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const force = 0.5 + Math.random() * 0.7;

            gsap.to(crumb.position, {
                x: crumb.position.x + Math.sin(phi) * Math.cos(theta) * force,
                y: crumb.position.y + Math.sin(phi) * Math.sin(theta) * force - 0.2,
                z: crumb.position.z + Math.cos(phi) * force,
                duration: 0.6,
                ease: "power2.out"
            });

            gsap.to(crumb.scale, {
                x: 0,
                y: 0,
                z: 0,
                duration: 0.6,
                ease: "power2.in",
                onComplete: () => {
                    this.kiroScene.scene.remove(crumb);
                    crumbGeo.dispose();
                    crumbMat.dispose();
                }
            });
        }
    }

    /**
     * Smooth squash/stretch chewy loop on Kiro using GSAP.
     */
    triggerChewingAnimation() {
        if (!window.gsap || !this.kiroScene.kiroGroup) return;

        const chewTimeline = gsap.timeline();
        const baseScale = 0.4 + 0.7 * Math.pow((this.kiroScene.wellbeing || 80) / 100, 2);

        chewTimeline.to(this.kiroScene.kiroGroup.scale, {
            y: baseScale * 0.78,
            x: baseScale * 1.15,
            duration: 0.12,
            ease: "power1.out"
        })
        .to(this.kiroScene.kiroGroup.scale, {
            y: baseScale * 1.12,
            x: baseScale * 0.9,
            duration: 0.12,
            ease: "power1.inOut"
        })
        .to(this.kiroScene.kiroGroup.scale, {
            y: baseScale * 0.82,
            x: baseScale * 1.1,
            duration: 0.1,
            ease: "power1.inOut"
        })
        .to(this.kiroScene.kiroGroup.scale, {
            x: baseScale,
            y: baseScale,
            z: baseScale,
            duration: 0.2,
            ease: "elastic.out(1, 0.3)"
        });
    }

    /**
     * Synthesizes a sweet, arcade-like chew and gulp sound procedurally using Web Audio API.
     */
    playChewingSound() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const ctx = (this.synthEngine && this.synthEngine.ctx) ? this.synthEngine.ctx : new AudioContextClass();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const bufferSize = ctx.sampleRate * 0.08;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = buffer;

            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1200, ctx.currentTime);
            noiseFilter.Q.setValueAtTime(3.0, ctx.currentTime);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);

            gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            noiseNode.start();
            osc.start();
            osc.stop(ctx.currentTime + 0.15);

        } catch (e) {
            console.warn("Procedural sound synthesis failed:", e);
        }
    }

    /**
     * Floating text popup rendering in 3D space above Kiro's head.
     */
    showFloatingText(text, hexColor = 0xFFFFFF) {
        const div = document.createElement('div');
        div.className = 'kiro-floating-yum';
        div.innerText = text;
        div.style.position = 'absolute';
        div.style.color = `#${hexColor.toString(16).padStart(6, '0')}`;
        div.style.fontFamily = '"Space Grotesk", "Quicksand", system-ui, sans-serif';
        div.style.fontWeight = 'bold';
        div.style.fontSize = '1.2rem';
        div.style.textShadow = '0 2px 4px rgba(0,0,0,0.5), 0 0 10px rgba(255,255,255,0.2)';
        div.style.pointerEvents = 'none';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
        div.style.opacity = '1';
        div.style.zIndex = '1000';
        
        if (this.kiroScene.container) {
            this.kiroScene.container.appendChild(div);

            const tempV = new THREE.Vector3(0, 1.2, 0);
            
            const updatePosition = () => {
                if (!this.kiroScene.camera || !this.kiroScene.renderer) return;
                const vector = tempV.clone().project(this.kiroScene.camera);
                const x = (vector.x *  .5 + .5) * this.kiroScene.container.clientWidth;
                const y = (vector.y * -.5 + .5) * this.kiroScene.container.clientHeight;
                div.style.left = `${x}px`;
                div.style.top = `${y}px`;
            };

            updatePosition();

            requestAnimationFrame(() => {
                tempV.y += 0.8;
                div.style.opacity = '0';
                div.style.transform = 'translate(-50%, -120%) scale(1.3)';
            });

            const alignInterval = setInterval(updatePosition, 16);

            setTimeout(() => {
                clearInterval(alignInterval);
                if (div.parentNode) {
                    div.parentNode.removeChild(div);
                }
            }, 800);
        }
    }
}

window.KiroFeedingManager = KiroFeedingManager;
