// Hand-authored GLSL for the BloomSense environments.
// Everything here is procedural: no image-based skies, no tiling textures.

export const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash31(i);
  float n100 = hash31(i + vec3(1, 0, 0));
  float n010 = hash31(i + vec3(0, 1, 0));
  float n110 = hash31(i + vec3(1, 1, 0));
  float n001 = hash31(i + vec3(0, 0, 1));
  float n101 = hash31(i + vec3(1, 0, 1));
  float n011 = hash31(i + vec3(0, 1, 1));
  float n111 = hash31(i + vec3(1, 1, 1));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
float fbm2(vec2 p) {
  return fbm3(vec3(p, 0.0));
}
`;

export const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const skyFragment = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uLow;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform vec3 uAccent;
uniform vec3 uCloudColor;
uniform float uSunSize;
uniform float uSunGlow;
uniform float uStars;
uniform float uNebula;
uniform float uClouds;
uniform float uAurora;
uniform float uCloudSpeed;
${NOISE}
void main() {
  vec3 dir = normalize(vDir);
  float y = dir.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(y, 0.0, 1.0), 0.55));
  col = mix(col, uLow, 1.0 - smoothstep(-0.38, 0.02, y));

  float sd = max(dot(dir, normalize(uSunDir)), 0.0);
  float disc = smoothstep(uSunSize, uSunSize + 0.00022, sd);
  col = mix(col, uSunColor * 1.25, disc);
  col += uSunColor * pow(sd, 30.0) * 0.055 * uSunGlow;
  col += uSunColor * pow(sd, 4.0) * 0.012 * uSunGlow;

  // sparse field stars with independent twinkle
  vec3 sp = dir * 250.0;
  vec3 cell = floor(sp);
  float star = pow(hash31(cell), 46.0);
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.1 + hash31(cell + 8.1) * 42.0);
  col += vec3(0.72, 0.84, 1.0) * star * uStars * twinkle * smoothstep(-0.02, 0.18, y);

  // cosmic gas / nebula
  float nebA = fbm3(vec3(dir.xz * 2.10, dir.y * 1.2 + uTime * 0.0035));
  float nebB = fbm3(vec3(dir.xz * 5.60 + 4.3, dir.y * 3.0 - uTime * 0.006));
  float neb = smoothstep(0.46, 0.76, nebA) * smoothstep(0.18, 0.82, nebB);
  col += (uAccent * 0.62 + uCloudColor * 0.18) * neb * uNebula;
  col += uAccent * pow(neb, 3.0) * 0.15 * uNebula;

  // slow horizon clouds
  float cloud = fbm3(vec3(dir.xz * vec2(2.4, 3.5) + uTime * 0.005 * uCloudSpeed, dir.y * 0.75));
  cloud += 0.35 * fbm3(vec3(dir.xz * 6.0 - uTime * 0.008 * uCloudSpeed, dir.y * 1.6));
  float cloudMask = smoothstep(0.52, 0.78, cloud) * smoothstep(-0.03, 0.28, y) * (1.0 - smoothstep(0.58, 0.88, y));
  col = mix(col, uCloudColor, cloudMask * uClouds);

  // aurora ribbons written directly into the sky
  if (uAurora > 0.001) {
    float a = atan(dir.z, dir.x);
    float n = fbm3(vec3(a * 2.2 + uTime * 0.012, y * 2.6, uTime * 0.018));
    float waves = sin(a * 5.0 + n * 3.2 + uTime * 0.035) * 0.5 + 0.5;
    float band = smoothstep(0.52, 0.95, waves);
    float mask = smoothstep(0.02, 0.22, y) * (1.0 - smoothstep(0.42, 0.76, y));
    vec3 auroraCol = mix(vec3(0.10, 1.0, 0.66), vec3(0.30, 0.55, 1.0), n);
    col += auroraCol * band * mask * uAurora;
  }

  col += (hash21(gl_FragCoord.xy + uTime) - 0.5) / 420.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const waterVertex = /* glsl */ `
varying vec3 vWorld;
varying vec2 vUv;
uniform float uTime;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(p.x * 0.28 + uTime * 0.55) * 0.055;
  p.z += sin(p.y * 0.42 - uTime * 0.42) * 0.035;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const waterFragment = /* glsl */ `
precision highp float;
varying vec3 vWorld;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uMoonColor;
uniform vec3 uAccent;
uniform vec3 uMoonDir;
uniform float uMoon;
${NOISE}
void main() {
  vec2 p = vWorld.xz;
  float t = uTime * 0.055;
  float n1 = fbm3(vec3(p * 0.11, t));
  float n2 = fbm3(vec3(p * 0.13 + vec2(0.25, 0.0), t));
  float n3 = fbm3(vec3(p * 0.13 + vec2(0.0, 0.25), t));
  vec3 N = normalize(vec3((n1 - n2) * 1.9, 1.0, (n1 - n3) * 1.9));

  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.2);
  vec3 col = mix(uDeep, uShallow, smoothstep(0.15, 0.85, n1));
  col = mix(col, uSky, fres * 0.62);

  vec2 moonFlat = normalize(uMoonDir.xz + vec2(0.0001));
  vec2 dirFlat = normalize(p + vec2(0.0001));
  float lane = pow(max(dot(dirFlat, moonFlat), 0.0), 22.0);
  float rippleMasks = smoothstep(0.3, 0.9, fbm3(vec3(p * 2.8, t * 4.0)));
  col += uMoonColor * lane * (0.25 + rippleMasks * 0.9) * uMoon;
  col += uMoonColor * pow(max(0.0, 1.0 - length(p - moonFlat * 9.0) / 9.0), 5.0) * 0.15 * uMoon;

  float glint = pow(fbm3(vec3(p * 7.0, t * 8.0)), 11.0);
  col += (uMoonColor * 0.8 + uAccent * 0.25) * glint * uMoon * 2.2;
  col += uAccent * 0.025 * smoothstep(0.45, 1.0, n2);

  float edge = smoothstep(55.0, 8.0, length(p - cameraPosition.xz));
  col = mix(uSky * 0.55, col, edge);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const auroraVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(uv.x * 6.0 + uTime * 0.15) * 0.12;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const auroraFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
${NOISE}
void main() {
  float n = fbm3(vec3(vUv.x * 4.5 + uTime * 0.018, vUv.y * 2.4 - uTime * 0.024, uTime * 0.012));
  float fine = fbm3(vec3(vUv.x * 22.0, vUv.y * 6.0 + uTime * 0.03, 2.4));
  float ribbon = smoothstep(0.38, 0.72, n) * (1.0 - smoothstep(0.72, 0.94, n));
  ribbon *= 0.55 + 0.45 * sin(vUv.x * 11.0 + n * 7.0 + uTime * 0.08);
  float fade = smoothstep(0.02, 0.22, vUv.y) * (1.0 - smoothstep(0.48, 0.98, vUv.y));
  float sides = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.84, 1.0, vUv.x));
  vec3 col = mix(uColorA, uColorB, clamp(vUv.y * 1.2 + n * 0.35, 0.0, 1.0));
  col += uColorA * fine * 0.3;
  gl_FragColor = vec4(col, ribbon * fade * sides * uOpacity);
}
`;

export const cloudVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const cloudFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vWorld;
uniform float uTime;
uniform vec3 uColorLow;
uniform vec3 uColorHigh;
uniform float uOpacity;
uniform float uSpeed;
uniform float uScale;
${NOISE}
void main() {
  vec2 uv = vUv;
  float n = fbm3(vec3(uv * uScale + vec2(uTime * 0.006 * uSpeed, uTime * 0.002), uTime * 0.004));
  float n2 = fbm3(vec3(uv * uScale * 3.1 - vec2(uTime * 0.014 * uSpeed, 0.0), 2.0));
  float a = smoothstep(0.34, 0.72, n * 0.72 + n2 * 0.28);
  a *= uOpacity;
  a *= smoothstep(0.48, 0.12, length(uv - 0.5));
  vec3 col = mix(uColorLow, uColorHigh, smoothstep(0.2, 0.85, n));
  gl_FragColor = vec4(col, a);
}
`;

export const particlesVertex = /* glsl */ `
precision highp float;
attribute float aScale;
attribute float aPhase;
uniform float uTime;
uniform float uSize;
uniform float uDpr;
uniform float uSpeed;
varying float vAlpha;
varying float vPhase;
void main() {
  vec3 p = position;
  float t = uTime * uSpeed;
  p.x += sin(t * 0.23 + aPhase * 4.1) * 0.85;
  p.y += cos(t * 0.17 + aPhase * 2.3) * 0.55;
  p.z += sin(t * 0.21 + aPhase * 1.7) * 0.7;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aScale * uDpr * (16.0 / max(1.0, -mv.z)), 1.0, 22.0);
  vAlpha = 0.45 + 0.55 * (0.5 + 0.5 * sin(t * 1.6 + aPhase * 6.283));
  vPhase = aPhase;
}
`;

export const particlesFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vAlpha;
varying float vPhase;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.02, d);
  float halo = smoothstep(0.5, 0.22, d) * 0.35;
  vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vPhase * 8.0));
  gl_FragColor = vec4(col, (core + halo) * uOpacity * vAlpha);
}
`;

export const haloVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const haloFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
${NOISE}
void main() {
  vec2 uv = vUv - 0.5;
  float d = length(uv);
  float n = fbm3(vec3(uv * 4.0, uTime * 0.06));
  float a = smoothstep(0.5, 0.02, d);
  a *= 0.55 + 0.45 * n;
  a *= 0.7 + 0.3 * sin(atan(uv.y, uv.x) * 5.0 + uTime * 0.25);
  vec3 col = mix(uColorA, uColorB, smoothstep(0.0, 0.45, d));
  gl_FragColor = vec4(col, a * uOpacity);
}
`;

export const runesVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const runesFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  vec2 p = vUv - 0.5;
  float r = length(p) * 2.0;
  float ang = atan(p.y, p.x);
  float ring = smoothstep(0.018, 0.0, abs(r - 0.86));
  float inner = smoothstep(0.012, 0.0, abs(r - 0.60));
  float ticks = step(0.80, fract((ang / 6.28318 + uTime * 0.005) * 96.0)) * smoothstep(0.06, 0.0, abs(r - 0.86));
  float glyph = step(0.86, fract((ang / 6.28318 + 0.5) * 12.0 + uTime * 0.01)) * smoothstep(0.02, 0.0, abs(r - 0.74));
  float a = (ring * 0.55 + inner * 0.22 + ticks * 0.5 + glyph * 0.22) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}
`;

export const burstVertex = /* glsl */ `
precision highp float;
attribute vec3 aDir;
attribute float aSpeed;
attribute float aScale;
attribute float aPhase;
uniform float uProgress;
uniform float uTime;
uniform float uDpr;
uniform float uSize;
varying float vAlpha;
void main() {
  float p = clamp(uProgress, 0.0, 1.0);
  float ease = 1.0 - pow(1.0 - p, 3.0);
  vec3 pos = position + aDir * (aSpeed * ease * 2.2);
  pos.y -= p * p * 0.9;
  pos.x += sin(uTime * 2.0 + aPhase * 9.0) * 0.06 * ease;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aScale * uDpr * (16.0 / max(1.0, -mv.z)), 1.0, 24.0) * (1.0 - p * 0.5);
  vAlpha = (1.0 - p) * (0.7 + 0.3 * sin(uTime * 8.0 + aPhase * 20.0));
}
`;

export const burstFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = smoothstep(0.5, 0.02, d);
  float petal = smoothstep(0.15, 0.0, abs(c.x)) * smoothstep(0.5, 0.05, length(c * vec2(1.0, 0.6)));
  vec3 col = mix(uColorA, uColorB, gl_PointCoord.y);
  gl_FragColor = vec4(col, max(a * 0.8, petal * 0.4) * vAlpha);
}
`;

export const lifePollenVertex = /* glsl */ `
precision highp float;
attribute float aScale;
attribute float aPhase;
uniform float uTime;
uniform float uBloom;
uniform float uEnergy;
uniform float uPulse;
uniform float uDpr;
uniform float uSize;
varying float vA;
varying float vPhase;
void main() {
  vPhase = aPhase;
  vec3 p = position;
  float t = uTime;
  float orbit = 0.22 + uBloom * 0.9;
  p.x += sin(t * 0.24 + aPhase * 3.1) * (orbit + 0.12);
  p.z += cos(t * 0.19 + aPhase * 2.3) * (orbit + 0.12);
  p.y += sin(t * 0.3 + aPhase * 1.7) * 0.2 + uBloom * 0.24 - (1.0 - uBloom) * 0.1;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aScale * uDpr * (15.0 / max(1.0, -mv.z)), 1.0, 18.0);
  vA = (0.12 + uBloom * 0.72 + uPulse * 0.7) * (0.35 + 0.65 * sin(t * 2.2 + aPhase * 6.28)) * (0.45 + uEnergy * 0.55);
}
`;

export const lifePollenFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying float vA;
varying float vPhase;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.02, d);
  float halo = smoothstep(0.5, 0.2, d) * 0.35;
  vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vPhase * 9.0));
  gl_FragColor = vec4(col, (core + halo) * vA);
}
`;

export const gradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: [1, 1] },
    uVignette: { value: 0.52 },
    uGrain: { value: 0.026 },
    uAberration: { value: 0.0012 },
    uSaturation: { value: 1.08 },
    uLife: { value: 0 },
    uPulse: { value: 0 },
    uAccent: { value: [1, 0.6, 0.7] },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uSaturation;
    uniform float uLife;
    uniform float uPulse;
    uniform vec3 uAccent;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    void main() {
      vec2 uv = vUv;
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      float ca = uAberration * r2;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + cc * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - cc * ca).b;
      float vig = smoothstep(0.92, 0.18, r2 * 1.8);
      col *= mix(1.0 - uVignette, 1.0, vig);
      float g = hash(uv * uResolution + uTime * 71.0) - 0.5;
      col += g * uGrain;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSaturation);
      col = mix(col, col * vec3(1.035, 1.005, 0.985), clamp(uLife, 0.0, 1.0) * 0.7);
      col += uAccent * uPulse * 0.03;
      col = max(col, 0.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
}
