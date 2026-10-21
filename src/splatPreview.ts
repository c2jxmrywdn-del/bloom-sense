import * as THREE from 'three'
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark'

const sceneName = new URLSearchParams(location.search).get('scene') ?? 'flowers'
document.querySelectorAll<HTMLAnchorElement>('#bar a').forEach((a) => {
  if (a.dataset.scene === sceneName) a.classList.add('on')
})

type Cam = { img_name: string; width: number; height: number; fx: number; fy: number; position: number[]; rotation: number[][] }
let cams: Cam[] = []
let camIndex = 0

const hud = document.getElementById('hud')!
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor('#0d0f10')
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.95
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.add(new SparkRenderer({ renderer }))

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.01, 200)
camera.position.set(0, 1.5, 3)

let mesh: SplatMesh | null = null
const info = { scene: sceneName, bbox: null as null | number[][], rotation: [0, 0, 0], scale: 1 }

function fmt(v: number) {
  return Math.abs(v) < 0.01 ? v.toExponential(1) : v.toFixed(3)
}

function applyCam(index: number) {
  if (!cams.length) return
  camIndex = (index + cams.length) % cams.length
  const c = cams[camIndex]
  const R = c.rotation
  const pos = new THREE.Vector3(c.position[0], c.position[1], c.position[2])
  // COLMAP: third row of world-to-camera rotation is the camera-forward axis in world space.
  const fwd = new THREE.Vector3(R[2][0], R[2][1], R[2][2]).normalize()
  const target = pos.clone().addScaledVector(fwd, 4.5)
  camera.position.copy(pos)
  camera.up.set(0, 1, 0)
  camera.lookAt(target)
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(c.height / (2 * c.fy)))
  camera.near = 0.01
  camera.far = 200
  camera.updateProjectionMatrix()
  hud.textContent = [
    `scene   ${sceneName}   cam ${camIndex + 1}/${cams.length}  ${c.img_name}`,
    `pos     ${pos.toArray().map(fmt).join(', ')}`,
    `fwd     ${fwd.toArray().map(fmt).join(', ')}`,
    `fov     ${camera.fov.toFixed(1)}°   ${c.width}×${c.height}`,
    `splat   ${mesh?.numSplats ?? 0}`,
    `keys    C next cam · P prev cam · G grid · R first cam`,
  ].join('\n')
  ;(window as any).__SPLAT_CAM__ = { index: camIndex, cam: c, target: target.toArray() }
}

mesh = new SplatMesh({
  url: `/splats/${sceneName === 'flowers' ? 'flowers_clean' : sceneName + '_hd'}.spz`,
  onProgress: (e) => {
    if (e.lengthComputable) hud.textContent = `loading ${sceneName} … ${Math.round((e.loaded / e.total) * 100)}%`
    else hud.textContent = `loading ${sceneName} … ${(e.loaded / 1048576).toFixed(1)} MB`
  },
})
scene.add(mesh)

Promise.all([
  fetch(`/splats/meta/${sceneName}_cameras.json`).then((r) => r.json() as Promise<Cam[]>),
  mesh.initialized,
])
  .then(async ([cameraJson]) => {
    cams = cameraJson
    applyCam(0)
    ;(window as any).__SPLAT__ = { mesh, camera, renderer, scene, cams, applyCam }
    document.title = `Splat · ${sceneName}`
  })
  .catch((err) => {
    console.error(err)
    hud.textContent = `failed to load ${sceneName}\n${String(err)}`
  })

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  if (k === 'c') applyCam(camIndex + 1)
  if (k === 'p') applyCam(camIndex - 1)
  if (k === 'r') applyCam(0)
})

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera)
})
