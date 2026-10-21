# -*- coding: utf-8 -*-
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:80])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

LIFE_VERT = r'''export const lifePollenVertex = /* glsl */ `
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

export const gradeShader = {'''

edit('src/three/shaders.ts', [
    ('export const gradeShader = {', LIFE_VERT),
    ('    uAberration: { value: 0.0012 },\n    uSaturation: { value: 1.08 },',
     '    uAberration: { value: 0.0012 },\n    uSaturation: { value: 1.08 },\n    uLife: { value: 0 },\n    uPulse: { value: 0 },\n    uAccent: { value: [1, 0.6, 0.7] },'),
    ('    uniform float uAberration;\n    uniform float uSaturation;\n    varying vec2 vUv;',
     '    uniform float uAberration;\n    uniform float uSaturation;\n    uniform float uLife;\n    uniform float uPulse;\n    uniform vec3 uAccent;\n    varying vec2 vUv;'),
    ('      col = mix(vec3(l), col, uSaturation);\n      col = max(col, 0.0);',
     '      col = mix(vec3(l), col, uSaturation);\n      col = mix(col, col * vec3(1.035, 1.005, 0.985), clamp(uLife, 0.0, 1.0) * 0.7);\n      col += uAccent * uPulse * 0.03;\n      col = max(col, 0.0);'),
])

edit('src/three/PostFX.tsx', [
    ("import { useApp } from '../store'", "import { useApp } from '../store'\nimport { lifeFX } from './lifeFX'"),
    ('  useFrame(({ clock }) => {\n    composer.grade.uniforms.uTime.value = clock.elapsedTime\n    composer.c.render()\n  }, 1)',
     '  useFrame(({ clock }) => {\n    composer.grade.uniforms.uTime.value = clock.elapsedTime\n    composer.grade.uniforms.uLife.value = lifeFX.bloom\n    composer.grade.uniforms.uPulse.value = lifeFX.pulse\n    composer.grade.uniforms.uAccent.value = [lifeFX.accent.r, lifeFX.accent.g, lifeFX.accent.b]\n    composer.c.render()\n  }, 1)'),
])

edit('src/three/FlowerStage.tsx', [
    ("import { createMossMaterial, createStoneMaterial, updatePetalMaterial } from './materials'",
     "import { createMossMaterial, createStoneMaterial, updatePetalMaterial } from './materials'\nimport { lifeFX, triggerLifePulse } from './lifeFX'"),
    ("import { haloFragment, haloVertex, burstVertex, burstFragment, runesVertex, runesFragment } from './shaders'",
     "import { haloFragment, haloVertex, burstVertex, burstFragment, runesVertex, runesFragment, lifePollenVertex, lifePollenFragment } from './shaders'"),
    ('  const burstKey = flowerEpoch\n', '  const burstKey = flowerEpoch\n  const actionPulseId = useApp((s) => s.actionPulse?.id)\n  const lastBloomLife = useRef(0)\n'),
    ('  useEffect(() => {\n    bloomRef.current = 0.04\n    switchRef.current = 0\n  }, [flowerEpoch])',
     '  useEffect(() => {\n    bloomRef.current = 0.04\n    switchRef.current = 0\n    triggerLifePulse(flower.accent)\n  }, [flowerEpoch, flower.accent])\n\n  useEffect(() => {\n    if (actionPulseId == null) return\n    const accent = useApp.getState().actionPulse?.accent ?? flower.accent\n    triggerLifePulse(accent)\n  }, [actionPulseId, flower.accent])'),
    ('    const bloom = bloomRef.current\n    const x = bloom * 6',
     '    const bloom = bloomRef.current\n    if (lastBloomLife.current < 0.94 && bloom >= 0.95) triggerLifePulse(flower.accent2)\n    lastBloomLife.current = bloom\n    lifeFX.bloom = bloom\n    lifeFX.energy = live.handPresent ? 0.55 + live.openness * 0.45 : 0.3\n    lifeFX.hand = live.handPresent\n    lifeFX.accent.set(flower.accent)\n    lifeFX.pulse = Math.max(0, lifeFX.pulse - d * 1.35)\n    state.gl.toneMappingExposure = 0.84 + bloom * 0.07 + lifeFX.pulse * 0.02\n    const x = bloom * 6'),
    ('      if (u?.uGlow) u.uGlow.value = 0.01',
     '      if (u?.uGlow) u.uGlow.value = 0.01\n      if (u?.uLife) u.uLife.value = bloom\n      if (u?.uPulse) u.uPulse.value = lifeFX.pulse\n      if (u?.uPulseColor) u.uPulseColor.value.copy(lifeFX.pulseColor)'),
    ('      <StageLights headY={asset.headY} envId={env.id} />',
     '      <LifePollen headY={asset.headY} accent={flower.accent} />\n      <LifeRing accent={flower.accent} />\n      <StageLights headY={asset.headY} envId={env.id} />'),
])

COMPONENTS = r'''function LifePollen({ headY, accent }: { headY: number; accent: string }) {
  const { gl } = useThree()
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const count = 120
  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.25 + Math.random() * 1.35
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = -0.2 + Math.random() * 1.3
      positions[i * 3 + 2] = Math.sin(a) * r
      scales[i] = 0.35 + Math.random() * 1.3
      phases[i] = Math.random() * 10
    }
    return { positions, scales, phases }
  }, [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBloom: { value: 0.2 },
      uEnergy: { value: 0.3 },
      uPulse: { value: 0 },
      uDpr: { value: Math.min(2, gl.getPixelRatio()) },
      uSize: { value: 2.6 },
      uColorA: { value: new THREE.Color('#ffe4b0') },
      uColorB: { value: new THREE.Color(accent) },
    }),
    [gl, accent]
  )
  useFrame(({ clock }) => {
    if (!matRef.current) return
    const u = matRef.current.uniforms
    u.uTime.value = clock.elapsedTime
    u.uBloom.value = lifeFX.bloom
    u.uEnergy.value = lifeFX.energy
    u.uPulse.value = lifeFX.pulse
    u.uDpr.value = Math.min(2, gl.getPixelRatio())
    u.uColorB.value.set(accent)
  })
  return (
    <points position={[0, headY, 0]} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[geo.scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[geo.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        args={[
          {
            uniforms,
            vertexShader: lifePollenVertex,
            fragmentShader: lifePollenFragment,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </points>
  )
}

function LifeRing({ accent }: { accent: string }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(() => {
    if (!meshRef.current || !matRef.current) return
    const s = 0.65 + lifeFX.bloom * 1.2 + lifeFX.pulse * 0.18
    meshRef.current.scale.setScalar(s)
    matRef.current.opacity = 0.025 + lifeFX.bloom * 0.13 + lifeFX.pulse * 0.28
  })
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.075, 0]}>
      <ringGeometry args={[0.82, 0.84, 96]} />
      <meshBasicMaterial ref={matRef} color={accent} transparent opacity={0.08} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

'''
s = open('src/three/FlowerStage.tsx', encoding='utf-8').read()
s = s.replace('function StageLights({ headY, envId }', COMPONENTS + 'function StageLights({ headY, envId }')
open('src/three/FlowerStage.tsx', 'w', encoding='utf-8').write(s)

# StageLights studio branch
s = open('src/three/FlowerStage.tsx', encoding='utf-8').read()
old = '''function StageLights({ headY, envId }: { headY: number; envId: string }) {
  return (
    <>
      <ambientLight intensity={0.18} />
      <directionalLight position={[4.4, 6.5, 4.2]} intensity={1.25} color="#ffe5ce" />
      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={0.8} color={envId === 'aurora' ? '#8fffd2' : '#aac9ff'} />
      <pointLight position={[2.4, 3.4, 2.2]} intensity={5} distance={8} decay={2} color="#ffd9c2" />
      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={2} distance={5} decay={2} color="#a9c8ff" />
      <hemisphereLight args={['#5a6b7a', '#0a0c0d', 0.16]} />
    </>
  )
}'''
new = '''function StageLights({ headY, envId }: { headY: number; envId: string }) {
  const studio = envId === 'studio'
  return (
    <>
      <ambientLight intensity={studio ? 0.5 : 0.18} />
      <directionalLight position={[4.4, 6.5, 4.2]} intensity={studio ? 2.1 : 1.25} color="#ffe5ce" />
      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={studio ? 0.7 : 0.8} color={envId === 'aurora' ? '#8fffd2' : envId === 'studio' ? '#dce8ff' : '#aac9ff'} />
      <pointLight position={[2.4, 3.4, 2.2]} intensity={studio ? 2.2 : 5} distance={8} decay={2} color="#ffd9c2" />
      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={studio ? 0.8 : 2} distance={5} decay={2} color="#a9c8ff" />
      <hemisphereLight args={studio ? ['#fff6e8', '#b9a88f', 0.55] : ['#5a6b7a', '#0a0c0d', 0.16]} />
    </>
  )
}'''
if old not in s:
    print('STAGE LIGHTS MISS')
s = s.replace(old, new)
open('src/three/FlowerStage.tsx', 'w', encoding='utf-8').write(s)
print('life fx applied')
