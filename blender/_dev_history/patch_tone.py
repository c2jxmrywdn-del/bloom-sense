# -*- coding: utf-8 -*-
# Tone down the initial exposure: dark cinematic scene, small particles.

def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:60])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/three/materials.ts', [
    ("uFresnel: { value: 0.36 },", "uFresnel: { value: 0.2 },"),
    ("uTranslucency: { value: 0.22 },", "uTranslucency: { value: 0.1 },"),
    ("uVein: { value: 0.045 },", "uVein: { value: 0.03 },"),
    ("uGlow: { value: 0.16 },", "uGlow: { value: 0.06 },"),
    ("    roughness: 0.43,", "    roughness: 0.5,"),
    ("    clearcoat: 0.16,", "    clearcoat: 0.08,"),
    ("    sheen: 1.0,", "    sheen: 0.7,"),
    ("  uniforms.uTranslucency.value = 0.22 * opacityScale", "  uniforms.uTranslucency.value = 0.1 * opacityScale"),
])

edit('src/three/FlowerStage.tsx', [
    ("      if (u?.uFresnel) u.uFresnel.value = 0.28 + bloom * 0.16\n      if (u?.uTranslucency) u.uTranslucency.value = 0.16 + bloom * 0.16\n      if (u?.uGlow) u.uGlow.value = 0.1 + bloom * 0.13",
     "      if (u?.uFresnel) u.uFresnel.value = 0.14 + bloom * 0.08\n      if (u?.uTranslucency) u.uTranslucency.value = 0.06 + bloom * 0.08\n      if (u?.uGlow) u.uGlow.value = 0.03 + bloom * 0.06"),
    ("      lightRef.current.intensity = 6 + bloom * 20", "      lightRef.current.intensity = 2.5 + bloom * 6"),
    ("          intensity={14}\n          distance={4.5}", "          intensity={5}\n          distance={4.2}"),
    ("      <ambientLight intensity={0.32} />\n      <directionalLight position={[4.4, 6.5, 4.2]} intensity={2.25} color=\"#ffe5ce\" />\n      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={1.35} color={envId === 'aurora' ? '#8fffd2' : '#aac9ff'} />\n      <pointLight position={[2.4, 3.4, 2.2]} intensity={16} distance={8} decay={2} color=\"#ffd9c2\" />\n      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={6} distance={5} decay={2} color=\"#a9c8ff\" />\n      <hemisphereLight args={['#5a6b7a', '#0a0c0d', 0.28]} />",
     "      <ambientLight intensity={0.18} />\n      <directionalLight position={[4.4, 6.5, 4.2]} intensity={1.25} color=\"#ffe5ce\" />\n      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={0.8} color={envId === 'aurora' ? '#8fffd2' : '#aac9ff'} />\n      <pointLight position={[2.4, 3.4, 2.2]} intensity={5} distance={8} decay={2} color=\"#ffd9c2\" />\n      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={2} distance={5} decay={2} color=\"#a9c8ff\" />\n      <hemisphereLight args={['#5a6b7a', '#0a0c0d', 0.16]} />"),
    ("    const scale = 4.4 + bloomRef.current * 1.6", "    const scale = 3.7 + bloomRef.current * 1.15"),
    ("    matRef.current.uniforms.uOpacity.value = 0.10 + bloomRef.current * 0.23", "    matRef.current.uniforms.uOpacity.value = 0.045 + bloomRef.current * 0.11"),
    ("<pointLight position={[0, 0.55, 0.25]} color={flower.accent} intensity={5} distance={2.4} decay={2} />", "<pointLight position={[0, 0.55, 0.25]} color={flower.accent} intensity={1.5} distance={2.4} decay={2} />"),
    ("<pointLight position={[0, 0.4, 0]} color={accent} intensity={2.5} distance={1.6} decay={2} />", "<pointLight position={[0, 0.4, 0]} color={accent} intensity={1} distance={1.6} decay={2} />"),
    ("      uSize: { value: 15 },", "      uSize: { value: 8 },"),
    ("      ringMat.current.opacity = (1 - p) * 0.42", "      ringMat.current.opacity = (1 - p) * 0.3"),
])

edit('src/three/Experience.tsx', [
    ("gl.toneMappingExposure = 1.05", "gl.toneMappingExposure = 0.86"),
])

edit('src/three/PostFX.tsx', [
    ("new THREE.Vector2(size.width, size.height), 0.68, 0.72, 0.82", "new THREE.Vector2(size.width, size.height), 0.42, 0.6, 0.9"),
    ("composer.bloom.strength = high ? 0.68 : 0.42", "composer.bloom.strength = high ? 0.42 : 0.28"),
    ("composer.bloom.radius = high ? 0.72 : 0.55", "composer.bloom.radius = high ? 0.6 : 0.5"),
    ("composer.bloom.threshold = high ? 0.82 : 0.92", "composer.bloom.threshold = high ? 0.9 : 0.94"),
    ("composer.grade.uniforms.uGrain.value = high ? 0.035 : 0.02", "composer.grade.uniforms.uGrain.value = high ? 0.028 : 0.018"),
])

edit('src/three/shaders.ts', [
    ("uVignette: { value: 0.42 },", "uVignette: { value: 0.52 },"),
    ("uGrain: { value: 0.035 },", "uGrain: { value: 0.026 },"),
    ("uAberration: { value: 0.0018 },", "uAberration: { value: 0.0012 },"),
    ("uSaturation: { value: 1.06 },", "uSaturation: { value: 1.08 },"),
    ("  col = mix(col, uSunColor * 2.6, disc);\n  col += uSunColor * pow(sd, 26.0) * 0.20 * uSunGlow;\n  col += uSunColor * pow(sd, 4.0) * 0.028 * uSunGlow;",
     "  col = mix(col, uSunColor * 1.25, disc);\n  col += uSunColor * pow(sd, 30.0) * 0.055 * uSunGlow;\n  col += uSunColor * pow(sd, 4.0) * 0.012 * uSunGlow;"),
    ("  gl_PointSize = uSize * aScale * uDpr * (52.0 / max(0.4, -mv.z));", "  gl_PointSize = clamp(uSize * aScale * uDpr * (16.0 / max(1.0, -mv.z)), 1.0, 22.0);"),
    ("  gl_PointSize = uSize * aScale * uDpr * (48.0 / max(0.4, -mv.z)) * (1.0 - p * 0.5);", "  gl_PointSize = clamp(uSize * aScale * uDpr * (16.0 / max(1.0, -mv.z)), 1.0, 24.0) * (1.0 - p * 0.5);"),
])

edit('src/three/Environment.tsx', [
    ("    sunDir: [-0.42, 0.2, -1], sunSize: 0.99855, sunGlow: 0.75,", "    sunDir: [-0.72, 0.3, -1], sunSize: 0.9992, sunGlow: 0.35,"),
    ("    sunDir: [0.35, 0.55, -1], sunSize: 0.9997, sunGlow: 0.1,", "    sunDir: [0.35, 0.55, -1], sunSize: 0.9998, sunGlow: 0.06,"),
    ("    sunDir: [0.5, 0.13, -1], sunSize: 0.9992, sunGlow: 1.4,", "    sunDir: [0.65, 0.18, -1], sunSize: 0.99945, sunGlow: 0.9,"),
    ("    sunDir: [0.2, 0.3, -1], sunSize: 0.99975, sunGlow: 0.2,", "    sunDir: [0.25, 0.36, -1], sunSize: 0.9996, sunGlow: 0.12,"),
    ("      uMoon: { value: 0.9 },", "      uMoon: { value: 0.65 },"),
    ("      <pointLight position={[0, 0.7, 0.8]} color=\"#ffb9ca\" intensity={8} distance={5} decay={2} />\n      <directionalLight position={[-5, 4, -2]} color=\"#a8c8ff\" intensity={1.4} />\n      <hemisphereLight args={['#37506d', '#060b12', 0.45]} />",
     "      <pointLight position={[0, 0.7, 0.8]} color=\"#ffb9ca\" intensity={2.5} distance={5} decay={2} />\n      <directionalLight position={[-5, 4, -2]} color=\"#a8c8ff\" intensity={0.7} />\n      <hemisphereLight args={['#37506d', '#060b12', 0.22]} />"),
    ("      <pointLight position={[0, 1, 0.8]} color=\"#c9b6ff\" intensity={10} distance={6} decay={2} />\n      <directionalLight position={[4, 5, -3]} color=\"#b79cff\" intensity={1.2} />\n      <hemisphereLight args={['#3d2a62', '#070510', 0.5]} />",
     "      <pointLight position={[0, 1, 0.8]} color=\"#c9b6ff\" intensity={3} distance={6} decay={2} />\n      <directionalLight position={[4, 5, -3]} color=\"#b79cff\" intensity={0.7} />\n      <hemisphereLight args={['#3d2a62', '#070510', 0.25]} />"),
    ("      <directionalLight position={[6, 6, -4]} color=\"#ffc59b\" intensity={2.2} />\n      <directionalLight position={[-4, 3, 5]} color=\"#9fb5d9\" intensity={0.6} />\n      <hemisphereLight args={['#e1b9b6', '#2a1f24', 0.5]} />",
     "      <directionalLight position={[6, 6, -4]} color=\"#ffc59b\" intensity={1.1} />\n      <directionalLight position={[-4, 3, 5]} color=\"#9fb5d9\" intensity={0.35} />\n      <hemisphereLight args={['#e1b9b6', '#2a1f24', 0.25]} />"),
    ("      <directionalLight position={[-5, 5, -2]} color=\"#8fffd2\" intensity={1.7} />\n      <directionalLight position={[5, 2, 4]} color=\"#9d8cff\" intensity={0.75} />\n      <hemisphereLight args={['#3cffe1', '#04090c', 0.35]} />",
     "      <directionalLight position={[-5, 5, -2]} color=\"#8fffd2\" intensity={0.9} />\n      <directionalLight position={[5, 2, 4]} color=\"#9d8cff\" intensity={0.4} />\n      <hemisphereLight args={['#3cffe1', '#04090c', 0.2]} />"),
    ("        size={8}\n        speed={0.55}\n        opacity={0.85}", "        size={4}\n        speed={0.55}\n        opacity={0.62}"),
    ("        size={13}\n        speed={0.32}\n        opacity={0.35}", "        size={6}\n        speed={0.32}\n        opacity={0.26}"),
    ("        size={6}\n        speed={0.24}\n        opacity={0.7}", "        size={2.2}\n        speed={0.24}\n        opacity={0.55}"),
    ("        size={16}\n        speed={0.3}\n        opacity={0.34}", "        size={7}\n        speed={0.3}\n        opacity={0.3}"),
    ("        size={7}\n        speed={0.4}\n        opacity={0.55}", "        size={3}\n        speed={0.4}\n        opacity={0.4}"),
    ("        size={4.2}\n        speed={0.22}\n        opacity={0.7}", "        size={1.6}\n        speed={0.22}\n        opacity={0.5}"),
    ("        size={10}\n        speed={0.28}\n        opacity={0.42}", "        size={4}\n        speed={0.28}\n        opacity={0.32}"),
])
print('tone patch done')
