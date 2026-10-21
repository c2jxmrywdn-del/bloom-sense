import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import * as THREE from 'three'
import { gradeShader } from './shaders'
import { useApp } from '../store'
import { lifeFX } from './lifeFX'

export function PostFX() {
  const { gl, scene, camera, size } = useThree()
  const quality = useApp((s) => s.quality)
  const composer = useMemo(() => {
    const c = new EffectComposer(gl)
    c.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.24, 0.46, 0.95)
    c.addPass(bloom)
    const grade = new ShaderPass(gradeShader)
    c.addPass(grade)
    c.addPass(new OutputPass())
    return { c, bloom, grade }
  }, [gl, scene, camera])

  useEffect(() => {
    composer.c.setPixelRatio(Math.min(2, gl.getPixelRatio()))
    composer.c.setSize(size.width, size.height)
    composer.bloom.setSize(size.width, size.height)
    composer.grade.uniforms.uResolution.value = [size.width, size.height]
  }, [composer, gl, size])

  useEffect(() => {
    const high = quality === 'high'
    composer.bloom.strength = high ? 0.24 : 0.14
    composer.bloom.radius = high ? 0.5 : 0.42
    composer.bloom.threshold = high ? 0.95 : 0.98
    composer.grade.uniforms.uGrain.value = high ? 0.028 : 0.018
    composer.grade.uniforms.uAberration.value = high ? 0.0018 : 0.001
  }, [composer, quality])

  useFrame(({ clock }) => {
    composer.grade.uniforms.uTime.value = clock.elapsedTime
    composer.grade.uniforms.uLife.value = lifeFX.bloom
    composer.grade.uniforms.uPulse.value = lifeFX.pulse
    composer.grade.uniforms.uAccent.value = [lifeFX.accent.r, lifeFX.accent.g, lifeFX.accent.b]
    composer.c.render()
  }, 1)

  useEffect(() => {
    return () => {
      composer.c.dispose()
    }
  }, [composer])

  return null
}
