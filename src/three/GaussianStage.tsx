import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'
import { REAL_SCENES } from '../data'
import { useApp } from '../store'
import { live } from '../live'

type CamPose = {
  img_name?: string
  width: number
  height: number
  fx: number
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

const camCache = new Map<string, CamPose[]>()
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function makePose(cam: CamPose): Pose {
  const R = cam.rotation
  // COLMAP cameras: +X right, +Y down, +Z forward. Three.js: +Y up, -Z forward.
  const right = new THREE.Vector3(R[0][0], R[0][1], R[0][2]).normalize()
  const up = new THREE.Vector3(-R[1][0], -R[1][1], -R[1][2]).normalize()
  const back = new THREE.Vector3(-R[2][0], -R[2][1], -R[2][2]).normalize()
  const m = new THREE.Matrix4().makeBasis(right, up, back)
  return {
    position: new THREE.Vector3(cam.position[0], cam.position[1], cam.position[2]),
    quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
    right,
    up,
    back,
    fov: THREE.MathUtils.radToDeg(2 * Math.atan(cam.height / (2 * cam.fy))),
  }
}

const PITCH_LIMIT = 1.35
const PAN_LIMIT = 26

export function GaussianStage() {
  const { gl } = useThree()
  const realIndex = useApp((s) => s.realIndex)
  const scene = REAL_SCENES[realIndex]
  const spark = useMemo(
    () =>
      new SparkRenderer({
        renderer: gl,
        maxStdDev: Math.sqrt(5),
        minAlpha: 2 / 255,
        accumExtSplats: true,
      }),
    [gl]
  )
  const [mesh, setMesh] = useState<SplatMesh | null>(null)
  const poseRef = useRef<Pose | null>(null)
  const hasPose = useRef(false)
  const focusRef = useRef(0.5)
  const lastRotEpoch = useRef(0)
  const cruiseDirRef = useRef(1)
  const sceneBoundsRef = useRef({ zoomMax: 2.4, pitchMax: 1.2, yawMax: 3.2 })
  // 自由轨道相机：以 hero 注视点为球心，水平 360°、俯仰 ±77°、缩放、平移
  const orbitRef = useRef({
    yaw: 0,
    pitch: 0,
    zoom: 1,
    pan: new THREE.Vector3(),
    down: false,
    button: 0,
    x: 0,
    y: 0,
  })
  // useFrame 每帧写出的当前朝向，供平移手势使用
  const camQuatRef = useRef(new THREE.Quaternion())

  useEffect(() => {
    // 3DGS 自带照片级色彩，ACES 胶片曲线会压出灰雾感 —— 实景模式改用线性映射
    const prevTone = gl.toneMapping
    gl.toneMapping = THREE.LinearToneMapping
    return () => {
      gl.toneMapping = prevTone
      ;(spark as any).dispose?.()
    }
  }, [gl, spark])

  useEffect(() => {
    const el = gl.domElement
    const orbit = orbitRef.current
    el.style.cursor = 'grab'
    const noMenu = (e: Event) => e.preventDefault()
    el.addEventListener('contextmenu', noMenu)
    // 触屏双指捏合 = 推拉镜头
    const touchPts = new Map<number, { x: number; y: number }>()
    let touchDist = 0
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touchPts.size === 2) {
          orbit.down = false
          const [a, b] = [...touchPts.values()]
          touchDist = Math.hypot(a.x - b.x, a.y - b.y)
          return
        }
      }
      orbit.down = true
      orbit.button = e.button
      orbit.x = e.clientX
      orbit.y = e.clientY
      el.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && touchPts.has(e.pointerId)) {
        touchPts.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (touchPts.size === 2) {
          const [a, b] = [...touchPts.values()]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (touchDist > 0) {
            const s = useApp.getState()
            orbit.zoom = clamp(orbit.zoom * (1 - (dist - touchDist) * 0.004 * s.prefs.dragSensitivity), 0.55, 6)
          }
          touchDist = dist
          return
        }
      }
      if (!orbit.down) return
      const s = useApp.getState()
      const ds = s.prefs.dragSensitivity
      const iv = s.prefs.invertLook ? -1 : 1
      const dx = e.clientX - orbit.x
      const dy = e.clientY - orbit.y
      if (orbit.button === 2 || orbit.button === 1 || e.shiftKey) {
        // 右键 / 中键 / Shift+拖拽 = 平移视点，自由查看整个场景
        const panVec = new THREE.Vector3(-dx * 0.0045 * ds * orbit.zoom, dy * 0.0045 * ds * orbit.zoom, 0)
        panVec.applyQuaternion(camQuatRef.current)
        orbit.pan.add(panVec)
        if (orbit.pan.length() > PAN_LIMIT) orbit.pan.setLength(PAN_LIMIT)
      } else {
        orbit.yaw -= dx * 0.0038 * ds
        orbit.pitch = clamp(orbit.pitch - dy * 0.0045 * ds * iv, -0.34, sceneBoundsRef.current.pitchMax)
      }
      orbit.x = e.clientX
      orbit.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      touchPts.delete(e.pointerId)
      if (touchPts.size < 2) touchDist = 0
      orbit.down = false
      el.style.cursor = 'grab'
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const s = useApp.getState()
      orbit.zoom = clamp(orbit.zoom * (1 + e.deltaY * 0.0012 * s.prefs.dragSensitivity), 0.55, 6)
    }
    const dbl = () => {
      orbit.yaw = 0
      orbit.pitch = 0
      orbit.zoom = 1
      orbit.pan.set(0, 0, 0)
      useApp.getState().setBloom(0.5, 'auto')
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('dblclick', dbl)
      el.removeEventListener('contextmenu', noMenu)
      el.style.cursor = ''
    }
  }, [gl])

  useEffect(() => {
    let disposed = false
    let activeMesh: SplatMesh | null = null
    poseRef.current = null
    hasPose.current = false
    sceneBoundsRef.current = scene.bounds
    cruiseDirRef.current = 1
    const orbit = orbitRef.current
    orbit.yaw = 0
    orbit.pitch = 0
    orbit.zoom = 1
    orbit.pan.set(0, 0, 0)
    const setLoading = useApp.getState().setRealLoading
    const totalGuess =
      scene.id === 'flowers' ? 86 * 1024 * 1024 : scene.id === 'garden' ? 84 * 1024 * 1024 : 27 * 1024 * 1024
    setLoading({ progress: 0.02, label: `正在载入实景 · ${scene.name}` })

    const loadCams = async (): Promise<CamPose[]> => {
      const cached = camCache.get(scene.id)
      if (cached) return cached
      const res = await fetch(scene.cameras)
      if (!res.ok) throw new Error(`camera pose ${res.status}`)
      const json = (await res.json()) as CamPose[]
      camCache.set(scene.id, json)
      return json
    }

    ;(async () => {
      const cams = await loadCams()
      if (disposed) return
      const cam = cams[clamp(scene.hero, 0, cams.length - 1)]
      poseRef.current = makePose(cam)
      const splat = new SplatMesh({
        url: scene.asset,
        onProgress: (e) => {
          if (disposed) return
          const total = e.lengthComputable && e.total > 0 ? e.total : totalGuess
          const progress = clamp(e.loaded / total, 0.03, 0.97)
          setLoading({ progress, label: `正在载入实景 · ${scene.name}` })
        },
      })
      activeMesh = splat
      setMesh(splat)
      try {
        await splat.initialized
        if (disposed) return
        hasPose.current = true
        setLoading(null)
      } catch (err) {
        console.error('[BloomSense] 3DGS load failed', err)
        if (!disposed) {
          setLoading({
            progress: 0,
            error: '实景载入失败。请确认 /public/splats 下的 .spz 文件完整，或切换到数字花境继续浏览。',
            label: '实景载入失败',
          })
        }
      }
    })().catch((err) => {
      console.error('[BloomSense] camera pose failed', err)
      if (!disposed) {
        setLoading({ progress: 0, error: '未能读取实景相机参数。', label: '实景载入失败' })
      }
    })

    return () => {
      disposed = true
      poseRef.current = null
      hasPose.current = false
      setMesh((current) => (current === activeMesh ? null : current))
      if (activeMesh) {
        activeMesh.visible = false
        activeMesh.dispose()
      }
    }
  }, [scene.id, scene.asset, scene.cameras, scene.hero, scene.name])

  useFrame(({ camera, gl }, dt) => {
    if (!hasPose.current || !poseRef.current) return
    const d = Math.min(0.05, dt)
    const s = useApp.getState()
    const pose = poseRef.current
    focusRef.current = THREE.MathUtils.damp(focusRef.current, s.bloomTarget, 2.6, d)
    gl.toneMappingExposure = scene.exposure

    const orbit = orbitRef.current
    // 归位手势 / 归零：回到初始扫描机位
    if (s.rotEpoch !== lastRotEpoch.current) {
      lastRotEpoch.current = s.rotEpoch
      orbit.yaw = 0
      orbit.pitch = 0
      orbit.zoom = 1
      orbit.pan.set(0, 0, 0)
    }

    // 键盘方向键：左右环绕、上下俯仰
    orbit.yaw += live.scrubDelta * 0.16
    live.scrubDelta = 0
    // 捏合拖转：像握住整个场景一样自由环绕
    if (live.pinchActive && s.handMode === 'camera' && s.gestureControl) {
      orbit.yaw += live.grab.x * 3.4
      orbit.pitch = clamp(orbit.pitch + live.grab.y * 2.8, -PITCH_LIMIT, PITCH_LIMIT)
    }
    live.grab.x = 0
    live.grab.y = 0
    live.grab.z = 0

    // 自动巡游：绕主体缓慢水平环绕（手势模式与减弱动效下暂停）
    const cruising = s.autoRotate && !s.prefs.reduceMotion && s.handMode !== 'camera' && !orbit.down
    if (cruising) {
      orbit.yaw += cruiseDirRef.current * d * 0.09
      // 在 ±yawMax 之间往返，避免室内场景绕到背光面变黑
      const yMax = sceneBoundsRef.current.yawMax
      if (orbit.yaw > yMax) { orbit.yaw = yMax; cruiseDirRef.current = -1 }
      else if (orbit.yaw < -yMax) { orbit.yaw = -yMax; cruiseDirRef.current = 1 }
    }

    // 手掌倾斜：叠加小幅绝对视角偏移（微调观察）
    const handWeight = s.handMode === 'camera' && s.gestureControl ? 1 : 0
    const tiltYaw =
      handWeight * clamp(live.handRotTarget.y * 0.5, -0.5, 0.5) + (s.locks.y ? 0 : s.baseRot.y * 0.004)
    const tiltPitch =
      handWeight * clamp(live.handRotTarget.x * 0.45, -0.4, 0.4) + (s.locks.x ? 0 : s.baseRot.x * 0.004)
    const tiltRoll = handWeight * clamp(live.handRotTarget.z * 0.3, -0.28, 0.28) + (s.locks.z ? 0 : s.baseRot.z * 0.003)

    // 组装轨道相机：先算位置、再 lookAt 主体——位置与朝向永远一致，
    // 仰角地板抬升位置后也不会出现"位置抬高、朝向朝天"的错位
    const center = new THREE.Vector3().copy(pose.position).addScaledVector(pose.back, -4.5).add(orbit.pan)
    const qYaw = new THREE.Quaternion().setFromAxisAngle(pose.up, orbit.yaw + tiltYaw)
    const pitchTotal = clamp(orbit.pitch + tiltPitch, -0.34, scene.bounds.pitchMax)
    const qPitch = new THREE.Quaternion().setFromAxisAngle(pose.right, -pitchTotal)
    const qOrbit = new THREE.Quaternion().copy(qYaw).multiply(qPitch)

    const offset = new THREE.Vector3().copy(pose.position).sub(center).multiplyScalar(orbit.zoom)
    offset.applyQuaternion(qOrbit)

    camera.up.copy(pose.up)
    camera.position.copy(center).add(offset)
    camera.lookAt(center)
    if (Math.abs(tiltRoll) > 0.001) camera.rotateZ(tiltRoll)
    // 开掌 / 握拳：沿视线推近拉远
    const dolly = (focusRef.current - 0.5) * 0.34
    if (Math.abs(dolly) > 0.001) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      camera.position.addScaledVector(fwd, dolly)
    }
    camQuatRef.current.copy(camera.quaternion)

    if (camera instanceof THREE.PerspectiveCamera) {
      if (Math.abs(camera.fov - pose.fov) > 0.01) {
        camera.fov = pose.fov
        camera.near = 0.01
        camera.far = 400
        camera.updateProjectionMatrix()
      }
    }
  })

  const groundTex = useMemo(() => {
    if (!scene.ground) return null
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')!
    const col = new THREE.Color(scene.ground.color)
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, `rgba(${rgb},0.95)`)
    g.addColorStop(0.6, `rgba(${rgb},0.8)`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [scene.ground])

  return (
    <group>
      <primitive object={spark} />
      {mesh ? <primitive object={mesh} /> : null}
      {scene.ground && groundTex ? (
        <mesh
          position={[scene.ground.x, scene.ground.y, scene.ground.z]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={-2}
        >
          <circleGeometry args={[scene.ground.radius, 72]} />
          <meshBasicMaterial map={groundTex} side={THREE.DoubleSide} depthWrite={false} transparent />
        </mesh>
      ) : null}
    </group>
  )
}
