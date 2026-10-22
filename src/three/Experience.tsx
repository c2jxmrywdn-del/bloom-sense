import { Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Environment, getEnvFog } from './Environment'
import { FlowerStage } from './FlowerStage'
import { GaussianStage } from './GaussianStage'
import { PostFX } from './PostFX'
import { useApp } from '../store'
import { ENVIRONMENTS } from '../data'
import { isMobile } from '../mobile'

function RoomEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const tex = pmrem.fromScene(room, 0.04).texture
    scene.environment = tex
    scene.environmentIntensity = 0.2
    return () => {
      scene.environment = null
      tex.dispose()
      pmrem.dispose()
      room.dispose?.()
    }
  }, [gl, scene])
  return null
}

function AtelierRig() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.position.set(1.95, 2.3, 3.85)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 1.98, 0)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 34
      camera.near = 0.1
      camera.far = 140
      camera.updateProjectionMatrix()
    }
    camera.updateMatrixWorld()
  }, [camera])
  return null
}

function SceneContent({ env }: { env: number }) {
  const envInfo = ENVIRONMENTS[env]
  const stageMode = useApp((s) => s.stageMode)
  const [rigReady, setRigReady] = useState(false)
  useEffect(() => {
    setRigReady(false)
    if (stageMode !== 'atelier') return
    const id = window.requestAnimationFrame(() => setRigReady(true))
    return () => window.cancelAnimationFrame(id)
  }, [stageMode])
  if (stageMode === 'real') {
    return (
      <>
        <color attach="background" args={['#070605']} />
        <GaussianStage />
      </>
    )
  }
  return (
    <>
      <color attach="background" args={[getEnvFog(envInfo.id)]} />
      <fog attach="fog" args={[getEnvFog(envInfo.id), 14, 58]} />
      <AtelierRig />
      <RoomEnv />
      <Environment id={envInfo.id} />
      <FlowerStage />
      {rigReady && <OrbitControls
        makeDefault
        target={[0, 1.98, 0]}
        enablePan={false}
        minDistance={2.3}
        maxDistance={7.2}
        minPolarAngle={0.68}
        maxPolarAngle={1.5}
        enableDamping
        dampingFactor={0.055}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
      />}
      <PostFX />
    </>
  )
}

export function Experience({ env }: { env: number }) {
  const quality = useApp((s) => s.quality)
  const stageMode = useApp((s) => s.stageMode)
  // 3DGS 实景按全分辨率渲染，花瓣与石纹等细节更锐利；
  // 移动端自动降级：高画质 DPR 上限压到 1.5，避免大模型 + 高 DPR 拖垮帧率
  const mobile = isMobile()
  const dpr: [number, number] =
    stageMode === 'real'
      ? quality === 'high'
        ? mobile
          ? [1, 1.5]
          : [1, 2.5]
        : [1, 1.35]
      : quality === 'high'
        ? mobile
          ? [1, 1.5]
          : [1, 1.75]
        : [1, 1.15]
  return (
    <Canvas
      className="stage-canvas"
      dpr={dpr}
      camera={{ position: [1.95, 2.3, 3.85], fov: 34, near: 0.1, far: 140 }}
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 0.86
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.setClearColor('#05070b')
      }}
      shadows={false}
    >
      <Suspense fallback={null}>
        <SceneContent env={env} />
      </Suspense>
    </Canvas>
  )
}
