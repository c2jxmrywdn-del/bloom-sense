/**
 * 相机 contact sheet：把多个训练机位渲染成一张拼图，用于挑 hero 视角。
 *
 * 前置：预览页面里暴露
 *   window.__SPLAT__ = { cams, camera, renderer, scene, mesh }
 * 其中 cams 为 cameras.json 解析结果，camera/renderer/scene 来自 Three.js。
 *
 * 用法（浏览器控制台）：
 *   __makeContactSheet({ picks: [0,12,24,37,49,61,74,98], cols: 4 })
 *   __makeContactSheet({ picks: 'every:20', cols: 6, w: 320, h: 180, label: true })
 */
(function () {
  const V = () => window.__SPLAT__.camera.position.constructor
  const M = () => window.__SPLAT__.camera.matrix.constructor

  function applyCam(cam, camera, w, h) {
    const R = cam.rotation
    // COLMAP world->camera: right = R[0], up = -R[1], back = -R[2]
    const right = new (V())(R[0][0], R[0][1], R[0][2])
    const up = new (V())(-R[1][0], -R[1][1], -R[1][2])
    const back = new (V())(-R[2][0], -R[2][1], -R[2][2])
    const m = new (M)()
    m.makeBasis(right, up, back)
    camera.quaternion.setFromRotationMatrix(m)
    camera.position.set(cam.position[0], cam.position[1], cam.position[2])
    camera.fov = (2 * Math.atan(cam.height / (2 * cam.fy)) * 180) / Math.PI
    camera.aspect = w / h
    camera.near = 0.01
    camera.far = 400
    camera.updateProjectionMatrix()
  }

  function pickIndexes(cams, picks, rows, cols) {
    if (Array.isArray(picks)) return picks
    if (typeof picks === 'string' && picks.startsWith('every:')) {
      const step = Math.max(1, parseInt(picks.slice(6), 10) || 20)
      const out = []
      for (let i = 0; i < cams.length; i += step) out.push(i)
      return out.slice(0, rows * cols)
    }
    const n = cams.length
    const total = rows * cols
    return Array.from({ length: total }, (_, i) => Math.round((i * (n - 1)) / Math.max(1, total - 1)))
  }

  window.__makeContactSheet = function (opts = {}) {
    const S = window.__SPLAT__
    if (!S || !S.cams || !S.cams.length) {
      console.warn('未找到 window.__SPLAT__.cams，请先加载场景与 cameras.json')
      return null
    }
    const w = opts.w || 320
    const h = opts.h || 180
    const cols = opts.cols || 4
    const picks = pickIndexes(S.cams, opts.picks, Math.ceil((opts.picks?.length || 24) / cols), cols)
    const rows = Math.ceil(picks.length / cols)
    const old = document.getElementById('__contact_sheet')
    if (old) old.remove()
    const cv = document.createElement('canvas')
    cv.id = '__contact_sheet'
    cv.width = w * cols
    cv.height = h * rows
    cv.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#111;max-width:100vw'
    document.body.appendChild(cv)
    const ctx = cv.getContext('2d')

    S.renderer.setAnimationLoop(null) // 暂停应用渲染循环，避免相机被覆盖
    const prevW = S.renderer.domElement.width
    const prevH = S.renderer.domElement.height

    picks.forEach((idx, i) => {
      const cam = S.cams[idx]
      if (!cam) return
      applyCam(cam, S.camera, w, h)
      S.renderer.setSize(w, h, false)
      S.renderer.render(S.scene, S.camera)
      const x = (i % cols) * w
      const y = Math.floor(i / cols) * h
      ctx.drawImage(S.renderer.domElement, 0, 0, w, h, x, y, w, h)
      if (opts.label !== false) {
        ctx.fillStyle = 'rgba(0,0,0,.65)'
        ctx.fillRect(x, y + h - 20, 96, 20)
        ctx.fillStyle = '#fff'
        ctx.font = '12px monospace'
        ctx.fillText(`cam ${idx}`, x + 6, y + h - 6)
      }
    })

    S.renderer.setSize(prevW, prevH, false)
    console.log('contact sheet 完成，点击页面右下角「恢复」或刷新继续')
    return cv
  }
})()
