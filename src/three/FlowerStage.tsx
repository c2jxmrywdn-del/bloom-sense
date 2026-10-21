import { useEffect, useImperativeHandle, useMemo, useRef, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { FLOWERS, ENVIRONMENTS } from '../data'
import { useApp } from '../store'
import { live } from '../live'
import { getFlowerAsset } from './modelCache'
import { createMossMaterial, createStoneMaterial, updatePetalMaterial } from './materials'
import { lifeFX, triggerLifePulse } from './lifeFX'
import { haloFragment, haloVertex, burstVertex, burstFragment, runesVertex, runesFragment, lifePollenVertex, lifePollenFragment } from './shaders'

const BACKLIGHT: Record<string, [number, number, number]> = {
  bamboo: [0.5, 0.65, -1],
  moon: [-0.4, 0.45, -1],
  cosmic: [0.35, 0.65, -1],
  dawn: [0.7, 0.35, -1],
  amber: [-0.55, 0.32, -1],
  aurora: [-0.2, 0.65, -1],
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const clampAbs = (v: number, m: number) => Math.min(m, Math.max(-m, v))
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

export function FlowerStage() {
  const flowerIndex = useApp((s) => s.flowerIndex)
  const flowerEpoch = useApp((s) => s.flowerEpoch)
  const envIndex = useApp((s) => s.envIndex)
  const flower = FLOWERS[flowerIndex]
  const env = ENVIRONMENTS[envIndex]
  const asset = getFlowerAsset(flower.id)
  const rootRef = useRef<THREE.Group>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const bloomRef = useRef(0.16)
  const switchRef = useRef(1)
  const spinRef = useRef(0)
  const handOff = useRef({ x: 0, y: 0, z: 0 })
  const grabRef = useRef({ x: 0, y: 0, z: 0 })
  const lastRotEpoch = useRef(0)
  const lastDisplay = useRef(0)
  const burstKey = flowerEpoch
  const actionPulseId = useApp((s) => s.actionPulse?.id)
  const lastBloomLife = useRef(0)

  useEffect(() => {
    bloomRef.current = 0.04
    switchRef.current = 0
    triggerLifePulse(flower.accent)
  }, [flowerEpoch, flower.accent])

  useEffect(() => {
    if (actionPulseId == null) return
    const accent = useApp.getState().actionPulse?.accent ?? flower.accent
    triggerLifePulse(accent)
  }, [actionPulseId, flower.accent])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const s = useApp.getState()
      if (!live.handPresent && s.bloomSource === 'auto') s.setBloom(0.84, 'auto')
    }, 950)
    return () => window.clearTimeout(timer)
  }, [flowerEpoch])

  useFrame((state, dt) => {
    const d = Math.min(0.05, dt)
    const s = useApp.getState()
    const time = state.clock.elapsedTime
    if (!asset) return

    // bloom smoothing + shape keys
    const target = s.bloomTarget
    bloomRef.current = THREE.MathUtils.damp(bloomRef.current, target, 3.2, d)
    const bloom = bloomRef.current
    if (lastBloomLife.current < 0.94 && bloom >= 0.95) triggerLifePulse(flower.accent2)
    lastBloomLife.current = bloom
    lifeFX.bloom = bloom
    lifeFX.energy = live.handPresent ? 0.55 + live.openness * 0.45 : 0.3
    lifeFX.hand = live.handPresent
    lifeFX.accent.set(flower.accent)
    lifeFX.pulse = Math.max(0, lifeFX.pulse - d * 1.35)
    state.gl.toneMappingExposure = 0.68 + bloom * 0.055 + lifeFX.pulse * 0.015
    const x = bloom * 6
    for (const mesh of asset.petalMeshes) {
      const influences = mesh.morphTargetInfluences
      if (!influences) continue
      influences.fill(0)
      if (x >= 6) {
        influences[influences.length - 1] = 1
      } else if (x > 0) {
        const i = Math.floor(x)
        if (i < 1) {
          influences[0] = x
        } else {
          const idx = i - 1
          const frac = x - i
          if (idx < influences.length) influences[idx] = 1 - frac
          if (idx + 1 < influences.length) influences[idx + 1] = frac
        }
      }
    }

    // shader life
    const back = new THREE.Vector3(...(BACKLIGHT[env.id] ?? BACKLIGHT.moon))
    for (const mat of asset.petalMaterials) {
      updatePetalMaterial(mat, time, back)
      const u = mat.userData.uniforms
      if (u?.uFresnel) u.uFresnel.value = 0.055 + bloom * 0.035
      if (u?.uTranslucency) u.uTranslucency.value = 0.02 + bloom * 0.025
      if (u?.uGlow) u.uGlow.value = 0.01
      if (u?.uLife) u.uLife.value = bloom
      if (u?.uPulse) u.uPulse.value = lifeFX.pulse
      if (u?.uPulseColor) u.uPulseColor.value.copy(lifeFX.pulseColor)
    }

    // rotation: base + auto spin + hand offsets + pinch grab
    if (rootRef.current) {
      const locks = s.locks
      const base = s.baseRot
      const handTarget = live.handRotTarget
      handOff.current.x = THREE.MathUtils.damp(handOff.current.x, locks.x ? 0 : handTarget.x, 7, d)
      handOff.current.y = THREE.MathUtils.damp(handOff.current.y, locks.y ? 0 : handTarget.y, 7, d)
      handOff.current.z = THREE.MathUtils.damp(handOff.current.z, locks.z ? 0 : handTarget.z, 7, d)
      // 捏合拖转：像握住花茎一样拖动整支花，松开后保持角度，归位手势清零
      if (s.rotEpoch !== lastRotEpoch.current) {
        lastRotEpoch.current = s.rotEpoch
        grabRef.current.x = grabRef.current.y = grabRef.current.z = 0
      }
      if (live.pinchActive && s.handMode === 'camera' && s.gestureControl) {
        grabRef.current.y = clampAbs(grabRef.current.y + live.grab.x, 2.7)
        grabRef.current.x = clampAbs(grabRef.current.x + live.grab.y, 1.15)
        grabRef.current.z = clampAbs(grabRef.current.z + live.grab.z, 0.95)
      }
      live.grab.x = 0
      live.grab.y = 0
      live.grab.z = 0
      if (s.autoRotate && !locks.y && s.handMode !== 'camera') spinRef.current += d * 0.115
      const gust = 0.6 + (live.handPresent ? live.openness * 0.65 : 0.15)
      // 手势控制期间锁住整株自由摆动，保证指令与轴角度的精确性
      const idleSway = s.handMode === 'camera' || s.prefs.reduceMotion ? 0 : 1
      const swayX = (Math.sin(time * 0.37) * 0.008 + Math.sin(time * 0.83 + 1.7) * 0.0035) * gust * idleSway
      const swayZ = (Math.sin(time * 0.29 + 1.2) * 0.010 + Math.sin(time * 0.61 + 2.4) * 0.004) * gust * idleSway
      rootRef.current.rotation.set(
        THREE.MathUtils.degToRad(base.x) + handOff.current.x + grabRef.current.x + swayX,
        THREE.MathUtils.degToRad(base.y) + spinRef.current + handOff.current.y + grabRef.current.y,
        THREE.MathUtils.degToRad(base.z) + handOff.current.z + grabRef.current.z + swayZ
      )
      rootRef.current.position.y = s.prefs.reduceMotion ? 0 : Math.sin(time * 0.9) * 0.006 + Math.sin(time * 1.7 + 1.3) * 0.002
      switchRef.current = Math.min(1, switchRef.current + d / 1.05)
      const grow = 0.84 + 0.16 * easeOut(switchRef.current)
      const breathe = s.prefs.reduceMotion ? 1 : 1 + Math.sin(time * 0.72) * 0.0035 + Math.sin(time * 1.6 + 1.2) * 0.0015
      const scale = grow * (1 + live.pinch * 0.02) * breathe
      rootRef.current.scale.setScalar(scale)
    }

    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + bloom * 0.7
      lightRef.current.color.set(flower.accent)
    }

    if (time - lastDisplay.current > 0.11) {
      lastDisplay.current = time
      s.setBloomActual(bloom)
    }
  })

  if (!asset) return null

  return (
    <group>
      <group ref={rootRef}>
        <primitive key={flower.id} object={asset.display} />
        <AxisGizmo headY={asset.headY} />
        <pointLight
          ref={lightRef}
          position={[0.35, asset.headY + 0.55, 0.45]}
          color={flower.accent2}
          intensity={0.6}
          distance={2.2}
          decay={2}
        />
      </group>

      <PetalBurst key={burstKey} headY={asset.headY} colorA={flower.accent} colorB={env.accent} start={burstKey > 0} />
      <LifePollen headY={asset.headY} accent={flower.accent} />
      <LifeRing accent={flower.accent} />
      <StageLights headY={asset.headY} envId={env.id} />
      <Pedestal accent={flower.accent} envAccent={env.accent} />
      <ContactShadows
        position={[0, 0.075, 0]}
        opacity={0.38}
        scale={6.2}
        blur={2.4}
        far={2.8}
        resolution={256}
        color="#000000"
        frames={1}
      />
      <pointLight position={[0, 0.55, 0.25]} color={flower.accent} intensity={1.5} distance={2.4} decay={2} />
    </group>
  )
}

function LifePollen({ headY, accent }: { headY: number; accent: string }) {
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

function StageLights({ headY, envId }: { headY: number; envId: string }) {
  const studio = envId === 'studio'
  const bamboo = envId === 'bamboo'
  const amber = envId === 'amber'
  const soft = studio || bamboo
  const fillColor = bamboo
    ? '#cfe8c8'
    : amber
      ? '#ff9f60'
      : envId === 'aurora'
        ? '#8fffd2'
        : studio
          ? '#dce8ff'
          : '#aac9ff'
  const rimColor = bamboo ? '#f4ffe8' : amber ? '#ffd09a' : '#ffe2ca'
  return (
    <>
      <ambientLight intensity={soft ? 0.16 : amber ? 0.22 : 0.18} />
      <directionalLight position={[4.4, 6.5, 4.2]} intensity={soft ? 0.95 : amber ? 1.05 : 1.25} color={amber ? '#ffdcb2' : '#ffe5ce'} />
      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={soft ? 0.3 : amber ? 0.58 : 0.8} color={fillColor} />
      <directionalLight position={[-2.6, 4.4, -3.4]} intensity={studio ? 0.6 : soft ? 0.5 : 0.35} color={rimColor} />
      <pointLight position={[2.4, 3.4, 2.2]} intensity={soft ? 0.68 : amber ? 3.4 : 5} distance={8} decay={2} color="#ffd9c2" />
      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={soft ? 0.25 : amber ? 1.4 : 2} distance={5} decay={2} color={bamboo ? '#bcd9b4' : '#a9c8ff'} />
      <hemisphereLight
        args={
          bamboo
            ? ['#eef7e6', '#40513f', 0.3]
            : studio
              ? ['#fff6e8', '#b9a88f', 0.26]
              : amber
                ? ['#5b3524', '#120b08', 0.24]
                : ['#5a6b7a', '#0a0c0d', 0.16]
        }
      />
    </>
  )
}

function StageHalo({
  rootRef,
  headY,
  bloomRef,
  colorA,
  colorB,
}: {
  rootRef: React.RefObject<THREE.Group>
  headY: number
  bloomRef: React.MutableRefObject<number>
  colorA: string
  colorB: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const world = useMemo(() => new THREE.Vector3(), [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA).lerp(new THREE.Color(colorB), 0.25) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: 0.2 },
    }),
    [colorA, colorB]
  )
  useFrame(({ camera, clock }) => {
    if (!meshRef.current || !matRef.current || !rootRef.current) return
    world.set(0, headY, 0)
    rootRef.current.localToWorld(world)
    const dir = new THREE.Vector3().subVectors(camera.position, world).normalize()
    meshRef.current.position.copy(world).addScaledVector(dir, -1.65)
    meshRef.current.quaternion.copy(camera.quaternion)
    const scale = 3.7 + bloomRef.current * 1.15
    meshRef.current.scale.set(scale, scale, 1)
    matRef.current.uniforms.uTime.value = clock.elapsedTime
    matRef.current.uniforms.uOpacity.value = 0.045 + bloomRef.current * 0.11
  })
  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        args={[
          {
            uniforms,
            vertexShader: haloVertex,
            fragmentShader: haloFragment,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </mesh>
  )
}

function AxisGizmo({ headY }: { headY: number }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.children.forEach((c, i) => {
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.055 + Math.sin(clock.elapsedTime * 0.4 + i * 2) * 0.012
    })
  })
  return (
    <group ref={group} position={[0, headY, 0]}>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.15, 0.0025, 4, 96]} />
        <meshBasicMaterial color="#ff9b9b" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.0025, 4, 96]} />
        <meshBasicMaterial color="#8fe3c0" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.15, 0.0025, 4, 96]} />
        <meshBasicMaterial color="#e6c88a" transparent opacity={0.06} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function Pedestal({ accent, envAccent }: { accent: string; envAccent: string }) {
  const stone = useMemo(() => createStoneMaterial(), [])
  const moss = useMemo(() => createMossMaterial(), [])
  const lathe = useMemo(() => {
    const points = [
      new THREE.Vector2(0.1, -0.44),
      new THREE.Vector2(0.42, -0.42),
      new THREE.Vector2(0.68, -0.34),
      new THREE.Vector2(0.86, -0.2),
      new THREE.Vector2(0.96, -0.04),
      new THREE.Vector2(0.98, 0.02),
      new THREE.Vector2(0.8, 0.07),
      new THREE.Vector2(0.56, 0.08),
      new THREE.Vector2(0.32, 0.075),
      new THREE.Vector2(0.15, 0.07),
    ]
    return new THREE.LatheGeometry(points, 72)
  }, [])
  const runeUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(accent).lerp(new THREE.Color(envAccent), 0.4) },
      uOpacity: { value: 0.8 },
    }),
    [accent, envAccent]
  )
  const runeRef = useRef<THREE.ShaderMaterial>(null)
  const shards = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = i * 2.1
        return {
          pos: [Math.cos(a) * (1.5 + i * 0.16), -0.8 - (i % 2) * 0.35, Math.sin(a) * (1.4 + i * 0.12)] as [
            number,
            number,
            number,
          ],
          scale: 0.1 + (i % 3) * 0.055,
          phase: i * 1.37,
        }
      }),
    []
  )
  const shardGroup = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (runeRef.current) runeRef.current.uniforms.uTime.value = clock.elapsedTime
    if (shardGroup.current) {
      shardGroup.current.children.forEach((c, i) => {
        c.rotation.y = clock.elapsedTime * 0.08 + i
        c.position.y = shards[i].pos[1] + Math.sin(clock.elapsedTime * 0.28 + shards[i].phase) * 0.07
      })
    }
  })

  return (
    <group>
      <mesh geometry={lathe} material={stone} position={[0, -0.04, 0]} />
      <mesh position={[0, 0.058, 0]} material={moss}>
        <cylinderGeometry args={[0.34, 0.4, 0.035, 48]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]}>
        <ringGeometry args={[0.53, 0.545, 96]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} renderOrder={1}>
        <circleGeometry args={[1.02, 96]} />
        <shaderMaterial
          ref={runeRef}
          args={[
            {
              uniforms: runeUniforms,
              vertexShader: runesVertex,
              fragmentShader: runesFragment,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
            },
          ]}
        />
      </mesh>
      <group ref={shardGroup}>
        {shards.map((s, i) => (
          <mesh key={i} position={s.pos} scale={s.scale}>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#1c2526" roughness={0.6} metalness={0.35} emissive={envAccent} emissiveIntensity={0.02} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.4, 0]} color={accent} intensity={1} distance={1.6} decay={2} />
    </group>
  )
}

interface BurstHandle {
  trigger: () => void
}

function PetalBurstInner(
  { headY, colorA, colorB, start }: { headY: number; colorA: string; colorB: string; start: boolean },
  ref: React.ForwardedRef<BurstHandle>
) {
  const { gl } = useThree()
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const ringMat = useRef<THREE.MeshBasicMaterial>(null)
  const started = useRef(-1)
  const active = useRef(start)
  const count = 260
  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const dirs = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const z = Math.random() * 2 - 1
      const r = Math.sqrt(1 - z * z)
      dirs[i * 3] = Math.cos(a) * r
      dirs[i * 3 + 1] = 0.4 + Math.random() * 0.8
      dirs[i * 3 + 2] = Math.sin(a) * r
      speeds[i] = 0.4 + Math.random() * 1.4
      scales[i] = 0.4 + Math.random() * 1.2
      phases[i] = Math.random() * 10
    }
    return { positions, dirs, speeds, scales, phases }
  }, [])
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uDpr: { value: Math.min(2, gl.getPixelRatio()) },
      uSize: { value: 8 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    }),
    [colorA, colorB, gl]
  )
  useImperativeHandle(ref, () => ({
    trigger: () => {
      started.current = performance.now() / 1000
      active.current = true
    },
  }))
  useEffect(() => {
    if (start) {
      started.current = performance.now() / 1000
      active.current = true
    }
  }, [start])
  useFrame(({ clock }) => {
    if (!matRef.current) return
    const now = clock.elapsedTime
    matRef.current.uniforms.uTime.value = now
    matRef.current.uniforms.uDpr.value = Math.min(2, gl.getPixelRatio())
    if (!active.current) {
      if (ringRef.current) ringRef.current.visible = false
      matRef.current.uniforms.uProgress.value = 2
      return
    }
    const startT = started.current > 0 ? started.current : now
    const progress = clamp01((performance.now() / 1000 - startT) / 1.6)
    matRef.current.uniforms.uProgress.value = progress
    if (ringRef.current && ringMat.current) {
      ringRef.current.visible = true
      const p = Math.min(1, progress * 1.8)
      ringRef.current.scale.setScalar(0.4 + p * 3.1)
      ringMat.current.opacity = (1 - p) * 0.3
    }
    if (progress >= 1) {
      active.current = false
      if (ringRef.current) ringRef.current.visible = false
    }
  })
  return (
    <group position={[0, headY - 0.15, 0]}>
      <points frustumCulled={false} visible={active.current}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
          <bufferAttribute attach="attributes-aDir" args={[geo.dirs, 3]} />
          <bufferAttribute attach="attributes-aSpeed" args={[geo.speeds, 1]} />
          <bufferAttribute attach="attributes-aScale" args={[geo.scales, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[geo.phases, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          args={[
            {
              uniforms,
              vertexShader: burstVertex,
              fragmentShader: burstFragment,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
            },
          ]}
        />
      </points>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.86, 0.9, 96]} />
        <meshBasicMaterial ref={ringMat} color={colorA} transparent opacity={0.3} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

const PetalBurst = forwardRef<BurstHandle, { headY: number; colorA: string; colorB: string; start: boolean }>(
  PetalBurstInner
)
