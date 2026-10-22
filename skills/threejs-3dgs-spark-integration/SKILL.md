---
name: threejs-3dgs-spark-integration
description: 把 3D Gaussian Splatting（Spark）实景扫描接入 React Three Fiber / Three.js 的完整可复现管线：remotezip 按需从 INRIA models.zip 抽取场景 → splat-transform 清洗并转 .spz → 用 COLMAP cameras.json 的训练相机位换算渲染（right=R[0], up=-R[1], back=-R[2], fov=2·atan(h/2fy)）→ contact sheet 拼图选 hero 机位 → SparkRenderer/SplatMesh 接入 → 逐场景曝光与视角边界 → 径向渐变地面盘补边（按 sRGB 字节取色，勿经 THREE.Color 线性化）→ 移动端 DPR/画质自动降级（isMobile）→ 慢速密集量化空洞验收（近黑像素占比 + 纯红探针盘）。当用户要接入 3DGS/高斯泼溅/Spark/.spz、使用 INRIA 预训练模型、处理 cameras.json、相机位不对或画面上下颠倒、场景发糊/涂抹/漂浮伪影、或把实景扫描放进 R3F 场景时使用。触发词：3DGS、高斯泼溅、Gaussian Splatting、Spark、splat-transform、.spz、INRIA models、cameras.json、实景扫描、点云场景、泼溅、移动端降级、手机性能、DPR 降级。
version: 1.4.0
---

# Three.js / R3F 接入 3DGS（Spark）实景扫描

本技能是一条**已跑通**的 3D Gaussian Splatting 接入管线：从 14GB 官方预训练包里只取需要的场景，清洗成 .spz，用真实训练相机位在 R3F 里渲染，并把"发糊、空洞、漂浮、发灰"这些 3DGS 特有的坑逐条堵住。

## 何时使用

- 要在 React Three Fiber / Three.js 里接入 3DGS 实景扫描（.spz / .ply / .splat）
- 使用 INRIA 官方预训练模型（Mip-NeRF 360 场景）
- 已有 splat 资产，但相机位置不对、画面上下颠倒、全黑、Infinity 裁切
- 实景画面发糊/涂抹、地面空洞、边缘漂浮碎块、场景像悬浮岛
- 需要从训练轨迹挑 hero 机位、拼 contact sheet 快速选型

**不适用**：纯程序化 R3F 场景/环境扩展请用 `threejs-r3f-environment-gallery`；Blender 程序化建模用 `procedural-blender-flower-pipeline`。

## 核心约束（先读，能省一天试错）

1. **3DGS 是静态光场**，不是带贴图的网格。只有在**训练相机位附近**才能得到照片级画质；自由环绕越界会出现拉丝、空洞、烟雾状伪影。正确做法：以训练机位为 hero，允许**有边界**的环绕（每场景独立 yaw/pitch/zoom 上限 + 仰角地板），而不是无限自由相机。
2. **COLMAP 相机要换基**：Three.js 相机看 -Z，COLMAP 看 +Z 且 Y 向下；直接 lookAt 会上下颠倒或偏转。必须用基向量建四元数（见步骤 3）。
3. **过滤不是越狠越好**：透明度阈值过狠会把草坪/地面 splat 删出黑洞；球裁过紧会把房间墙壁裁掉。每改一次参数都要重新截图验收。
4. **SplatMesh.getBoundingBox() 在未 `await initialized` 前返回 Infinity**，拿它设 near/far 会直接毁掉整个画面。
5. **Vite 监听 public/**：替换 .spz 会触发 HMR 重载，浏览器测试中途刷新；且被 dev/preview server 占用的文件 rename 会报 EPERM。用新文件名或 `vite preview`。
6. **相机位与点云同坐标系**：直接用 `cameras.json` 的 position 与 `.ply/.spz` 一起渲染即可，**不要**缩放相机、也不要用百分位包围盒去推断"点云比相机大 N 倍"——那是早期猜测，已实测证伪（花野 cam0 直接摆放即得到正确构图）。包围盒只用来选裁剪半径和地表高度。
7. **采集外的物体补不出来**：3DGS 只重建镜头拍到的内容。窗外过曝的白墙、没拍到的电脑/书桌不会凭空出现；往照片级点云里硬塞程序化低模，光照与透视对不上，只会更假。要新增物体只能重新采集并训练。验收时先确认"这是数据缺失还是渲染问题"，避免把不可解的需求当 bug 修。
8. **取色别过 `THREE.Color`；空洞验收要慢·密·量化**：地面盘/补边贴图必须按 sRGB 字节直接写（`parseInt(hex)`），用 `new THREE.Color(hex).r*255` 会被线性化，深绿压成近黑，"补上的洞仍是黑的"（见步骤 6）。验收空洞**不能**"一把拖到极限 + 只看 4 个极端角 + 短暂停顿"——那样没等点云排序收敛、漏掉中间角度，会把真实存在的洞误判成"无洞"。要小步慢移、每步等排序稳定、全周+各 pitch 密集取样、用下半区近黑像素占比量化，必要时上纯红探针盘区分"覆盖不足"与"颜色 bug"（见步骤 7）。
9. **移动端自动降级（大模型 + 高 DPR 会拖垮手机）**：3DGS 单场景常 70–80MB、三四百万 splat，手机 GPU 又贵又热，桌面端拉满的 DPR 在手机上会明显掉帧发热。用 `isMobile()`（`matchMedia('(pointer: coarse)').matches` 且 `navigator.maxTouchPoints>0`，或视口宽 <820；带触摸屏的笔记本主指针仍是 `fine`，不会被误伤）在移动端把渲染 DPR 上限从桌面（如实景 2.5、花境 1.75）压到 ~1.5，并把 store 默认画质设为 `balanced`；桌面保持高分辨率。`dpr` 在 R3F `<Canvas dpr={[min,max]}>` 里按 `isMobile()` 分支即可。**注意：桌面 Chrome 的移动模拟（setViewport isMobile/hasTouch/dpr3）只能验证布局、触摸、是否渲染和 DPR 是否被压下去，测不出真机帧率**——最终流畅度必须真机确认。

## 渲染参数速查（先抄这组，再逐场景微调）

```ts
new SparkRenderer({
  renderer: gl,
  maxStdDev: Math.sqrt(6),  // 5–7 之间；越小越锐、越容易露缝
  minAlpha: 2.2 / 255,      // 去雾；草坪场景不要高于 3/255
  accumExtSplats: true,     // 扩展精度累积，减少色带
})
// 3DGS 不走 EffectComposer；antialias:false；dpr 桌面 [1,2]（高画质可到 2.5），移动端按 isMobile() 自动降到 [1,1.5]
gl.toneMapping = THREE.LinearToneMapping   // ACES 会发灰
gl.toneMappingExposure = scene.exposure    // 户外≈1.0，室内暗部≈1.4–1.5
```

对应"涂抹感"的修复组合拳：`--filter-floaters` 清杂点 → `maxStdDev √6` 收尾巴 → `minAlpha` 去雾 → `accumExtSplats` 提精度 → `dpr 2` 提采样。

## 七步工作流

### 1. 按需下载资产（不要拉 14GB 整包）

模型地址：`https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets/pretrained/models.zip`

用 `scripts/fetch_models.py`（remotezip + HTTP Range，断点续传、失败重试）：

```bash
pip install remotezip
python scripts/fetch_models.py --out splat_src \
  --scene flowers:30000 --scene bonsai:30000 --scene garden:7000
```

它会抽取 `point_cloud/iteration_*/point_cloud.ply`，并应同时抽取同目录的 `cameras.json`（没有相机位就无法正确渲染）。校验：每个 .ply 大于 10MB 才算完整。

### 2. 清洗并转 .spz

```bash
npx @playcanvas/splat-transform@latest --help   # 先看当前版本支持的 flag
# 查看列统计（末尾的 null 不能省，否则只解析不输出）
npx splat-transform splat_src/garden.ply --stats null

# 通用清洗（户外草坪/植被场景，实测基线）
npx splat-transform splat_src/garden.ply \
  -N -F \
  --seed-pos 0,0,5 -C \
  -S 0,0,1,16 \
  public/splats/garden_v1.spz
```

参数含义与取舍：

| Flag | 作用 | 实测经验 |
| --- | --- | --- |
| `-N` | 去 NaN/Inf | 必加 |
| `-F [size,op,min]` | 体素漂浮物过滤 | 默认 `0.05,0.1,0.004` 最稳；更细（0.03）会伤地面 |
| `-V opacity,gt,0.02` | 透明度下限 | 2% 适合草坪；5% 会删出地面黑洞 |
| `-S x,y,z,r` | 球体裁剪 | 半径按场景实测包围盒给；过紧会裁墙 |
| `--seed-pos` + `-C` | 只保留与种子连通的簇 | 删"漂出去"的屋顶/树冠碎片；seed 取主体中心 |
| `--stats null` / `--info null` | 只打印信息 | 末尾的 `null` 是输出占位，缺失则不打印 |

输出 .spz 必须 **单文件 < 100MB**（GitHub 硬限制）；4M splat 约 70–80MB。

### 3. COLMAP 相机位 → Three.js

`cameras.json` 每项含 `position[3]`、`rotation[3][3]`（world→camera）、`fx/fy/width/height`。换算：

```ts
// COLMAP: +X right, +Y down, +Z forward
// Three.js: +X right, +Y up, -Z forward
const right = new THREE.Vector3(R[0][0], R[0][1], R[0][2]).normalize()
const up    = new THREE.Vector3(-R[1][0], -R[1][1], -R[1][2]).normalize()
const back  = new THREE.Vector3(-R[2][0], -R[2][1], -R[2][2]).normalize()
const quaternion = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(right, up, back)
)
const fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * fy)))
// camera.position = position; camera.quaternion = quaternion; camera.fov = fov
```

写一个 `splat-preview.html`（或临时页面）暴露 `window.__SPLAT__ = { cams, camera, renderer, scene, mesh }`，用 `scripts/contact-sheet.js` 渲染候选机位拼图：

```js
// 浏览器控制台/页面脚本
window.__makeContactSheet({ picks: [0,12,24,37,49,61,74,98], cols: 4, w: 400, h: 225 })
```

挑 hero 的原则：**结构化实体面多**的机位（砖墙、桌面、花坛俯角），避开大面积稀疏草地特写、逆光树冠、纯天空。

### 4. R3F 中接入 Spark

```bash
npm i @sparkjsdev/spark three @react-three/fiber
```

```tsx
const spark = useMemo(() => new SparkRenderer({
  renderer: gl,
  maxStdDev: Math.sqrt(6),   // 越小越锐但会露缝；√5–√7 是可用区间
  minAlpha: 2.2 / 255,       // 渲染端再筛掉近透明杂点
  accumExtSplats: true,      // 扩展精度累积，减少色带
}), [gl])
```

加载与生命周期：

```tsx
const splat = new SplatMesh({ url, onProgress })
setMesh(splat)
await splat.initialized          // 必须等，之后才能用 boundingBox
// 切场景：旧 mesh.visible=false; mesh.dispose(); 并保留上一帧直到新点云可用
```

**渲染设置**：3DGS 不要走 EffectComposer；`antialias: false`；`dpr=[1,2]`；色调映射用 `THREE.LinearToneMapping`（ACES 会把照片级颜色压灰）并逐场景设 `gl.toneMappingExposure`。

### 5. 视角与边界（把用户留在采集范围内）

用"以主体为球心的轨道相机 + 每场景边界"代替无限自由相机：

- 每场景配置 `{ zoomMax, pitchMax, yawMax }`（实测：户外 2.4/1.25/3.2，室内 2.2/0.85/1.25）
- 先算位置再 `camera.lookAt(target)`，保证位置与朝向永远一致（避免仰角地板抬升后"看天"）
- 俯仰下限 -0.34 rad（不钻地），上限按场景
- 自动巡游只在边界内往返；双击/归位手势回 hero
- 手势/鼠标/键盘/触屏四通路并行，灵敏度可调（见项目偏好系统）

### 6. 补边：径向渐变地面盘

数据边界外的虚空用程序化圆盘垫底，不要硬边圆盘。**取色必须按 sRGB 字节直接写入贴图**：

```ts
const c = document.createElement('canvas'); c.width = c.height = 256
const ctx = c.getContext('2d')!
// ✅ 直接从十六进制按 sRGB 字节取色（贴图随后标记 SRGBColorSpace）
const hex = scene.ground.color.replace('#', '')
const r8 = parseInt(hex.substring(0, 2), 16)
const g8 = parseInt(hex.substring(2, 4), 16)
const b8 = parseInt(hex.substring(4, 6), 16)
const rgb = `${r8},${g8},${b8}`          // 如 '61,77,38'
const g = ctx.createRadialGradient(128,128,0, 128,128,128)
g.addColorStop(0,   `rgba(${rgb},0.95)`)
g.addColorStop(0.6, `rgba(${rgb},0.8)`)
g.addColorStop(1,   `rgba(${rgb},0)`)
ctx.fillStyle = g; ctx.fillRect(0,0,256,256)
const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace
```

> ❌ **绝不能**用 `new THREE.Color(hex).r*255`（或 `.g`/`.b`）取色写进贴图。`THREE.Color` 会把 sRGB 十六进制**线性化**（`#3d4d26` → 0.038 这种小数），×255 得 ≈(10,17,4) 近黑，再当 sRGB 写进 CanvasTexture → 洞"补上了但仍是黑色"，看起来像没补。纯红 `#ff0000` 因 1.0 通道线性≈sRGB 才侥幸显红，可当探针暴露这个 bug（见步骤 7）。

盘的位置要按点云实测地表高度（对草坪区域取 y 的 p50–p70），半径要显著大于岛界；颜色用可辨识的暗苔绿而非近黑（`#131c11` 会被误读成黑洞），并确保上面这条取色走的是 sRGB 字节、没被 `THREE.Color` 线性化。掠射角易露黑底时，把内圈不透明度延伸到 ~0.86 半径再淡出，并给 meshBasicMaterial 加 `fog={false}`（实景分支通常无雾，但加了更保险）。

### 7. 验收

- `npx tsc --noEmit && npm run build` 通过
- 用 `vite preview --port <未占用端口>` 验证生产构建：旧 preview 常占用默认 4173，浏览器还可能缓存旧 bundle；换新端口并在 URL 加 `?v=<随机>` 可避免"测的其实是旧版本"
- 三类截图：hero 机位、最大俯仰、最大缩放（检查空洞/漂浮/接缝）
- 每场景 .spz 体积与 splat 数记录进场景表
- 控制台无 Spark 报错；场景切换后旧 mesh 已 dispose

**空洞（地面/草坪补边）专项验收——慢速·密集·量化**：

> ⚠️ 千万别"一把把相机拖到极限 + 只看 4 个极端方位角 + 短暂停顿就截图"。这样既没等 Spark 点云排序收敛（拖到位就抓会拍到尚未稳定的糊帧），又完全漏掉中间角度——用户实际会慢慢扫过的那些角度才是真相，粗验证会误判"无洞"（本技能曾因此把 35% 空洞看成 0%）。

1. **慢速小步 + 每步等排序收敛**：用脚本（如 `qa-slow.mjs`）按 10°~20° 一步推进 yaw，覆盖全周，并在**每个 pitch 级**都取一遍；每步移动后 `sleep` 足够时间（数百 ms 到 1s+）让点云排序稳定，再 `takeScreenshot`。
2. **量化近黑像素占比**：对每张图取"下半区中间 60% 宽"（避开左右侧栏/顶栏 UI），步进采样，统计近黑像素（如 `r<22 && g<26 && b<20`）占比。户外草坪/地面目标 ≈0%–5%；某角度突然 20%+ 就是那里真有洞，别靠肉眼一句话带过。
3. **区分"数据缺失/室内本就暗"与"渲染 bug"**：hero 视角仍有 10%+ 近黑，可能是树缝间的真实暗背景或前景虚化暗角，属正常；室内场景（无地面盘）暗占比高，要先看图判断是"没扫到的黑洞"还是"房间本来就暗的家具/阴影"，阈值会误报，别当 bug 修。
4. **纯红探针盘定位根因**：怀疑地面盘时，把 `ground.color` 临时设成 `#ff0000`，转到最差角度截图。**前景变红 = 盘覆盖到位、问题在颜色**（几乎一定是步骤 6 的 `THREE.Color` 线性化 bug）；**前景仍黑 = 盘根本没盖到那片区域**（半径/高度/位置问题）。这一步把"覆盖不足"与"颜色 bug"一次性分开，别再盲猜着改半径反复试。
5. **修完复测同一批慢速角度**，确认最差角度近黑占比从原来数值（如 34.6%）降到 ≈0%–5%，再目视抽查背面+hero 确认无回归。

## 症状 → 根因 → 修复

| 症状 | 根因 | 修复 |
| --- | --- | --- |
| 画面上下颠倒/偏转 | COLMAP 基向量用错 | 按步骤 3 用 right/up/back 建四元数，别用 lookAt 猜 |
| 整屏黑/裁切异常 | 初始化前取了 boundingBox（Infinity） | `await splat.initialized` 后再读；或写死 near/far |
| 发灰蒙纱 | ACES 色调映射 | 实景改 LinearToneMapping + 逐场景曝光 |
| 地面黑洞 | 透明度阈值/细体素过滤过度 | 透明度下限降到 2%，`-F` 用默认参数 |
| 地面盘"补上了洞仍是黑色" | `new THREE.Color(hex)` 把 sRGB 线性化，深绿压成近黑 | 按 sRGB 字节 `parseInt` 写贴图；用纯红探针盘区分"覆盖不足"与"颜色 bug"（见步骤 6/7） |
| 涂抹拉丝 | 视角超出训练范围 / maxStdDev 过大 | 收紧 yaw/pitch/zoom；maxStdDev 降到 √5–√6 |
| 圆形硬边接缝 | 地面盘无渐变 | 径向渐变 alpha 贴图 + 半径超出岛界 |
| 悬浮碎块 | 与主体不连通的簇 | `--seed-pos` + `-C` 只留连通簇 |
| 替换资产后页面刷新/EPERM | Vite 监听 public + 文件被占用 | 输出新文件名，或改用 `vite preview` |
| 载入 90MB 后卡死 | 未 dispose 旧 mesh + 多标签同开 | 切场景 dispose；测试只开一个标签 |
| 手机端拖动卡顿/发热/首屏慢 | 大模型（70–80MB、数百万 splat）+ 桌面级高 DPR 压垮手机 GPU | `isMobile()` 自动降级：DPR 上限压到 ~1.5、默认画质 balanced；桌面仍高分辨率（见约束 9）。真机帧率须真机测，桌面模拟测不出 |

## 辅助文件

- `reference.md` — 完整命令/参数、相机数学、实测三场景基线、排障详解
- `scripts/fetch_models.py` — remotezip 选择性下载（断点、重试、跳过已存在）
- `scripts/contact-sheet.js` — 浏览器端相机拼图选型
- `templates/GaussianStage.tsx` — 精简参考实现（Spark + hero 轨道 + 边界 + 地面盘）
