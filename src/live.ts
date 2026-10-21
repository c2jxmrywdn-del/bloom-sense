// High-frequency state that must not trigger React renders.
export const live = {
  handRotTarget: { x: 0, y: 0, z: 0 },
  handRot: { x: 0, y: 0, z: 0 },
  handPresent: false,
  pinch: 0,
  openness: 0.5,
  fps: 0,
  landmarks: null as null | { x: number; y: number; z: number }[],
  bloomFromHand: null as null | number,
  lastGesture: 'None',
  // 捏合（两指 / 五指）后移动手掌 → 像握住物体一样拖转整支花或镜头
  pinchActive: false,
  pinchSource: 'none' as 'none' | 'two' | 'five',
  grab: { x: 0, y: 0, z: 0 },
  // 键盘方向键沿轨迹巡游的增量（每帧被 GaussianStage 消费清零）
  scrubDelta: 0,
}
