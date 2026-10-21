import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { getCachedFlowers } from './modelCache'
import { updatePetalMaterial } from './materials'
import { useApp } from '../store'

const BACKLIGHT = new THREE.Vector3(0.4, 0.35, -1).normalize()

export async function generateThumbnails() {
  const assets = getCachedFlowers()
  if (!assets.length) return
  let renderer: THREE.WebGLRenderer | null = null
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(1.4)
    renderer.setSize(600, 750, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.setClearColor(0x000000, 0)
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.45

    const key = new THREE.DirectionalLight('#ffe3ce', 3.4)
    key.position.set(4, 7, 4)
    scene.add(key)
    const rim = new THREE.DirectionalLight('#a9c8ff', 2.6)
    rim.position.set(-4.5, 4, -3)
    scene.add(rim)
    const fill = new THREE.DirectionalLight('#f7c9c9', 0.8)
    fill.position.set(0, 2, 5)
    scene.add(fill)
    const ambient = new THREE.AmbientLight('#ffffff', 0.65)
    scene.add(ambient)

    const camera = new THREE.PerspectiveCamera(34, 600 / 750, 0.1, 80)

    for (const asset of assets) {
      const clone = asset.display.clone(true)
      clone.position.set(0, asset.baseLift, 0)
      clone.rotation.set(0, -0.38, 0)
      clone.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        const n = child.name.toLowerCase()
        if (n.startsWith('petals')) {
          const count = child.geometry.morphAttributes?.position?.length ?? 0
          child.morphTargetInfluences = new Array(count).fill(0)
          applyMorph(child, asset.flower.previewT)
          for (const mat of asset.petalMaterials) {
            updatePetalMaterial(mat, 3.2, BACKLIGHT)
            const u = mat.userData.uniforms
            if (u?.uFresnel) u.uFresnel.value = 0.42
            if (u?.uTranslucency) u.uTranslucency.value = 0.28
            if (u?.uGlow) u.uGlow.value = 0.2
          }
        }
      })
      scene.add(clone)
      clone.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(clone)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const target = new THREE.Vector3(0, box.max.y - size.y * 0.26, 0)
      const fov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect)
      const dist = Math.max(
        (size.x * 1.12) / (2 * Math.tan(hFov / 2)),
        (size.y * 0.72) / (2 * Math.tan(fov / 2))
      )
      const dir = new THREE.Vector3(0.44, 0.2, 1).normalize()
      camera.position.copy(target).addScaledVector(dir, dist * 1.16)
      camera.lookAt(target)
      renderer.render(scene, camera)
      const url = renderer.domElement.toDataURL('image/png')
      useApp.getState().setThumbnail(asset.flower.id, url)
      scene.remove(clone)
    }

    env.dispose()
    pmrem.dispose()
    room.dispose?.()
  } catch (err) {
    console.warn('[BloomSense] thumbnail renderer unavailable', err)
  } finally {
    renderer?.dispose()
  }
}

function applyMorph(mesh: THREE.Mesh, t: number) {
  const influences = mesh.morphTargetInfluences
  if (!influences?.length) return
  influences.fill(0)
  const x = Math.max(0, Math.min(1, t)) * influences.length
  if (x <= 0) return
  if (x >= influences.length) {
    influences[influences.length - 1] = 1
    return
  }
  const i = Math.floor(x)
  if (i < 1) {
    influences[0] = x
  } else {
    const idx = i - 1
    const frac = x - i
    influences[idx] = 1 - frac
    if (idx + 1 < influences.length) influences[idx + 1] = frac
  }
}
