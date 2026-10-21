import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FLOWERS, type Flower, type FlowerId } from '../data'
import { createPetalMaterial, createPlantMaterial } from './materials'

export interface FlowerAsset {
  flower: Flower
  display: THREE.Group
  petalMeshes: THREE.Mesh[]
  petalMaterials: THREE.MeshPhysicalMaterial[]
  materials: THREE.Material[]
  bounds: THREE.Box3
  height: number
  headY: number
  baseLift: number
}

const cache = new Map<FlowerId, FlowerAsset>()
let loadingPromise: Promise<FlowerAsset[]> | null = null

function prepareAsset(flower: Flower, gltfScene: THREE.Group): FlowerAsset {
  const petalMeshes: THREE.Mesh[] = []
  const materials: THREE.Material[] = []
  const petalMaterial = createPetalMaterial(flower)
  const coreMaterial = createPlantMaterial(flower, 'core')
  const stemMaterial = createPlantMaterial(flower, 'stem')
  materials.push(petalMaterial, coreMaterial, stemMaterial)

  gltfScene.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const n = child.name.toLowerCase()
    const isPetal = n.startsWith('petals')
    const isStem = n.startsWith('stem')
    child.frustumCulled = false
    child.castShadow = false
    child.receiveShadow = false
    if (isPetal) {
      if (child.geometry.getAttribute('uv')) {
        child.geometry.setAttribute('aPetalUv', child.geometry.getAttribute('uv'))
      }
      child.material = petalMaterial
      petalMeshes.push(child)
      if (child.morphTargetInfluences) {
        child.morphTargetInfluences = child.morphTargetInfluences.map(() => 0)
      }
    } else {
      child.material = isStem ? stemMaterial : coreMaterial
    }
  })

  const box = new THREE.Box3().setFromObject(gltfScene)
  const baseLift = -box.min.y
  const display = new THREE.Group()
  display.name = 'flower_' + flower.id
  display.add(gltfScene)
  display.position.y = baseLift

  // a natural off-axis starting pose
  display.rotation.y = -0.22

  const height = box.max.y - box.min.y
  const headY = box.max.y - Math.min(0.85, height * 0.27)
  const asset: FlowerAsset = {
    flower,
    display,
    petalMeshes,
    petalMaterials: [petalMaterial],
    materials,
    bounds: box,
    height,
    headY,
    baseLift,
  }
  return asset
}

export async function loadFlowers(
  onProgress?: (progress: number, step: string) => void
): Promise<FlowerAsset[]> {
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const loader = new GLTFLoader()
    let finished = 0
    const assets = await Promise.all(
      FLOWERS.map(async (flower) => {
        onProgress?.(0.05 + (finished / FLOWERS.length) * 0.86, `正在移栽 · ${flower.short}`)
        const gltf = await loader.loadAsync(flower.model)
        finished += 1
        onProgress?.(0.05 + (finished / FLOWERS.length) * 0.86, `花谱已收录 · ${flower.short}`)
        const asset = prepareAsset(flower, gltf.scene as THREE.Group)
        cache.set(flower.id, asset)
        return asset
      })
    )
    return assets
  })()
  return loadingPromise
}

export function getFlowerAsset(id: FlowerId): FlowerAsset | undefined {
  return cache.get(id)
}

export function getCachedFlowers(): FlowerAsset[] {
  return FLOWERS.map((f) => cache.get(f.id)).filter(Boolean) as FlowerAsset[]
}
