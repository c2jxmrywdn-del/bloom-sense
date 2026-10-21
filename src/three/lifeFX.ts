import * as THREE from 'three'

// Shared lifecycle signal consumed by petals, particles and the post grade.
export const lifeFX = {
  bloom: 0.25,
  energy: 0.2,
  pulse: 0,
  hand: false,
  accent: new THREE.Color('#ff6f8d'),
  pulseColor: new THREE.Color('#ffd9b0'),
}

export function triggerLifePulse(color: string | THREE.Color) {
  lifeFX.pulse = 1
  lifeFX.pulseColor.set(color)
}
