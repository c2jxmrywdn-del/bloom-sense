---
name: threejs-r3f-environment-gallery
description: React Three Fiber / Three.js 花境画廊的环境扩展配方：新增一重环境时，按 EnvId→环境数据→天空与雾→程序化场景→HUD 图标→快捷键→音景→主题联动逐层接入，并用同构几何分组规避 mergeGeometries 混拓扑 + vertexColors 导致的整屏黑屏。当用户要在 R3F/Three.js 花境、场景画廊、环境切换器中新增或扩展背景环境，或新增背景后画面全黑、遇到 vertexColors/mergeGeometries 渲染问题时使用。触发词：新增花境、增加背景环境、加一重环境、R3F 环境、Three.js 环境切换器、场景画廊、vertexColors 黑屏、mergeGeometries 黑屏。
version: 1.0.0
---

# Three.js / R3F 花境环境扩展

新增一重花境不是只加一个场景组件，而是一条从 `EnvId` 到主题、快捷键、音景的完整链路。本技能提供已跑通的接入顺序、程序化场景构建规则，以及“新增背景后整屏黑屏”的分诊与修复流程。

## 何时使用

- 在 React Three Fiber / Three.js 花境、场景画廊、环境切换器中新增或扩展环境。
- 新增背景后 UI 正常但 3D 画面全黑、无控制台报错。
- 使用 `mergeGeometries` + `vertexColors` 出现静默渲染失败。
- 需要一次接全天空、雾、灯光、HUD 图标、快捷键、音景、主题。
- 环境数量从 5 增至 7+，需要处理坞栏占位与键位冲突。

不适用：Blender 花朵建模与 GLB 导出（用 `procedural-blender-flower-pipeline`）；摄像头手势识别（用 `mediapipe-camera-gesture-webapp`）；纯后处理调色。

## 核心原则

1. **环境是一条链路**：类型、数据、天空、雾、场景、灯光、图标、快捷键、音景、主题、文案，缺一处就会留下“看起来加了但不可用”的假功能。
2. **先盘点再写场景**：先跑第 0 步的接入点表，再写几何。
3. **合并几何按材质/拓扑分组**：`vertexColors` 只用于同构几何；混拓扑合并是黑屏高发区。
4. **确定性随机**：所有程序化摆放使用固定 seed 的 PRNG，保证每次刷新构图一致、问题可复现。
5. **证据化验收**：类型检查 + 生产构建 + 新环境截图 + 旧环境回归 + 控制台检查，缺一不算完成。

## 端到端接入点表

| 层 | 典型位置 | 改动 | 漏接症状 |
|---|---|---|---|
| 类型 | `src/data.ts` | `EnvId` 增加新 id | 类型报错或无法选取 |
| 环境数据 | `src/data.ts` | `ENVIRONMENTS` 补完整条目 | 坞栏缺项、文案空白 |
| 天空 | `Environment.tsx` | `ENV_SKY` 配置 | 天空退回默认或发黑 |
| 雾/背景 | `Environment.tsx` + `Experience.tsx` | `ENV_FOG` 与 `fog` | 雾色不匹配、远景穿帮 |
| 场景分支 | `Environment.tsx` | switch 增加 `id === 'xxx'` | 选中后无场景 |
| 场景实现 | `Environment.tsx` | `XxxScene` + builder | 空白或黑屏 |
| 舞台灯 | `FlowerStage.tsx` | `BACKLIGHT`、`StageLights` | 花体死黑或过曝 |
| HUD | `ui/Hud.tsx` | `ENV_ICONS`、环境计数 | 图标 undefined、计数错 |
| 快捷键 | `App.tsx`、`data.ts`、HUD 提示 | `envKeys` 扩容、巡游键迁移 | 键位冲突、按了没反应 |
| 音景 | `audio.ts` | `ENV_TONES` 补音高 | 切换后沿用旧音 |
| 主题 | `App.tsx` + `styles.css` | 浅色判定、主题 class | 文字不可读、玻璃层突兀 |
| 文案 | `data.ts`、README、手势详情 | 环境数量与描述同步 | 文档与 UI 不一致 |

## 工作流

复制清单并逐项推进：

- [ ] 0. 盘点接入点
- [ ] 1. 写环境规格卡
- [ ] 2. 数据与主题接线
- [ ] 3. 天空、雾、灯光接线
- [ ] 4. 程序化场景实现
- [ ] 5. 跨系统联动
- [ ] 6. 构建、截图与回归
- [ ] 7. 黑屏分诊（如遇全黑）
- [ ] 8. 收尾与验收

### Step 0 — 盘点接入点

用一次 grep 找齐所有环境枚举的消费方：

```bash
grep -rn "EnvId\|ENVIRONMENTS\|ENV_ICONS\|ENV_TONES\|BACKLIGHT\|envKeys" src
```

把命中位置填进上面的接入点表。不要边写边找，漏接通常发生在快捷键、音景和主题这三处。

### Step 1 — 先写环境规格卡

在动代码前确定：

- 名称、英文名、诗句、描述、雾色、accent、chip
- 光照性格：主光方向与色温、补光颜色、轮廓光、半球光
- 前景/中景/远景：地面 shader、主体几何、剪影层
- 动态元素：粒子、落叶、光柱、雾层，以及各自数量上限
- UI 主题：浅色还是深色，需要哪些 CSS 变量覆盖
- 键位：分配哪个字母，是否与自动巡游冲突
- 音景：root、fifth、cutoff、air

规格卡没写清楚，后面会用“调参数”反复返工。

### Step 2 — 数据与主题接线

在 `data.ts` 扩展 `EnvId` 并补 `ENVIRONMENTS` 条目；`fog` 同时写入 `ENV_FOG`，保持单一来源。浅色环境在 `App.tsx` 增加主题判定与 class，在 `styles.css` 补玻璃层、文字与边框的对比度覆盖。

环境在数组中的顺序就是坞栏顺序与快捷键顺序。新增浅色环境时，优先放在浅色环境旁边，避免相邻主题跳变过大。

### Step 3 — 天空、雾、灯光接线

补 `ENV_SKY`（天顶、地平、低空、太阳方向与大小、云量、星点、极光、accent）与 `ENV_FOG`；在 `Environment` 的 switch 里挂载新场景。舞台侧补 `BACKLIGHT` 方向与 `StageLights` 的柔光/暖光分支，避免新环境里花体变成剪影或过曝。

### Step 4 — 程序化场景实现

按“远景 → 中景 → 地面 → 动态元素”的顺序搭：

- 固定 seed PRNG（如 `seed = (seed * 16807) % 2147483647`）。
- 每组几何独立数组，同组同拓扑，最后 `mergeGeometries(arr, false)`。
- 远景剪影用 `meshBasicMaterial` 且 `fog={false}`，避免被雾洗平。
- 落叶/花粉用 `InstancedMesh`，逐帧 `setMatrixAt`，颜色用 `setColorAt` + `instanceColor.needsUpdate`。
- `renderOrder` 分层：天空 -10、远山 -7/-6、远景 -3、主体 -1。

详细模板见 [reference.md](reference.md)。

### Step 5 — 跨系统联动

逐项接：HUD 图标与环境计数、`envKeys` 扩容、自动巡游键迁移（新增环境占用原巡游键时必须改键，并在 HUD 提示与 README 同步）、`ENV_TONES` 音高、手势详情文案、README 快捷键表。环境数 ≥7 时给坞栏加紧凑与矮屏滚动规则。

### Step 6 — 构建、截图与回归

```bash
npx tsc --noEmit
npm run build
```

用 QA 参数直达新环境并截图：

```text
http://localhost:5179/?qa=1&env=<new-id>&flower=rose&bloom=0.9
```

至少验证：新环境正常、一个浅色旧环境正常、一个深色旧环境正常、逐个点击全部环境、控制台无 WebGL/shader 错误。QA 参数与截图方法因项目而异，以项目现有约定为准。

### Step 7 — 整屏黑屏分诊

**症状**：UI 正常渲染，Canvas 全黑，控制台可能没有任何报错。

按以下顺序二分，不要先怀疑相机或后处理：

1. 切回旧环境。旧环境正常 → 新环境专属问题；旧环境也黑 → 全局上下文/渲染循环问题。
2. 检查 `canvas` 尺寸与 `gl.isContextLost()`。
3. 从最后新增的 mesh 开始逐件隐藏，定位到具体几何。
4. 把该 mesh 换成 `meshBasicMaterial wireframe`。能显示 → 几何有效，问题在材质/属性路径。
5. 换普通颜色 `meshStandardMaterial`（去掉 `vertexColors`）。能显示 → 问题在顶点色路径。
6. 检查该几何是否合并了不同拓扑（Cylinder + Plane + Icosahedron 等）。
7. 拆分几何：按拓扑/材质分组，各自材质，去掉混合组的 `vertexColors`。
8. 仍黑再查 NaN 顶点、无穷 boundingSphere、shader 编译、renderOrder/透明、后处理。

**已确认的坑**：`mergeGeometries` 合并 `CylinderGeometry` + `PlaneGeometry`，给合并结果写 color attribute，再用 `meshStandardMaterial vertexColors`，会让整屏静默变黑且控制台无报错。修复是拆成 `backdrop.culms` 与 `backdrop.leaves` 两组几何、普通材质；主竹丛仍按同构分组保留顶点色。

详细证据链与代码见 [reference.md](reference.md)。

### Step 8 — 收尾与验收

- [ ] 新环境在坞栏可见，序号与快捷键一致
- [ ] 天空、雾、背景色三者一致
- [ ] 新旧环境全部可切换且无黑屏
- [ ] 控制台无 WebGL/shader/未捕获异常
- [ ] 巡游键已迁移，HUD/README/手势文案同步
- [ ] 音景随环境切换生效
- [ ] 浅色环境文字与玻璃层对比度可读
- [ ] 7+ 环境时坞栏不遮挡花谱/绽放面板
- [ ] `npx tsc --noEmit` 与 `npm run build` 通过
- [ ] 有新环境与旧环境回归截图

## 常见坑速查

| 现象 | 优先怀疑 | 修复 |
|---|---|---|
| 整屏黑，UI 正常 | 混拓扑 merge + vertexColors | 拆几何、去顶点色 |
| 只有远景消失 | 远景材质受雾影响 | `fog={false}` |
| 落叶颜色不生效 | 未设置 `instanceColor.needsUpdate` | 初始化后刷新 |
| 新环境没有音景 | `ENV_TONES` 漏项 | 补 root/fifth/cutoff/air |
| 按 T 没反应/巡游错乱 | 新环境占用了巡游键 | 迁移巡游键并同步提示 |
| 坞栏盖住底部面板 | 7+ 项高度溢出 | 紧凑间距 + 矮屏滚动 |
| 浅色环境文字发白 | 主题 class/对比度未覆盖 | 补 CSS 变量与玻璃层 |

更多代码模板、修复前后对比与验证记录见 [reference.md](reference.md)。
