# -*- coding: utf-8 -*-
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:90])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/three/materials.ts', [
    ("const VERT_PARS = /* glsl */ `\nvarying vec3 vPetalWorld;",
     "const VERT_PARS = /* glsl */ `\nuniform float uTime;\nuniform float uLife;\nvarying vec3 vPetalWorld;"),
    ("    roughness: 0.62,", "    roughness: 0.66,"),
    ("    sheen: 0.26,", "    sheen: 0.18,"),
    ("    clearcoat: 0.03,", "    clearcoat: 0.0,"),
    ("    envMapIntensity: 0.5,", "    envMapIntensity: 0.42,"),
    ("""      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vPetalWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPetalNormalW = normalize(mat3(modelMatrix) * objectNormal);
        vPetalUv = aPetalUv;`
      )""",
     """      .replace(
        '#include <project_vertex>',
        `vPetalUv = aPetalUv;
        float windPhase = atan(position.z, position.x);
        float flutter = sin(uTime * 1.35 + windPhase * 2.3 + vPetalUv.x * 7.0)
                      * 0.0032 * smoothstep(0.08, 0.9, vPetalUv.x);
        transformed += objectNormal * flutter;
        transformed.x += sin(uTime * 0.52 + windPhase * 1.7) * 0.0018 * vPetalUv.x;
        transformed.z += cos(uTime * 0.43 + windPhase * 1.3) * 0.0015 * vPetalUv.x;
        #include <project_vertex>
        vPetalWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPetalNormalW = normalize(mat3(modelMatrix) * objectNormal);`
      )"""
    ),
    ("      .replace(\n        '#include <color_fragment>',",
     "      .replace(\n        '#include <normal_fragment_begin>',\n        `#include <normal_fragment_begin>\n        float pnA = sin(vPetalUv.x * 61.0 + vPetalUv.y * 23.0 + uTime * 0.6);\n        float pnB = sin(vPetalUv.x * 37.0 - vPetalUv.y * 47.0 - uTime * 0.45);\n        vec3 pnWorld = vec3(pnA, pnB, 0.0);\n        normal = normalize(normal + normalize((viewMatrix * vec4(pnWorld, 0.0)).xyz) * 0.028);`\n      )\n      .replace(\n        '#include <roughnessmap_fragment>',\n        `#include <roughnessmap_fragment>\n        float rv = 0.5 + 0.5 * sin(vPetalUv.x * 17.0 + vPetalUv.y * 29.0);\n        roughnessFactor = clamp(roughnessFactor + (rv - 0.5) * 0.10, 0.36, 0.92);`\n      )\n      .replace(\n        '#include <color_fragment>',"
    ),
    ("""        float mottle = sin(along * 13.0 + across * 7.0) * 0.55 + sin(along * 5.0 - across * 11.0) * 0.45;
        diffuseColor.rgb *= 1.0 - veins * 0.03 - midrib * 0.022 + mottle * 0.0045;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 0.995, 0.98), clamp(uLife, 0.0, 1.0) * 0.5);
        diffuseColor.rgb += uPulseColor * uPulse * 0.035 * (0.35 + abs(across - 0.5));""",
     """        float mottle = sin(along * 13.0 + across * 7.0) * 0.55 + sin(along * 5.0 - across * 11.0) * 0.45;
        float broad = 0.5 + 0.5 * sin(along * 7.0 + across * 4.0 + 1.3);
        diffuseColor.rgb *= 1.0 - veins * 0.03 - midrib * 0.022 + mottle * 0.0045 + broad * 0.045 - 0.02;
        float lumPetal = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        diffuseColor.rgb = mix(vec3(lumPetal), diffuseColor.rgb, 0.93);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 0.995, 0.98), clamp(uLife, 0.0, 1.0) * 0.5);
        diffuseColor.rgb += uPulseColor * uPulse * 0.035 * (0.35 + abs(across - 0.5));"""
    ),
    ("        totalEmissiveRadiance += uRimColor * petalEdge * (0.006 + uLife * 0.012) + uPulseColor * uPulse * 0.05;`",
     "        float edgeBreathe = 0.65 + 0.35 * sin(uTime * 1.05 + vPetalUv.x * 5.0);\n        totalEmissiveRadiance += uRimColor * petalEdge * (0.010 + uLife * 0.016) * edgeBreathe\n                               + uRimColor * petalBack * 0.012 * uLife\n                               + uPulseColor * uPulse * 0.045;`")
])

edit('src/three/FlowerStage.tsx', [
    ("""      const swayX = Math.sin(time * 0.52) * 0.006
      const swayZ = Math.sin(time * 0.41 + 1.4) * 0.008
      rootRef.current.rotation.set(
        THREE.MathUtils.degToRad(base.x) + handOff.current.x + swayX,
        THREE.MathUtils.degToRad(base.y) + spinRef.current + handOff.current.y,
        THREE.MathUtils.degToRad(base.z) + handOff.current.z + swayZ
      )
      switchRef.current = Math.min(1, switchRef.current + d / 1.05)
      const grow = 0.84 + 0.16 * easeOut(switchRef.current)
      const scale = grow * (1 + live.pinch * 0.024)
      rootRef.current.scale.setScalar(scale)""",
     """      const gust = 0.6 + (live.handPresent ? live.openness * 0.65 : 0.15)
      const swayX = (Math.sin(time * 0.37) * 0.008 + Math.sin(time * 0.83 + 1.7) * 0.0035) * gust
      const swayZ = (Math.sin(time * 0.29 + 1.2) * 0.010 + Math.sin(time * 0.61 + 2.4) * 0.004) * gust
      rootRef.current.rotation.set(
        THREE.MathUtils.degToRad(base.x) + handOff.current.x + swayX,
        THREE.MathUtils.degToRad(base.y) + spinRef.current + handOff.current.y,
        THREE.MathUtils.degToRad(base.z) + handOff.current.z + swayZ
      )
      rootRef.current.position.y = Math.sin(time * 0.9) * 0.006 + Math.sin(time * 1.7 + 1.3) * 0.002
      switchRef.current = Math.min(1, switchRef.current + d / 1.05)
      const grow = 0.84 + 0.16 * easeOut(switchRef.current)
      const breathe = 1 + Math.sin(time * 0.72) * 0.0035 + Math.sin(time * 1.6 + 1.2) * 0.0015
      const scale = grow * (1 + live.pinch * 0.02) * breathe
      rootRef.current.scale.setScalar(scale)"""
    ),
    ("      <directionalLight position={[-2.2, headY - 0.4, 1.2]} intensity={studio ? 0.8 : 2} distance={5} decay={2} color=\"#a9c8ff\" />",
     "      <directionalLight position={[-2.2, headY - 0.4, 1.2]} intensity={studio ? 0.8 : 2} distance={5} decay={2} color=\"#a9c8ff\" />\n      <directionalLight position={[-2.6, 4.4, -3.4]} intensity={studio ? 0.6 : 0.35} color=\"#ffe2ca\" />")
])
print('liveliness patch applied')
