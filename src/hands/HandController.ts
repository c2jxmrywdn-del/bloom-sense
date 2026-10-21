import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'
import { useApp } from '../store'
import { live } from '../live'
import { audio } from '../audio'
import { ENVIRONMENTS, FLOWERS } from '../data'

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const COMMANDS: Record<string, string> = {
  None: '待命',
  Open_Palm: '花朵绽放',
  Closed_Fist: '花朵合拢',
  Victory: '切换花型',
  Thumb_Up: '切换花境',
  Thumb_Down: '回溯花境',
  Pointing_Up: '旋转归位',
  ILoveYou: '自动巡游',
}

const LABELS: Record<string, string> = {
  None: '识别中',
  Open_Palm: '张开手掌',
  Closed_Fist: '轻轻握拳',
  Victory: '双指如剪',
  Thumb_Up: '点赞',
  Thumb_Down: '拇指朝下',
  Pointing_Up: '单指向上',
  ILoveYou: '爱你手势',
}

type SourceMode = 'camera'

function dist2(a: any, b: any, aspect: number) {
  const dx = (a.x - b.x) * aspect
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smoothstep = (v: number) => {
  const x = clamp(v, 0, 1)
  return x * x * (3 - 2 * x)
}

class Smoother {
  value = 0
  initialized = false
  constructor(private tau = 0.14) {}
  push(v: number, dt: number) {
    if (!this.initialized) {
      this.value = v
      this.initialized = true
      return this.value
    }
    const a = 1 - Math.exp(-Math.max(0.001, dt) / this.tau)
    this.value += (v - this.value) * a
    return this.value
  }
  reset() {
    this.initialized = false
    this.value = 0
  }
}

export class HandController {
  private video: HTMLVideoElement | null = null
  private overlay: HTMLCanvasElement | null = null
  private stream: MediaStream | null = null
  private recognizer: GestureRecognizer | null = null
  private filesetReady = false
  private raf = 0
  private running = false
  private mode: SourceMode = 'camera'
  private lastInfer = 0
  private lastVideoTime = -1
  private fpsFrames: number[] = []
  private lastStatusAt = 0
  private lastUiAt = 0
  private lastDrawAt = 0
  private stableGesture = 'None'
  private smoothScores: Record<string, number> = {}
  private holdGesture: string | null = null
  private holdStart = 0
  private lastActionAt = 0
  private lastHoldAt = 0
  private lastBloomAt = 0
  private latencyAvg = 0
  private reportedGesture = 'None'
  private lastReportedAt = 0
  private openMin = 1.35
  private openMax = 2.35
  private engineLabel = 'MediaPipe · GPU'

  private yaw = new Smoother(0.18)
  private pitch = new Smoother(0.18)
  private roll = new Smoother(0.2)
  private pinch = new Smoother(0.12)
  private openness = new Smoother(0.16)
  private lastFrameTime = 0
  private lastPalm: { x: number; y: number } | null = null
  private lastPalmAngle = 0

  async start(mode: SourceMode, video: HTMLVideoElement, overlay: HTMLCanvasElement) {
    this.cleanupMedia()
    this.video = video
    this.overlay = overlay
    this.mode = mode
    const store = useApp.getState()
    store.setHandInit('initializing')
    store.setHandMode(mode)
    store.setAutoRotate(false)
    live.handPresent = false
    live.landmarks = null

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      video.srcObject = this.stream
      video.removeAttribute('src')
      video.loop = false
      video.muted = true
      video.playsInline = true
      video.setAttribute('playsinline', 'true')
      await video.play().catch(() => undefined)
      await this.waitForVideo(video)
      if (!this.recognizer) await this.initRecognizer()
      this.running = true
      this.lastVideoTime = -1
      this.loop(performance.now())
      useApp.getState().setHandInit('ready')
      useApp.getState().updateHandStatus({
        source: '摄像头 · 实时',
        engine: this.engineLabel,
        gesture: '等待手掌',
        gestureId: 'None',
        command: '将手掌放入画面',
        latency: 0,
      })
    } catch (err) {
      console.error('[BloomSense] hand tracking failed', err)
      this.cleanupMedia()
      useApp.getState().setHandInit('error')
      useApp.getState().setHandMode('off')
      throw err
    }
  }

  private waitForVideo(video: HTMLVideoElement) {
    if (video.readyState >= 2) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const ok = () => {
        cleanup()
        resolve()
      }
      const fail = () => {
        cleanup()
        reject(new Error('video unsupported'))
      }
      const cleanup = () => {
        video.removeEventListener('loadeddata', ok)
        video.removeEventListener('error', fail)
      }
      video.addEventListener('loadeddata', ok)
      video.addEventListener('error', fail)
      setTimeout(ok, 4500)
    })
  }

  private async initRecognizer() {
    const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
    const options = {
      baseOptions: {
        modelAssetPath: '/mediapipe/gesture_recognizer.task',
        delegate: 'GPU' as const,
      },
      runningMode: 'VIDEO' as const,
      numHands: 1,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    }
    try {
      this.recognizer = await GestureRecognizer.createFromOptions(fileset, options)
      this.engineLabel = 'MediaPipe · GPU'
    } catch (err) {
      console.warn('[BloomSense] GPU delegate failed, falling back to CPU', err)
      this.recognizer = await GestureRecognizer.createFromOptions(fileset, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: 'CPU' },
      })
      this.engineLabel = 'MediaPipe · CPU'
    }
  }

  private cleanupMedia() {
    this.running = false
    cancelAnimationFrame(this.raf)
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
    if (this.video) {
      try {
        this.video.pause()
      } catch {}
      this.video.srcObject = null
      this.video.removeAttribute('src')
      try {
        this.video.load()
      } catch {}
    }
    this.yaw.reset()
    this.pitch.reset()
    this.roll.reset()
    this.pinch.reset()
    this.openness.reset()
    live.handPresent = false
    live.landmarks = null
    live.bloomFromHand = null
    live.handRotTarget.x = 0
    live.handRotTarget.y = 0
    live.handRotTarget.z = 0
    live.pinch = 0
    live.pinchActive = false
    live.pinchSource = 'none'
    live.grab.x = 0
    live.grab.y = 0
    live.grab.z = 0
    this.lastPalm = null
  }

  stop() {
    this.cleanupMedia()
    const s = useApp.getState()
    s.setHandMode('off')
    s.setHandInit('idle')
    s.setHold(null, null)
    s.updateHandStatus({
      present: false,
      gesture: '已关闭',
      gestureId: 'None',
      confidence: 0,
      fps: 0,
      latency: 0,
      command: '已关闭',
      holdProgress: null,
      holdName: null,
      source: '未连接',
    })
  }

  dispose() {
    this.stop()
    try {
      this.recognizer?.close()
    } catch {}
    this.recognizer = null
  }

  private loop = (now: number) => {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    const video = this.video
    if (!video || video.readyState < 2) return

    const fpsDt = now - (this.lastFrameTime || now)
    this.lastFrameTime = now
    if (fpsDt > 0) {
      this.fpsFrames.push(1000 / fpsDt)
      if (this.fpsFrames.length > 60) this.fpsFrames.shift()
    }

    const inferInterval = this.latencyAvg > 19 ? 33 : 22
    if (now - this.lastInfer < inferInterval) return
    this.lastInfer = now

    if (!this.recognizer) return
    if (video.currentTime === this.lastVideoTime) {
      if (now - this.lastDrawAt > 120) this.draw(null)
      return
    }
    this.lastVideoTime = video.currentTime

    let result: any = null
    const inferStart = performance.now()
    try {
      result = this.recognizer.recognizeForVideo(video, now)
    } catch (err) {
      console.warn('[BloomSense] inference error', err)
      return
    }
    const inferMs = performance.now() - inferStart
    this.latencyAvg = this.latencyAvg ? this.latencyAvg * 0.8 + inferMs * 0.2 : inferMs
    this.handleResult(result, now, fpsDt)
  }

  private handleResult(result: any, now: number, dt: number) {
    const store = useApp.getState()
    const landmarks = result?.landmarks?.[0] as any[] | undefined
    const video = this.video!
    const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3

    if (!landmarks || landmarks.length < 21) {
      live.handPresent = false
      live.landmarks = null
      live.bloomFromHand = null
      this.holdGesture = null
      this.stableGesture = 'None'
      this.smoothScores = {}
      live.handRotTarget.x *= 0.9
      live.handRotTarget.y *= 0.9
      live.handRotTarget.z *= 0.9
      live.pinch *= 0.9
      live.pinchActive = false
      live.pinchSource = 'none'
      live.grab.x = 0
      live.grab.y = 0
      live.grab.z = 0
      this.lastPalm = null
      const avgFps = this.fpsFrames.length
        ? Math.round(this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length)
        : 0
      if (now - this.lastStatusAt > 260) {
        this.lastStatusAt = now
        store.updateHandStatus({
          present: false,
          gesture: '等待手掌',
          gestureId: 'None',
          confidence: 0,
          fps: avgFps,
          latency: Math.round(this.latencyAvg),
          command: '将手掌放入画面',
          holdProgress: null,
          holdName: null,
        })
        store.setHold(null, null)
      }
      this.draw(null)
      return
    }

    live.handPresent = true
    live.landmarks = landmarks.map((p) => ({ x: p.x, y: p.y, z: p.z ?? 0 }))
    const palmScale = Math.max(0.04, dist2(landmarks[0], landmarks[9], aspect))

    // Pinch detection: 两指捏合（拇指+食指相触且其余手指伸展）或五指捏合（指尖聚向掌心前方一点）
    const ext = (tip: number, pip: number) =>
      dist2(landmarks[tip], landmarks[0], aspect) > dist2(landmarks[pip], landmarks[0], aspect) * 1.055
    const fIndex = ext(8, 6)
    const fMiddle = ext(12, 10)
    const fRing = ext(16, 14)
    const fPinky = ext(20, 18)
    const handAngle = Math.atan2(landmarks[17].y - landmarks[5].y, landmarks[17].x - landmarks[5].x)
    const pinchRatio = dist2(landmarks[4], landmarks[8], aspect) / palmScale
    const twoPinch = pinchRatio < 0.52 && (fRing || fPinky)
    const palmCenter = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
      y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
    }
    const tips5 = [4, 8, 12, 16, 20]
    const fiveSpread =
      tips5.reduce((sum, i) => sum + dist2(landmarks[i], palmCenter, aspect), 0) / tips5.length / palmScale
    const tipWristAvg =
      tips5.reduce((sum, i) => sum + dist2(landmarks[i], landmarks[0], aspect), 0) / tips5.length / palmScale
    const fivePinch = fiveSpread < 0.62 && tipWristAvg > 1.08
    const pinchActive = twoPinch || fivePinch
    live.pinchActive = pinchActive
    live.pinchSource = fivePinch ? 'five' : twoPinch ? 'two' : 'none'
    if (pinchActive && this.lastPalm) {
      const g = store.prefs.gestureSensitivity
      const iv = store.prefs.invertLook ? -1 : 1
      live.grab.x += clamp(-(palmCenter.x - this.lastPalm.x) * 2.3 * g, -0.05, 0.05)
      live.grab.y += clamp((palmCenter.y - this.lastPalm.y) * 2.0 * g * iv, -0.05, 0.05)
      live.grab.z += clamp(-(handAngle - this.lastPalmAngle), -0.06, 0.06) * 1.4 * g
    }
    this.lastPalm = pinchActive ? palmCenter : null
    this.lastPalmAngle = handAngle

    // smoothed classifier scores
    const categories = result?.gestures?.[0] ?? []
    const rawScores: Record<string, number> = {}
    for (const c of categories) rawScores[c.categoryName] = c.score
    for (const key of Object.keys(rawScores)) {
      this.smoothScores[key] = (this.smoothScores[key] ?? 0) * 0.68 + rawScores[key] * 0.32
    }
    let best = 'None'
    let bestScore = 0
    for (const [k, v] of Object.entries(this.smoothScores)) {
      if (v > bestScore) {
        best = k
        bestScore = v
      }
    }
    if (bestScore < 0.5) {
      best = 'None'
      bestScore = 0
    }

    // Geometric fusion: when the CNN is uncertain, use per-finger extension
    // to recover the four core poses. This makes the controller resilient
    // to lighting and camera angle without a second heavy model.
    let heuristic = 'None'
    if (fIndex && fMiddle && fRing && fPinky) heuristic = 'Open_Palm'
    else if (!fIndex && !fMiddle && !fRing && !fPinky) heuristic = 'Closed_Fist'
    else if (fIndex && fMiddle && !fRing && !fPinky) heuristic = 'Victory'
    else if (fIndex && !fMiddle && !fRing && !fPinky) heuristic = 'Pointing_Up'
    if (heuristic !== 'None') {
      this.smoothScores[heuristic] = Math.max(this.smoothScores[heuristic] ?? 0, 0.58)
      if (bestScore < 0.55) {
        best = heuristic
        bestScore = 0.58
      }
    }
    if (best !== 'None') this.stableGesture = best

    // continuous openness
    const tips = [4, 8, 12, 16, 20]
    const opennessRaw =
      tips.reduce((sum, i) => sum + dist2(landmarks[i], landmarks[0], aspect), 0) / tips.length / palmScale
    // Adaptive signal calibration: learn the user's own open/fist range,
    // then map it smoothly to 0..1. This is the continuous regression layer.
    this.openMin = Math.min(Math.max(0.85, this.openMin + 0.00022), opennessRaw)
    this.openMax = Math.max(Math.min(3.2, this.openMax - 0.00022), opennessRaw)
    const span = Math.max(0.32, this.openMax - this.openMin)
    const openNorm = smoothstep((opennessRaw - this.openMin) / span)
    const smoothedOpen = this.openness.push(openNorm, dt / 1000)
    live.openness = smoothedOpen

    let bloomTarget: number | null = null
    if (best === 'Closed_Fist') bloomTarget = 0.03
    else if (best === 'Open_Palm' || best === 'None') bloomTarget = smoothedOpen
    live.bloomFromHand = pinchActive ? null : bloomTarget
    if (bloomTarget != null && !pinchActive && store.gestureControl && !this.isUiOverride(now) && now - this.lastBloomAt > 55) {
      this.lastBloomAt = now
      store.setBloom(bloomTarget, 'gesture')
    }

    // palm pose -> flower XYZ rotation targets
    const palmX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3
    const palmY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3
    const yawTarget = clamp((0.5 - palmX) * 1.9, -0.6, 0.6)
    const pitchTarget = clamp((palmY - 0.55) * 1.65, -0.42, 0.42)
    const rollTarget = clamp(-handAngle * 0.82, -0.55, 0.55)
    const sec = dt / 1000
    // 操控偏好：手势灵敏度（不同用户手幅/距离差异大）与俯仰轴向反转
    const gs = store.prefs.gestureSensitivity
    const inv = store.prefs.invertLook ? -1 : 1
    live.handRotTarget.y = this.yaw.push(yawTarget * gs, sec)
    live.handRotTarget.x = this.pitch.push(pitchTarget * gs * inv, sec)
    live.handRotTarget.z = this.roll.push(rollTarget * gs, sec)

    const pinchTarget = smoothstep((0.95 - pinchRatio) / 0.65)
    live.pinch = this.pinch.push(pinchTarget, sec)

    if (best !== 'None' && !pinchActive) this.handleHold(best, now, store)

    const avgFps = this.fpsFrames.length
      ? Math.round(this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length)
      : 0
    const command = pinchActive
      ? fivePinch
        ? '五指捏合 · 拖转花朵'
        : '两指捏合 · 拖转花朵'
      : COMMANDS[best] ?? '待命'
    if (best !== this.reportedGesture && now - this.lastReportedAt > 120) {
      this.reportedGesture = best
      this.lastReportedAt = now
      store.updateHandStatus({
        present: true,
        gesture: LABELS[best] ?? best,
        gestureId: best,
        command,
        confidence: bestScore,
        fps: avgFps,
        latency: Math.round(this.latencyAvg),
      })
    }
    if (now - this.lastStatusAt > 140) {
      this.lastStatusAt = now
      store.updateHandStatus({
        present: true,
        gesture: LABELS[best] ?? best,
        gestureId: best,
        command,
        confidence: bestScore,
        fps: avgFps,
        latency: Math.round(this.latencyAvg),
      })
    }
    this.draw(result)
  }

  private isUiOverride(now: number) {
    return now - this.lastUiAt < 2200
  }

  markUiBloom() {
    this.lastUiAt = performance.now()
  }

  private handleHold(gesture: string, now: number, store: ReturnType<typeof useApp.getState>) {
    const holds: Record<string, { label: string; threshold: number; cooldown: number; run: () => void }> = {
      Victory: {
        label: '花谱翻页',
        threshold: 700,
        cooldown: 1900,
        run: () => {
          if (store.stageMode === 'real') {
            store.nextReal()
            store.pulseAction('实景换页', '3DGS · 下一处扫描', 'env', 'var(--accent)')
            audio.chime()
          } else {
            store.nextFlower()
          }
        },
      },
      Thumb_Up: {
        label: '花境流转',
        threshold: 700,
        cooldown: 1900,
        run: () => {
          if (store.stageMode === 'real') {
            store.nextReal()
            store.pulseAction('实景换页', '3DGS · 下一处扫描', 'env')
            audio.chime()
          } else {
            store.nextEnv()
          }
        },
      },
      Thumb_Down: {
        label: '返回花境',
        threshold: 700,
        cooldown: 1900,
        run: () => {
          if (store.stageMode === 'real') {
            store.prevReal()
            store.pulseAction('实景回退', '3DGS · 上一处扫描', 'env')
            audio.chime()
          } else {
            store.prevEnv()
          }
        },
      },
      Pointing_Up: {
        label: '归位',
        threshold: 850,
        cooldown: 1800,
        run: () => {
          store.resetRot()
          if (store.stageMode === 'real') {
            store.setBloom(0.5, 'auto')
            store.pulseAction('实景归位', '镜头回到初始扫描位', 'rotate')
            store.pushToast('实景已归位 · 运镜保持锁定')
          } else {
            store.pulseAction('花心归位', '旋转回到正面', 'rotate')
            store.pushToast('已归位 · 手势控制期间自由旋转保持锁定')
          }
          audio.chime()
        },
      },
    }
    const def = holds[gesture]
    if (!def) {
      if (this.holdGesture) {
        this.holdGesture = null
        store.setHold(null, null)
      }
      return
    }
    if (this.holdGesture !== gesture) {
      this.holdGesture = gesture
      this.holdStart = now
    }
    const progress = clamp((now - this.holdStart) / def.threshold, 0, 1)
    if (now - this.lastHoldAt > 50 || progress >= 1) {
      this.lastHoldAt = now
      store.setHold(def.label, progress)
    }
    if (progress >= 1 && now - this.lastActionAt > def.cooldown) {
      this.lastActionAt = now
      this.holdStart = now + 500
      store.setHold(null, null)
      def.run()
    }
  }

  private draw(result: any) {
    const canvas = this.overlay
    const video = this.video
    if (!canvas || !video) return
    const width = canvas.width
    const height = canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const now = performance.now()
    if (now - this.lastDrawAt < 24) return
    this.lastDrawAt = now
    ctx.clearRect(0, 0, width, height)
    // viewfinder corners
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1
    const m = 14
    const len = 14
    ctx.beginPath()
    ctx.moveTo(m, m + len); ctx.lineTo(m, m); ctx.lineTo(m + len, m)
    ctx.moveTo(width - m - len, m); ctx.lineTo(width - m, m); ctx.lineTo(width - m, m + len)
    ctx.moveTo(m, height - m - len); ctx.lineTo(m, height - m); ctx.lineTo(m + len, height - m)
    ctx.moveTo(width - m - len, height - m); ctx.lineTo(width - m, height - m); ctx.lineTo(width - m, height - m - len)
    ctx.stroke()
    ctx.restore()

    const landmarks = result?.landmarks?.[0] as any[] | undefined
    if (!landmarks) {
      const scan = (Math.sin(now / 900) + 1) * 0.5
      const g = ctx.createLinearGradient(0, 0, 0, height)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.5, 'rgba(143,227,192,0.06)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, scan * height - 20, width, 40)
      return
    }

    const accent = '#b9f26e'
    const points = landmarks.map((p) => ({
      x: (1 - p.x) * width,
      y: p.y * height,
    }))

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowBlur = 12
    ctx.shadowColor = accent
    ctx.strokeStyle = accent
    ctx.globalAlpha = 0.78
    ctx.lineWidth = 1.6
    for (const [a, b] of CONNECTIONS) {
      ctx.beginPath()
      ctx.moveTo(points[a].x, points[a].y)
      ctx.lineTo(points[b].x, points[b].y)
      ctx.stroke()
    }
    ctx.restore()

    for (let i = 0; i < points.length; i++) {
      const tip = [4, 8, 12, 16, 20].includes(i)
      ctx.beginPath()
      ctx.fillStyle = tip ? '#fff5e6' : accent
      ctx.shadowBlur = tip ? 14 : 6
      ctx.shadowColor = accent
      ctx.arc(points[i].x, points[i].y, tip ? 3.2 : 2.1, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0

    const tip = points[8]
    const label = LABELS[this.stableGesture] ?? '识别中'
    ctx.font = '600 12px "Microsoft YaHei", sans-serif'
    const tw = ctx.measureText(label).width + 20
    const lx = Math.min(width - tw - 10, Math.max(10, tip.x - tw / 2))
    const ly = Math.max(12, tip.y - 46)
    ctx.fillStyle = 'rgba(5,8,12,0.66)'
    roundRect(ctx, lx, ly, tw, 24, 12)
    ctx.fill()
    ctx.strokeStyle = accent + '66'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#f4eee4'
    ctx.fillText(label, lx + 10, ly + 16)
    // palm reticle
    const px = points[9].x
    const py = points[9].y
    ctx.strokeStyle = accent + '88'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(px, py, 17 + Math.sin(now / 300) * 1.5, 0, Math.PI * 2)
    ctx.stroke()
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
