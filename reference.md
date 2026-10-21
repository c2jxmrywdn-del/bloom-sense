# 参考：R3F 花境环境扩展模板与排查记录

本文件是 `SKILL.md` 的配套参考，包含可直接改用的代码片段、几何分组规则和一次真实的整屏黑屏排查证据链。文件名与类名以常见 R3F 花境项目为例，接入前先对照项目现有命名。

## 1. 环境数据条目

```ts
// src/data.ts
export type EnvId = 'studio' | 'bamboo' | 'moon' | 'cosmic' | 'dawn' | 'amber' | 'aurora'

export interface EnvironmentInfo {
  id: EnvId
  name: string
  en: string
  accent: string
  chip: string
  poem: string
  description: string
  fog: string
}

export const ENVIRONMENTS: EnvironmentInfo[] = [
  {
    id: 'bamboo',
    name: '雾竹幽庭',
    en: 'MISTY BAMBOO',
    accent: '#8fb59a',
    chip: '#dcecdf',
    poem: '竹影摇过石灯，雾气把晨光折成细线。',
    description: '青苔、竹节与石灯。薄雾在竹林间缓慢流动，光从叶隙落下。',
    fog: '#e3ebdc',
  },
]
```

要点：

- 数组顺序 = 坞栏顺序 = 快捷键顺序。新增项插入中间会改变后续所有键位，必须同步 HUD 与 README。
- `fog` 在数据层和渲染层各存一份时，保持同值；最好只保留一个来源，另一处引用它。
- 浅色环境优先与浅色环境相邻，深色环境与深色环境相邻，减少主题跳变。

## 2. 天空与雾配置

```ts
// Environment.tsx
type SkyConfig = {
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
  bamboo: {
    zenith: '#e9f0e3', horizon: '#d2dfc8', low: '#b3c3aa', sun: '#fff4d6',
    sunDir: [0.9, 0.6, -1], sunSize: 0.99965, sunGlow: 0.1, stars: 0, nebula: 0,
    clouds: 0.09, aurora: 0, accent: '#8fb59a', cloudColor: '#e9f1df', cloudSpeed: 0.24,
  },
  amber: {
    zenith: '#2a1a17', horizon: '#b96f3f', low: '#2a1812', sun: '#ffd29a',
    sunDir: [-0.52, 0.2, -1], sunSize: 0.9992, sunGlow: 0.82, stars: 0.2, nebula: 0,
    clouds: 0.6, aurora: 0, accent: '#f2a45c', cloudColor: '#d99563', cloudSpeed: 0.5,
  },
}

const ENV_FOG: Record<EnvId, string> = {
  bamboo: '#e3ebdc',
  amber: '#2a1913',
}

export function getEnvFog(id: EnvId) {
  return ENV_FOG[id]
}
```

场景挂载：

```tsx
export function Environment({ id }: { id: EnvId }) {
  const cfg = ENV_SKY[id]
  return (
    <group key={id}>
      <Sky cfg={cfg} />
      {id === 'studio' && <StudioScene />}
      {id === 'bamboo' && <BambooScene />}
      {id === 'moon' && <MoonScene />}
      {id === 'amber' && <AmberScene />}
    </group>
  )
}
```

背景与雾的单一入口：

```tsx
const envInfo = ENVIRONMENTS[env]
return (
  <>
    <color attach="background" args={[getEnvFog(envInfo.id)]} />
    <fog attach="fog" args={[getEnvFog(envInfo.id), 14, 58]} />
    <Environment id={envInfo.id} />
    <FlowerStage />
  </>
)
```

雾距 14–58 是“近处清晰、远处融进天色”的经验区间。远景物体若不想被雾洗平，用 `meshBasicMaterial` 并显式 `fog={false}`。

## 3. 场景骨架

雾竹场景的结构：

```tsx
function BambooScene() {
  const grove = useMemo(() => buildBambooGrove(), [])
  const backdrop = useMemo(() => buildBambooBackdrop(), [])
  return (
    <group>
      {/* 地面：自写苔地 shader */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} renderOrder={-2}>
        <planeGeometry args={[110, 110]} />
        <shaderMaterial args={[{ uniforms, vertexShader, fragmentShader }]} />
      </mesh>

      {/* 远景：拆成两组几何、两种普通材质 */}
      <mesh geometry={backdrop.culms} renderOrder={-3}>
        <meshStandardMaterial color="#a7b79c" roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={backdrop.leaves} renderOrder={-3}>
        <meshStandardMaterial color="#b2c0a4" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* 中景：同构分组、保留顶点色 */}
      <mesh geometry={grove.culms} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.7} metalness={0.02} />
      </mesh>
      <mesh geometry={grove.rings} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.86} />
      </mesh>
      <mesh geometry={grove.leaves} renderOrder={-1}>
        <meshStandardMaterial vertexColors roughness={0.8} side={THREE.DoubleSide} />
      </mesh>

      {/* 雾层、光柱、石灯、花粉 */}
      <CloudLayer y={-0.8} size={70} opacity={0.13} speed={0.2} />
      <LightShaft position={[2.8, 2.9, -5.2]} width={2.1} height={10} opacity={0.2} />
      <StoneLantern position={[-3.25, -1.5, -5.2]} scale={1.05} />
      <ParticleField seed={83} count={90} radius={8.5} yRange={[-1.1, 5.4]} opacity={0.45} />

      {/* 场景局部灯，不要只依赖舞台灯 */}
      <directionalLight position={[4.6, 7.2, 3.2]} color="#fff3d8" intensity={0.95} />
      <directionalLight position={[-4.2, 3.6, -2.6]} color="#bcd8b2" intensity={0.46} />
      <hemisphereLight args={['#e8f2df', '#3e4c3a', 0.3]} />
    </group>
  )
}
```

秋苑场景的结构：

```tsx
function AmberScene() {
  const trees = useMemo(() => buildAmberTrees(), [])
  const grass = useMemo(() => buildAmberGrass(), [])
  const ridge = useMemo(() => buildAmberRidge(), [])
  const litter = useMemo(() => buildAmberLitter(), [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} renderOrder={-2}>
        <planeGeometry args={[120, 120]} />
        <shaderMaterial args={[{ uniforms: {}, vertexShader, fragmentShader }]} />
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

      <FallingLeaves count={58} />
      <ParticleField seed={97} count={120} radius={11} yRange={[-1.2, 6.5]} opacity={0.42} additive />
      <directionalLight position={[-7, 4.6, -3.4]} color="#ffb877" intensity={1.25} />
      <directionalLight position={[4.5, 3, 4.5]} color="#9b7fbf" intensity={0.3} />
      <hemisphereLight args={['#5c3a2a', '#100a07', 0.26]} />
    </group>
  )
}
```

构图经验：把远树放到 z -30 到 -38，并让山脊位于 z -29 和 -38，可以遮住树干下半段，避免近处出现“巨大木柱”。

## 4. 合并几何：按材质/拓扑分组

### 错误写法（会整屏静默变黑）

```tsx
// 把圆柱竹节和平面竹叶合并成一个几何，再写顶点色
const merged = mergeGeometries([...culms, ...leaves], false) as THREE.BufferGeometry
paintGeometry(merged, new THREE.Color('#97a88d'))

<mesh geometry={merged} renderOrder={-3}>
  <meshStandardMaterial vertexColors roughness={0.95} />
</mesh>
```

症状：UI 正常、Canvas 全黑、控制台没有 WebGL/shader 报错；切到其他环境恢复。

### 正确写法（按拓扑/材质拆分）

```tsx
const mergedCulms = mergeGeometries(culms, false) as THREE.BufferGeometry
const mergedLeaves = mergeGeometries(leaves, false) as THREE.BufferGeometry

<mesh geometry={mergedCulms} renderOrder={-3}>
  <meshStandardMaterial color="#a7b79c" roughness={0.95} metalness={0} />
</mesh>
<mesh geometry={mergedLeaves} renderOrder={-3}>
  <meshStandardMaterial color="#b2c0a4" roughness={0.95} side={THREE.DoubleSide} />
</mesh>
```

### 同构分组 + 顶点色是安全的

```tsx
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

const grove = {
  culms: mergeGeometries(culmGeos, false),   // 全部 Cylinder
  rings: mergeGeometries(ringGeos, false),   // 全部 Cylinder
  leaves: mergeGeometries(leafGeos, false),  // 全部 Plane（已变形）
}
```

分组判据：**材质意图、拓扑类型、顶点属性集** 三者一致才合并。若一个数组里同时出现 `CylinderGeometry`、`PlaneGeometry`、`IcosahedronGeometry`，不要合并成同一 mesh；拆成多个 mesh，每个 mesh 使用自己的材质。

## 5. 确定性 PRNG

```ts
let seed = 20261020
const rand = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
```

每个 builder 用独立 seed，避免改动一处导致全场景构图变化。构建结果放进 `useMemo(..., [])`，不要每帧重建。

## 6. 雾竹：远景竹丛（拆分版）

```ts
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
```

关键点：竹叶先做锥形收尖，再随机旋转缩放；远景半径 17–29，高度 10–17，数量约 34 根，足以形成剪影层但不抢主体。

## 7. 雾竹：主竹丛与顶点色

主竹丛按 culms / rings / branches / leaves 四组独立构建，每组内部拓扑一致，最后分别合并、分别 paint：

```ts
const culm = new THREE.CylinderGeometry(r * 0.7, r, h, 7, 1)
culm.applyMatrix4(new THREE.Matrix4().makeTranslation(0, h / 2, 0).premultiply(stalkMatrix))
culms.push(paintGeometry(culm, new THREE.Color().setHSL(...)))

const ring = new THREE.CylinderGeometry(r * 1.16, r * 1.16, 0.04, 7, 1)
rings.push(paintGeometry(ring, new THREE.Color().setHSL(...)))

const leaf = leafBase.clone()
leaf.applyMatrix4(...)
leaves.push(paintGeometry(leaf, new THREE.Color().setHSL(...)))
```

注意 `paintGeometry` 必须在矩阵变换之后调用，否则颜色数量仍然匹配，但随后的合并不会改变颜色，容易出现“颜色和位置对不上”的错觉。顶点色是逐顶点写入，几何顶点数变化后要重新写。

## 8. 秋苑：树、山脊、落叶

### 分形树

```ts
function buildAmberTrees() {
  let seed = 4242
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const trunks: THREE.BufferGeometry[] = []
  const canopy: THREE.BufferGeometry[] = []
  const up = new THREE.Vector3(0, 1, 0)

  const addBranch = (base: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    // 树干：CylinderGeometry；树冠：IcosahedronGeometry；两者分别入数组
    // 递归 3 层，子枝角度 -0.31..0.31，长度衰减 0.6..0.8，半径衰减 0.64
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
```

树冠用多个小 Icosahedron 聚在枝梢，单块尺寸约 0.32–0.68，比单一大球更像树叶团。不要开 `flatShading`，除非明确要低多边形风格；圆滑着色更接近远处树影。

### 山脊剪影

```ts
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
```

山脊用 `meshBasicMaterial` + `fog={false}`，颜色压暗，renderOrder -7/-6。它不参与光照，只负责层次，避免被雾和光洗成一条灰带。

### 实例化落叶

```tsx
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
      dummy.rotation.set(
        t * 0.5 * d.spin + d.phase,
        t * 0.35 * d.spin + d.yaw,
        Math.sin(t * d.drift + d.phase) * 0.8
      )
      dummy.scale.setScalar(d.scale)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} />
}
```

`setColorAt` 只在初始化时写一次；若颜色会动态变化，再在变化时刷新 `instanceColor.needsUpdate`。每帧只更新矩阵，不要每帧重建几何或材质。

## 9. 跨系统接线片段

### 快捷键与巡游键

```ts
// App.tsx
const envKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u']
if (envKeys.includes(k)) {
  s.selectEnv(envKeys.indexOf(k))
  return
}

switch (k) {
  case 'o':
    s.toggleAutoTour()
    return
}
```

新增环境占用原巡游键时，必须迁移巡游键，并同步 HUD 与 README：

```ts
// data.ts
['Q W E R T Y U', '切换花境'],
['O', '自动巡游'],
```

### 浅色主题

```tsx
const lightEnv = ENVIRONMENTS[envDisplay].id === 'studio' || ENVIRONMENTS[envDisplay].id === 'bamboo'
return (
  <div
    className={`app ${phase === 'ready' ? 'is-ready' : ''} ${hideUI ? 'ui-hidden' : ''} ${
      lightEnv ? 'studio-theme' : ''
    } ${ENVIRONMENTS[envDisplay].id === 'bamboo' ? 'bamboo-theme' : ''}`}
    style={vars}
  >
```

CSS 只覆盖必要的玻璃层、文字、边框，不要复制整套主题：

```css
.bamboo-theme .glass {
  background:
    linear-gradient(150deg, rgba(251, 253, 247, 0.88), rgba(238, 244, 232, 0.72)),
    rgba(248, 251, 243, 0.66);
  border-color: rgba(76, 102, 74, 0.15);
}
```

### HUD 图标

```tsx
const ENV_ICONS = {
  studio: Leaf,
  bamboo: Trees,
  moon: Moon,
  cosmic: Sparkles,
  dawn: Sun,
  amber: TreeDeciduous,
  aurora: Snowflake,
}
```

图标是否存在先用：

```bash
grep -o "declare const \(Trees\|TreeDeciduous\|Wheat\)" node_modules/lucide-react/dist/lucide-react.d.ts | sort -u
```

### 音景

```ts
const ENV_TONES: Record<string, EnvTone> = {
  bamboo: { root: 123.47, fifth: 185, cutoff: 780, air: 0.18 },
  amber: { root: 130.81, fifth: 196, cutoff: 640, air: 0.11 },
}
```

音高按环境的明暗与温度选：浅色竹林偏高、偏亮；秋苑偏低、偏暖。

### 舞台灯

```ts
const BACKLIGHT: Record<string, [number, number, number]> = {
  bamboo: [0.5, 0.65, -1],
  amber: [-0.55, 0.32, -1],
}

function StageLights({ headY, envId }: { headY: number; envId: string }) {
  const bamboo = envId === 'bamboo'
  const amber = envId === 'amber'
  const soft = envId === 'studio' || bamboo
  return (
    <>
      <ambientLight intensity={soft ? 0.16 : amber ? 0.22 : 0.18} />
      <directionalLight position={[4.4, 6.5, 4.2]} intensity={soft ? 0.95 : amber ? 1.05 : 1.25} color={amber ? '#ffdcb2' : '#ffe5ce'} />
      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={soft ? 0.3 : amber ? 0.58 : 0.8} color={amber ? '#ffb877' : '#aac9ff'} />
      <pointLight position={[2.4, 3.4, 2.2]} intensity={soft ? 0.68 : amber ? 3.4 : 5} distance={8} decay={2} color="#ffd9c2" />
    </>
  )
}
```

## 10. 黑屏排查证据链（真实案例）

场景：给雾竹新增远景竹丛，把圆柱竹节与平面竹叶合并成一个几何，写 color attribute，使用 `meshStandardMaterial vertexColors`。结果：

1. 页面 UI 正常，Canvas 全黑，控制台无 WebGL/shader 报错。
2. 切回晨光花室正常，切到月下也正常 → 问题只在新环境。
3. 检查 canvas 尺寸与 `gl.isContextLost()`，均正常 → 不是上下文丢失。
4. 隐藏远景 backdrop mesh → 雾竹恢复渲染 → 锁定该 mesh。
5. 换成 `meshBasicMaterial color="#ff0000" wireframe` → 能看到红色线框竹丛 → 几何有效，问题在材质/属性。
6. 换成普通颜色 `meshStandardMaterial color="#97a88d"`（去掉 vertexColors）→ 正常渲染 → 锁定顶点色路径。
7. 把合并几何拆成 culms / leaves 两组，各自普通材质 → 正常渲染，且层次更清楚。
8. 主竹丛仍按 culms / rings / leaves 同构分组保留 vertexColors，渲染正常。

结论：**混合拓扑的几何不要合并后启用 vertexColors**。拆分几何、按组配材质，比继续在材质参数上找原因更快。

补充排查项（若上述仍未解决）：

- 几何是否存在 NaN/Infinity 顶点；用 boundingSphere 与遍历 position 检查。
- `mergeGeometries` 是否为 `null`（属性不一致时会返回 null）；加类型断言前先判空。
- shader 编译错误是否被后处理或错误边界吞掉；单独关闭 PostFX 验证。
- `renderOrder` + 透明材质是否让物体被错误遮挡；先换成不透明 basic 材质。
- 是否是 HMR 残留：新开标签页或加版本参数重新加载。

## 11. 验证命令与 QA URL

```bash
npx tsc --noEmit
npm run build
```

```text
http://localhost:5179/?qa=1&env=bamboo&flower=rose&bloom=0.9
http://localhost:5179/?qa=1&env=amber&flower=rose&bloom=0.9
```

点击坞栏环境（浏览器控制台）：

```js
[...document.querySelectorAll('.env-item')].find(x => x.textContent.includes('雾竹'))?.click()
```

检查渲染上下文：

```js
(() => {
  const c = document.querySelector('canvas')
  const gl = c && (c.getContext('webgl2') || c.getContext('webgl'))
  return JSON.stringify({ canvas: !!c, w: c && c.width, h: c && c.height, lost: gl ? gl.isContextLost() : null })
})()
```

控制台错误过滤：

```text
Uncaught|TypeError|ReferenceError|Shader Error|Program Info Log|WebGL: INVALID|failed
```

回归顺序建议：新浅色环境 → 旧浅色环境 → 新深色环境 → 旧深色环境 → 全部逐个点击。每次切换后停留 2–4 秒再截图，等雾幕过渡和异步加载完成。

## 12. 7+ 环境坞栏适配

```css
/* 让 7 项坞栏保持呼吸感 */
.env-list { gap: 2px; }
.env-item { padding: 6px 8px; }
.env-orb { width: 26px; height: 26px; }

@media (max-height: 860px) {
  .env-dock { width: 206px; }
  .env-copy em { display: none; }
  .env-dock .panel-note { display: none; }
}

@media (max-height: 760px) {
  .env-dock {
    top: 120px;
    max-height: calc(100vh - 160px);
    overflow-y: auto;
  }
}
```

改前先用 grep 确认现有类名与断点，避免覆盖其他面板的规则。矮屏优先隐藏英文副标题和面板脚注，而不是缩小可点击区域。

## 13. 新增环境交付清单

- [ ] `EnvId` 与 `ENVIRONMENTS` 条目完整，顺序与键位一致
- [ ] `ENV_SKY` / `ENV_FOG` 已补，背景色与雾一致
- [ ] 场景 switch 已挂载，场景局部灯已配
- [ ] 几何按材质/拓扑分组，混合组未启用 vertexColors
- [ ] 远景 `fog={false}`，renderOrder 分层正确
- [ ] HUD 图标、环境计数、快捷键提示已更新
- [ ] 巡游键冲突已处理，README 与手势文案同步
- [ ] `ENV_TONES` 已补，切换后音景变化
- [ ] 浅色主题对比度可读，7+ 坞栏不遮挡
- [ ] `npx tsc --noEmit`、`npm run build` 通过
- [ ] 新环境与旧环境回归截图齐全，控制台无错误
