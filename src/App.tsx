import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useApp } from './store'
import { ENVIRONMENTS, FLOWERS, REAL_SCENES } from './data'
import { Experience } from './three/Experience'
import { loadFlowers } from './three/modelCache'
import { useHandTracking } from './hands/useHandTracking'
import { audio } from './audio'
import { live } from './live'
import { IntroScreen, HandPanel, GuideModal, GalleryModal, SettingsDrawer } from './ui/Overlays'
import {
  Header,
  TitleBlock,
  AxisDeck,
  EnvDock,
  GalleryRail,
  BloomDial,
  ActionFlash,
  Toasts,
  TransitionVeil,
  HideRestore,
  FooterHint,
  StageSwitch,
  RealTitleBlock,
  RealDock,
  RealHint,
} from './ui/Hud'

function hexRgb(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

type Veil = { label: string; en: string; accent: string } | null

export default function App() {
  const phase = useApp((s) => s.phase)
  const loadingProgress = useApp((s) => s.loadingProgress)
  const loadingStep = useApp((s) => s.loadingStep)
  const flowerIndex = useApp((s) => s.flowerIndex)
  const envIndex = useApp((s) => s.envIndex)
  const flowerEpoch = useApp((s) => s.flowerEpoch)
  const envEpoch = useApp((s) => s.envEpoch)
  const hideUI = useApp((s) => s.hideUI)
  const autoTour = useApp((s) => s.autoTour)
  const handMode = useApp((s) => s.handMode)
  const handInit = useApp((s) => s.handInit)
  const stageMode = useApp((s) => s.stageMode)
  const realIndex = useApp((s) => s.realIndex)
  const realLoading = useApp((s) => s.realLoading)
  const [envDisplay, setEnvDisplay] = useState(() => useApp.getState().envIndex)
  const [veil, setVeil] = useState<Veil>(null)
  const [busy, setBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const tracking = useHandTracking()
  const started = useRef(false)
  const lastFlowerEpoch = useRef(flowerEpoch)
  const lastEnvEpoch = useRef(envEpoch)
  const envTimers = useRef<number[]>([])
  const envIndexRef = useRef(envIndex)
  envIndexRef.current = envIndex

  const flower = FLOWERS[flowerIndex]
  const env = ENVIRONMENTS[envIndex]
  const realScene = REAL_SCENES[realIndex]
  const vars = useMemo(() => {
    const accent = stageMode === 'real' ? realScene.accent : flower.accent
    const accent2 = stageMode === 'real' ? realScene.accent2 : flower.accent2
    const envAccent = stageMode === 'real' ? realScene.accent : env.accent
    return {
      '--accent': accent,
      '--accent-2': accent2,
      '--accent-rgb': hexRgb(accent),
      '--accent2-rgb': hexRgb(accent2),
      '--env-accent': envAccent,
      '--env-rgb': hexRgb(envAccent),
    } as React.CSSProperties
  }, [flower, env, realScene, stageMode])

  const startFlow = useCallback(
    async (mode: 'camera' | 'browse' = 'camera') => {
      if (started.current) return
      started.current = true
      setBusy(true)
      setStartError(null)
      const store = useApp.getState()
      store.beginLoading()

      let fallbackNote: string | null = null
      audio.init().then(() => {
        if (useApp.getState().soundOn) audio.enable(true)
      })

      const track = (async () => {
        if (mode === 'browse') {
          useApp.getState().setHandMode('off')
          useApp.getState().setHandInit('idle')
          return
        }
        try {
          await tracking.start('camera')
        } catch (err) {
          const name = (err as any)?.name
          fallbackNote = name === 'NotReadableError'
            ? '摄像头被其他应用占用。关闭占用程序后，点击「开启摄像头」重试。'
            : '未能打开摄像头。可继续浏览花境，或检查浏览器权限后点击「开启摄像头」重试。'
          useApp.getState().setHandMode('off')
          useApp.getState().setHandInit('error')
        }
      })()

      try {
        await loadFlowers((p, step) => {
          useApp.getState().setLoading(Math.min(0.94, p), step)
        })
        useApp.getState().setLoading(0.96, '校准光与影')
        await new Promise((r) => setTimeout(r, 260))
        useApp.getState().enter()
        setEnvDisplay(useApp.getState().envIndex)
        setBusy(false)
        if (fallbackNote) {
          const note = fallbackNote
          window.setTimeout(() => useApp.getState().pushToast(note, 'warn'), 700)
        }
        window.setTimeout(() => {
          if (useApp.getState().soundOn) audio.enable(true)
          audio.setEnvironment(ENVIRONMENTS[useApp.getState().envIndex].id)
        }, 400)
      } catch (err) {
        console.error('[BloomSense] startup failed', err)
        useApp.setState({ phase: 'intro', loadingProgress: 0, loadingStep: '准备花境' })
        setStartError('花谱模型加载失败，请检查本地资源后重试。')
        started.current = false
        setBusy(false)
      }
    },
    [tracking]
  )

  const startCamera = useCallback(async () => {
    const s = useApp.getState()
    if (s.handMode === 'camera' && s.handInit === 'initializing') return
    s.setCamPanelOpen(true)
    s.pushToast('正在请求摄像头权限…', 'muted')
    try {
      await tracking.start('camera')
      useApp.getState().pushToast('摄像头已连接 · 实时指令已开启')
    } catch (err) {
      const reason = (err as any)?.name === 'NotReadableError'
        ? '摄像头被其他应用占用，请关闭占用程序后重试'
        : '无法打开摄像头，请检查浏览器权限后重试'
      useApp.getState().setHandMode('off')
      useApp.getState().pushToast(reason, 'warn')
    }
  }, [tracking])

  const handleCameraClick = useCallback(() => {
    const s = useApp.getState()
    if (s.handMode === 'camera') {
      s.setCamPanelOpen(!s.camPanelOpen)
      return
    }
    startCamera()
  }, [startCamera])

  const stopHand = useCallback(() => {
    tracking.stop()
    useApp.getState().pushToast('手势追踪已关闭', 'muted')
  }, [tracking])

  const toggleSound = useCallback(() => {
    const next = !useApp.getState().soundOn
    useApp.getState().toggleSound()
    if (next) {
      audio.init().then(() => {
        audio.enable(true)
        audio.setEnvironment(ENVIRONMENTS[envIndexRef.current].id)
      })
    } else {
      audio.enable(false)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => undefined)
    } else {
      document.exitFullscreen?.().catch(() => undefined)
    }
  }, [])

  // environment transition choreography
  useEffect(() => {
    if (lastEnvEpoch.current === envEpoch) return
    lastEnvEpoch.current = envEpoch
    const next = ENVIRONMENTS[envIndex]
    setVeil({ label: next.name, en: next.en, accent: next.accent })
    audio.setEnvironment(next.id)
    audio.environmentSwitch()
    useApp.getState().pushToast('花境 · ' + next.name)
    useApp.getState().pulseAction('花境流转', `${next.name} · ${next.en}`, 'env', next.accent)
    envTimers.current.forEach((t) => window.clearTimeout(t))
    const t1 = window.setTimeout(() => setEnvDisplay(envIndex), 430)
    const t2 = window.setTimeout(() => setVeil(null), 1250)
    envTimers.current = [t1, t2]
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [envEpoch, envIndex])

  // flower switch feedback
  useEffect(() => {
    if (lastFlowerEpoch.current === flowerEpoch) return
    lastFlowerEpoch.current = flowerEpoch
    const f = FLOWERS[useApp.getState().flowerIndex]
    audio.flowerSwitch()
    useApp.getState().pushToast('花谱 · ' + f.name)
    useApp.getState().pulseAction('花谱翻页', `${f.name} · ${f.latin}`, 'flower', f.accent)
  }, [flowerEpoch])

  // auto tour
  useEffect(() => {
    if (!autoTour || phase !== 'ready') return
    const timer = window.setInterval(() => {
      const s = useApp.getState()
      if (s.stageMode === 'real') s.nextReal()
      else s.nextEnv()
    }, 42000)
    return () => window.clearInterval(timer)
  }, [autoTour, phase])

  // reveal thumbnails once ready
  useEffect(() => {
    if (phase !== 'ready') return
    setEnvDisplay(useApp.getState().envIndex)
  }, [phase])

  // keyboard atlas
  useEffect(() => {
    if (phase !== 'ready') return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const s = useApp.getState()
      if (k === 'v') {
        s.setStageMode(s.stageMode === 'real' ? 'atelier' : 'real')
        return
      }
      if (s.stageMode === 'real') {
        if (e.key >= '1' && e.key <= '3') {
          s.selectReal(Number(e.key) - 1)
          return
        }
        const realKeys = ['q', 'w', 'e']
        if (realKeys.includes(k)) {
          s.selectReal(realKeys.indexOf(k))
          return
        }
        if (k === 'a') {
          if (s.handMode === 'camera') {
            s.pushToast('手势控制中 · 实景运镜已锁定', 'muted')
            return
          }
          s.setAutoRotate(!s.autoRotate)
          s.pushToast(s.autoRotate ? '实景呼吸运镜已暂停' : '实景呼吸运镜已开启', 'muted')
          return
        }
        if (k === ' ') {
          e.preventDefault()
          s.toggleBloom()
          return
        }
        if (k === 'arrowleft' || k === 'arrowright') {
          e.preventDefault()
          live.scrubDelta += k === 'arrowleft' ? -0.5 : 0.5
          return
        }
        if (k === 'arrowup' || k === 'arrowdown') {
          e.preventDefault()
          if (k === 'arrowup') s.nudgeRot(-2, 0, 0)
          if (k === 'arrowdown') s.nudgeRot(2, 0, 0)
          return
        }
      }
      if (e.key >= '1' && e.key <= '6') {
        s.selectFlower(Number(e.key) - 1)
        return
      }
      const envKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u']
      if (envKeys.includes(k)) {
        s.selectEnv(envKeys.indexOf(k))
        return
      }
      switch (k) {
        case ' ':
          e.preventDefault()
          s.toggleBloom()
          return
        case 'a':
          if (s.handMode === 'camera') {
            s.setAutoRotate(false)
            s.pushToast('手势控制中 · 自由旋转已锁定', 'muted')
            return
          }
          s.setAutoRotate(!s.autoRotate)
          s.pushToast(s.autoRotate ? '自动旋转已暂停' : '自动旋转已开启', 'muted')
          return
        case 'o':
          s.toggleAutoTour()
          return
        case 'x':
        case 'y':
        case 'z':
          s.toggleLock(k as 'x' | 'y' | 'z')
          return
        case 'arrowleft':
          e.preventDefault()
          s.nudgeRot(0, -4, 0)
          return
        case 'arrowright':
          e.preventDefault()
          s.nudgeRot(0, 4, 0)
          return
        case 'arrowup':
          e.preventDefault()
          s.nudgeRot(-4, 0, 0)
          return
        case 'arrowdown':
          e.preventDefault()
          s.nudgeRot(4, 0, 0)
          return
        case 'g':
          s.togglePanel('guide')
          return
        case 'l':
          s.togglePanel('gallery')
          return
        case 's':
          s.togglePanel('settings')
          return
        case 'm':
          toggleSound()
          return
        case 'h':
          s.toggleHideUI()
          return
        case 'c':
          s.setCamPanelOpen(!s.camPanelOpen)
          return
        case 'f':
          toggleFullscreen()
          return
        case 'escape':
          s.closePanel()
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, toggleSound, toggleFullscreen])

  // QA hooks and deep links
  useEffect(() => {
    const api = {
      browse: () => startFlow('browse'),
      startCamera: () => startFlow('camera'),
      stop: stopHand,
      flower: (i: number) => useApp.getState().selectFlower(i),
      env: (i: number) => useApp.getState().selectEnv(i),
      real: (i: number) => useApp.getState().selectReal(i),
      stage: (m: 'real' | 'atelier') => useApp.getState().setStageMode(m),
      bloom: (v: number) => useApp.getState().setBloom(v, 'ui'),
      autoRotate: (b: boolean) => useApp.getState().setAutoRotate(b),
      next: () => useApp.getState().nextFlower(),
      nextEnv: () => useApp.getState().nextEnv(),
      panel: (p: any) => useApp.setState({ panel: p }),
      hideUI: (b: boolean) => useApp.setState({ hideUI: b }),
      guide: () => useApp.setState({ panel: 'guide' }),
      gallery: () => useApp.setState({ panel: 'gallery' }),
      settings: () => useApp.setState({ panel: 'settings' }),
    }
    ;(window as any).__BLOOM__ = api
    const params = new URLSearchParams(window.location.search)
    if (params.get('qa') === '1' && !started.current) {
      const t = window.setTimeout(() => startFlow('browse'), 350)
      return () => window.clearTimeout(t)
    }
  }, [startFlow, stopHand])

  useEffect(() => {
    if (phase !== 'ready') return
    const params = new URLSearchParams(window.location.search)
    const fid = params.get('flower')
    const eid = params.get('env')
    const bloom = params.get('bloom')
    if (fid) {
      const idx = FLOWERS.findIndex((f) => f.id === fid || String(FLOWERS.indexOf(f)) === fid)
      if (idx >= 0) useApp.getState().selectFlower(idx)
    }
    if (eid) {
      const idx = ENVIRONMENTS.findIndex((e) => e.id === eid || String(ENVIRONMENTS.indexOf(e)) === eid)
      if (idx >= 0) {
        useApp.getState().selectEnv(idx)
        setEnvDisplay(idx)
      }
    }
    if (bloom != null && bloom !== '') {
      const value = Math.max(0, Math.min(1, Number(bloom)))
      if (!Number.isNaN(value)) useApp.getState().setBloom(value, 'ui')
    }
  }, [phase])

  useEffect(() => {
    return () => {
      envTimers.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const lightEnv = stageMode !== 'real' && (ENVIRONMENTS[envDisplay].id === 'studio' || ENVIRONMENTS[envDisplay].id === 'bamboo')
  return (
    <div
      className={`app ${phase === 'ready' ? 'is-ready' : ''} ${hideUI ? 'ui-hidden' : ''} ${
        lightEnv ? 'studio-theme' : ''
      } ${ENVIRONMENTS[envDisplay].id === 'bamboo' ? 'bamboo-theme' : ''} ${
        stageMode === 'real' ? 'real-theme' : ''
      }`}
      style={vars}
    >
      {phase === 'ready' && (
        <div className="stage-wrap">
          <Experience env={envDisplay} />
        </div>
      )}
      <div className="vignette-layer" />
      <div className="grain-layer" />
      {phase === 'ready' && <div className="scene-reveal" />}

      {phase === 'ready' && (
        <>
          <Header
            onToggleSound={toggleSound}
            onToggleFullscreen={toggleFullscreen}
            onCameraClick={handleCameraClick}
            cameraLive={handMode === 'camera'}
          />
          <button
            className={`camera-cta ${handMode === 'camera' ? 'live' : ''}`}
            onClick={handleCameraClick}
            title={handMode === 'camera' ? '摄像头实时指令已开启' : '开启摄像头，用真实手势控制花朵'}
          >
            <span className="cam-pulse" />
            <Camera size={14} />
            <span>
              {handMode === 'camera'
                ? handInit === 'initializing'
                  ? '摄像头启动中…'
                  : '实时指令 · 摄像头已开启'
                : '开启摄像头 · 实时指令'}
            </span>
            <em>{handMode === 'camera' ? 'LIVE' : 'REALTIME'}</em>
          </button>
          <StageSwitch />
          {stageMode === 'real' ? (
            <>
              <RealTitleBlock />
              <RealDock />
              <RealHint />
            </>
          ) : (
            <>
              <TitleBlock />
              <AxisDeck />
              <EnvDock />
              <GalleryRail />
              <BloomDial markUiBloom={tracking.markUiBloom} />
              <FooterHint />
            </>
          )}
          <ActionFlash />
          <Toasts />
          <GuideModal />
          <GalleryModal />
          <SettingsDrawer
            onStartCamera={startCamera}
            onStop={stopHand}
            onToggleSound={toggleSound}
            onToggleFullscreen={toggleFullscreen}
          />
          {stageMode === 'atelier' && veil && (
            <TransitionVeil key={envEpoch} label={veil.label} en={veil.en} accent={veil.accent} />
          )}
          {stageMode === 'real' && realLoading && (
            <div className="real-loading">
              <div className="real-loading-card glass">
                <div className="real-loading-kicker">3D GAUSSIAN SPLATTING</div>
                <div className="real-loading-label">{realLoading.label}</div>
                {realLoading.error ? (
                  <p className="real-loading-error">{realLoading.error}</p>
                ) : (
                  <>
                    <div className="real-loading-bar">
                      <i style={{ width: `${Math.round(realLoading.progress * 100)}%` }} />
                    </div>
                    <div className="real-loading-meta">
                      {Math.round(realLoading.progress * 100)}% · 正在解码高斯点云
                    </div>
                  </>
                )}
                {realLoading.error && (
                  <button className="real-loading-fallback" onClick={() => useApp.getState().setStageMode('atelier')}>
                    进入数字花境
                  </button>
                )}
              </div>
            </div>
          )}
          <HideRestore />
        </>
      )}

      <HandPanel
        visible={phase === 'ready' && !hideUI && !(stageMode === 'real' && handMode !== 'camera')}
        videoRef={tracking.videoRef}
        canvasRef={tracking.canvasRef}
        onStartCamera={startCamera}
        onStop={stopHand}
        markUiBloom={tracking.markUiBloom}
      />

      {phase !== 'ready' && (
        <IntroScreen
          progress={loadingProgress}
          step={loadingStep}
          error={startError}
          busy={busy}
          loading={phase === 'loading'}
          onStart={() => startFlow('camera')}
          onBrowse={() => startFlow('browse')}
        />
      )}
    </div>
  )
}

