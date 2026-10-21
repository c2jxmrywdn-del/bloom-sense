# -*- coding: utf-8 -*-
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:80])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/App.tsx', [
    ("async (mode: 'camera' | 'demo' = 'camera') => {", "async (mode: 'camera' | 'browse' = 'camera') => {"),
    ("""      const track = (async () => {
        try {
          await tracking.start(mode)
        } catch (err) {
          if (mode === 'camera') {
            try {
              await tracking.start('demo')
              fallbackNote = '未获得摄像头权限，已切换到示例影像'
            } catch (err2) {
              fallbackNote = '视觉引擎不可用，可继续使用鼠标与快捷键'
              useApp.getState().setHandInit('error')
            }
          } else {
            fallbackNote = '示例影像无法启动，可继续使用鼠标与快捷键'
            useApp.getState().setHandInit('error')
          }
        }
      })()""",
     """      const track = (async () => {
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
      })()"""),
    ("""    } catch (err) {
      const reason = (err as any)?.name === 'NotReadableError'
        ? '摄像头被其他应用占用，请关闭占用程序后重试；已切换到示例影像'
        : '无法打开摄像头，已切换到示例影像'
      useApp.getState().pushToast(reason, 'warn')
      try {
        await tracking.start('demo')
      } catch {}
    }
  }, [tracking])""",
     """    } catch (err) {
      const reason = (err as any)?.name === 'NotReadableError'
        ? '摄像头被其他应用占用，请关闭占用程序后重试'
        : '无法打开摄像头，请检查浏览器权限后重试'
      useApp.getState().setHandMode('off')
      useApp.getState().pushToast(reason, 'warn')
    }
  }, [tracking])"""),
    ("""  const startDemo = useCallback(async () => {
    try {
      await tracking.start('demo')
      useApp.getState().pushToast('示例影像 · MediaPipe 实时推理')
    } catch {
      useApp.getState().pushToast('示例影像启动失败', 'warn')
    }
  }, [tracking])

""", ""),
    ("      startDemo: () => startFlow('demo'),", "      browse: () => startFlow('browse'),"),
    ("      const t = window.setTimeout(() => startFlow('demo'), 350)", "      const t = window.setTimeout(() => startFlow('browse'), 350)"),
    ("""                : handMode === 'demo'
                  ? '开启摄像头 · 实时识别'
                  : '开启摄像头 · 实时指令'}""",
     """                : '开启摄像头 · 实时指令'}"""),
    ("""          <SettingsDrawer
            onStartCamera={startCamera}
            onStartDemo={startDemo}
            onStop={stopHand}
            onToggleSound={toggleSound}
            onToggleFullscreen={toggleFullscreen}
          />""",
     """          <SettingsDrawer
            onStartCamera={startCamera}
            onStop={stopHand}
            onToggleSound={toggleSound}
            onToggleFullscreen={toggleFullscreen}
          />"""),
    ("""        onStartCamera={startCamera}
        onStartDemo={startDemo}
        onStop={stopHand}
        markUiBloom={tracking.markUiBloom}""",
     """        onStartCamera={startCamera}
        onStop={stopHand}
        markUiBloom={tracking.markUiBloom}"""),
    ("""          onStart={() => startFlow('camera')}
          onStartDemo={() => startFlow('demo')}""",
     """          onStart={() => startFlow('camera')}
          onBrowse={() => startFlow('browse')}"""),
])

edit('src/hands/HandController.ts', [
    ("type SourceMode = 'camera' | 'demo'", "type SourceMode = 'camera'"),
    ("  private mode: SourceMode = 'demo'", "  private mode: SourceMode = 'camera'"),
    ("""      if (mode === 'camera') {
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
      } else {
        video.srcObject = null
        video.src = '/demo/reference.webm'
        video.loop = true
      }
      video.muted = true""",
     """      this.stream = await navigator.mediaDevices.getUserMedia({
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
      video.muted = true"""),
    ("        source: mode === 'camera' ? '摄像头 · 实时' : '示例视频 · 实时推理',", "        source: '摄像头 · 实时',"),
])

edit('src/hands/useHandTracking.ts', [
    ("export type TrackingMode = 'camera' | 'demo'", "export type TrackingMode = 'camera'"),
])

edit('src/store.ts', [
    ("export type HandMode = 'camera' | 'demo' | 'off'", "export type HandMode = 'camera' | 'off'"),
    ("  bloomSource: 'gesture' | 'ui' | 'auto' | 'demo'", "  bloomSource: 'gesture' | 'ui' | 'auto'"),
])

edit('src/ui/Overlays.tsx', [
    ("import { Camera, ChevronRight, Lock, Play, RotateCcw, X, Hand as HandIcon } from 'lucide-react'",
     "import { Camera, ChevronRight, Eye, Lock, RotateCcw, X, Hand as HandIcon } from 'lucide-react'"),
    ("  onStartDemo,\n}: {\n  progress: number\n  step: string\n  error: string | null\n  busy: boolean\n  loading: boolean\n  onStart: () => void\n  onStartDemo: () => void\n}) {",
     "  onBrowse,\n}: {\n  progress: number\n  step: string\n  error: string | null\n  busy: boolean\n  loading: boolean\n  onStart: () => void\n  onBrowse: () => void\n}) {"),
    ("""            <button className="enter-btn ghost" onClick={onStartDemo} disabled={busy}>
              <Play size={16} />
              进入演示
              <small>示例影像</small>
            </button>""",
     """            <button className="enter-btn ghost" onClick={onBrowse} disabled={busy}>
              <Eye size={16} />
              仅浏览花境
              <small>无摄像头</small>
            </button>"""),
    ("  onStartCamera,\n  onStartDemo,\n  onStop,\n  markUiBloom,\n}: {",
     "  onStartCamera,\n  onStop,\n  markUiBloom,\n}: {"),
    ("  onStartCamera: () => void\n  onStartDemo: () => void\n  onStop: () => void\n  markUiBloom: () => void\n}) {",
     "  onStartCamera: () => void\n  onStop: () => void\n  markUiBloom: () => void\n}) {"),
    ("""                <div className="hand-empty-title">让花读懂你的手</div>
                <div className="hand-empty-copy">开启摄像头，或先用示例影像体验</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 摄像头
                  </button>
                  <button className="tiny-btn" onClick={onStartDemo}>
                    <Play size={12} /> 示例影像
                  </button>
                </div>""",
     """                <div className="hand-empty-title">让花读懂你的手</div>
                <div className="hand-empty-copy">开启摄像头；也可先用鼠标与快捷键浏览花境</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 开启摄像头
                  </button>
                </div>"""),
    ("""                <div className="hand-empty-title">未能连接视觉引擎</div>
                <div className="hand-empty-copy">请检查摄像头权限，或改用示例影像</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 重试
                  </button>
                  <button className="tiny-btn" onClick={onStartDemo}>
                    示例影像
                  </button>
                </div>""",
     """                <div className="hand-empty-title">未能连接摄像头</div>
                <div className="hand-empty-copy">请检查权限，或关闭其他正在占用摄像头的程序</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 重试
                  </button>
                </div>"""),
    ("""            <button onClick={onStartCamera}>开启摄像头</button>
            <i />
            <button onClick={onStartDemo}>示例</button>
            <i />
            <button onClick={onStop} className="danger">
              关闭
            </button>""",
     """            <button onClick={onStartCamera}>开启摄像头</button>
            <i />
            <button onClick={onStop} className="danger">
              关闭
            </button>"""),
    ("{handMode === 'demo' ? '示例模式' : handMode === 'camera' ? '摄像头模式' : '待机'}",
     "{handMode === 'camera' ? '摄像头模式' : '仅浏览'}"),
    ("  onStartCamera,\n  onStartDemo,\n  onStop,\n  onToggleSound,\n  onToggleFullscreen,\n}: {",
     "  onStartCamera,\n  onStop,\n  onToggleSound,\n  onToggleFullscreen,\n}: {"),
    ("  onStartCamera: () => void\n  onStartDemo: () => void\n  onStop: () => void\n  onToggleSound: () => void\n  onToggleFullscreen: () => void\n}) {",
     "  onStartCamera: () => void\n  onStop: () => void\n  onToggleSound: () => void\n  onToggleFullscreen: () => void\n}) {"),
    ("""          <div className="segmented three">
            <button className={handMode === 'camera' ? 'active' : ''} onClick={onStartCamera}>
              摄像头
            </button>
            <button className={handMode === 'demo' ? 'active' : ''} onClick={onStartDemo}>
              示例影像
            </button>
            <button className={handMode === 'off' ? 'active' : ''} onClick={onStop}>
              关闭
            </button>
          </div>""",
     """          <div className="segmented">
            <button className={handMode === 'camera' ? 'active' : ''} onClick={onStartCamera}>
              摄像头
            </button>
            <button className={handMode === 'off' ? 'active' : ''} onClick={onStop}>
              关闭 · 仅浏览
            </button>
          </div>"""),
])
print('demo mode removed from app')
