/**
 * 🛰️ Kiro's Cosmic Haven — Master Skyrim-Inspired Anime Shader Pipeline (V7.0 / V9.2)
 * 100% Procedural Shaders, Hand-Drawn Watercolors, and Swirling Vortex effects.
 * Calculated entirely on the GPU at 120 FPS on mobile WebViews.
 *
 * Grounded in the Twilight Celestial Color Space:
 *   Midnight: #11111b, Mint-Teal: #4ec9b0, Pastel-Pink: #f5c2e7,
 *   Gold-Glow: #f9e2af, Emerald-Neon: #94e2d5, Lavender-Cone: #cba6f7
 */

export const TwilightTokens = {
    midnight: '#11111b',
    mintTeal: '#4ec9b0',
    pastelPink: '#f5c2e7',
    goldGlow: '#f9e2af',
    emeraldNeon: '#94e2d5',
    lavenderCone: '#cba6f7',
    lavenderGray: '#cdd6f4'
};

const GLSL_NOISE_FUNCTIONS = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;

// =============================================================================
// 1. Anime Cel-Shaded Planet Shader Material
// =============================================================================
export function createPlanetShaderMaterial(planetColorHex = TwilightTokens.mintTeal, lightDirVector = new THREE.Vector3(0.8, 1.0, 0.6)) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBaseColor: { value: new THREE.Color(planetColorHex) },
      uAtmosphereColor: { value: new THREE.Color(TwilightTokens.emeraldNeon) },
      uLightDir: { value: lightDirVector.clone().normalize() },
      uShadowColor: { value: new THREE.Color(TwilightTokens.midnight) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uAtmosphereColor;
      uniform vec3 uLightDir;
      uniform vec3 uShadowColor;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewDir;

      ${GLSL_NOISE_FUNCTIONS}

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        
        // Stepped Lambertian lighting for cel-shading
        float NdotL = dot(normal, uLightDir);
        float celTerminator = smoothstep(0.08, 0.12, NdotL) * 0.35 + 
                              smoothstep(0.45, 0.48, NdotL) * 0.65;
        
        // Swirling cloud bands (horizontal fBm coordinates offset)
        vec3 noiseCoord = vec3(vUv.x * 2.5, vUv.y * 5.0 + sin(uTime * 0.2) * 0.4, uTime * 0.12);
        float cloudNoise = fbm(noiseCoord);
        float cloudStep = step(0.12, cloudNoise);
        vec3 cloudColor = vec3(0.98, 0.97, 1.0); // Soft white bands
        
        vec3 surfaceColor = mix(uBaseColor, cloudColor, cloudStep * 0.42);
        
        // Volumetric Rim Glow (Atmospheric scattering simulation)
        float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 4.0);
        
        vec3 litColor = mix(uShadowColor, surfaceColor, celTerminator);
        vec3 finalColor = mix(litColor, uAtmosphereColor, fresnel * 0.85);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
}

// =============================================================================
// 2. Skyrim Sovngarde Swirling Vortex Nebula Background Shader Material
// =============================================================================
export function createNebulaShaderMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      u_time: { value: 0 },
      u_audio: { value: 0 },
      uColorPrimary: { value: new THREE.Color(TwilightTokens.mintTeal) },
      uColorSecondary: { value: new THREE.Color(TwilightTokens.pastelPink) },
      uColorGlow: { value: new THREE.Color(TwilightTokens.goldGlow) },
      uColorBackdrop: { value: new THREE.Color(TwilightTokens.midnight) },
      u_color1: { value: new THREE.Color(TwilightTokens.mintTeal) },
      u_color2: { value: new THREE.Color(TwilightTokens.lavenderCone) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float u_time;
      uniform float u_audio;
      uniform vec3 uColorPrimary;
      uniform vec3 uColorSecondary;
      uniform vec3 uColorGlow;
      uniform vec3 uColorBackdrop;
      uniform vec3 u_color1;
      uniform vec3 u_color2;

      varying vec2 vUv;

      ${GLSL_NOISE_FUNCTIONS}

      void main() {
        float time = uTime + u_time;
        vec2 uv = vUv;
        vec2 centerDist = uv - vec2(0.5);
        float radius = length(centerDist);

        // Multi-arm polar coordinate spiral to recreate Skyrim's vortex arms
        float angle = atan(centerDist.y, centerDist.x);
        float spiralAngle = angle + (radius * 7.5) - (time * 0.15);
        
        // Swirling coordinates
        vec3 spiralCoord1 = vec3(cos(spiralAngle) * radius * 3.5, sin(spiralAngle) * radius * 3.5, time * 0.04);
        vec3 spiralCoord2 = vec3(cos(spiralAngle + 3.1415) * radius * 2.5, sin(spiralAngle + 3.1415) * radius * 2.5, -time * 0.03);

        // Watercolor bleed fBm maps
        float noise1 = fbm(spiralCoord1) * 0.5 + 0.5;
        float noise2 = fbm(spiralCoord2) * 0.5 + 0.5;
        float finalVortex = clamp(noise1 + noise2 * 0.8, 0.0, 1.0);

        // Shimmering aurora waves sliding horizontally across the sky
        float auroraY = uv.y + sin(uv.x * 3.5 + time * 0.6) * 0.12 - 0.55;
        float auroraWave = exp(-auroraY * auroraY * 18.0);
        float auroraNoise = fbm(vec3(uv.x * 2.0, uv.y, time * 0.08)) * 0.5 + 0.5;
        vec3 auroraGlow = uColorPrimary * auroraWave * auroraNoise * 0.82;

        // High-fidelity paper/canvas fiber noise for the hand-drawn anime look
        float paperFiber = snoise(vec3(uv.x * 240.0, uv.y * 240.0, 0.0)) * 0.07;

        // Dynamic gradients matching Skyrim's Illusion colors (Cyan, Purple, Pink)
        vec3 baseSky = mix(uColorBackdrop, uColorSecondary * 0.3, uv.y);
        vec3 primaryColor = mix(u_color1, uColorGlow, noise1 * 0.4);
        vec3 secondaryColor = mix(u_color2, uColorBackdrop, noise2 * 0.5);

        vec3 nebulaGlow = mix(primaryColor, secondaryColor, finalVortex) * finalVortex;
        
        // Combine and apply vignette
        float vignette = smoothstep(0.75, 0.28, radius);
        vec3 finalColor = baseSky + nebulaGlow + auroraGlow + paperFiber;

        gl_FragColor = vec4(finalColor, (finalVortex * 0.72 + auroraWave * 0.4) * vignette);
      }
    `
  });
}

export const createAnimeBackgroundShaderMaterial = createNebulaShaderMaterial;

// =============================================================================
// 3. Skyrim Sovngarde Starfield Shader (Swirling 4-Point Flares)
// =============================================================================
export function createAnimeStarfieldShaderMaterial(baseSize = 0.40) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      u_time: { value: 0 },
      uBaseSize: { value: baseSize * 100.0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float u_time;
      uniform float uBaseSize;

      attribute float aPhase;
      attribute float aScale;
      attribute vec3 aColor;

      varying float vAlpha;
      varying vec3 vColor;
      varying float vPhase;

      void main() {
        float time = uTime + u_time;
        vPhase = aPhase;
        vColor = aColor;

        // Shimmering twinkle frequency matching Skyrim magical effects
        float twinkle = 0.35 + 0.65 * sin(time * 3.2 + aPhase) * cos(time * 1.5 + aPhase * 0.3);
        vAlpha = twinkle;

        // Swirl positions dynamically along the polar vortex stream
        vec3 pos = position;
        float radius = length(pos.xy);
        float swirlAngle = sin(time * 0.08 - radius * 0.12) * 0.42 * (1.0 / (radius + 0.5));
        float cosA = cos(swirlAngle);
        float sinA = sin(swirlAngle);
        
        pos.x = position.x * cosA - position.y * sinA;
        pos.y = position.x * sinA + position.y * cosA;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uBaseSize * (aScale > 0.0 ? aScale : 1.0) * (420.0 / -mvPosition.z) * (twinkle * 0.25 + 0.75);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      varying float vPhase;

      void main() {
        // Shift coordinates to point center [-0.5, 0.5]
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);

        // Multi-arm hand-drawn 4-pointed cross flare equation
        float crossX = max(0.0, 1.0 - abs(uv.x * 6.5)) * max(0.0, 1.0 - abs(uv.y * 1.5));
        float crossY = max(0.0, 1.0 - abs(uv.y * 6.5)) * max(0.0, 1.0 - abs(uv.x * 1.5));
        float starFlare = (crossX + crossY) * 0.72;

        // Soft background glow ring
        float centerGlow = exp(-dist * dist * 16.0) * 0.45;
        float finalMask = starFlare + centerGlow;

        if (finalMask < 0.01) discard;

        gl_FragColor = vec4(vColor, finalMask * vAlpha * 0.95);
      }
    `
  });
}

// =============================================================================
// 4. Spectral Ribbon Comet Shader (Hand-Drawn Magical Streaks)
// =============================================================================
export function createAnimeCometShaderMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      u_time: { value: 0 },
      uColorCore: { value: new THREE.Color(TwilightTokens.emeraldNeon) },
      uColorTail: { value: new THREE.Color(TwilightTokens.lavenderCone) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float u_time;
      attribute float aIndex; // Tail layout offset (0 = Head, 1 = Tip)

      varying float vOpacity;
      varying float vIndex;

      void main() {
        float time = uTime + u_time;
        vIndex = aIndex;
        vec3 pos = position;

        // GPU Sinusoidal ripple wave imitating fluid watercolor ribbon lines
        float waveOffset = sin(time * 9.5 - aIndex * 5.0) * 0.22 * aIndex;
        pos.y += waveOffset;

        vOpacity = exp(-aIndex * 1.6);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = 34.0 * (1.0 - aIndex * 0.45) * (20.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColorCore;
      uniform vec3 uColorTail;

      varying float vOpacity;
      varying float vIndex;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);

        // Hand-drawn brush line slices into the comet tail
        float brushStrokes = step(0.12, sin(uv.y * 32.0)) * 0.25 + 0.75;

        // Soft Gaussian point head
        float starDisc = exp(-dist * dist * 12.0) * brushStrokes;
        if (starDisc < 0.01) discard;

        // Chromatic color blend from Emerald-Neon core to Lavender-Pink trail
        vec3 finalColor = mix(uColorCore, uColorTail, vIndex);

        gl_FragColor = vec4(finalColor, starDisc * vOpacity * 0.95);
      }
    `
  });
}

// =============================================================================
// 5. Anime Low-Poly Ink Outline Asteroid Material (With Shimmering Aura)
// =============================================================================
export function createAnimeAsteroidShaderMaterial(lightDirVector = new THREE.Vector3(0.8, 1.0, 0.6)) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      u_time: { value: 0 },
      uLightDir: { value: lightDirVector.clone().normalize() },
      u_lightDir: { value: lightDirVector.clone().normalize() },
      uColorLit: { value: new THREE.Color(TwilightTokens.lavenderCone) },
      uColorShadow: { value: new THREE.Color(TwilightTokens.midnight) },
      uAuraColor: { value: new THREE.Color(TwilightTokens.mintTeal) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewDir = normalize(cameraPosition - worldPos.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float u_time;
      uniform vec3 uLightDir;
      uniform vec3 u_lightDir;
      uniform vec3 uColorLit;
      uniform vec3 uColorShadow;
      uniform vec3 uAuraColor;

      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;

      ${GLSL_NOISE_FUNCTIONS}

      void main() {
        float time = uTime + u_time;
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewDir);
        vec3 light = normalize(uLightDir + u_lightDir);

        // 1. Hand-Drawn Outline ink stroke using Rim-Normal detection
        float edgeRim = dot(normal, viewDir);
        float edgeStroke = step(0.24, edgeRim);

        // 2. High-fidelity watercolor brush texture overlay on the rock face
        vec3 paintCoord = vec3(vUv.x * 25.0, vUv.y * 25.0, time * 0.05);
        float brushNoise = fbm(paintCoord) * 0.15 + 0.85;

        // 3. Multi-stage cel-shading light quantizing
        float NdotL = dot(normal, light);
        float stepLight = smoothstep(0.0, 0.06, NdotL) * 0.35 + 
                          smoothstep(0.35, 0.42, NdotL) * 0.65;

        vec3 baseColor = mix(uColorShadow, uColorLit * brushNoise, stepLight);

        // 4. Shimmering magical aura glow (Skyrim-style magical aura)
        float auraFresnel = pow(1.0 - max(0.0, edgeRim), 3.0);
        float auraTwinkle = 0.65 + 0.35 * sin(time * 4.0 + normal.x * 10.0);
        vec3 finalAura = uAuraColor * auraFresnel * auraTwinkle * 0.88;

        // 5. Apply black ink outlines on edges, otherwise display colored rock face
        vec3 finalColor = mix(vec3(0.06, 0.06, 0.11), baseColor + finalAura, edgeStroke);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });
}

// =============================================================================
// 6. Inverted-Hull Anime Cel Outline Helper
// =============================================================================
export function createAnimeOutlineMesh(geometry, thickness = 0.024, outlineColor = 0x11111B) {
  const outlineVertexShader = `
    uniform float uOutlineThickness;
    void main() {
      vec3 transformed = position + normal * uOutlineThickness;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `;

  const outlineFragmentShader = `
    uniform vec3 uOutlineColor;
    void main() {
      gl_FragColor = vec4(uOutlineColor, 1.0);
    }
  `;

  const outlineMaterial = new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      uOutlineThickness: { value: thickness },
      uOutlineColor: { value: new THREE.Color(outlineColor) }
    },
    side: THREE.BackSide,
    depthWrite: true
  });

  return new THREE.Mesh(geometry, outlineMaterial);
}
