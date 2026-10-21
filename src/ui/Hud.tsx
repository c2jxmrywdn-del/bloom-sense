import { useMemo, useRef } from 'react'
import {
  BookOpen,
  Camera,
  Grid2X2,
  Lock,
  Maximize2,
  RotateCcw,
  Settings,
  Unlock,
  Volume2,
  VolumeX,
  Moon,
  Sparkles,
  Sun,
  Snowflake,
  Leaf,
  Trees,
  TreeDeciduous,
  Hand as HandIcon,
  X,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'
import type { CSSProperties, RefObject } from 'react'
import { ENVIRONMENTS, FLOWERS, GESTURES, REAL_SCENES } from '../data'
import { useApp } from '../store'

type Vars = CSSProperties & Record<string, string | number>

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="brand-mark" aria-hidden>
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="0.55" stopColor="#f2d2ae" />
          <stop offset="1" stopColor="var(--env-accent)" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#bm)" strokeWidth="2" strokeLinecap="round">
        <path d="M32 47c-8-5.5-12.5-12-12.5-19.5C19.5 19 25 13 32 13s12.5 6 12.5 14.5C44.5 35 40 41.5 32 47z" />
        <path d="M32 46c-2.2-8.4-2.2-15.7 0-25" />
        <path d="M32 29c-6.4-1-10.5-4.4-12.8-9.8 6.3-1 10.7 1 12.8 5.6" />
        <path d="M32 29c6.4-1 10.5-4.4 12.8-9.8-6.3-1-10.7 1-12.8 5.6" />
        <path d="M32 36c-4.4-.8-7.7-2.7-9.9-6.1 4.7-.8 8 .5 9.9 3.4" />
        <path d="M32 36c4.4-.8 7.7-2.7 9.9-6.1-4.7-.8-8 .5-9.9 3.4" />
      </g>
    </svg>
  )
}

export function HandGlyph({ type, className = '' }: { type: string; className?: string }) {
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 64 64" className={`hand-glyph ${className}`} aria-hidden>
      <circle cx="32" cy="34" r="27" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1" />
      <g {...stroke}>
        {type === 'open' && (
          <>
            <path d="M20 32c-4-2-6-5-6-8 0-2 1.6-3 3.4-2.4C20 22.8 22 26 24 28" />
            <path d="M24 28V15.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V28" />
            <path d="M30.4 28V12.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V28" />
            <path d="M36.8 28V15.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V29" />
            <path d="M43.2 29V21c0-1.9 1.4-3.3 3-3.3 1.7 0 3 1.4 3 3.3v10.6C49 40 43 48 33 48" />
            <path d="M24 28c-1.5 3.8-1.6 8.3-.2 12.3 2 5.1 6.6 8 12.7 7.7 7-.3 11.4-5.2 11.4-12" />
          </>
        )}
        {type === 'fist' && (
          <>
            <path d="M18 31c0-4 3-7 7-7h14c4 0 7 3 7 7v7c0 7-5 12-12 12h-4c-7 0-12-5-12-12z" />
            <path d="M20 30c2.2-4.5 5.2-6.8 9-6.8M30 23.2c2.6-2.3 5.2-2.9 7.8-1.8M37.8 21.4c2.8.2 5 1.7 6.4 4.2" />
            <path d="M22 28.5c0-2 1.5-3.4 3.5-3.4M29 25.2c0-1.8 1.4-3.1 3.2-3.1M36 22.4c0-1.7 1.3-3 3-3" />
            <path d="M23 38h15" />
          </>
        )}
        {type === 'victory' && (
          <>
            <path d="M24 30c-3-1.8-5-4.2-5-6.6 0-1.7 1.3-2.6 2.8-2.1 2 0.7 3.7 3.2 5.2 5" />
            <path d="M27 27 18.5 13.8c-1-1.7-.5-3.6 1-4.4 1.5-.8 3.2-.2 4.3 1.5l10 15" />
            <path d="M33.5 26 42 11.5c1-1.8 2.8-2.3 4.3-1.4 1.4.9 1.8 2.8.7 4.5l-9.8 17" />
            <path d="M27 28c-1.6 4.1-1.3 8.7.6 12.5 2.8 5.3 8 7.5 14 6.4 6.2-1.1 10-6.2 9.2-12.8" />
          </>
        )}
        {type === 'thumb' && (
          <>
            <path d="M23 34c0-4 3-7 7-7h13c4 0 7 3 7 7v5c0 7-5 12-12 12h-3c-7 0-12-5-12-12z" />
            <path d="M23 33c-3.8-.3-7-2.2-7-6.2 0-3.6 2.6-6 6.1-6 2.7 0 4.9 1.2 6.9 3.8l4 5.2" />
            <path d="M24 29c-3.5 0-6.5-1.7-8.5-4.7" />
            <path d="M28 38h13" />
          </>
        )}
        {type === 'point' && (
          <>
            <path d="M23 36c0-4 3-7 7-7h13c4 0 7 3 7 7v4c0 7-5 12-12 12h-3c-7 0-12-5-12-12z" />
            <path d="M27 29V13.2c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V29" />
            <path d="M33.4 29V22c0-1.9 1.4-3.4 3-3.4 1.7 0 3 1.5 3 3.4v7" />
            <path d="M23 33c-3.6-.4-6.5-2.1-8-5" />
          </>
        )}
        {type === 'tilt' && (
          <>
            <path d="M20 32c-4-2-6-5-6-8 0-2 1.6-3 3.4-2.4C20 22.8 22 26 24 28" />
            <path d="M24 28V15.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V28" />
            <path d="M30.4 28V12.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V28" />
            <path d="M36.8 28V15.5c0-2 1.4-3.5 3.2-3.5s3.2 1.5 3.2 3.5V29" />
            <path d="M43.2 29V21c0-1.9 1.4-3.3 3-3.3 1.7 0 3 1.4 3 3.3v10.6C49 40 43 48 33 48" />
            <path d="M9 42h8m-8 0 3-3m-3 3 3 3" />
            <path d="M55 42h-6m6 0-3-3m3 3-3 3" />
          </>
        )}
        {type === 'pinch' && (
          <>
            <circle cx="27.5" cy="26" r="5.2" />
            <path d="M17.6 27.4c-2.6-1-4.2-2.8-5-5.2" />
            <path d="M31.6 22.4c1.6-3.4 3.8-6.2 6.6-8" />
            <path d="M33.4 27.6c3.2-1.4 6.6-2.2 10.2-2.2" />
            <path d="M32.8 31.6c3.6.4 7 1.4 10 3" />
            <path d="M30 35.6c2.4 1.8 4.2 4.2 5.2 7" />
            <path d="M24.6 31.2c-1 2.6-1.2 5.4-.6 8.4.8 4.4 4 7.4 8.6 8.2" />
            <path d="M14 20l-2.6-2m2.6 2 .4-3.2" />
          </>
        )}
      </g>
    </svg>
  )
}

function VarStyle(vars: Record<string, string | number>): CSSProperties {
  return vars as Vars
}

export function Header({
  onToggleSound,
  onToggleFullscreen,
  onCameraClick,
  cameraLive,
}: {
  onToggleSound: () => void
  onToggleFullscreen: () => void
  onCameraClick: () => void
  cameraLive: boolean
}) {
  const soundOn = useApp((s) => s.soundOn)
  const panel = useApp((s) => s.panel)
  const togglePanel = useApp((s) => s.togglePanel)
  const camPanelOpen = useApp((s) => s.camPanelOpen)
  const setCamPanelOpen = useApp((s) => s.setCamPanelOpen)
  return (
    <header className="hud header">
      <div className="brand">
        <BrandMark />
        <div className="brand-type">
          <div className="brand-cn">拈花</div>
          <div className="brand-en">BLOOM SENSE</div>
        </div>
        <div className="brand-rule" />
        <div className="brand-meta">
          INTERACTIVE
          <br />
          FLORA · 2026
        </div>
      </div>
      <div className="header-actions">
        <button
          className={`icon-btn ${panel === 'guide' ? 'active' : ''}`}
          onClick={() => togglePanel('guide')}
          title="手势指南"
          aria-label="手势指南"
        >
          <BookOpen size={17} />
        </button>
        <button
          className={`icon-btn ${panel === 'gallery' ? 'active' : ''}`}
          onClick={() => togglePanel('gallery')}
          title="花谱"
          aria-label="花谱"
        >
          <Grid2X2 size={17} />
        </button>
        <button
          className={`icon-btn camera-btn ${camPanelOpen ? 'active' : ''} ${cameraLive ? 'camera-live' : ''}`}
          onClick={onCameraClick}
          title={cameraLive ? '摄像头实时识别中' : '开启摄像头实时指令'}
          aria-label="开启摄像头实时指令"
        >
          <Camera size={17} />
        </button>
        <span className="header-sep" />
        <button className="icon-btn" onClick={onToggleSound} title={soundOn ? '静音' : '开启声音'} aria-label="声音">
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <button className="icon-btn" onClick={onToggleFullscreen} title="全屏" aria-label="全屏">
          <Maximize2 size={16} />
        </button>
        <button
          className={`icon-btn ${panel === 'settings' ? 'active' : ''}`}
          onClick={() => togglePanel('settings')}
          title="设置"
          aria-label="设置"
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  )
}

export function StageSwitch() {
  const stageMode = useApp((s) => s.stageMode)
  const setStageMode = useApp((s) => s.setStageMode)
  return (
    <div className="hud stage-switch glass" role="tablist" aria-label="展示模式">
      <button
        role="tab"
        aria-selected={stageMode === 'real'}
        className={stageMode === 'real' ? 'on' : ''}
        onClick={() => setStageMode('real')}
        title="写实 3DGS 实景扫描"
      >
        <span className="stage-switch-dot" />
        实景 · 3DGS
      </button>
      <button
        role="tab"
        aria-selected={stageMode === 'atelier'}
        className={stageMode === 'atelier' ? 'on' : ''}
        onClick={() => setStageMode('atelier')}
        title="可手势绽放的数字花境"
      >
        <Sparkles size={13} />
        花境 · 互动
      </button>
    </div>
  )
}

export function RealTitleBlock() {
  const realIndex = useApp((s) => s.realIndex)
  const scene = REAL_SCENES[realIndex]
  return (
    <div className="hud title-block real-title">
      <div className="eyebrow">
        <span>实景扫描</span>
        <span className="eyebrow-index">0{realIndex + 1} / 0{REAL_SCENES.length}</span>
        <span className="eyebrow-line" />
        <span>3D GAUSSIAN SPLATTING</span>
      </div>
      <h1>{scene.name}</h1>
      <div className="latin">{scene.latin}</div>
      <div className="flower-mood">
        <span className="mood-dot" />
        <span>{scene.tagline}</span>
      </div>
      <p className="real-desc">{scene.description}</p>
    </div>
  )
}

export function RealDock() {
  const realIndex = useApp((s) => s.realIndex)
  const selectReal = useApp((s) => s.selectReal)
  return (
    <aside className="hud real-dock">
      <div className="real-dock-head">
        <span>REAL SCANS</span>
        <em>3DGS · LIVE</em>
      </div>
      <div className="real-cards">
        {REAL_SCENES.map((scene, i) => (
          <button
            key={scene.id}
            className={`real-card ${i === realIndex ? 'on' : ''}`}
            onClick={() => selectReal(i)}
            style={VarStyle({ '--real-accent': scene.accent })}
          >
            <span className="real-card-index">0{i + 1}</span>
            <span className="real-card-copy">
              <strong>{scene.name}</strong>
              <em>{scene.en}</em>
            </span>
            <span className="real-card-splats">{scene.splats}</span>
          </button>
        ))}
      </div>
      <div className="real-dock-foot">
        左右拖拽 = 沿拍摄轨迹巡游 · 上下 = 俯仰 · 滚轮推近
      </div>
    </aside>
  )
}

export function RealHint() {
  const realIndex = useApp((s) => s.realIndex)
  return (
    <div className="hud footer-hint real-hint">
      <span className="key-cap">1 – 3</span> 实景
      <span className="hint-sep">·</span>
      <span className="key-cap">V</span> 切换模式
      <span className="hint-sep">·</span>
      <span className="key-cap">H</span> 隐藏界面
      <span className="hint-sep">·</span>
      <span>拖拽环绕 · 右键平移 · 滚轮缩放 · 双击归位</span>
      <span className="hint-sep">·</span>
      <span className="real-hint-credit">{REAL_SCENES[realIndex].source}</span>
    </div>
  )
}

export function TitleBlock() {
  const flowerIndex = useApp((s) => s.flowerIndex)
  const bloomActual = useApp((s) => s.bloomActual)
  const flower = FLOWERS[flowerIndex]
  const state = bloomActual < 0.22 ? '含苞' : bloomActual < 0.62 ? '初绽' : bloomActual < 0.9 ? '舒展' : '盛放'
  return (
    <div className="hud title-block">
      <div className="eyebrow">
        <span>花谱</span>
        <span className="eyebrow-index">
          {String(flowerIndex + 1).padStart(2, '0')} / {String(FLOWERS.length).padStart(2, '0')}
        </span>
        <span className="eyebrow-line" />
        <span>{flower.season}</span>
      </div>
      <h1>{flower.name}</h1>
      <div className="latin">{flower.latin}</div>
      <div className="flower-mood">
        <span className="mood-dot" />
        {state}
        <span className="mood-sep">·</span>
        <span>{flower.tagline}</span>
      </div>
    </div>
  )
}

export function AxisDeck() {
  const baseRot = useApp((s) => s.baseRot)
  const locks = useApp((s) => s.locks)
  const autoRotate = useApp((s) => s.autoRotate)
  const handMode = useApp((s) => s.handMode)
  const setBaseRot = useApp((s) => s.setBaseRot)
  const toggleLock = useApp((s) => s.toggleLock)
  const setAutoRotate = useApp((s) => s.setAutoRotate)
  const resetRot = useApp((s) => s.resetRot)
  const spinLocked = handMode === 'camera'
  const axes = [
    { key: 'x' as const, label: 'X', color: '#ff9b9b', desc: '俯仰' },
    { key: 'y' as const, label: 'Y', color: '#8fe3c0', desc: '左右' },
    { key: 'z' as const, label: 'Z', color: '#e6c88a', desc: '翻转' },
  ]
  return (
    <aside className="hud axis-deck glass">
      <div className="panel-head">
        <div>
          <div className="panel-title">姿态轴</div>
          <div className="panel-en">ORIENTATION</div>
        </div>
        <div className="axis-mini">X · Y · Z</div>
      </div>
      <div className="axis-rows">
        {axes.map((axis) => (
          <div
            className={`axis-row ${locks[axis.key] ? 'locked' : ''}`}
            key={axis.key}
            style={VarStyle({ '--axis-color': axis.color })}
          >
            <div className="axis-label">
              <span>{axis.label}</span>
              <small>{axis.desc}</small>
            </div>
            <input
              className="axis-range"
              type="range"
              min={-60}
              max={60}
              step={1}
              value={baseRot[axis.key]}
              onChange={(e) => setBaseRot(axis.key, Number(e.target.value))}
              aria-label={`${axis.label} 轴旋转`}
            />
            <div className="axis-value">{Math.round(baseRot[axis.key])}°</div>
            <button
              className={`lock-btn ${locks[axis.key] ? 'on' : ''}`}
              onClick={() => toggleLock(axis.key)}
              title={locks[axis.key] ? '解锁' : '锁定'}
              aria-label={locks[axis.key] ? '解锁轴' : '锁定轴'}
            >
              {locks[axis.key] ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
          </div>
        ))}
      </div>
      <div className="axis-actions">
        <button
          className={`mini-toggle ${autoRotate && !spinLocked ? 'on' : ''} ${spinLocked ? 'locked' : ''}`}
          onClick={() => {
            if (spinLocked) {
              useApp.getState().pushToast('手势控制中 · 自由旋转已锁定', 'muted')
              return
            }
            setAutoRotate(!autoRotate)
          }}
          title={spinLocked ? '手势控制期间锁定自由旋转' : '自动旋转'}
        >
          <span className="toggle-dot" />
          {spinLocked ? '自转已锁定' : '自动旋转'}
        </button>
        <button className="mini-btn" onClick={resetRot}>
          <RotateCcw size={13} /> 归零
        </button>
      </div>
      <p className="panel-note">
        {spinLocked ? '手势控制中自由旋转已锁定；倾斜手掌微调 X·Y·Z，捏合后可拖转整支花。' : '手掌左右 / 上下 / 翻转，控制 X·Y·Z；锁住不想动的轴。'}
      </p>
    </aside>
  )
}

const ENV_ICONS = {
  studio: Leaf,
  bamboo: Trees,
  moon: Moon,
  cosmic: Sparkles,
  dawn: Sun,
  amber: TreeDeciduous,
  aurora: Snowflake,
}

export function EnvDock() {
  const envIndex = useApp((s) => s.envIndex)
  const selectEnv = useApp((s) => s.selectEnv)
  const autoTour = useApp((s) => s.autoTour)
  const toggleAutoTour = useApp((s) => s.toggleAutoTour)
  return (
    <aside className="hud env-dock glass">
      <div className="panel-head">
        <div>
          <div className="panel-title">花境</div>
          <div className="panel-en">SEVEN REALMS</div>
        </div>
        <div className="env-count">0{envIndex + 1}</div>
      </div>
      <div className="env-list">
        {ENVIRONMENTS.map((env, i) => {
          const Icon = ENV_ICONS[env.id]
          return (
            <button
              key={env.id}
              className={`env-item ${envIndex === i ? 'active' : ''}`}
              style={VarStyle({ '--env-color': env.accent, '--env-chip': env.chip })}
              onClick={() => selectEnv(i)}
            >
              <span className="env-orb">
                <Icon size={15} />
              </span>
              <span className="env-copy">
                <strong>{env.name}</strong>
                <em>{env.en}</em>
              </span>
              <span className="env-index">0{i + 1}</span>
            </button>
          )
        })}
      </div>
      <div className="auto-tour-row">
        <div>
          <div className="auto-tour-label">自动巡游</div>
          <div className="auto-tour-sub">每 42 秒，换一重花境</div>
        </div>
        <button className={`switch ${autoTour ? 'on' : ''}`} onClick={toggleAutoTour} aria-label="自动巡游">
          <span />
        </button>
      </div>
      <p className="panel-note">点赞手势 👍 也可以切换花境。</p>
    </aside>
  )
}

export function GalleryRail() {
  const flowerIndex = useApp((s) => s.flowerIndex)
  const selectFlower = useApp((s) => s.selectFlower)
  const thumbnails = useApp((s) => s.thumbnails)
  const togglePanel = useApp((s) => s.togglePanel)
  return (
    <section className="hud gallery-rail glass">
      <div className="rail-head">
        <div className="rail-title">
          花谱 <span>FLORA CODEX</span>
        </div>
        <button className="rail-open" onClick={() => togglePanel('gallery')}>
          展开全谱 <ArrowRight size={12} />
        </button>
      </div>
      <div className="rail-cards">
        {FLOWERS.map((flower, i) => (
          <button
            key={flower.id}
            className={`flower-card ${i === flowerIndex ? 'active' : ''}`}
            onClick={() => selectFlower(i)}
            style={VarStyle({ '--card-accent': flower.accent, '--card-accent2': flower.accent2 })}
            title={flower.tagline}
          >
            <span className="card-thumb">
              <img
                src={thumbnails[flower.id] || flower.preview}
                alt={flower.name}
                draggable={false}
                onError={(e) => {
                  ;(e.currentTarget as HTMLImageElement).src = flower.preview
                }}
              />
              <span className="card-index">0{i + 1}</span>
              <span className="card-shade" />
            </span>
            <span className="card-copy">
              <strong>{flower.short}</strong>
              <em>{flower.latin.split(' ')[0]}</em>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export function BloomDial({ markUiBloom }: { markUiBloom: () => void }) {
  const bloomTarget = useApp((s) => s.bloomTarget)
  const bloomActual = useApp((s) => s.bloomActual)
  const setBloom = useApp((s) => s.setBloom)
  const flowerIndex = useApp((s) => s.flowerIndex)
  const gestureControl = useApp((s) => s.gestureControl)
  const setGestureControl = useApp((s) => s.setGestureControl)
  const handPresent = useApp((s) => s.handStatus.present)
  const handMode = useApp((s) => s.handMode)
  const flower = FLOWERS[flowerIndex]
  const dragging = useRef(false)
  const dialRef = useRef<HTMLDivElement>(null)
  const radius = 61
  const circumference = 2 * Math.PI * radius

  const updateFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = dialRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    let angle = Math.atan2(y, x) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    const progress = angle / (Math.PI * 2)
    setBloom(progress, 'ui')
    markUiBloom()
  }

  return (
    <section className="hud bloom-dial glass">
      <div className="panel-head compact">
        <div>
          <div className="panel-title">绽放</div>
          <div className="panel-en">BLOOM CONTROL</div>
        </div>
        <div className={`ml-mini ${handPresent ? 'live' : ''}`}>
          <span />
          {handPresent ? 'LIVE' : handMode === 'off' ? 'MANUAL' : 'WAIT'}
        </div>
      </div>
      <div
        className="dial-wrap"
        ref={dialRef}
        onPointerDown={(e) => {
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          updateFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (dragging.current) updateFromPointer(e)
        }}
        onPointerUp={(e) => {
          dragging.current = false
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {}
        }}
        onPointerCancel={() => (dragging.current = false)}
        role="slider"
        aria-label="花朵绽放度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(bloomTarget * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            setBloom(Math.min(1, bloomTarget + 0.05), 'ui')
            markUiBloom()
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            setBloom(Math.max(0, bloomTarget - 0.05), 'ui')
            markUiBloom()
          }
        }}
      >
        <svg viewBox="0 0 160 160" className="dial-svg">
          <defs>
            <linearGradient id={`bloomGrad${flowerIndex}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={flower.accent2} />
              <stop offset="0.55" stopColor={flower.accent} />
              <stop offset="1" stopColor="#f2d7b8" />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="2.5" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i / 36) * Math.PI * 2 - Math.PI / 2
            const inner = i % 3 === 0 ? 69 : 72
            return (
              <line
                key={i}
                x1={80 + Math.cos(a) * inner}
                y1={80 + Math.sin(a) * inner}
                x2={80 + Math.cos(a) * 75}
                y2={80 + Math.sin(a) * 75}
                stroke="rgba(255,255,255,.15)"
                strokeWidth="1"
              />
            )
          })}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={`url(#bloomGrad${flowerIndex})`}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - bloomActual)}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            opacity=".35"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={`url(#bloomGrad${flowerIndex})`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - bloomTarget)}
            strokeLinecap="round"
            transform="rotate(-90 80 80)"
            className="dial-progress"
          />
          {(() => {
            const a = bloomTarget * Math.PI * 2 - Math.PI / 2
            return (
              <circle
                cx={80 + Math.cos(a) * radius}
                cy={80 + Math.sin(a) * radius}
                r="4"
                fill="#fff8ec"
                className="dial-knob"
              />
            )
          })()}
        </svg>
        <div className="dial-center">
          <div className="dial-number">{Math.round(bloomTarget * 100)}<small>%</small></div>
          <div className="dial-label">绽放度</div>
          <div className="dial-src">{handPresent && gestureControl ? '手势同步' : '拖动调节'}</div>
        </div>
      </div>
      <div className="dial-actions">
        <button
          className="dial-quick"
          onClick={() => {
            setBloom(0.035, 'ui')
            markUiBloom()
          }}
        >
          含苞
        </button>
        <button
          className="dial-quick primary"
          onClick={() => {
            setBloom(1, 'ui')
            markUiBloom()
          }}
        >
          盛放
        </button>
      </div>
      <div className="gesture-link-row">
        <span>
          <HandIcon size={12} /> 手势控花
        </span>
        <button
          className={`switch small ${gestureControl ? 'on' : ''}`}
          onClick={() => setGestureControl(!gestureControl)}
          aria-label="手势控花"
        >
          <span />
        </button>
      </div>
    </section>
  )
}

export function ActionFlash() {
  const pulse = useApp((s) => s.actionPulse)
  if (!pulse) return null
  const glyph = pulse.kind === 'flower' ? '花' : pulse.kind === 'env' ? '境' : pulse.kind === 'rotate' ? '旋' : '绽'
  return (
    <div className="action-flash" key={pulse.id} style={VarStyle({ '--pulse-accent': pulse.accent })}>
      <div className="pulse-ring">
        <span>{glyph}</span>
      </div>
      <div className="pulse-copy">
        <strong>{pulse.title}</strong>
        {pulse.sub && <em>{pulse.sub}</em>}
      </div>
    </div>
  )
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div className={`toast ${t.tone ?? 'accent'}`} key={t.id}>
          <span className="toast-dot" />
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function TransitionVeil({ label, en, accent }: { label: string; en: string; accent: string }) {
  return (
    <div className="env-veil" style={VarStyle({ '--veil-accent': accent })}>
      <div className="veil-inner">
        <div className="veil-orb">
          <span />
          <span />
          <span />
        </div>
        <div className="veil-label">正在进入</div>
        <div className="veil-name">{label}</div>
        <div className="veil-en">{en}</div>
      </div>
    </div>
  )
}

export function HideRestore() {
  const hideUI = useApp((s) => s.hideUI)
  const toggleHideUI = useApp((s) => s.toggleHideUI)
  if (!hideUI) return null
  return (
    <button className="hide-restore glass" onClick={toggleHideUI}>
      <Eye size={15} /> 显示界面 <kbd>H</kbd>
    </button>
  )
}

export function FooterHint() {
  return (
    <div className="hud footer-hint">
      <span>拖拽旋转</span>
      <i />
      <span>滚轮缩放</span>
      <i />
      <span><kbd>Space</kbd> 开合</span>
      <i />
      <span><kbd>1–6</kbd> 换花</span>
      <i />
      <span><kbd>Q W E R T Y U</kbd> 换境</span>
    </div>
  )
}
