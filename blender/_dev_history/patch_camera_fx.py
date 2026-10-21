# -*- coding: utf-8 -*-
# Real-time camera commands + calmer, detail-first lighting.

def edit(path, pairs, required=True):
    s = open(path, encoding='utf-8').read()
    for a, b in pairs:
        if a not in s:
            print('MISS', path, a[:70])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)

edit('src/store.ts', [
    ("  fps: number\n  holdProgress: number | null", "  fps: number\n  latency: number\n  command: string\n  holdProgress: number | null"),
    ("    confidence: 0,\n    fps: 0,\n    holdProgress: null,", "    confidence: 0,\n    fps: 0,\n    latency: 0,\n    command: '待命',\n    holdProgress: null,"),
])

edit('src/hands/HandController.ts', [
    ("const LABELS: Record<string, string> = {",
     "const COMMANDS: Record<string, string> = {\n  None: '待命',\n  Open_Palm: '花朵绽放',\n  Closed_Fist: '花朵合拢',\n  Victory: '切换花型',\n  Thumb_Up: '切换花境',\n  Thumb_Down: '回溯花境',\n  Pointing_Up: '自动旋转',\n  ILoveYou: '自动巡游',\n}\n\nconst LABELS: Record<string, string> = {"),
    ("  private lastBloomAt = 0\n  private engineLabel = 'MediaPipe · GPU'",
     "  private lastBloomAt = 0\n  private latencyAvg = 0\n  private reportedGesture = 'None'\n  private lastReportedAt = 0\n  private openMin = 1.35\n  private openMax = 2.35\n  private engineLabel = 'MediaPipe · GPU'"),
    ("      useApp.getState().updateHandStatus({\n        source: mode === 'camera' ? '摄像头 · 实时' : '示例视频 · 实时推理',\n        engine: this.engineLabel,\n        gesture: '等待手掌',\n        gestureId: 'None',\n      })",
     "      useApp.getState().updateHandStatus({\n        source: mode === 'camera' ? '摄像头 · 实时' : '示例视频 · 实时推理',\n        engine: this.engineLabel,\n        gesture: '等待手掌',\n        gestureId: 'None',\n        command: '将手掌放入画面',\n        latency: 0,\n      })"),
    ("      gesture: '已关闭',\n      gestureId: 'None',\n      confidence: 0,\n      fps: 0,",
     "      gesture: '已关闭',\n      gestureId: 'None',\n      confidence: 0,\n      fps: 0,\n      latency: 0,\n      command: '已关闭',\n      holdProgress: null,\n      holdName: null,"),
    ("    if (now - this.lastInfer < 27) return\n    this.lastInfer = now",
     "    const inferInterval = this.latencyAvg > 19 ? 33 : 22\n    if (now - this.lastInfer < inferInterval) return\n    this.lastInfer = now"),
    ("    let result: any = null\n    try {\n      result = this.recognizer.recognizeForVideo(video, now)\n    } catch (err) {\n      console.warn('[BloomSense] inference error', err)\n      return\n    }\n    this.handleResult(result, now, fpsDt)",
     "    let result: any = null\n    const inferStart = performance.now()\n    try {\n      result = this.recognizer.recognizeForVideo(video, now)\n    } catch (err) {\n      console.warn('[BloomSense] inference error', err)\n      return\n    }\n    const inferMs = performance.now() - inferStart\n    this.latencyAvg = this.latencyAvg ? this.latencyAvg * 0.8 + inferMs * 0.2 : inferMs\n    this.handleResult(result, now, fpsDt)"),
    ("          gesture: '等待手掌',\n          gestureId: 'None',\n          confidence: 0,\n          fps: avgFps,\n          holdProgress: null,\n          holdName: null,",
     "          gesture: '等待手掌',\n          gestureId: 'None',\n          confidence: 0,\n          fps: avgFps,\n          latency: Math.round(this.latencyAvg),\n          command: '将手掌放入画面',\n          holdProgress: null,\n          holdName: null,"),
    ("    if (bestScore < 0.5) {\n      best = 'None'\n      bestScore = 0\n    } else {\n      this.stableGesture = best\n    }",
     "    if (bestScore < 0.5) {\n      best = 'None'\n      bestScore = 0\n    }\n\n    // Geometric fusion: when the CNN is uncertain, use per-finger extension\n    // to recover the four core poses. This makes the controller resilient\n    // to lighting and camera angle without a second heavy model.\n    const ext = (tip: number, pip: number) =>\n      dist2(landmarks[tip], landmarks[0], aspect) > dist2(landmarks[pip], landmarks[0], aspect) * 1.055\n    const fIndex = ext(8, 6)\n    const fMiddle = ext(12, 10)\n    const fRing = ext(16, 14)\n    const fPinky = ext(20, 18)\n    let heuristic = 'None'\n    if (fIndex && fMiddle && fRing && fPinky) heuristic = 'Open_Palm'\n    else if (!fIndex && !fMiddle && !fRing && !fPinky) heuristic = 'Closed_Fist'\n    else if (fIndex && fMiddle && !fRing && !fPinky) heuristic = 'Victory'\n    else if (fIndex && !fMiddle && !fRing && !fPinky) heuristic = 'Pointing_Up'\n    if (heuristic !== 'None') {\n      this.smoothScores[heuristic] = Math.max(this.smoothScores[heuristic] ?? 0, 0.58)\n      if (bestScore < 0.55) {\n        best = heuristic\n        bestScore = 0.58\n      }\n    }\n    if (best !== 'None') this.stableGesture = best"),
    ("    const openNorm = smoothstep((opennessRaw - 1.45) / 1.02)\n    const smoothedOpen = this.openness.push(openNorm, dt / 1000)\n    live.openness = smoothedOpen\n\n    let bloomTarget: number | null = null\n    if (best === 'Open_Palm') bloomTarget = 0.86 + smoothedOpen * 0.14\n    else if (best === 'Closed_Fist') bloomTarget = 0.035\n    else if (best !== 'None') bloomTarget = smoothedOpen * 0.94\n    else bloomTarget = smoothedOpen * 0.85\n    live.bloomFromHand = bloomTarget\n    if (store.gestureControl && !this.isUiOverride(now) && now - this.lastBloomAt > 90) {\n      this.lastBloomAt = now\n      store.setBloom(bloomTarget, 'gesture')\n    }",
     "    // Adaptive signal calibration: learn the user's own open/fist range,\n    // then map it smoothly to 0..1. This is the continuous regression layer.\n    this.openMin = Math.min(Math.max(0.85, this.openMin + 0.00022), opennessRaw)\n    this.openMax = Math.max(Math.min(3.2, this.openMax - 0.00022), opennessRaw)\n    const span = Math.max(0.32, this.openMax - this.openMin)\n    const openNorm = smoothstep((opennessRaw - this.openMin) / span)\n    const smoothedOpen = this.openness.push(openNorm, dt / 1000)\n    live.openness = smoothedOpen\n\n    let bloomTarget: number | null = null\n    if (best === 'Closed_Fist') bloomTarget = 0.03\n    else if (best === 'Open_Palm' || best === 'None') bloomTarget = smoothedOpen\n    live.bloomFromHand = bloomTarget\n    if (bloomTarget != null && store.gestureControl && !this.isUiOverride(now) && now - this.lastBloomAt > 55) {\n      this.lastBloomAt = now\n      store.setBloom(bloomTarget, 'gesture')\n    }"),
    ("    if (now - this.lastStatusAt > 140) {\n      this.lastStatusAt = now\n      store.updateHandStatus({\n        present: true,\n        gesture: LABELS[best] ?? best,\n        gestureId: best,\n        confidence: bestScore,\n        fps: avgFps,\n      })\n    }",
     "    const command = COMMANDS[best] ?? '待命'\n    if (best !== this.reportedGesture && now - this.lastReportedAt > 120) {\n      this.reportedGesture = best\n      this.lastReportedAt = now\n      store.updateHandStatus({\n        present: true,\n        gesture: LABELS[best] ?? best,\n        gestureId: best,\n        command,\n        confidence: bestScore,\n        fps: avgFps,\n        latency: Math.round(this.latencyAvg),\n      })\n    }\n    if (now - this.lastStatusAt > 140) {\n      this.lastStatusAt = now\n      store.updateHandStatus({\n        present: true,\n        gesture: LABELS[best] ?? best,\n        gestureId: best,\n        command,\n        confidence: bestScore,\n        fps: avgFps,\n        latency: Math.round(this.latencyAvg),\n      })\n    }"),
    ("    const accent = FLOWERS[useApp.getState().flowerIndex].accent", "    const accent = '#b9f26e'"),
])

edit('src/ui/Hud.tsx', [
    ("export function Header({\n  onToggleSound,\n  onToggleFullscreen,\n}: {\n  onToggleSound: () => void\n  onToggleFullscreen: () => void\n}) {",
     "export function Header({\n  onToggleSound,\n  onToggleFullscreen,\n  onCameraClick,\n  cameraLive,\n}: {\n  onToggleSound: () => void\n  onToggleFullscreen: () => void\n  onCameraClick: () => void\n  cameraLive: boolean\n}) {"),
    ("        <button\n          className={`icon-btn ${camPanelOpen ? 'active' : ''}`}\n          onClick={() => setCamPanelOpen(!camPanelOpen)}\n          title=\"手势监视器\"\n          aria-label=\"手势监视器\"\n        >\n          <Camera size={17} />\n        </button>",
     "        <button\n          className={`icon-btn camera-btn ${camPanelOpen ? 'active' : ''} ${cameraLive ? 'camera-live' : ''}`}\n          onClick={onCameraClick}\n          title={cameraLive ? '摄像头实时识别中' : '开启摄像头实时指令'}\n          aria-label=\"开启摄像头实时指令\"\n        >\n          <Camera size={17} />\n        </button>"),
])

edit('src/App.tsx', [
    ("import { useCallback, useEffect, useMemo, useRef, useState } from 'react'", "import { useCallback, useEffect, useMemo, useRef, useState } from 'react'\nimport { Camera } from 'lucide-react'"),
    ("  const hideUI = useApp((s) => s.hideUI)\n  const autoTour = useApp((s) => s.autoTour)",
     "  const hideUI = useApp((s) => s.hideUI)\n  const autoTour = useApp((s) => s.autoTour)\n  const handMode = useApp((s) => s.handMode)\n  const handInit = useApp((s) => s.handInit)\n  const handStatus = useApp((s) => s.handStatus)"),
    ("  const startCamera = useCallback(async () => {\n    try {\n      await tracking.start('camera')\n      useApp.getState().pushToast('摄像头已连接 · 本地推理中')\n    } catch (err) {\n      useApp.getState().pushToast('无法打开摄像头，已使用示例影像', 'warn')\n      try {\n        await tracking.start('demo')\n      } catch {}\n    }\n  }, [tracking])",
     "  const startCamera = useCallback(async () => {\n    const s = useApp.getState()\n    if (s.handMode === 'camera' && s.handInit === 'initializing') return\n    s.setCamPanelOpen(true)\n    s.pushToast('正在请求摄像头权限…', 'muted')\n    try {\n      await tracking.start('camera')\n      useApp.getState().pushToast('摄像头已连接 · 实时指令已开启')\n    } catch (err) {\n      useApp.getState().pushToast('无法打开摄像头，已使用示例影像', 'warn')\n      try {\n        await tracking.start('demo')\n      } catch {}\n    }\n  }, [tracking])\n\n  const handleCameraClick = useCallback(() => {\n    const s = useApp.getState()\n    if (s.handMode === 'camera') {\n      s.setCamPanelOpen(!s.camPanelOpen)\n      return\n    }\n    startCamera()\n  }, [startCamera])"),
    ("          <Header onToggleSound={toggleSound} onToggleFullscreen={toggleFullscreen} />",
     "          <Header\n            onToggleSound={toggleSound}\n            onToggleFullscreen={toggleFullscreen}\n            onCameraClick={handleCameraClick}\n            cameraLive={handMode === 'camera'}\n          />\n          <button\n            className={`camera-cta ${handMode === 'camera' ? 'live' : ''}`}\n            onClick={handleCameraClick}\n            title={handMode === 'camera' ? '摄像头实时指令已开启' : '开启摄像头，用真实手势控制花朵'}\n          >\n            <span className=\"cam-pulse\" />\n            <Camera size={14} />\n            <span>\n              {handMode === 'camera'\n                ? handInit === 'initializing'\n                  ? '摄像头启动中…'\n                  : '实时指令 · 摄像头已开启'\n                : handMode === 'demo'\n                  ? '开启摄像头 · 实时识别'\n                  : '开启摄像头 · 实时指令'}\n            </span>\n            <em>{handMode === 'camera' ? `${handStatus.latency || 0} MS` : 'REALTIME'}</em>\n          </button>"),
])

edit('src/ui/Overlays.tsx', [
    ("      <div className=\"hand-head\">\n        <div className=\"hand-title\">\n          <span className={`live-dot ${ready ? 'on' : handInit === 'initializing' ? 'loading' : ''}`} />\n          <div>\n            <strong>手势识别</strong>\n            <em>GESTURE · ML VISION</em>\n          </div>\n        </div>\n        <div className=\"hand-head-actions\">\n          <span className=\"hand-fps\">{hand.fps ? hand.fps + ' FPS' : '— FPS'}</span>\n          <button\n            className=\"icon-btn small\"\n            onClick={() => setCamPanelOpen(false)}\n            title=\"收起监视器\"\n            aria-label=\"收起监视器\"\n          >\n            <X size={14} />\n          </button>\n        </div>\n      </div>",
     "      <div className=\"hand-head\">\n        <div className=\"hand-title hand-command-title\">\n          <span className={`live-dot ${ready && hand.present ? 'on' : handInit === 'initializing' ? 'loading' : ''}`} />\n          <div>\n            <em>实时指令 · LIVE COMMAND</em>\n            <strong className={ready && hand.present ? 'command-live' : ''}>\n              {handMode === 'camera' && handInit === 'initializing'\n                ? '摄像头启动中…'\n                : ready && hand.present\n                  ? `${hand.gesture} → ${hand.command}`\n                  : handMode === 'off'\n                    ? '摄像头未开启'\n                    : '将手掌放入画面'}\n            </strong>\n          </div>\n        </div>\n        <div className=\"hand-head-actions\">\n          <span className=\"hand-fps\">\n            {hand.fps ? hand.fps + ' FPS' : '— FPS'}\n            {hand.latency ? ' · ' + hand.latency + ' MS' : ''}\n          </span>\n          {handMode !== 'camera' && (\n            <button className=\"icon-btn small\" onClick={onStartCamera} title=\"开启摄像头\" aria-label=\"开启摄像头\">\n              <Camera size={13} />\n            </button>\n          )}\n          <button\n            className=\"icon-btn small\"\n            onClick={() => setCamPanelOpen(false)}\n            title=\"收起监视器\"\n            aria-label=\"收起监视器\"\n          >\n            <X size={14} />\n          </button>\n        </div>\n      </div>"),
    ("        <div>\n          <span>置信度</span>\n          <strong>{hand.present ? Math.round(hand.confidence * 100) + '%' : '—'}</strong>\n        </div>", "        <div>\n          <span>延迟</span>\n          <strong>{hand.latency ? hand.latency + ' ms' : '—'}</strong>\n        </div>"),
    ("            <button onClick={onStartCamera}>摄像头</button>", "            <button onClick={onStartCamera}>开启摄像头</button>"),
])

# calmer center lighting
edit('src/three/FlowerStage.tsx', [
    ("      <StageHalo rootRef={rootRef} headY={asset.headY} bloomRef={bloomRef} colorA={flower.accent} colorB={env.accent} />\n", ""),
    ("        <pointLight\n          ref={lightRef}\n          position={[0, asset.headY + 0.1, 0.15]}\n          color={flower.accent}\n          intensity={5}\n          distance={4.2}\n          decay={2}\n        />",
     "        <pointLight\n          ref={lightRef}\n          position={[0.35, asset.headY + 0.55, 0.45]}\n          color={flower.accent2}\n          intensity={0.6}\n          distance={2.2}\n          decay={2}\n        />"),
    ("      lightRef.current.intensity = 2.5 + bloom * 6", "      lightRef.current.intensity = 0.3 + bloom * 0.7"),
    ("      if (u?.uFresnel) u.uFresnel.value = 0.14 + bloom * 0.08\n      if (u?.uTranslucency) u.uTranslucency.value = 0.06 + bloom * 0.08\n      if (u?.uGlow) u.uGlow.value = 0.03 + bloom * 0.06",
     "      if (u?.uFresnel) u.uFresnel.value = 0.055 + bloom * 0.035\n      if (u?.uTranslucency) u.uTranslucency.value = 0.02 + bloom * 0.025\n      if (u?.uGlow) u.uGlow.value = 0.01"),
])

edit('src/three/PostFX.tsx', [
    ("new THREE.Vector2(size.width, size.height), 0.42, 0.6, 0.9", "new THREE.Vector2(size.width, size.height), 0.24, 0.46, 0.95"),
    ("composer.bloom.strength = high ? 0.42 : 0.28", "composer.bloom.strength = high ? 0.24 : 0.14"),
    ("composer.bloom.radius = high ? 0.6 : 0.5", "composer.bloom.radius = high ? 0.5 : 0.42"),
    ("composer.bloom.threshold = high ? 0.9 : 0.94", "composer.bloom.threshold = high ? 0.95 : 0.98"),
])

# closer, lower editorial camera that shows the flower center
edit('src/three/Experience.tsx', [
    ("camera={{ position: [2.35, 2.55, 4.55], fov: 36, near: 0.1, far: 140 }}", "camera={{ position: [1.95, 2.3, 3.85], fov: 34, near: 0.1, far: 140 }}"),
    ("        target={[0, 1.95, 0]}\n        enablePan={false}\n        minDistance={2.9}\n        maxDistance={7.8}",
     "        target={[0, 1.98, 0]}\n        enablePan={false}\n        minDistance={2.3}\n        maxDistance={7.2}"),
])
print('camera + detail-first lighting patch done')
