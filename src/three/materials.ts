import * as THREE from 'three'
import type { Flower } from '../data'

export interface PetalUniforms {
  uTime: { value: number }
  uAccent: { value: THREE.Color }
  uRimColor: { value: THREE.Color }
  uFresnel: { value: number }
  uTranslucency: { value: number }
  uBackLight: { value: THREE.Vector3 }
  uVein: { value: number }
  uGlow: { value: number }
  uLife: { value: number }
  uPulse: { value: number }
  uPulseColor: { value: THREE.Color }
}

const VERT_PARS = /* glsl */ `
uniform float uTime;
uniform float uLife;
varying vec3 vPetalWorld;
varying vec3 vPetalNormalW;
varying vec2 vPetalUv;
attribute vec2 aPetalUv;
`

const FRAG_PARS = /* glsl */ `
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uRimColor;
uniform float uFresnel;
uniform float uTranslucency;
uniform vec3 uBackLight;
uniform float uVein;
uniform float uGlow;
uniform float uLife;
uniform float uPulse;
uniform vec3 uPulseColor;
varying vec3 vPetalWorld;
varying vec3 vPetalNormalW;
varying vec2 vPetalUv;
`

export function createPetalMaterial(flower: Flower, backLight = new THREE.Vector3(-0.4, 0.3, -1)) {
  const accent = new THREE.Color(flower.accent)
  const rim = new THREE.Color(flower.accent2).lerp(new THREE.Color('#fff4ea'), 0.35)
  const uniforms: PetalUniforms = {
    uTime: { value: 0 },
    uAccent: { value: accent },
    uRimColor: { value: rim },
    uFresnel: { value: 0.2 },
    uTranslucency: { value: 0.1 },
    uBackLight: { value: backLight.clone().normalize() },
    uVein: { value: 0.03 },
    uGlow: { value: 0.06 },
    uLife: { value: 0.2 },
    uPulse: { value: 0 },
    uPulseColor: { value: new THREE.Color(flower.accent2) },
  }

  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: 0xffffff,
    roughness: 0.66,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.42,
    sheen: 0.18,
    sheenRoughness: 0.58,
    sheenColor: new THREE.Color(flower.accent2).lerp(new THREE.Color('#ffffff'), 0.15),
    side: THREE.DoubleSide,
    envMapIntensity: 0.42,
    transparent: false,
    toneMapped: true,
  })

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uAccent = uniforms.uAccent
    shader.uniforms.uRimColor = uniforms.uRimColor
    shader.uniforms.uFresnel = uniforms.uFresnel
    shader.uniforms.uTranslucency = uniforms.uTranslucency
    shader.uniforms.uBackLight = uniforms.uBackLight
    shader.uniforms.uVein = uniforms.uVein
    shader.uniforms.uGlow = uniforms.uGlow
    shader.uniforms.uLife = uniforms.uLife
    shader.uniforms.uPulse = uniforms.uPulse
    shader.uniforms.uPulseColor = uniforms.uPulseColor

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
      .replace(
        '#include <project_vertex>',
        `vPetalUv = aPetalUv;
        float windPhase = atan(position.z, position.x);
        float flutter = sin(uTime * 1.35 + windPhase * 2.3 + vPetalUv.x * 7.0)
                      * 0.0032 * smoothstep(0.08, 0.9, vPetalUv.x);
        transformed += objectNormal * flutter;
        transformed.x += sin(uTime * 0.52 + windPhase * 1.7) * 0.0018 * vPetalUv.x;
        transformed.z += cos(uTime * 0.43 + windPhase * 1.3) * 0.0015 * vPetalUv.x;
        #include <project_vertex>
        vPetalWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPetalNormalW = normalize(mat3(modelMatrix) * objectNormal);`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
        float pnA = sin(vPetalUv.x * 61.0 + vPetalUv.y * 23.0 + uTime * 0.6);
        float pnB = sin(vPetalUv.x * 37.0 - vPetalUv.y * 47.0 - uTime * 0.45);
        vec3 pnWorld = vec3(pnA, pnB, 0.0);
        normal = normalize(normal + normalize((viewMatrix * vec4(pnWorld, 0.0)).xyz) * 0.028);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        float rv = 0.5 + 0.5 * sin(vPetalUv.x * 17.0 + vPetalUv.y * 29.0);
        roughnessFactor = clamp(roughnessFactor + (rv - 0.5) * 0.10, 0.36, 0.92);`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 puv = vPetalUv;
        float across = clamp(puv.y, 0.0, 1.0);
        float along = clamp(puv.x, 0.0, 1.0);
        float lateral = abs(fract(across * 12.0 + sin(along * 3.4 + across * 4.0) * 0.024) - 0.5);
        float veins = smoothstep(0.055, 0.0, lateral) * smoothstep(0.08, 0.3, along) * (1.0 - smoothstep(0.82, 1.0, along));
        float midrib = smoothstep(0.04, 0.0, abs(across - 0.5)) * (1.0 - smoothstep(0.78, 1.0, along));
        float mottle = sin(along * 13.0 + across * 7.0) * 0.55 + sin(along * 5.0 - across * 11.0) * 0.45;
        float broad = 0.5 + 0.5 * sin(along * 7.0 + across * 4.0 + 1.3);
        diffuseColor.rgb *= 1.0 - veins * 0.03 - midrib * 0.022 + mottle * 0.0045 + broad * 0.045 - 0.02;
        float lumPetal = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(lumPetal), diffuseColor.rgb, 0.93);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 0.995, 0.98), clamp(uLife, 0.0, 1.0) * 0.5);
        diffuseColor.rgb += uPulseColor * uPulse * 0.035 * (0.35 + abs(across - 0.5));`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 petalN = normalize(vPetalNormalW) * (gl_FrontFacing ? 1.0 : -1.0);
        vec3 petalV = normalize(cameraPosition - vPetalWorld);
        float petalFres = pow(1.0 - clamp(dot(petalN, petalV), 0.0, 1.0), 2.25);
        float petalBack = pow(clamp(dot(-petalN, normalize(uBackLight)), 0.0, 1.0), 1.65);
        float petalMicro = sin(vPetalWorld.x * 31.0 + vPetalWorld.y * 6.0)
                         * sin(vPetalWorld.z * 19.0 - vPetalWorld.y * 9.0);
        float petalVein = smoothstep(0.72, 1.0, petalMicro);
        totalEmissiveRadiance += uRimColor * petalFres * uFresnel;
        totalEmissiveRadiance += uAccent * petalBack * uTranslucency;
        totalEmissiveRadiance += uAccent * petalVein * uVein * (0.5 + 0.5 * petalBack);
        totalEmissiveRadiance += uAccent * uGlow * (0.25 + 0.75 * petalBack) * 0.08;
        float petalEdge = smoothstep(0.42, 0.5, abs(vPetalUv.y - 0.5));
        float edgeBreathe = 0.65 + 0.35 * sin(uTime * 1.05 + vPetalUv.x * 5.0);
        totalEmissiveRadiance += uRimColor * petalEdge * (0.010 + uLife * 0.016) * edgeBreathe
                               + uRimColor * petalBack * 0.012 * uLife
                               + uPulseColor * uPulse * 0.045;`
      )

    material.userData.shader = shader
    material.userData.uniforms = uniforms
  }
  material.customProgramCacheKey = () => 'bloomsense-petal-v1'
  material.userData.uniforms = uniforms
  return material
}

export function createPlantMaterial(flower: Flower, kind: 'core' | 'stem') {
  return new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    color: 0xffffff,
    roughness: kind === 'stem' ? 0.66 : 0.56,
    metalness: 0.0,
    clearcoat: kind === 'core' ? 0.08 : 0.03,
    clearcoatRoughness: 0.6,
    sheen: kind === 'stem' ? 0.2 : 0.3,
    sheenColor: new THREE.Color(flower.accent).lerp(new THREE.Color('#8fae6b'), 0.65),
    side: THREE.DoubleSide,
    envMapIntensity: 0.55,
  })
}

export function createStoneMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0c1113'),
    roughness: 0.72,
    metalness: 0.22,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.42,
  })
}

export function createMossMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1c2b18'),
    roughness: 0.92,
    metalness: 0.0,
    sheen: 0.4,
    sheenColor: new THREE.Color('#5c7d45'),
    envMapIntensity: 0.3,
  })
}

export function updatePetalMaterial(
  material: THREE.Material,
  time: number,
  backLight?: THREE.Vector3,
  opacityScale = 1
) {
  const uniforms = (material.userData.uniforms ?? (material.userData.shader?.uniforms as any)) as
    | PetalUniforms
    | undefined
  if (!uniforms) return
  uniforms.uTime.value = time
  if (backLight) uniforms.uBackLight.value.copy(backLight).normalize()
  uniforms.uTranslucency.value = 0.1 * opacityScale
}
