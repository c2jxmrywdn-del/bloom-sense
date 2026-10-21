import { useMemo } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Camera, ChevronRight, Eye, Lock, RotateCcw, X, Hand as HandIcon } from 'lucide-react'
import { ENVIRONMENTS, FLOWERS, GESTURES, KEYBOARD_HINTS } from '../data'
import { useApp } from '../store'
import { BrandMark, HandGlyph } from './Hud'

type Vars = CSSProperties & Record<string, string | number>
const VarStyle = (vars: Record<string, string | number>) => vars as Vars

export function IntroScreen({
  progress,
  step,
  error,
  busy,
  loading,
  onStart,
  onBrowse,
}: {
  progress: number
  step: string
  error: string | null
  busy: boolean
  loading: boolean
  onStart: () => void
  onBrowse: () => void
}) {
  const dust = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37.7) % 100,
        top: (i * 53.3) % 100,
        size: 1 + (i % 4),
        delay: (i % 9) * 1.7,
        duration: 12 + (i % 8) * 2.2,
      })),
    []
  )
  return (
    <div className={`intro-screen ${loading ? 'loading' : ''}`}>
      <div className="intro-aurora intro-aurora-a" />
      <div className="intro-aurora intro-aurora-b" />
      <div className="intro-dust">
        {dust.map((d, i) => (
          <span
            key={i}
            style={{
              left: d.left + '%',
              top: d.top + '%',
              width: d.size + 'px',
              height: d.size + 'px',
              animationDelay: `-${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          />
        ))}
      </div>
      <div className="intro-copy">
        <div className="intro-brand">
          <BrandMark size={42} />
          <div>
            <strong>拈花</strong>
            <span>BLOOM SENSE · INTERACTIVE FLORA</span>
          </div>
        </div>
        <div className="intro-kicker">
          实景扫描 <i /> 3DGS × 交互花谱
        </div>
        <h1>
          以指尖为风
          <br />
          让花<span>缓缓醒来</span>
        </h1>
        <p className="intro-lead">
          真实花野与春日盆景以 3D 高斯泼溅整帧重建，六种数字花卉在掌心盛开。
          摄像头观察手指的变化，机器学习读懂你的手势，在写实与想象之间自由切换。
        </p>
        <div className="intro-chips">
          <span>3D Gaussian Splatting</span>
          <span>MediaPipe ML</span>
          <span>WebGL Shaders</span>
          <span>本地推理</span>
        </div>

        {!loading ? (
          <div className="intro-actions">
            <button className="enter-btn primary" onClick={onStart} disabled={busy}>
              <span className="enter-icon">
                <Camera size={18} />
              </span>
              <span>
                开启摄像头
                <small>ENTER THE GARDEN</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button className="enter-btn ghost" onClick={onBrowse} disabled={busy}>
              <Eye size={16} />
              仅浏览花境
              <small>无摄像头</small>
            </button>
          </div>
        ) : (
          <div className="intro-loading">
            <div className="loading-head">
              <span className="loading-spinner" />
              <span>{step}</span>
              <em>{Math.round(progress * 100)}%</em>
            </div>
            <div className="loading-bar">
              <span style={{ width: Math.max(3, Math.min(100, progress * 100)) + '%' }} />
            </div>
            <div className="loading-sub">正在校准花谱与实景的光</div>
          </div>
        )}
        {error && <div className="intro-error">{error}</div>}
        <div className="intro-privacy">
          <span className="secure-dot" />
          视频帧仅在浏览器本地解析，不会上传；建议使用 Chrome / Edge 获得最佳 ML 性能。
        </div>
        <div className="intro-foot">
          <span>3DGS · PROCEDURAL BOTANY</span>
          <span>MEDIAPIPE · THREE.JS</span>
          <span>© 2026 BLOOM SENSE</span>
        </div>
      </div>

      <div className="intro-visual">
        <svg viewBox="0 0 600 600" className="mandala">
          <defs>
            <linearGradient id="petalA" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stopColor="#ffd9c7" stopOpacity=".9" />
              <stop offset=".45" stopColor="#e59a9c" stopOpacity=".55" />
              <stop offset="1" stopColor="#8fb9a6" stopOpacity=".1" />
            </linearGradient>
            <linearGradient id="petalB" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f5e6d2" stopOpacity=".55" />
              <stop offset="1" stopColor="#d1a0a3" stopOpacity=".05" />
            </linearGradient>
            <radialGradient id="coreGlow">
              <stop offset="0" stopColor="#ffe9d2" stopOpacity=".95" />
              <stop offset=".35" stopColor="#e8ad9d" stopOpacity=".45" />
              <stop offset="1" stopColor="#e8ad9d" stopOpacity="0" />
            </radialGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="300" cy="300" r="230" fill="none" stroke="rgba(240,220,200,.12)" />
          <circle cx="300" cy="300" r="188" fill="none" stroke="rgba(240,220,200,.08)" strokeDasharray="2 8" />
          <g className="mandala-layer layer-1">
            {Array.from({ length: 24 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 15} 300 300)`}>
                <path
                  d="M300 300 C286 250 286 210 300 168 C314 210 314 250 300 300Z"
                  fill="url(#petalB)"
                  stroke="rgba(255,230,210,.20)"
                  strokeWidth="0.7"
                />
              </g>
            ))}
          </g>
          <g className="mandala-layer layer-2">
            {Array.from({ length: 16 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 22.5 + 7} 300 300)`}>
                <path
                  d="M300 300 C273 251 270 206 300 156 C330 206 327 251 300 300Z"
                  fill="url(#petalA)"
                  stroke="rgba(255,236,220,.32)"
                  strokeWidth="1"
                  filter="url(#softGlow)"
                />
              </g>
            ))}
          </g>
          <g className="mandala-layer layer-3">
            {Array.from({ length: 10 }, (_, i) => (
              <g key={i} transform={`rotate(${i * 36 + 18} 300 300)`}>
                <path
                  d="M300 300 C279 268 280 221 300 190 C320 221 321 268 300 300Z"
                  fill="rgba(255,239,222,.16)"
                  stroke="rgba(255,242,228,.45)"
                  strokeWidth="1.2"
                />
              </g>
            ))}
          </g>
          <circle cx="300" cy="300" r="76" fill="url(#coreGlow)" />
          <circle cx="300" cy="300" r="16" fill="#fff0dc" opacity=".8" filter="url(#softGlow)" />
          <circle cx="300" cy="300" r="7" fill="#fffaf1" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <circle
                key={i}
                cx={300 + Math.cos(a) * 230}
                cy={300 + Math.sin(a) * 230}
                r="2"
                fill="#f6d8bf"
                opacity=".55"
              />
            )
          })}
        </svg>
        <div className="mandala-caption">
          <span>Rosa × damascena</span>
          <i />
          <span>OPEN / CLOSE / ROTATE</span>
        </div>
      </div>
    </div>
  )
}

export function HandPanel({
  visible,
  videoRef,
  canvasRef,
  onStartCamera,
  onStop,
  markUiBloom,
}: {
  visible: boolean
  videoRef: RefObject<HTMLVideoElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  onStartCamera: () => void
  onStop: () => void
  markUiBloom: () => void
}) {
  const handMode = useApp((s) => s.handMode)
  const handInit = useApp((s) => s.handInit)
  const hand = useApp((s) => s.handStatus)
  const camPanelOpen = useApp((s) => s.camPanelOpen)
  const setCamPanelOpen = useApp((s) => s.setCamPanelOpen)
  const isVisible = visible && camPanelOpen
  const ready = handInit === 'ready' && handMode !== 'off'
  const activeGesture = hand.gestureId
  return (
    <aside className={`hud hand-panel glass ${isVisible ? '' : 'is-dormant'} ${ready ? 'is-ready' : ''}`}>
      <div className="hand-head">
        <div className="hand-title hand-command-title">
          <span className={`live-dot ${ready && hand.present ? 'on' : handInit === 'initializing' ? 'loading' : ''}`} />
          <div>
            <em>实时指令 · LIVE COMMAND</em>
            <strong className={ready && hand.present ? 'command-live' : ''}>
              {handMode === 'camera' && handInit === 'initializing'
                ? '摄像头启动中…'
                : ready && hand.present
                  ? `${hand.gesture} → ${hand.command}`
                  : handMode === 'off'
                    ? '摄像头未开启'
                    : '将手掌放入画面'}
            </strong>
          </div>
        </div>
        <div className="hand-head-actions">
          <span className="hand-fps">
            {hand.fps ? hand.fps + ' FPS' : '— FPS'}
            {hand.latency ? ' · ' + hand.latency + ' MS' : ''}
          </span>
          {handMode !== 'camera' && (
            <button className="icon-btn small" onClick={onStartCamera} title="开启摄像头" aria-label="开启摄像头">
              <Camera size={13} />
            </button>
          )}
          <button
            className="icon-btn small"
            onClick={() => setCamPanelOpen(false)}
            title="收起监视器"
            aria-label="收起监视器"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="hand-video">
        <video ref={videoRef} className="hand-video-el" muted playsInline />
        <canvas ref={canvasRef} className="hand-overlay" width={640} height={480} />
        <div className="video-vignette" />
        <div className="video-scan" />
        {!ready && (
          <div className="hand-empty">
            {handMode === 'off' || handInit === 'idle' ? (
              <>
                <div className="hand-empty-orbit">
                  <HandIcon size={26} />
                </div>
                <div className="hand-empty-title">让花读懂你的手</div>
                <div className="hand-empty-copy">开启摄像头；也可先用鼠标与快捷键浏览花境</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 开启摄像头
                  </button>
                </div>
              </>
            ) : handInit === 'initializing' ? (
              <>
                <span className="hand-loader" />
                <div className="hand-empty-title">正在加载 ML 引擎</div>
                <div className="hand-empty-copy">MediaPipe · Hand Gesture Recognizer</div>
              </>
            ) : (
              <>
                <div className="hand-empty-title">未能连接摄像头</div>
                <div className="hand-empty-copy">请检查权限，或关闭其他正在占用摄像头的程序</div>
                <div className="hand-empty-actions">
                  <button className="tiny-btn primary" onClick={onStartCamera}>
                    <Camera size={13} /> 重试
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {ready && hand.present && (
          <div className="ml-tag">
            <span>ML LIVE</span>
            <strong>{Math.round(hand.confidence * 100)}%</strong>
          </div>
        )}
      </div>

      <div className="hand-stats">
        <div>
          <span>来源</span>
          <strong>{hand.source}</strong>
        </div>
        <div>
          <span>引擎</span>
          <strong>{hand.engine}</strong>
        </div>
        <div>
          <span>延迟</span>
          <strong>{hand.latency ? hand.latency + ' ms' : '—'}</strong>
        </div>
      </div>

      <div className="gesture-strip">
        {GESTURES.slice(0, 4).map((g) => (
          <div
            key={g.id}
            className={`gesture-chip ${activeGesture === g.id || (g.id === 'open' && activeGesture === 'Open_Palm') || (g.id === 'fist' && activeGesture === 'Closed_Fist') || (g.id === 'victory' && activeGesture === 'Victory') || (g.id === 'thumb' && activeGesture === 'Thumb_Up') ? 'active' : ''}`}
            title={g.action}
          >
            <HandGlyph type={g.id} />
            <span>{g.title}</span>
          </div>
        ))}
      </div>

      {hand.holdProgress != null && (
        <div className="hold-meter">
          <div className="hold-copy">
            <span>{hand.holdName ?? '保持手势'}</span>
            <em>{Math.round(hand.holdProgress * 100)}%</em>
          </div>
          <div className="hold-track">
            <span style={{ width: hand.holdProgress * 100 + '%' }} />
          </div>
        </div>
      )}

      <div className="hand-foot">
        <span className="privacy-inline">本地推理 · 不上传视频</span>
        {ready ? (
          <div className="source-switch">
            <button onClick={onStartCamera}>开启摄像头</button>
            <i />
            <button onClick={onStop} className="danger">
              关闭
            </button>
          </div>
        ) : (
          <span className="hand-status-label">
            {handMode === 'camera' ? '摄像头模式' : '仅浏览'}
          </span>
        )}
      </div>
    </aside>
  )
}

export function GuideModal() {
  const panel = useApp((s) => s.panel)
  const closePanel = useApp((s) => s.closePanel)
  if (panel !== 'guide') return null
  return (
    <div className="modal-layer" onMouseDown={(e) => e.target === e.currentTarget && closePanel()}>
      <div className="modal guide-modal">
        <div className="modal-head">
          <div>
            <div className="modal-kicker">INTERACTION ATLAS · 交互图谱</div>
            <h2>手势指南</h2>
            <p>所有动作都由 MediaPipe 手部关键点实时驱动。保持 0.7 秒，即可完成一次切换。</p>
            <p className="guide-mode-note">实景 3DGS 模式下：双指 / 点赞 / 踩切换实景，左右拖拽沿真实拍摄轨迹巡游机位；花瓣绽放仅在「花境 · 互动」中可用。拖拽、手势、键盘、触屏可同时使用，灵敏度与减弱动效请在「设置 · 操控习惯」中调节。</p>
          </div>
          <button className="icon-btn" onClick={closePanel} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="guide-grid">
          {GESTURES.map((g) => (
            <article className="guide-card" key={g.id}>
              <div className="guide-glyph">
                <HandGlyph type={g.id} />
              </div>
              <div className="guide-copy">
                <div className="guide-head">
                  <h3>{g.title}</h3>
                  <span>{g.hold}</span>
                </div>
                <em>{g.en}</em>
                <strong>{g.action}</strong>
                <p>{g.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="modal-foot">
          <div className="shortcut-grid">
            {KEYBOARD_HINTS.map(([key, label]) => (
              <div key={key}>
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="modal-privacy">
            <Lock size={12} />
            摄像头帧由浏览器本地解析，不经过服务器
          </div>
        </div>
      </div>
    </div>
  )
}

export function GalleryModal() {
  const panel = useApp((s) => s.panel)
  const closePanel = useApp((s) => s.closePanel)
  const flowerIndex = useApp((s) => s.flowerIndex)
  const selectFlower = useApp((s) => s.selectFlower)
  const thumbnails = useApp((s) => s.thumbnails)
  if (panel !== 'gallery') return null
  return (
    <div className="modal-layer" onMouseDown={(e) => e.target === e.currentTarget && closePanel()}>
      <div className="modal gallery-modal">
        <div className="modal-head">
          <div>
            <div className="modal-kicker">FLORA CODEX · 程序化花谱</div>
            <h2>六种花，六种呼吸</h2>
            <p>每一片花瓣都由参数曲线在 Blender 中生长，并经过完整开花过程的穿模校验。</p>
          </div>
          <button className="icon-btn" onClick={closePanel} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="gallery-grid">
          {FLOWERS.map((f, i) => (
            <button
              key={f.id}
              className={`codex-card ${i === flowerIndex ? 'active' : ''}`}
              onClick={() => {
                selectFlower(i)
                closePanel()
              }}
              style={VarStyle({ '--card-accent': f.accent, '--card-accent2': f.accent2 })}
            >
              <div className="codex-image">
                <img
                  src={thumbnails[f.id] || f.preview}
                  alt={f.name}
                  draggable={false}
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).src = f.preview
                  }}
                />
                <div className="codex-image-shade" />
                <span className="codex-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="codex-season">{f.season}</span>
                {i === flowerIndex && <span className="codex-current">正在凝视</span>}
              </div>
              <div className="codex-copy">
                <div className="codex-title">
                  <h3>{f.name}</h3>
                  <em>{f.latin}</em>
                </div>
                <p className="codex-tagline">{f.tagline}</p>
                <p className="codex-poem">{f.poem}</p>
                <div className="codex-palette">
                  {f.palette.map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </div>
                <div className="codex-cta">
                  切换至此花 <ChevronRight size={13} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, onChange, disabled = false }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      className={`switch ${on ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onChange}
      aria-pressed={on}
      disabled={disabled}
    >
      <span />
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <div className="slider-wrap">
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <em>{value.toFixed(1)}×</em>
    </div>
  )
}

export function SettingsDrawer({
  onStartCamera,
  onStop,
  onToggleSound,
  onToggleFullscreen,
}: {
  onStartCamera: () => void
  onStop: () => void
  onToggleSound: () => void
  onToggleFullscreen: () => void
}) {
  const panel = useApp((s) => s.panel)
  const closePanel = useApp((s) => s.closePanel)
  const handMode = useApp((s) => s.handMode)
  const gestureControl = useApp((s) => s.gestureControl)
  const setGestureControl = useApp((s) => s.setGestureControl)
  const autoRotate = useApp((s) => s.autoRotate)
  const setAutoRotate = useApp((s) => s.setAutoRotate)
  const autoTour = useApp((s) => s.autoTour)
  const toggleAutoTour = useApp((s) => s.toggleAutoTour)
  const soundOn = useApp((s) => s.soundOn)
  const quality = useApp((s) => s.quality)
  const setQuality = useApp((s) => s.setQuality)
  const hideUI = useApp((s) => s.hideUI)
  const toggleHideUI = useApp((s) => s.toggleHideUI)
  const resetRot = useApp((s) => s.resetRot)
  const prefs = useApp((s) => s.prefs)
  const setPrefs = useApp((s) => s.setPrefs)
  if (panel !== 'settings') return null
  return (
    <div className="drawer-layer" onMouseDown={(e) => e.target === e.currentTarget && closePanel()}>
      <aside className="settings-drawer">
        <div className="drawer-head">
          <div>
            <div className="drawer-kicker">SYSTEM · 花境设置</div>
            <h2>设置</h2>
          </div>
          <button className="icon-btn" onClick={closePanel} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <section className="setting-section">
          <h3>视觉输入</h3>
          <p>MediaPipe 手部模型在浏览器内完成 21 点追踪。</p>
          <div className="segmented">
            <button className={handMode === 'camera' ? 'active' : ''} onClick={onStartCamera}>
              摄像头
            </button>
            <button className={handMode === 'off' ? 'active' : ''} onClick={onStop}>
              关闭 · 仅浏览
            </button>
          </div>
        </section>

        <section className="setting-section">
          <h3>交互</h3>
          <div className="setting-row">
            <div>
              <strong>手势控花</strong>
              <span>手掌开合直接影响花瓣形态</span>
            </div>
            <Toggle on={gestureControl} onChange={() => setGestureControl(!gestureControl)} />
          </div>
          <div className="setting-row">
            <div>
              <strong>自动旋转</strong>
              <span>{handMode === 'camera' ? '手势控制期间锁定，关闭摄像头后可开启' : '让花以自身 Y 轴缓缓游走'}</span>
            </div>
            <Toggle
              on={autoRotate}
              onChange={() => setAutoRotate(!autoRotate)}
              disabled={handMode === 'camera'}
            />
          </div>
          <div className="setting-row">
            <div>
              <strong>自动巡游</strong>
              <span>每 42 秒切换一重花境</span>
            </div>
            <Toggle on={autoTour} onChange={toggleAutoTour} />
          </div>
        </section>

        <section className="setting-section">
          <h3>操控习惯</h3>
          <p>拖拽、手势、键盘、触控可同时使用，按你的习惯调节。</p>
          <div className="setting-row column">
            <div>
              <strong>拖拽 / 滚轮灵敏度</strong>
              <span>鼠标、触控板与触屏巡游机位的速度</span>
            </div>
            <Slider
              value={prefs.dragSensitivity}
              min={0.3}
              max={2}
              step={0.1}
              label="拖拽灵敏度"
              onChange={(v) => setPrefs({ dragSensitivity: v })}
            />
          </div>
          <div className="setting-row column">
            <div>
              <strong>手势灵敏度</strong>
              <span>手幅小、离摄像头远可调高；容易误触可调低</span>
            </div>
            <Slider
              value={prefs.gestureSensitivity}
              min={0.3}
              max={2}
              step={0.1}
              label="手势灵敏度"
              onChange={(v) => setPrefs({ gestureSensitivity: v })}
            />
          </div>
          <div className="setting-row">
            <div>
              <strong>反转俯仰轴</strong>
              <span>习惯飞行模拟器式上下反向的用户可开启</span>
            </div>
            <Toggle on={prefs.invertLook} onChange={() => setPrefs({ invertLook: !prefs.invertLook })} />
          </div>
          <div className="setting-row">
            <div>
              <strong>减弱动效</strong>
              <span>关闭自动巡游与常驻呼吸摆动，减少晕动负担</span>
            </div>
            <Toggle on={prefs.reduceMotion} onChange={() => setPrefs({ reduceMotion: !prefs.reduceMotion })} />
          </div>
        </section>

        <section className="setting-section">
          <h3>呈现</h3>
          <div className="setting-row">
            <div>
              <strong>环境声音</strong>
              <span>生成式环境底噪与玻璃风铃</span>
            </div>
            <Toggle on={soundOn} onChange={onToggleSound} />
          </div>
          <div className="setting-row column">
            <div>
              <strong>渲染质量</strong>
              <span>高质量启用完整 Bloom 与 2× 像素密度</span>
            </div>
            <div className="segmented">
              <button className={quality === 'high' ? 'active' : ''} onClick={() => setQuality('high')}>
                高质量
              </button>
              <button
                className={quality === 'balanced' ? 'active' : ''}
                onClick={() => setQuality('balanced')}
              >
                平衡
              </button>
            </div>
          </div>
          <div className="setting-row">
            <div>
              <strong>隐藏界面</strong>
              <span>只留下花与花境，按 H 恢复</span>
            </div>
            <Toggle on={hideUI} onChange={toggleHideUI} />
          </div>
          <div className="setting-row action-row">
            <button className="drawer-action" onClick={resetRot}>
              <RotateCcw size={14} /> 复位姿态
            </button>
            <button className="drawer-action" onClick={onToggleFullscreen}>
              全屏花境
            </button>
          </div>
        </section>

        <section className="setting-section about">
          <h3>关于拈花</h3>
          <p>
            Blender 5.3 程序化花卉 · 6 种花型 / 6 个开花形态关键帧 · 全动画 BVH 穿模校验。
            环境由手写 GLSL 实时生成，不依赖贴图或视频素材。
          </p>
          <div className="about-signature">
            <span>BLOOM SENSE</span>
            <i />
            <span>2026</span>
          </div>
        </section>
      </aside>
    </div>
  )
}
