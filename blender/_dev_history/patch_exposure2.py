# -*- coding: utf-8 -*-
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:70])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/three/FlowerStage.tsx', [
    ('    state.gl.toneMappingExposure = 0.84 + bloom * 0.07 + lifeFX.pulse * 0.02',
     '    state.gl.toneMappingExposure = 0.68 + bloom * 0.055 + lifeFX.pulse * 0.015'),
    ('      <ambientLight intensity={studio ? 0.5 : 0.18} />',
     '      <ambientLight intensity={studio ? 0.16 : 0.18} />'),
    ('      <directionalLight position={[4.4, 6.5, 4.2]} intensity={studio ? 2.1 : 1.25} color="#ffe5ce" />',
     '      <directionalLight position={[4.4, 6.5, 4.2]} intensity={studio ? 0.95 : 1.25} color="#ffe5ce" />'),
    ('      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={studio ? 0.7 : 0.8} color={envId === \'aurora\' ? \'#8fffd2\' : envId === \'studio\' ? \'#dce8ff\' : \'#aac9ff\'} />',
     '      <directionalLight position={[-4.5, 3.8, -3.2]} intensity={studio ? 0.28 : 0.8} color={envId === \'aurora\' ? \'#8fffd2\' : envId === \'studio\' ? \'#dce8ff\' : \'#aac9ff\'} />'),
    ('      <pointLight position={[2.4, 3.4, 2.2]} intensity={studio ? 2.2 : 5} distance={8} decay={2} color="#ffd9c2" />',
     '      <pointLight position={[2.4, 3.4, 2.2]} intensity={studio ? 0.7 : 5} distance={8} decay={2} color="#ffd9c2" />'),
    ('      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={studio ? 0.8 : 2} distance={5} decay={2} color="#a9c8ff" />',
     '      <pointLight position={[-2.2, headY - 0.4, 1.2]} intensity={studio ? 0.25 : 2} distance={5} decay={2} color="#a9c8ff" />'),
    ('      <hemisphereLight args={studio ? [\'#fff6e8\', \'#b9a88f\', 0.55] : [\'#5a6b7a\', \'#0a0c0d\', 0.16]} />',
     '      <hemisphereLight args={studio ? [\'#fff6e8\', \'#b9a88f\', 0.26] : [\'#5a6b7a\', \'#0a0c0d\', 0.16]} />'),
])

edit('src/three/Environment.tsx', [
    ('      <directionalLight position={[4.5, 6.5, 4.5]} color="#fff2e4" intensity={0.8} />\n      <directionalLight position={[-4, 3.5, 3]} color="#eef4ff" intensity={0.3} />\n      <ambientLight intensity={0.38} />',
     '      <directionalLight position={[4.5, 6.5, 4.5]} color="#fff2e4" intensity={0.3} />\n      <directionalLight position={[-4, 3.5, 3]} color="#eef4ff" intensity={0.12} />\n      <ambientLight intensity={0.16} />'),
])

edit('src/three/Experience.tsx', [
    ('    scene.environmentIntensity = 0.32', '    scene.environmentIntensity = 0.2'),
])

edit('src/three/materials.ts', [
    ('    roughness: 0.5,', '    roughness: 0.62,'),
    ('    clearcoat: 0.08,', '    clearcoat: 0.03,'),
    ('    sheen: 0.7,', '    sheen: 0.26,'),
    ('    envMapIntensity: 0.7,', '    envMapIntensity: 0.5,'),
])

# lower exposure uniform of post grade? no, the renderer exposure drives it.
print('exposure reduced for the atelier')
