/**
 * 最小可用的 3DGS（Spark）R3F 组件参考实现。
 *
 * 用法：
 *   <GaussianStage
 *     url="/splats/garden.spz"
 *     camerasUrl="/splats/garden_cameras.json"
 *     hero={37}
 *     exposure={1.0}
 *     bounds={{ zoomMax: 1.9, pitchMax: 1.15, yawMax: 3.2 }}
 *     ground={{ x: 0, y: 5.2, z: 4, radius: 55, color: '#3d4d26' }}
 *   />
 *
 * 依赖：three @react-three/fiber @sparkjsdev/spark
 * 注意：3DGS 是静态光场，超出训练相机范围会出现拉伸/空洞；用 bounds 收住。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'

type Cam = {
  width: number
  height: number
  fy: number
  position: number[]
  rotation: number[][]
}

type Pose = {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  right: THREE.Vector3
  up: THREE.Vector3
  back: THREE.Vector3
  fov: number
}

export type Bounds = { zoomMax: number; pitchMax: number; yawMax: number }
export type Ground = { x: number; y: number; z: number; radius: number; color: string }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function makePose(cam: Cam): Pose {
  const R = cam.rotation
  // COLMAP: +X right, +Y down, +Z forward / Three.js: +X right, +Y up, -Z forward
  const right = new THREE.Vector3(R[0][0], R[0][1], R[0][2]).normalize()
  const up = new THREE.Vector3(-R[1][0], -R[1][1], -R[1][2]).normalize()
  const back = new THREE.Vector3(-R[2][0], -R[2][1], -R[2][2]).normalize()
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, back)
  )
  return {
    position: new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]),
    quaternion,
    right,
    up,
    back,
    fov: THREE.MathUtils.radToDeg(2 * Math.atan(cam.height / (2 * cam.fy))),
  }
}

export function GaussianStage({
  url,
  camerasUrl,
  hero = 0,
  exposure = 1.0,
  bounds = { zoomMax: 2.4, pitchMax: 1.15, yawMax: 3.2 },
  ground,
  subjectDistance = 4.5,
}: {
  url: string
  camerasUrl: string
  hero?: number
  exposure?: number
  bounds?: Bounds
  ground?: Ground
  subjectDistance?: number
}) {
  const { gl } = useThree()
  const [mesh, setMesh] = useState<SplatMesh | null>(null)
  const [pose, setPose] = useState<Pose | null>(null)
  const orbit = useRef({ yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3() })
  const drag = useRef({ x: 0, y: 0, down: false, button: 0 })
  const focus = useRef(0.5)

  const spark = useMemo(
    () =>
      new SparkRenderer({
        renderer: gl,
        maxStdDev: Math.sqrt(6),
        minAlpha: 2.2 / 255,
        accumExtSplats: true,
      }),
    [gl]
  )

  useEffect(() => {
    const prevTone = gl.toneMapping
    gl.toneMapping = THREE.LinearToneMapping
    return () => {
      gl.toneMapping = prevTone
      ;(spark as any).dispose?.()
    }
  }, [gl, spark])

  // 相机位 + 点云加载
  useEffect(() => {
    let disposed = false
    let active: SplatMesh | null = null
    setMesh(null)
    setPose(null)
    orbit.current = { yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3() }
    ;(async () => {
      const res = await fetch(camerasUrl)
      const cams = (await res.json()) as Cam[]
      if (disposed) return
      setPose(makePose(cams[clamp(hero, 0, cams.length - 1)]))
      const splat = new SplatMesh({ url })
      active = splat
      setMesh(splat)
      await splat.initialized // 必须等待，之后才能安全使用 boundingBox
    })().catch((err) => console.error('[3DGS] load failed', err))
    return () => {
      disposed = true
      setMesh((cur) => (cur === active ? null : cur))
      if (active) {
        active.visible = false
        active.dispose()
      }
    }
  }, [url, camerasUrl, hero])

  // 指针/滚轮交互
  useEffect(() => {
    const el = gl.domElement
    const start = (e: PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, down: true, button: e.button }
    }
    const move = (e: PointerEvent) => {
      if (!drag.current.down) return
      const dx = e.clientX - drag.current.x
      const dy = e.clientY - drag.current.y
      if (drag.current.button === 2) {
        orbit.current.pan.x -= dx * 0.004
        orbit.current.pan.y += dy * 0.004
      } else {
        orbit.current.yaw -= dx * 0.004
        orbit.current.pitch = clamp(orbit.current.pitch - dy * 0.004, -0.34, bounds.pitchMax)
      }
      drag.current.x = e.clientX
      drag.current.y = e.clientY
    }
    const end = () => (drag.current.down = false)
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      orbit.current.zoom = clamp(orbit.current.zoom * (1 + e.deltaY * 0.0012), 0.55, bounds.zoomMax)
    }
    const dbl = () => {
      orbit.current = { yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3() }
      focus.current = 0.5
    }
    const noMenu = (e: Event) => e.preventDefault()
    el.addEventListener('pointerdown', start)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    el.addEventListener('contextmenu', noMenu)
    return () => {
      el.removeEventListener('pointerdown', start)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('dblclick', dbl)
      el.removeEventListener('contextmenu', noMenu)
    }
  }, [gl, bounds])

  useFrame(({ camera }, dt) => {
    if (!pose) return
    const d = Math.min(0.05, dt)
    gl.toneMappingExposure = exposure
    focus.current = THREE.MathUtils.damp(focus.current, 0.5, 3, d)

    const center = pose.position.clone().addScaledVector(pose.back, -subjectDistance).add(orbit.current.pan)
    const qYaw = new THREE.Quaternion().setFromAxisAngle(pose.up, orbit.current.yaw)
    const qPitch = new THREE.Quaternion().setFromAxisAngle(pose.right, -orbit.current.pitch)
    const q = new THREE.Quaternion().copy(qYaw).multiply(qPitch)

    const offset = pose.position.clone().sub(center).multiplyScalar(orbit.current.zoom).applyQuaternion(q)
    camera.up.copy(pose.up)
    camera.position.copy(center).add(offset)
    camera.lookAt(center)

    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - pose.fov) > 0.01) {
      camera.fov = pose.fov
      camera.near = 0.01
      camera.far = 400
      camera.updateProjectionMatrix()
    }
  })

  const groundTex = useMemo(() => {
    if (!ground) return null
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    // 直接按 sRGB 字节取色：贴图标记为 SRGBColorSpace；若经 THREE.Color 会被线性化，
    // 深色草地绿会被压成近黑，导致"补的洞仍是黑色"
    const hex = ground.color.replace('#', '')
    const rgb = `${parseInt(hex.substring(0, 2), 16)},${parseInt(hex.substring(2, 4), 16)},${parseInt(hex.substring(4, 6), 16)}`
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, `rgba(${rgb},1)`)
    g.addColorStop(0.86, `rgba(${rgb},0.98)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [ground])

  return (
    <group>
      <primitive object={spark} />
      {mesh ? <primitive object={mesh} /> : null}
      {ground && groundTex ? (
        <mesh position={[ground.x, ground.y, ground.z]} rotation={[Math.PI / 2, 0, 0]} renderOrder={-2}>
          <circleGeometry args={[ground.radius, 72]} />
          <meshBasicMaterial map={groundTex} side={THREE.DoubleSide} depthWrite={false} transparent />
        </mesh>
      ) : null}
    </group>
  )
}
