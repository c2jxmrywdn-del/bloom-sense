import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { EnvId } from '../data'
import {
  NOISE,
  skyVertex,
  skyFragment,
  waterVertex,
  waterFragment,
  auroraVertex,
  auroraFragment,
  cloudVertex,
  cloudFragment,
  particlesVertex,
  particlesFragment,
  runesVertex,
  runesFragment,
} from './shaders'

interface SkyConfig {
  zenith: string
  horizon: string
  low: string
  sun: string
  sunDir: [number, number, number]
  sunSize: number
  sunGlow: number
  stars: number
  nebula: number
  clouds: number
  aurora: number
  accent: string
  cloudColor: string
  cloudSpeed: number
}

const ENV_SKY: Record<EnvId, SkyConfig> = {
  studio: {
    zenith: '#f7f2e9', horizon: '#ece2d4', low: '#ded3c2', sun: '#fff4e2',
    sunDir: [0.55, 0.32, -1], sunSize: 0.9999, sunGlow: 0.06, stars: 0, nebula: 0,
    clouds: 0.02, aurora: 0, accent: '#c9aa88', cloudColor: '#f5eee3', cloudSpeed: 0.2,
  },
  bamboo: {
    zenith: '#e9f0e3', horizon: '#d2dfc8', low: '#b3c3aa', sun: '#fff4d6',
    sunDir: [0.9, 0.6, -1], sunSize: 0.99965, sunGlow: 0.1, stars: 0, nebula: 0,
    clouds: 0.09, aurora: 0, accent: '#8fb59a', cloudColor: '#e9f1df', cloudSpeed: 0.24,
  },
  moon: {
    zenith: '#02060f', horizon: '#0a1b2b', low: '#050b12', sun: '#dceaff',
    sunDir: [-0.72, 0.3, -1], sunSize: 0.9992, sunGlow: 0.35, stars: 0.95, nebula: 0.02,
    clouds: 0.20, aurora: 0, accent: '#7fa8de', cloudColor: '#152636', cloudSpeed: 0.55,
  },
  cosmic: {
    zenith: '#05020e', horizon: '#160a2c', low: '#070412', sun: '#b493ff',
    sunDir: [0.35, 0.55, -1], sunSize: 0.9998, sunGlow: 0.06, stars: 1.15, nebula: 0.8,
    clouds: 0.18, aurora: 0.22, accent: '#9b7cff', cloudColor: '#43215e', cloudSpeed: 0.35,
  },
  dawn: {
    zenith: '#28334d', horizon: '#ffb08a', low: '#342a31', sun: '#ffd6a5',
    sunDir: [0.65, 0.18, -1], sunSize: 0.99945, sunGlow: 0.9, stars: 0.05, nebula: 0,
    clouds: 0.75, aurora: 0, accent: '#ffbd8c', cloudColor: '#f0b198', cloudSpeed: 0.8,
  },
  amber: {
    zenith: '#2a1a17', horizon: '#b96f3f', low: '#2a1812', sun: '#ffd29a',
    sunDir: [-0.52, 0.2, -1], sunSize: 0.9992, sunGlow: 0.82, stars: 0.2, nebula: 0,
    clouds: 0.6, aurora: 0, accent: '#f2a45c', cloudColor: '#d99563', cloudSpeed: 0.5,
  },
  aurora: {
    zenith: '#010609', horizon: '#062524', low: '#020c0d', sun: '#b7fff0',
    sunDir: [0.25, 0.36, -1], sunSize: 0.9996, sunGlow: 0.12, stars: 0.7, nebula: 0.08,
    clouds: 0.14, aurora: 0.95, accent: '#66ffc8', cloudColor: '#0d3d3a', cloudSpeed: 0.3,
  },
}

const ENV_FOG: Record<EnvId, string> = {
  studio: '#f0e9dd',
  bamboo: '#e3ebdc',
  moon: '#071018',
  cosmic: '#0b0718',
  dawn: '#1b1720',
  amber: '#2a1913',
  aurora: '#051214',
}

export function getEnvFog(id: EnvId) {
  return ENV_FOG[id]
}

export function Environment({ id }: { id: EnvId }) {
  const cfg = ENV_SKY[id]
  return (
    <group key={id}>
      <Sky cfg={cfg} />
      {id === 'studio' && <StudioScene />}
      {id === 'bamboo' && <BambooScene />}
      {id === 'moon' && <MoonScene />}
      {id === 'cosmic' && <CosmicScene />}
      {id === 'dawn' && <DawnScene />}
      {id === 'amber' && <AmberScene />}
      {id === 'aurora' && <AuroraScene />}
      <EnvironmentLights id={id} />
    </group>
  )
}

function Sky({ cfg }: { cfg: SkyConfig }) {
  const ref = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uZenith: { value: new THREE.Color(cfg.zenith) },
      uHorizon: { value: new THREE.Color(cfg.horizon) },
      uLow: { value: new THREE.Color(cfg.low) },
      uSunColor: { value: new THREE.Color(cfg.sun) },
      uSunDir: { value: new THREE.Vector3(...cfg.sunDir).normalize() },
      uAccent: { value: new THREE.Color(cfg.accent) },
      uCloudColor: { value: new THREE.Color(cfg.cloudColor) },
      uSunSize: { value: cfg.sunSize },
      uSunGlow: { value: cfg.sunGlow },
      uStars: { value: cfg.stars },
      uNebula: { value: cfg.nebula },
      uClouds: { value: cfg.clouds },
      uAurora: { value: cfg.aurora },
      uCloudSpeed: { value: cfg.cloudSpeed },
    }),
    [cfg]
  )
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[70, 64, 40]} />
      <shaderMaterial
        ref={ref}
        args={[
          {
            uniforms,
            vertexShader: skyVertex,
            fragmentShader: skyFragment,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false,
            fog: false,
          },
        ]}
      />
    </mesh>
  )
}

function StudioScene() {
  const shadowRef = useRef<THREE.ShaderMaterial>(null)
  const shadowUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#98876f') },
      uOpacity: { value: 0.34 },
    }),
    []
  )
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.48, 0]} receiveShadow={false}>
        <planeGeometry args={[130, 130]} />
        <meshStandardMaterial color="#e9dfd1" roughness={0.92} metalness={0.0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.465, 0]} renderOrder={1}>
        <planeGeometry args={[5.4, 5.4]} />
        <shaderMaterial
          ref={shadowRef}
          args={[
            {
              uniforms: shadowUniforms,
              vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                varying vec2 vUv;
                uniform vec3 uColor;
                uniform float uOpacity;
                void main(){
                  vec2 p=vUv*2.0-1.0;
                  float d=length(p);
                  float a=smoothstep(0.85,0.08,d);
                  a*=smoothstep(1.0,0.6,length(p*vec2(0.9,1.4)))*uOpacity;
                  gl_FragColor=vec4(uColor,a);
                }
              `,
              transparent: true,
              depthWrite: false,
            },
          ]}
        />
      </mesh>
      <ParticleField
        seed={71}
        count={64}
        radius={6.8}
        yRange={[-1.2, 5.2]}
        colorA="#fff6e6"
        colorB="#d8c5aa"
        size={1.5}
        speed={0.24}
        opacity={0.38}
        additive={false}
      />
      <ParticleField
        seed={79}
        count={22}
        radius={4.2}
        yRange={[0.2, 4]}
        colorA="#f4dcc0"
        colorB="#fff9ee"
        size={2.6}
        speed={0.18}
        opacity={0.22}
        additive
      />
      <directionalLight position={[4.5, 6.5, 4.5]} color="#fff2e4" intensity={0.3} />
      <directionalLight position={[-4, 3.5, 3]} color="#eef4ff" intensity={0.12} />
      <ambientLight intensity={0.16} />
    </group>
  )
}

// ── 雾竹幽庭 ────────────────────────────────────────────────
function BambooScene() {
  const moss = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({ clock }) => {
    if (moss.current) moss.current.uniforms.uTime.value = clock.elapsedTime
  })
  const grove = useMemo(() => buildBambooGrove(), [])
  const backdrop = useMemo(() => buildBambooBackdrop(), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} renderOrder={-2}>
        <planeGeometry args={[110, 110]} />
        <shaderMaterial
          ref={moss}
          args={[
            {
              uniforms,
              vertexShader: /* glsl */ `
                varying vec3 vWorld;
                void main() {
                  vec4 w = modelMatrix * vec4(position, 1.0);
                  vWorld = w.xyz;
                  gl_Position = projectionMatrix * viewMatrix * w;
                }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                varying vec3 vWorld;
                uniform float uTime;
                ${NOISE}
                void main() {
                  vec2 p = vWorld.xz;
                  float n = fbm2(p * 0.28 + 3.0);
                  vec3 col = mix(vec3(0.15, 0.20, 0.135), vec3(0.32, 0.395, 0.255), n);
                  float moss = smoothstep(0.50, 0.80, fbm2(p * 1.25 + 7.0));
                  col = mix(col, vec3(0.255, 0.335, 0.205), moss * 0.55);
                  float dapple = smoothstep(0.56, 0.86, fbm2(p * 0.62 + vec2(uTime * 0.004, 0.0)));
                  col += vec3(0.10, 0.105, 0.06) * dapple * 0.7;
                  float stones = smoothstep(0.80, 0.90, fbm2(p * 3.4 + 11.0));
                  col = mix(col, vec3(0.42, 0.43, 0.38), stones * 0.32);
                  col = mix(vec3(0.64, 0.71, 0.60), col, smoothstep(44.0, 8.0, length(p)));
                  gl_FragColor = vec4(col, 1.0);
                }
              `,
              transparent: false,
            },
          ]}
        />
      </mesh>

      <mesh geometry={backdrop.culms} renderOrder={-3}>
        <meshStandardMaterial color="#a7b79c" roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={backdrop.leaves} renderOrder={-3}>
        <meshStandardMaterial color="#b2c0a4" roughness={0.95} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={grove.culms} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.7} metalness={0.02} />
      </mesh>
      <mesh geometry={grove.rings} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.86} />
      </mesh>
      <mesh geometry={grove.leaves} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      <CloudLayer y={-0.8} size={70} colorLow="#d3e0c7" colorHigh="#eef5e3" opacity={0.13} speed={0.2} scale={1.7} />
      <CloudLayer y={0.65} size={56} colorLow="#cad9bd" colorHigh="#e8f1dd" opacity={0.09} speed={0.28} scale={2.4} />
      <CloudLayer y={2.1} size={46} colorLow="#c4d4b8" colorHigh="#e2ecda" opacity={0.06} speed={0.16} scale={2.9} />

      <LightShaft position={[2.8, 2.9, -5.2]} rotation={[0.03, 0.1, 0.22]} width={2.1} height={10} color="#fff6d9" opacity={0.2} />
      <LightShaft position={[4.1, 3.4, -7.4]} rotation={[-0.02, 0.18, 0.3]} width={3.2} height={12} color="#f8ffe8" opacity={0.12} />

      <StoneLantern position={[-3.25, -1.5, -5.2]} scale={1.05} />
      <StoneLantern position={[4.4, -1.5, -8.2]} scale={0.78} />

      <ParticleField
        seed={83}
        count={90}
        radius={8.5}
        yRange={[-1.1, 5.4]}
        colorA="#f4ffe8"
        colorB="#cfe4b8"
        size={2.2}
        speed={0.2}
        opacity={0.45}
        additive={false}
      />
      <ParticleField
        seed={89}
        count={38}
        radius={5.2}
        yRange={[0.1, 4.2]}
        colorA="#fff4c9"
        colorB="#c4e8a8"
        size={3.4}
        speed={0.26}
        opacity={0.32}
        additive
      />

      <directionalLight position={[4.6, 7.2, 3.2]} color="#fff3d8" intensity={0.95} />
      <directionalLight position={[-4.2, 3.6, -2.6]} color="#bcd8b2" intensity={0.46} />
      <hemisphereLight args={['#e8f2df', '#3e4c3a', 0.3]} />
    </group>
  )
}

function paintGeometry(geo: THREE.BufferGeometry, color: THREE.Color) {
  const count = geo.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geo
}

function buildBambooGrove() {
  let seed = 20261020
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const culms: THREE.BufferGeometry[] = []
  const rings: THREE.BufferGeometry[] = []
  const leaves: THREE.BufferGeometry[] = []

  const leafBase = new THREE.PlaneGeometry(0.13, 0.4, 1, 4)
  leafBase.translate(0, 0.2, 0)
  {
    const pos = leafBase.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const x = pos.getX(i)
      const t = THREE.MathUtils.clamp(y / 0.4, 0, 1)
      const w = Math.pow(Math.sin(Math.PI * t), 0.65)
      pos.setX(i, x * w)
      pos.setZ(i, Math.sin(t * Math.PI) * 0.06 - t * t * 0.03)
    }
    leafBase.computeVertexNormals()
  }

  const stalkMatrix = new THREE.Matrix4()
  const localMatrix = new THREE.Matrix4()
  const quat = new THREE.Quaternion()
  const euler = new THREE.Euler()

  for (let i = 0; i < 24; i++) {
    let angle = Math.PI + rand() * Math.PI
    if (i % 6 === 0) angle = (rand() < 0.5 ? 0 : Math.PI) + (rand() - 0.5) * 1.1
    const radius = 6.2 + rand() * 7.6
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const h = 7.4 + rand() * 5.8
    const r = 0.05 + rand() * 0.035
    euler.set((rand() - 0.5) * 0.12, rand() * Math.PI, (rand() - 0.5) * 0.12)
    quat.setFromEuler(euler)
    stalkMatrix.compose(new THREE.Vector3(x, -1.5, z), quat, new THREE.Vector3(1, 1, 1))

    const culmColor = new THREE.Color().setHSL(0.225 + rand() * 0.04, 0.24 + rand() * 0.13, 0.32 + rand() * 0.1)
    const nodeColor = new THREE.Color().setHSL(0.22, 0.2, 0.25 + rand() * 0.04)
    const culm = new THREE.CylinderGeometry(r * 0.7, r, h, 7, 1)
    culm.applyMatrix4(new THREE.Matrix4().makeTranslation(0, h / 2, 0).premultiply(stalkMatrix))
    culms.push(paintGeometry(culm, culmColor))

    const nodes = Math.max(4, Math.round(h / 1.0))
    for (let k = 1; k < nodes; k++) {
      const ring = new THREE.CylinderGeometry(r * 1.16, r * 1.16, 0.04, 7, 1)
      ring.applyMatrix4(new THREE.Matrix4().makeTranslation(0, (k / nodes) * h, 0).premultiply(stalkMatrix))
      rings.push(paintGeometry(ring, nodeColor))
    }

    const clusters = 6 + Math.floor(rand() * 5)
    for (let c = 0; c < clusters; c++) {
      const y = h * (0.34 + rand() * 0.62)
      const ang = rand() * Math.PI * 2
      const out = 0.34 + rand() * 1.24
      const dir = new THREE.Vector3(Math.cos(ang), 0.28 + rand() * 0.24, Math.sin(ang)).normalize()
      const start = new THREE.Vector3(0, y, 0)
      const end = start.clone().addScaledVector(dir, out)
      const branch = new THREE.CylinderGeometry(0.006, 0.016, out + 0.04, 4, 1)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      const mid = start.clone().add(end).multiplyScalar(0.5)
      branch.applyMatrix4(
        stalkMatrix.clone().multiply(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)))
      )
      rings.push(paintGeometry(branch, nodeColor))

      for (let j = 0; j < 2; j++) {
        const leafPos = end.clone().add(new THREE.Vector3((rand() - 0.5) * 0.16, j * 0.075, (rand() - 0.5) * 0.16))
        const leafRot = new THREE.Euler(
          (rand() - 0.5) * 1.15,
          ang + Math.PI / 2 + (rand() - 0.5) * 0.6,
          (rand() - 0.5) * 1.5
        )
        const leafScale = 0.75 + rand() * 0.9
        localMatrix.compose(
          leafPos,
          new THREE.Quaternion().setFromEuler(leafRot),
          new THREE.Vector3(leafScale, leafScale, leafScale)
        )
        const leafColor = new THREE.Color().setHSL(0.2 + rand() * 0.06, 0.3 + rand() * 0.16, 0.34 + rand() * 0.14)
        const leaf = leafBase.clone()
        leaf.applyMatrix4(stalkMatrix.clone().multiply(localMatrix))
        leaves.push(paintGeometry(leaf, leafColor))
      }
    }
  }

  return {
    culms: mergeGeometries(culms, false) as THREE.BufferGeometry,
    rings: mergeGeometries(rings, false) as THREE.BufferGeometry,
    leaves: mergeGeometries(leaves, false) as THREE.BufferGeometry,
  }
}

function buildBambooBackdrop() {
  let seed = 6161
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const culms: THREE.BufferGeometry[] = []
  const leaves: THREE.BufferGeometry[] = []
  const leafBase = new THREE.PlaneGeometry(0.18, 0.58, 1, 3)
  leafBase.translate(0, 0.29, 0)
  {
    const pos = leafBase.attributes.position
    for (let k = 0; k < pos.count; k++) {
      const t = THREE.MathUtils.clamp(pos.getY(k) / 0.58, 0, 1)
      pos.setX(k, pos.getX(k) * Math.pow(Math.sin(Math.PI * t), 0.6))
      pos.setZ(k, Math.sin(t * Math.PI) * 0.04)
    }
    leafBase.computeVertexNormals()
  }
  for (let i = 0; i < 34; i++) {
    const angle = Math.PI + rand() * Math.PI
    const radius = 17 + rand() * 12
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const h = 10 + rand() * 7
    const r = 0.09 + rand() * 0.07
    const culm = new THREE.CylinderGeometry(r * 0.8, r, h, 5, 1)
    culm.applyMatrix4(new THREE.Matrix4().makeTranslation(x, h / 2 - 1.5, z))
    culms.push(culm)
    const clusters = 3 + Math.floor(rand() * 3)
    for (let c = 0; c < clusters; c++) {
      const y = h * (0.5 + rand() * 0.46) - 1.5
      const a = rand() * Math.PI * 2
      const out = 0.25 + rand() * 1.3
      const leaf = leafBase.clone()
      const p = new THREE.Vector3(x + Math.cos(a) * out, y, z + Math.sin(a) * out)
      const rot = new THREE.Euler((rand() - 0.5) * 1.1, a + Math.PI / 2, (rand() - 0.5) * 1.4)
      leaf.applyMatrix4(
        new THREE.Matrix4().compose(
          p,
          new THREE.Quaternion().setFromEuler(rot),
          new THREE.Vector3(0.8 + rand() * 0.7, 0.8 + rand() * 0.7, 0.8 + rand() * 0.7)
        )
      )
      leaves.push(leaf)
    }
  }
  return {
    culms: mergeGeometries(culms, false) as THREE.BufferGeometry,
    leaves: mergeGeometries(leaves, false) as THREE.BufferGeometry,
  }
}

function StoneLantern({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 0.16, 6]} />
        <meshStandardMaterial color="#7d8175" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.44, 6]} />
        <meshStandardMaterial color="#878b7d" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.63, 0]}>
        <cylinderGeometry args={[0.3, 0.26, 0.1, 6]} />
        <meshStandardMaterial color="#74786c" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <boxGeometry args={[0.34, 0.3, 0.34]} />
        <meshStandardMaterial color="#8d9183" roughness={0.9} />
      </mesh>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <mesh key={a} position={[Math.sin(a) * 0.176, 0.82, Math.cos(a) * 0.176]} rotation={[0, a, 0]}>
          <planeGeometry args={[0.15, 0.17]} />
          <meshBasicMaterial color="#ffdca6" transparent opacity={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.03, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.47, 0.2, 4]} />
        <meshStandardMaterial color="#6e7265" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.17, 0]}>
        <sphereGeometry args={[0.055, 10, 8]} />
        <meshStandardMaterial color="#7f8376" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 0.84, 0]} color="#ffcf8f" intensity={1.6} distance={3.4} decay={2} />
    </group>
  )
}

function LightShaft({
  position,
  rotation,
  width,
  height,
  color,
  opacity,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
  color: string
  opacity: number
}) {
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } }), [color, opacity])
  return (
    <mesh position={position} rotation={rotation} renderOrder={-1}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        args={[
          {
            uniforms,
            vertexShader: /* glsl */ `
              varying vec2 vUv;
              void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: /* glsl */ `
              precision highp float;
              varying vec2 vUv;
              uniform vec3 uColor;
              uniform float uOpacity;
              void main(){
                float edge = smoothstep(0.0, 0.28, vUv.x) * (1.0 - smoothstep(0.72, 1.0, vUv.x));
                float fade = smoothstep(0.0, 0.24, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));
                float grain = 0.82 + 0.18 * sin(vUv.y * 42.0 + vUv.x * 9.0);
                gl_FragColor = vec4(uColor, edge * fade * grain * uOpacity);
              }
            `,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </mesh>
  )
}

// ── 琥珀秋苑 ────────────────────────────────────────────────
function AmberScene() {
  const trees = useMemo(() => buildAmberTrees(), [])
  const grass = useMemo(() => buildAmberGrass(), [])
  const ridge = useMemo(() => buildAmberRidge(), [])
  const litter = useMemo(() => buildAmberLitter(), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} renderOrder={-2}>
        <planeGeometry args={[120, 120]} />
        <shaderMaterial
          args={[
            {
              uniforms: {},
              vertexShader: /* glsl */ `
                varying vec3 vWorld;
                void main() {
                  vec4 w = modelMatrix * vec4(position, 1.0);
                  vWorld = w.xyz;
                  gl_Position = projectionMatrix * viewMatrix * w;
                }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                varying vec3 vWorld;
                ${NOISE}
                void main() {
                  vec2 p = vWorld.xz;
                  float n = fbm2(p * 0.24 + 5.0);
                  vec3 col = mix(vec3(0.095, 0.06, 0.042), vec3(0.26, 0.155, 0.085), n);
                  float litter = smoothstep(0.60, 0.86, fbm2(p * 2.3 + 3.0));
                  col = mix(col, vec3(0.42, 0.225, 0.10), litter * 0.52);
                  float fleck = smoothstep(0.87, 0.97, fbm2(p * 11.0));
                  col = mix(col, vec3(0.74, 0.41, 0.17), fleck * 0.6);
                  col = mix(vec3(0.42, 0.255, 0.145), col, smoothstep(44.0, 8.0, length(p)));
                  gl_FragColor = vec4(col, 1.0);
                }
              `,
              transparent: false,
            },
          ]}
        />
      </mesh>

      <mesh geometry={ridge.far} position={[0, -1.5, -38]} renderOrder={-7}>
        <meshBasicMaterial color="#4f2e20" fog={false} />
      </mesh>
      <mesh geometry={ridge.near} position={[0, -1.5, -29]} renderOrder={-6}>
        <meshBasicMaterial color="#3b2318" fog={false} />
      </mesh>

      <mesh geometry={trees.trunks} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.94} />
      </mesh>
      <mesh geometry={trees.canopy} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.9} />
      </mesh>
      <mesh geometry={grass} renderOrder={-1}>
        <meshStandardMaterial color="#8a6738" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={litter} position={[0, -1.49, 0]} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.92} side={THREE.DoubleSide} />
      </mesh>

      <CloudLayer y={-1.1} size={78} colorLow="#4a2a1d" colorHigh="#e8a06a" opacity={0.26} speed={0.3} scale={2.2} />
      <CloudLayer y={0.1} size={64} colorLow="#54301f" colorHigh="#d99663" opacity={0.16} speed={0.36} scale={2.6} />
      <CloudLayer y={1.4} size={50} colorLow="#5a3624" colorHigh="#c98a5c" opacity={0.1} speed={0.24} scale={3.1} />
      <CloudLayer y={4.4} size={92} colorLow="#4b2c1f" colorHigh="#e0a071" opacity={0.07} speed={0.4} scale={1.8} />

      <FallingLeaves count={58} />
      <ParticleField
        seed={97}
        count={120}
        radius={11}
        yRange={[-1.2, 6.5]}
        colorA="#ffd7a0"
        colorB="#ffac62"
        size={2.4}
        speed={0.3}
        opacity={0.42}
        additive
      />
      <ParticleField
        seed={101}
        count={40}
        radius={6.2}
        yRange={[0.1, 4.6]}
        colorA="#ffb768"
        colorB="#ffe2b0"
        size={4.6}
        speed={0.24}
        opacity={0.26}
        additive
      />

      <directionalLight position={[-7, 4.6, -3.4]} color="#ffb877" intensity={1.25} />
      <directionalLight position={[4.5, 3, 4.5]} color="#9b7fbf" intensity={0.3} />
      <hemisphereLight args={['#5c3a2a', '#100a07', 0.26]} />
    </group>
  )
}

function buildAmberTrees() {
  let seed = 4242
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const trunks: THREE.BufferGeometry[] = []
  const canopy: THREE.BufferGeometry[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const trunkColor = new THREE.Color()
  const canopyColor = new THREE.Color()

  const addBlob = (at: THREE.Vector3, size: number) => {
    const pieces = 3 + Math.floor(rand() * 3)
    for (let k = 0; k < pieces; k++) {
      const blob = new THREE.IcosahedronGeometry((0.16 + rand() * 0.2) * size, 1)
      blob.scale(1.15 + rand() * 0.5, 0.7 + rand() * 0.3, 1.0 + rand() * 0.45)
      blob.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          at.x + (rand() - 0.5) * 0.62 * size,
          at.y + (rand() - 0.5) * 0.4 * size,
          at.z + (rand() - 0.5) * 0.56 * size
        )
      )
      canopyColor.setHSL(0.05 + rand() * 0.03, 0.38 + rand() * 0.16, 0.28 + rand() * 0.12)
      canopy.push(paintGeometry(blob, canopyColor))
    }
  }

  const addBranch = (base: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const d = dir.clone().normalize()
    const end = base.clone().addScaledVector(d, len)
    const geo = new THREE.CylinderGeometry(rad * 0.66, rad, len, 5, 1)
    const q = new THREE.Quaternion().setFromUnitVectors(up, d)
    geo.applyMatrix4(
      new THREE.Matrix4().compose(base.clone().add(end).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1))
    )
    trunkColor.setHSL(0.055, 0.28, 0.12 + depth * 0.02)
    trunks.push(paintGeometry(geo, trunkColor))

    if (depth <= 0 || len < 0.55) {
      addBlob(end, 1)
      return
    }
    if (depth === 1 && rand() > 0.42) addBlob(end, 0.9)

    const children = depth >= 3 ? 3 : 2 + (rand() > 0.5 ? 1 : 0)
    for (let c = 0; c < children; c++) {
      const nd = d.clone()
      nd.applyAxisAngle(up, (c - (children - 1) / 2) * 0.62 + (rand() - 0.5) * 0.34)
      nd.applyAxisAngle(new THREE.Vector3(1, 0, 0), (rand() - 0.5) * 0.55)
      nd.y = Math.max(0.22, nd.y + (rand() - 0.5) * 0.3)
      addBranch(end, nd, len * (0.6 + rand() * 0.2), rad * 0.64, depth - 1)
    }
  }

  const spots: [number, number, number, number][] = [
    [-14, -30, 4.0, 0.26],
    [15, -33, 4.2, 0.28],
    [-23, -38, 3.4, 0.2],
  ]
  for (const [x, z, len, rad] of spots) {
    addBranch(new THREE.Vector3(x, -1.5, z), new THREE.Vector3((x < 0 ? -1 : 1) * 0.15, 1, -0.03), len, rad, 3)
  }

  return {
    trunks: mergeGeometries(trunks, false) as THREE.BufferGeometry,
    canopy: mergeGeometries(canopy, false) as THREE.BufferGeometry,
  }
}

function buildAmberRidge() {
  let seed = 3141
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const make = (height: number) => {
    const shape = new THREE.Shape()
    shape.moveTo(-60, -4)
    const phase = rand() * Math.PI * 2
    for (let x = -60; x <= 60; x += 1.2) {
      const y =
        0.25 +
        (Math.sin(x * 0.085 + phase) * 0.5 + 0.5) * height +
        (Math.sin(x * 0.23 + phase * 2.1) * 0.5 + 0.5) * height * 0.24
      shape.lineTo(x, y)
    }
    shape.lineTo(60, -4)
    shape.closePath()
    return new THREE.ShapeGeometry(shape)
  }
  return { far: make(2.6), near: make(1.6) }
}

function makeLeafGeometry() {
  const geo = new THREE.BufferGeometry()
  const verts = new Float32Array([
    0, 0, 0,
    0.042, 0.06, 0.006,
    0.032, 0.118, 0.012,
    0, 0.17, 0,
    -0.032, 0.118, 0.004,
    -0.042, 0.06, -0.002,
  ])
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5])
  geo.computeVertexNormals()
  return geo
}

function buildAmberLitter() {
  let seed = 8642
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const parts: THREE.BufferGeometry[] = []
  const color = new THREE.Color()
  for (let i = 0; i < 220; i++) {
    const a = rand() * Math.PI * 2
    const r = 1.3 + rand() * 10.5
    const leaf = makeLeafGeometry()
    const s = 0.32 + rand() * 0.64
    const rot = new THREE.Euler(-Math.PI / 2 + (rand() - 0.5) * 0.28, rand() * Math.PI * 2, (rand() - 0.5) * 0.25)
    leaf.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
        new THREE.Quaternion().setFromEuler(rot),
        new THREE.Vector3(s, s, s)
      )
    )
    color.setHSL(0.045 + rand() * 0.04, 0.38 + rand() * 0.2, 0.17 + rand() * 0.16)
    parts.push(paintGeometry(leaf, color))
  }
  return mergeGeometries(parts, false) as THREE.BufferGeometry
}

function buildAmberGrass() {
  let seed = 777
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const blades: THREE.BufferGeometry[] = []
  for (let i = 0; i < 86; i++) {
    const angle = Math.PI + rand() * Math.PI
    const radius = 3.1 + rand() * 5.6
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const h = 0.38 + rand() * 0.72
    const blade = new THREE.PlaneGeometry(0.05, h, 1, 3)
    blade.translate(0, h / 2, 0)
    const pos = blade.attributes.position
    for (let k = 0; k < pos.count; k++) {
      const t = THREE.MathUtils.clamp(pos.getY(k) / h, 0, 1)
      pos.setX(k, pos.getX(k) * (1 - t * 0.85))
      pos.setZ(k, t * t * (0.1 + rand() * 0.05))
    }
    blade.computeVertexNormals()
    const rot = new THREE.Euler((rand() - 0.5) * 0.35, rand() * Math.PI, (rand() - 0.5) * 0.4)
    blade.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, -1.5, z),
        new THREE.Quaternion().setFromEuler(rot),
        new THREE.Vector3(1, 1, 1)
      )
    )
    blades.push(blade)
  }
  return mergeGeometries(blades, false) as THREE.BufferGeometry
}

function FallingLeaves({ count = 64 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const data = useMemo(() => {
    let seed = 9001
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const palette = ['#ffb768', '#df8747', '#ffd092', '#c96f3d']
    return Array.from({ length: count }, () => ({
      x: (rand() - 0.5) * 10,
      z: -8 + rand() * 8.6,
      offset: rand() * 6,
      speed: 0.22 + rand() * 0.42,
      drift: 0.4 + rand() * 0.7,
      phase: rand() * Math.PI * 2,
      yaw: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 1.4,
      scale: 0.8 + rand() * 0.6,
      color: palette[Math.floor(rand() * palette.length)],
    }))
  }, [count])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const geometry = useMemo(() => makeLeafGeometry(), [])
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: THREE.DoubleSide }),
    []
  )

  useEffect(() => {
    if (!ref.current) return
    const c = new THREE.Color()
    data.forEach((d, i) => {
      c.set(d.color)
      ref.current!.setColorAt(i, c)
    })
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true
  }, [data])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    data.forEach((d, i) => {
      const fall = (((d.offset - t * d.speed) % 6) + 6) % 6
      dummy.position.set(
        d.x + Math.sin(t * d.drift + d.phase) * 0.7,
        fall - 1.5,
        d.z + Math.cos(t * d.drift * 0.7 + d.phase) * 0.35
      )
      dummy.rotation.set(t * 0.5 * d.spin + d.phase, t * 0.35 * d.spin + d.yaw, Math.sin(t * d.drift + d.phase) * 0.8)
      dummy.scale.setScalar(d.scale)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
}

function MoonScene() {
  const waterRef = useRef<THREE.ShaderMaterial>(null)
  const waterUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#02080f') },
      uShallow: { value: new THREE.Color('#0c2634') },
      uSky: { value: new THREE.Color('#6e92b8') },
      uMoonColor: { value: new THREE.Color('#dceaff') },
      uAccent: { value: new THREE.Color('#ffc1ce') },
      uMoonDir: { value: new THREE.Vector3(-0.42, 0.2, -1).normalize() },
      uMoon: { value: 0.65 },
    }),
    []
  )
  useFrame(({ clock }) => {
    if (waterRef.current) waterRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  const mountains = useMemo(() => {
    const make = (seed: number, height: number) => {
      const shape = new THREE.Shape()
      shape.moveTo(-48, -6)
      let x = -48
      let i = 0
      while (x < 48) {
        const step = 3.8 + ((Math.sin(seed + i * 2.7) + 1) * 2.4)
        const y = 1.2 + Math.abs(Math.sin(seed * 1.7 + i * 1.9)) * height + Math.random() * 0.2
        shape.lineTo(x + step * 0.45, y * 0.8)
        shape.lineTo(x + step, 0.2)
        x += step
        i++
      }
      shape.lineTo(48, -6)
      shape.closePath()
      return new THREE.ShapeGeometry(shape)
    }
    return { far: make(2.3, 5.2), near: make(7.4, 3.1) }
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} renderOrder={-2}>
        <planeGeometry args={[100, 100, 1, 1]} />
        <shaderMaterial
          ref={waterRef}
          args={[
            {
              uniforms: waterUniforms,
              vertexShader: waterVertex,
              fragmentShader: waterFragment,
              transparent: false,
              depthWrite: true,
            },
          ]}
        />
      </mesh>
      <mesh geometry={mountains.far} position={[0, -1.5, -34]} renderOrder={-3}>
        <meshBasicMaterial color="#07121c" fog={false} />
      </mesh>
      <mesh geometry={mountains.near} position={[0, -1.5, -24]} renderOrder={-2}>
        <meshBasicMaterial color="#0b1b27" fog={false} transparent opacity={0.95} />
      </mesh>
      <ParticleField
        seed={3}
        count={90}
        radius={9}
        yRange={[-0.6, 4.2]}
        colorA="#ffd9a8"
        colorB="#b8ffd9"
        size={4}
        speed={0.55}
        opacity={0.62}
        additive
      />
      <ParticleField
        seed={11}
        count={42}
        radius={7}
        yRange={[0.2, 4.8]}
        colorA="#ffd2de"
        colorB="#ffb0c4"
        size={6}
        speed={0.32}
        opacity={0.26}
        additive
      />
      <pointLight position={[0, 0.7, 0.8]} color="#ffb9ca" intensity={2.5} distance={5} decay={2} />
      <directionalLight position={[-5, 4, -2]} color="#a8c8ff" intensity={0.7} />
      <hemisphereLight args={['#37506d', '#060b12', 0.22]} />
    </group>
  )
}

function CosmicScene() {
  const discRef = useRef<THREE.ShaderMaterial>(null)
  const discUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#a98aff') },
      uAccent: { value: new THREE.Color('#62e6d2') },
    }),
    []
  )
  useFrame(({ clock }) => {
    if (discRef.current) discRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  const crystals = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = i * 2.399 + 0.7
        const r = 2.6 + (i % 4) * 1.2
        return {
          pos: [Math.cos(a) * r, -1.1 + (i % 3) * 0.75, Math.sin(a) * r] as [number, number, number],
          scale: 0.12 + (i % 3) * 0.08,
          speed: 0.1 + (i % 5) * 0.04,
          color: i % 2 ? '#8e75ff' : '#6ee9d8',
        }
      }),
    []
  )
  const groupRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.elapsedTime
    groupRef.current.children.forEach((obj, i) => {
      obj.rotation.y = t * (0.12 + i * 0.012) + i
      obj.rotation.x = Math.sin(t * 0.2 + i) * 0.3
      obj.position.y += Math.sin(t * 0.35 + i * 1.7) * 0.00045
    })
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.15, 0]} renderOrder={-2}>
        <circleGeometry args={[13, 96]} />
        <shaderMaterial
          ref={discRef}
          args={[
            {
              uniforms: discUniforms,
              vertexShader: /* glsl */ `
                varying vec2 vUv;
                void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                varying vec2 vUv;
                uniform float uTime;
                uniform vec3 uColor;
                uniform vec3 uAccent;
                void main() {
                  vec2 p = vUv * 2.0 - 1.0;
                  float r = length(p);
                  float a = atan(p.y, p.x);
                  float rings = smoothstep(0.02, 0.0, abs(fract(r * 9.0 - uTime * 0.04) - 0.5) - 0.472);
                  float spokes = smoothstep(0.025, 0.0, abs(fract(a / 6.28318 * 36.0 + r * 0.12 + uTime * 0.01) - 0.5) - 0.475);
                  float glow = smoothstep(0.92, 0.0, r);
                  vec3 col = mix(uColor, uAccent, 0.5 + 0.5 * sin(a * 3.0 + r * 7.0));
                  float alpha = (rings * 0.16 + spokes * 0.08 + glow * 0.09) * smoothstep(1.0, 0.45, r);
                  gl_FragColor = vec4(col, alpha);
                }
              `,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
            },
          ]}
        />
      </mesh>

      <group ref={groupRef}>
        {crystals.map((c, i) => (
          <mesh key={i} position={c.pos} scale={c.scale}>
            <icosahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color={c.color}
              emissive={c.color}
              emissiveIntensity={0.35}
              roughness={0.2}
              metalness={0.15}
              transparent
              opacity={0.72}
              envMapIntensity={0.8}
            />
          </mesh>
        ))}
      </group>

      <AuroraCurtain position={[-10, 7, -22]} rotation={[0, 0.2, 0.06]} colorA="#8d6dff" colorB="#53e4d3" width={34} height={13} opacity={0.34} />
      <AuroraCurtain position={[10, 8.5, -26]} rotation={[0, -0.25, -0.07]} colorA="#ff8fd8" colorB="#7b9cff" width={30} height={14} opacity={0.24} />

      <ParticleField
        seed={19}
        count={180}
        radius={16}
        yRange={[-2, 8]}
        colorA="#e8ddff"
        colorB="#8de7ff"
        size={2.2}
        speed={0.24}
        opacity={0.55}
        additive
      />
      <ParticleField
        seed={27}
        count={40}
        radius={5.4}
        yRange={[0.2, 5]}
        colorA="#ffd0f2"
        colorB="#b49aff"
        size={7}
        speed={0.3}
        opacity={0.3}
        additive
      />
      <pointLight position={[0, 1, 0.8]} color="#c9b6ff" intensity={3} distance={6} decay={2} />
      <directionalLight position={[4, 5, -3]} color="#b79cff" intensity={0.7} />
      <hemisphereLight args={['#3d2a62', '#070510', 0.25]} />
    </group>
  )
}

function DawnScene() {
  const sunGlow = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (sunGlow.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 0.15) * 0.02
      sunGlow.current.scale.set(s, s, 1)
    }
  })

  return (
    <group>
      <mesh ref={sunGlow} position={[6, 5.5, -16]} renderOrder={-5}>
        <planeGeometry args={[18, 18]} />
        <meshBasicMaterial color="#ffcf9d" transparent opacity={0.14} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[6.1, 5.6, -16.1]} renderOrder={-4}>
        <circleGeometry args={[2.1, 64]} />
        <meshBasicMaterial color="#ffe6c4" transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <CloudLayer
          key={i}
          y={-2.0 - i * 0.65}
          size={70 + i * 42}
          colorLow={i % 2 ? '#6b4a54' : '#7a5560'}
          colorHigh={i % 2 ? '#ffd0b5' : '#ffe1c9'}
          opacity={0.62 - i * 0.1}
          speed={0.7 + i * 0.12}
          scale={2.6 + i * 0.45}
        />
      ))}
      <CloudLayer y={4.2} size={90} colorLow="#68546d" colorHigh="#ffd2ba" opacity={0.17} speed={0.45} scale={1.8} />
      <ParticleField
        seed={41}
        count={100}
        radius={10}
        yRange={[-1, 6]}
        colorA="#ffe4c6"
        colorB="#ffc6a1"
        size={3}
        speed={0.4}
        opacity={0.4}
        additive
      />
      <directionalLight position={[6, 6, -4]} color="#ffc59b" intensity={1.1} />
      <directionalLight position={[-4, 3, 5]} color="#9fb5d9" intensity={0.35} />
      <hemisphereLight args={['#e1b9b6', '#2a1f24', 0.25]} />
    </group>
  )
}

function AuroraScene() {
  const ice = useRef<THREE.ShaderMaterial>(null)
  const iceUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#03100f') },
      uGlow: { value: new THREE.Color('#53ffd0') },
      uAccent: { value: new THREE.Color('#9d7bff') },
    }),
    []
  )
  useFrame(({ clock }) => {
    if (ice.current) ice.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} renderOrder={-2}>
        <planeGeometry args={[100, 100, 1, 1]} />
        <shaderMaterial
          ref={ice}
          args={[
            {
              uniforms: iceUniforms,
              vertexShader: /* glsl */ `
                varying vec3 vWorld;
                varying vec2 vUv;
                void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }
              `,
              fragmentShader: /* glsl */ `
                precision highp float;
                varying vec3 vWorld;
                varying vec2 vUv;
                uniform float uTime;
                uniform vec3 uDeep;
                uniform vec3 uGlow;
                uniform vec3 uAccent;
                float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
                float noise(vec2 p){
                  vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
                  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
                }
                float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;} return v; }
                void main(){
                  vec2 p=vWorld.xz;
                  float n=fbm(p*0.32);
                  float crack=smoothstep(0.80,0.98,fbm(p*1.1+vec2(uTime*0.006,0.0)));
                  vec3 col=mix(uDeep,uGlow*0.22,n*0.85);
                  col=mix(col,uGlow, crack*0.28);
                  float glint=pow(fbm(p*4.0+uTime*0.02),12.0);
                  col+=uAccent*glint*0.5;
                  float fade=smoothstep(48.0,10.0,length(p));
                  col=mix(vec3(0.024,0.055,0.06),col,fade);
                  gl_FragColor=vec4(col,1.0);
                }
              `,
              transparent: false,
            },
          ]}
        />
      </mesh>

      <AuroraCurtain position={[-8, 6.5, -22]} rotation={[0, 0.15, 0.04]} colorA="#57ffc0" colorB="#3a92ff" width={38} height={15} opacity={0.5} />
      <AuroraCurtain position={[9, 8, -25]} rotation={[0, -0.2, -0.05]} colorA="#a2ffd9" colorB="#6b74ff" width={32} height={14} opacity={0.36} />
      <AuroraCurtain position={[0, 4.2, -30]} rotation={[0, 0, 0.02]} colorA="#3dff9e" colorB="#c26fff" width={48} height={11} opacity={0.22} />

      <ParticleField
        seed={53}
        count={220}
        radius={18}
        yRange={[-1.4, 8]}
        colorA="#eafff8"
        colorB="#bfffea"
        size={1.6}
        speed={0.22}
        opacity={0.5}
        additive={false}
      />
      <ParticleField
        seed={59}
        count={50}
        radius={7}
        yRange={[0.2, 5]}
        colorA="#a2ffd9"
        colorB="#b28dff"
        size={4}
        speed={0.28}
        opacity={0.32}
        additive
      />
      <directionalLight position={[-5, 5, -2]} color="#8fffd2" intensity={0.9} />
      <directionalLight position={[5, 2, 4]} color="#9d8cff" intensity={0.4} />
      <hemisphereLight args={['#3cffe1', '#04090c', 0.2]} />
    </group>
  )
}

function AuroraCurtain({
  position,
  rotation,
  colorA,
  colorB,
  width,
  height,
  opacity,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  colorA: string
  colorB: string
  width: number
  height: number
  opacity: number
}) {
  const ref = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: opacity },
    }),
    [colorA, colorB, opacity]
  )
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh position={position} rotation={rotation} renderOrder={-4}>
      <planeGeometry args={[width, height, 40, 12]} />
      <shaderMaterial
        ref={ref}
        args={[
          {
            uniforms,
            vertexShader: auroraVertex,
            fragmentShader: auroraFragment,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
          },
        ]}
      />
    </mesh>
  )
}

function CloudLayer({
  y,
  size,
  colorLow,
  colorHigh,
  opacity,
  speed,
  scale,
}: {
  y: number
  size: number
  colorLow: string
  colorHigh: string
  opacity: number
  speed: number
  scale: number
}) {
  const ref = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorLow: { value: new THREE.Color(colorLow) },
      uColorHigh: { value: new THREE.Color(colorHigh) },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uScale: { value: scale },
    }),
    [colorLow, colorHigh, opacity, speed, scale]
  )
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={-3}>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={ref}
        args={[
          {
            uniforms,
            vertexShader: cloudVertex,
            fragmentShader: cloudFragment,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
          },
        ]}
      />
    </mesh>
  )
}

function ParticleField({
  seed,
  count,
  radius,
  yRange,
  colorA,
  colorB,
  size,
  speed,
  opacity,
  additive,
}: {
  seed: number
  count: number
  radius: number
  yRange: [number, number]
  colorA: string
  colorB: string
  size: number
  speed: number
  opacity: number
  additive?: boolean
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { gl } = useThree()
  const data = useMemo(() => {
    let s = seed * 9301 + 49297
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * radius
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = yRange[0] + rand() * (yRange[1] - yRange[0])
      positions[i * 3 + 2] = Math.sin(a) * r
      scales[i] = 0.45 + rand() * 1.6
      phases[i] = rand() * Math.PI * 2
    }
    return { positions, scales, phases }
  }, [seed, count, radius, yRange])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: size },
      uDpr: { value: Math.min(2, gl.getPixelRatio()) },
      uSpeed: { value: speed },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: opacity },
    }),
    [size, speed, colorA, colorB, opacity, gl]
  )
  useFrame(({ clock }) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = clock.elapsedTime
    matRef.current.uniforms.uDpr.value = Math.min(2, gl.getPixelRatio())
  })

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[data.scales, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[data.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        args={[
          {
            uniforms,
            vertexShader: particlesVertex,
            fragmentShader: particlesFragment,
            transparent: true,
            depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
          },
        ]}
      />
    </points>
  )
}

function EnvironmentLights({ id }: { id: EnvId }) {
  if (id === 'moon') return null
  if (id === 'cosmic') return null
  if (id === 'dawn') return null
  return null
}
