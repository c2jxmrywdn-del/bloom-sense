import { create } from 'zustand'
import { FLOWERS, ENVIRONMENTS, REAL_SCENES } from './data'

export type Phase = 'intro' | 'loading' | 'ready'
export type HandMode = 'camera' | 'off'
export type Panel = 'gallery' | 'guide' | 'settings' | null
export type Axis = 'x' | 'y' | 'z'
export type Quality = 'high' | 'balanced'
export type StageMode = 'real' | 'atelier'
export interface ControlPrefs {
  dragSensitivity: number
  gestureSensitivity: number
  invertLook: boolean
  reduceMotion: boolean
}
export interface RealLoading { progress: number; label: string; error?: string }

export interface Toast {
  id: number
  text: string
  tone?: 'accent' | 'muted' | 'warn'
}

export interface ActionPulse {
  id: number
  title: string
  sub?: string
  kind: string
  accent: string
}

export interface HandStatus {
  present: boolean
  gestureId: string
  gesture: string
  confidence: number
  fps: number
  latency: number
  command: string
  holdProgress: number | null
  holdName: string | null
  source: string
  engine: string
}

interface AppState {
  phase: Phase
  loadingProgress: number
  loadingStep: string

  stageMode: StageMode
  realIndex: number
  realEpoch: number
  realLoading: RealLoading | null

  flowerIndex: number
  envIndex: number
  flowerEpoch: number
  envEpoch: number

  bloomTarget: number
  bloomActual: number
  bloomSource: 'gesture' | 'ui' | 'auto'
  gestureControl: boolean

  autoRotate: boolean
  autoTour: boolean
  locks: Record<Axis, boolean>
  baseRot: Record<Axis, number>
  rotEpoch: number

  handMode: HandMode
  handInit: 'idle' | 'initializing' | 'ready' | 'error'
  handStatus: HandStatus

  panel: Panel
  hideUI: boolean
  camPanelOpen: boolean
  soundOn: boolean
  quality: Quality
  prefs: ControlPrefs
  thumbnails: Record<string, string>
  toasts: Toast[]
  actionPulse: ActionPulse | null

  // actions
  setStageMode: (mode: StageMode) => void
  selectReal: (index: number) => void
  nextReal: () => void
  prevReal: () => void
  setRealLoading: (loading: RealLoading | null) => void

  beginLoading: () => void
  setLoading: (progress: number, step?: string) => void
  enter: () => void
  setHandMode: (mode: HandMode) => void
  setHandInit: (state: AppState['handInit']) => void
  updateHandStatus: (patch: Partial<HandStatus>) => void
  setHold: (name: string | null, progress: number | null) => void

  selectFlower: (index: number) => void
  nextFlower: () => void
  prevFlower: () => void
  selectEnv: (index: number) => void
  nextEnv: () => void
  prevEnv: () => void

  setBloom: (value: number, source?: AppState['bloomSource']) => void
  setBloomActual: (value: number) => void
  toggleBloom: () => void
  setGestureControl: (on: boolean) => void

  setAutoRotate: (on: boolean) => void
  toggleAutoTour: () => void
  toggleLock: (axis: Axis) => void
  setBaseRot: (axis: Axis, value: number) => void
  nudgeRot: (dx: number, dy?: number, dz?: number) => void
  resetRot: () => void

  togglePanel: (panel: Panel) => void
  closePanel: () => void
  toggleHideUI: () => void
  setCamPanelOpen: (open: boolean) => void
  toggleSound: () => void
  setQuality: (q: Quality) => void
  setPrefs: (patch: Partial<ControlPrefs>) => void
  setThumbnail: (id: string, url: string) => void

  pushToast: (text: string, tone?: Toast['tone']) => void
  pulseAction: (title: string, sub: string | undefined, kind: string, accent?: string) => void
  clearActionPulse: (id: number) => void
}

let toastSeq = 1
let pulseSeq = 1
let toastTimers: Record<number, number> = {}

const wrap = (n: number, length: number) => ((n % length) + length) % length
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export const useApp = create<AppState>((set, get) => ({
  phase: 'intro',
  loadingProgress: 0,
  loadingStep: '准备花境',

  stageMode: 'real',
  realIndex: 0,
  realEpoch: 0,
  realLoading: { progress: 0, label: '正在唤醒实景' },

  flowerIndex: 0,
  envIndex: 0,
  flowerEpoch: 0,
  envEpoch: 0,

  bloomTarget: 0.74,
  bloomActual: 0.2,
  bloomSource: 'auto',
  gestureControl: true,

  autoRotate: true,
  autoTour: false,
  locks: { x: false, y: false, z: false },
  baseRot: { x: 0, y: 0, z: 0 },
  rotEpoch: 0,

  handMode: 'off',
  handInit: 'idle',
  handStatus: {
    present: false,
    gestureId: 'None',
    gesture: '等待手掌',
    confidence: 0,
    fps: 0,
    latency: 0,
    command: '待命',
    holdProgress: null,
    holdName: null,
    source: '未连接',
    engine: 'MediaPipe',
  },

  panel: null,
  hideUI: false,
  camPanelOpen: true,
  soundOn: false,
  quality: 'high',
  prefs: { dragSensitivity: 1, gestureSensitivity: 1, invertLook: false, reduceMotion: false },
  thumbnails: Object.fromEntries(FLOWERS.map((f) => [f.id, f.preview])),
  toasts: [],
  actionPulse: null,

  setStageMode: (mode) => {
    if (get().stageMode === mode) return
    set({ stageMode: mode, panel: null })
    if (mode === 'real') get().setRealLoading({ progress: 0, label: '正在唤醒实景' })
    else set({ realLoading: null })
  },
  selectReal: (index) => {
    const next = wrap(index, REAL_SCENES.length)
    if (next === get().realIndex) return
    set((s) => ({
      realIndex: next,
      realEpoch: s.realEpoch + 1,
      bloomTarget: 0.5,
      bloomSource: 'auto',
      realLoading: { progress: 0, label: `正在载入实景 · ${REAL_SCENES[next].name}` },
    }))
  },
  nextReal: () => get().selectReal(get().realIndex + 1),
  prevReal: () => get().selectReal(get().realIndex - 1),
  setRealLoading: (realLoading) => set({ realLoading }),

  beginLoading: () => set({ phase: 'loading', loadingProgress: 0.02, loadingStep: '正在铺开花谱' }),
  setLoading: (progress, step) =>
    set((s) => ({
      loadingProgress: Math.max(s.loadingProgress, clamp01(progress)),
      loadingStep: step ?? s.loadingStep,
    })),
  enter: () => set({ phase: 'ready', loadingProgress: 1 }),

  setHandMode: (mode) => set({ handMode: mode }),
  setHandInit: (handInit) => set({ handInit }),
  updateHandStatus: (patch) =>
    set((s) => ({ handStatus: { ...s.handStatus, ...patch } })),
  setHold: (name, progress) =>
    set((s) => ({
      handStatus: { ...s.handStatus, holdName: name, holdProgress: progress },
    })),

  selectFlower: (index) => {
    const next = wrap(index, FLOWERS.length)
    set((s) => ({
      flowerIndex: next,
      flowerEpoch: s.flowerEpoch + 1,
      bloomTarget: 0.16,
      bloomSource: 'auto',
    }))
  },
  nextFlower: () => get().selectFlower(get().flowerIndex + 1),
  prevFlower: () => get().selectFlower(get().flowerIndex - 1),

  selectEnv: (index) => {
    const next = wrap(index, ENVIRONMENTS.length)
    if (next === get().envIndex) return
    set((s) => ({ envIndex: next, envEpoch: s.envEpoch + 1 }))
  },
  nextEnv: () => get().selectEnv(get().envIndex + 1),
  prevEnv: () => get().selectEnv(get().envIndex - 1),

  setBloom: (value, source = 'ui') =>
    set({ bloomTarget: clamp01(value), bloomSource: source }),
  setBloomActual: (value) => set({ bloomActual: clamp01(value) }),
  toggleBloom: () => {
    const s = get()
    s.setBloom(s.bloomTarget > 0.48 ? 0.035 : 1, 'ui')
  },
  setGestureControl: (on) => set({ gestureControl: on }),

  // 手势指令期间禁止花朵自由自转，关闭摄像头后恢复手动开关
  setAutoRotate: (on) => set((s) => ({ autoRotate: s.handMode === 'camera' ? false : on })),
  toggleAutoTour: () => set((s) => ({ autoTour: !s.autoTour })),
  toggleLock: (axis) =>
    set((s) => ({ locks: { ...s.locks, [axis]: !s.locks[axis] } })),
  setBaseRot: (axis, value) =>
    set((s) => ({
      baseRot: { ...s.baseRot, [axis]: Math.max(-90, Math.min(90, value)) },
    })),
  nudgeRot: (dx, dy = 0, dz = 0) =>
    set((s) => ({
      baseRot: {
        x: Math.max(-90, Math.min(90, s.baseRot.x + (s.locks.x ? 0 : dx))),
        y: Math.max(-90, Math.min(90, s.baseRot.y + (s.locks.y ? 0 : dy))),
        z: Math.max(-90, Math.min(90, s.baseRot.z + (s.locks.z ? 0 : dz))),
      },
    })),
  resetRot: () => set((s) => ({ baseRot: { x: 0, y: 0, z: 0 }, rotEpoch: s.rotEpoch + 1 })),

  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
  closePanel: () => set({ panel: null }),
  toggleHideUI: () => set((s) => ({ hideUI: !s.hideUI })),
  setCamPanelOpen: (open) => set({ camPanelOpen: open }),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  setQuality: (quality) => set({ quality }),
  setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
  setThumbnail: (id, url) =>
    set((s) => ({ thumbnails: { ...s.thumbnails, [id]: url } })),

  pushToast: (text, tone = 'accent') => {
    const id = toastSeq++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }))
    const timer = window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      delete toastTimers[id]
    }, 3400)
    toastTimers[id] = timer
  },
  pulseAction: (title, sub, kind, accent) => {
    const id = pulseSeq++
    const flower = FLOWERS[get().flowerIndex]
    set({ actionPulse: { id, title, sub, kind, accent: accent ?? flower.accent } })
    window.setTimeout(() => get().clearActionPulse(id), 1600)
  },
  clearActionPulse: (id) =>
    set((s) => ({ actionPulse: s.actionPulse?.id === id ? null : s.actionPulse })),
}))

export const selectCurrentFlower = (s: AppState) => FLOWERS[s.flowerIndex]
export const selectCurrentEnv = (s: AppState) => ENVIRONMENTS[s.envIndex]
