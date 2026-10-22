# 3DGS / Spark 接入参考手册

## 1. 资产与格式

INRIA 预训练模型包（Mip-NeRF 360 场景，研究/非商业许可）：

```
https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets/pretrained/models.zip
```

包内结构：

```
flowers/point_cloud/iteration_30000/point_cloud.ply
flowers/cameras.json
garden/point_cloud/iteration_7000/point_cloud.ply
garden/cameras.json
bonsai/point_cloud/iteration_30000/point_cloud.ply
bonsai/cameras.json
```

- 30000 iteration 的画质通常优于 7000；文件也更大（flowers 30k ≈ 1.0GB，70k ≈ 0.4GB）。
- 许可：官方模型为研究/非商业用途；对外发布需替换资产或标注许可，见项目 `ATTRIBUTIONS.md` 的写法。

## 2. splat-transform 命令速查（v3.10 实测）

```bash
# 统计（注意末尾的 null 输出占位，否则只解析不打印）
npx splat-transform input.ply --stats null
npx splat-transform input.ply --info null

# 通用清洗 → .spz
npx splat-transform input.ply \
  -N \                             # 去 NaN/Inf/零范数旋转
  -F \                             # 漂浮物过滤（默认 0.05,0.1,0.004）
  -V opacity,gt,0.02 \             # 透明度下限（草坪 2%，室内 3%，勿超 5%）
  --seed-pos 0,0,5 \               # 连通簇种子（主体中心）
  -C \                             # 只保留种子所在连通簇
  -S 0,0,1,16 \                    # 球体裁剪：中心+半径
  output.spz

# 仅统计不转换时用 null 作为输出
npx splat-transform input.ply -N --filter-box 0,-10,-10,10,10,10 null
```

常用 flag：

| Flag | 参数 | 说明 |
| --- | --- | --- |
| `-N` | — | NaN / Inf / 零旋转清理 |
| `-F` | `[size,op,min]` | 体素漂浮物过滤，默认 `0.05,0.1,0.004` |
| `-V` | `name,cmp,value` | 列过滤，如 `opacity,gt,0.02`、`scale_0,lt,0.3` |
| `-S` | `x,y,z,r` | 保留球内高斯 |
| `-B` | `x,y,z,X,Y,Z` | 保留盒内高斯 |
| `-C` | `[res,op,min]` | 连通簇过滤，配合 `--seed-pos` |
| `--seed-pos` | `x,y,z` | 簇过滤/体素处理的种子点 |
| `-d` | `n|n%` | 抽稀（会降画质，不优先用） |
| `--stats/--info` | `null` | 打印统计/结构，必须跟输出占位 |

## 3. 相机数学

COLMAP 存储的是 world→camera 旋转 `R`：

- 相机右轴（世界系）：`right = R[0]`（第 0 行）
- 相机上轴：`up = -R[1]`
- 相机后轴（+Z，朝观察者）：`back = -R[2]`
- 位置：`camera.position = position`
- 朝向：`Q = setFromRotationMatrix(makeBasis(right, up, back))`
- 垂直 FOV：`fov = degrees(2 * atan(height / (2 * fy)))`

常见错误：

1. 直接把 `R[2]` 当 forward 再 `lookAt(pos + fwd)`：roll 丢失，画面可能倾斜/颠倒。
2. 用 `camera.up = (0,1,0)` 强行修正：场景的世界上方向不一定是 +Y（COLMAP 常为 Y-down），会翻。
3. 混用不同归一化尺度：`cameras.json` 与 `.ply` 必须在同一坐标系；不要额外缩放相机。

## 4. 实测基线（BloomSense 项目，可直接作为起点）

| 场景 | 清洗参数 | splat 数 | .spz | 曝光 | 边界 yaw/pitch/zoom |
| --- | --- | --- | --- | --- | --- |
| 花野 flowers | `-N -F -V opacity,gt,0.02 --seed-pos 0,-1,1 -C -S 0,-2,2,26` | 3.14M | 78MB | 0.98 | 3.2 / 0.68 / 2.4 |
| 庭院 garden | `-N -F -V opacity,gt,0.02 --seed-pos 0,0,5 -C -S 0,0,1,16` | 4.04M | 77MB | 0.98–1.2 | 3.2 / 1.15 / 1.9 |
| 盆景 bonsai | `-N -F 0.03,0.06,0.003 -V opacity,gt,0.03 -S 0,1.5,1.8,13` | 723K | 17MB | 1.5 | 6.29 / 1.15 / 2.8 |

说明：

- 花野/庭院是户外：草坪靠低透明度 splat 叠出来，透明度下限用 2%；更低会黑洞，更高会丢草。
- 盆景是室内：不要球裁过紧（半径 9 时只剩 327K，房间墙会被裁掉；13 是实测平衡点）。
- 曝光在 LinearToneMapping 下使用：户外 ≈1.0，室内暗部 ≈1.4–1.5。

## 5. SparkRenderer 参数

```ts
new SparkRenderer({
  renderer: gl,
  maxStdDev: Math.sqrt(6),  // 高斯截断半径；√8 更满但更糊，√5 更锐但露缝
  minAlpha: 2.2 / 255,      // 丢弃近透明 splat，减少雾感
  accumExtSplats: true,     // 扩展精度累积，减少色带
})
```

- 不使用 EffectComposer 渲染 splat（会二次采样导致糊）。
- `antialias: false`；`dpr=[1, 2]`。
- `gl.toneMapping = THREE.LinearToneMapping`，`gl.toneMappingExposure = scene.exposure`。
- 每个场景一个 `SplatMesh`；切场景时 `visible=false` + `dispose()`，并把 `mesh` 置空后再加载新的。

## 6. 交互边界参考

```ts
type Bounds = { zoomMax: number; pitchMax: number; yawMax: number }
// 轨道参数
orbit.yaw   ∈ [-yawMax, yawMax]        // 3.2 ≈ 180°；6.29 ≈ 360°
orbit.pitch ∈ [-0.34, pitchMax]        // -0.34 防钻地
orbit.zoom  ∈ [0.55, zoomMax]          // 缩放下限防止钻进主体
```

- 位置与朝向：先算 `position = center + offset`，再 `camera.lookAt(center)`；不要用两套独立旋转，否则地板抬升后会"看天"。
- 自动巡游在 `±yawMax` 间往返，室内场景一定要限制（背面没有采光）。
- 双击/归位把 yaw/pitch 归零、zoom 归 1、pan 归零。

## 7. 补边（地面盘）

```ts
const c = document.createElement('canvas'); c.width = c.height = 256
const ctx = c.getContext('2d')!
// ✅ 从十六进制按 sRGB 字节取色（贴图随后标记 SRGBColorSpace）
const hex = scene.ground.color.replace('#', '')
const rgb = `${parseInt(hex.substring(0,2),16)},${parseInt(hex.substring(2,4),16)},${parseInt(hex.substring(4,6),16)}`
const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
g.addColorStop(0,    `rgba(${rgb},1)`)     // 掠射角易露黑底时，内圈不透明延伸到 ~0.86 再淡出
g.addColorStop(0.86, `rgba(${rgb},0.98)`)
g.addColorStop(1,    `rgba(${rgb},0)`)
ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256)
const tex = new THREE.CanvasTexture(c)
tex.colorSpace = THREE.SRGBColorSpace
```

- ❌ **不要**用 `new THREE.Color(hex).r*255` 取色：`THREE.Color` 会把 sRGB 十六进制线性化（`#3d4d26` → ≈(10,17,4) 近黑），再当 sRGB 写进 CanvasTexture，补上的洞仍是黑色。纯红 `#ff0000` 因 1.0 通道线性≈sRGB 侥幸显红，可作探针暴露此 bug。
- 盘面旋转：`rotation={[Math.PI / 2, 0, 0]}`，位置取实测地表 y（草坪 y 的 p50–p70）。
- 半径要显著大于岛界（掠射角可见范围可达 200+，实测用 260），否则最大缩放/背面掠射时能看到硬边或露黑底；给 meshBasicMaterial 加 `fog={false}`。
- 颜色不要接近纯黑（`#131c11` 会被当成虚空），用可辨识的暗苔绿（`#3d4d26`），并确保走的是 sRGB 字节、没被线性化。

## 8. 排障

| 现象 | 排查 |
| --- | --- |
| 全黑 | `splat.initialized` 是否 await；near/far 是否被 Infinity 污染；SparkRenderer 是否加入 scene |
| 上下颠倒 | 基向量符号；拿 contact sheet 对照原始训练图 |
| 发灰 | ACES 未关；曝光未按场景设置；minAlpha 太低导致雾叠加 |
| 空洞 | 过滤过度（重点：透明度、`-F` 的 size）；换回默认参数二分定位 |
| 补的洞仍发黑 | 取色被 `THREE.Color` 线性化（深绿→近黑）；用纯红探针盘：变红=颜色 bug（改 sRGB 字节），仍黑=盘没覆盖到（半径/高度） |
| 拉丝/涂抹 | 相机超出训练锥；收紧 yaw/pitch/zoom；maxStdDev 降到 √5 |
| 边缘硬缝 | 地面盘无 alpha 渐变；半径不足 |
| 切换场景闪黑 | 旧 mesh 先 dispose 再加载；加载期间保留上一帧 |
| 页面测试中自动刷新 | Vite 监听 public；输出新文件名或换 `vite preview` |
| `EPERM rename ...tmp -> x.spz` | 目标文件被浏览器/预览服务器占用；写新文件名 |
| 大文件推 GitHub 失败 | 单文件 >100MB；压缩/裁剪或 Git LFS |

## 9. 验收清单

- [ ] `npx tsc --noEmit` 与 `npm run build` 通过
- [ ] hero 机位截图正常（无颠倒/发灰/空洞）
- [ ] 最大俯仰与最大缩放截图无接缝、无大面积空洞
- [ ] **慢速密集环视**（脚本 10°~20°/步 + 每步等点云排序稳定，覆盖全周与各 pitch）下半区近黑像素占比达标：户外地面 ≈0%–5%，最差角度也降到位（如从 34.6%→0.6%）
- [ ] 疑似地面盘时用**纯红探针盘**（`#ff0000`）自检：前景变红=覆盖到位（残留黑是颜色 bug，改 sRGB 字节取色）；仍黑=盘没盖到（调半径/高度）
- [ ] 室内高暗占比要目视区分"没扫到的黑洞"与"房间本就暗的家具/阴影"，别把阈值误报当 bug 修
- [ ] 场景切换 3 次后无内存暴涨（旧 mesh 已 dispose）
- [ ] 每个 .spz < 100MB，许可说明已写入 `ATTRIBUTIONS.md`
