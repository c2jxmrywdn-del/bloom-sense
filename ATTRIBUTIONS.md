# ATTRIBUTIONS · 素材与许可

本项目的「实景 · 3DGS」模式使用公开的研究用 3D Gaussian Splatting 预训练模型作为初始样例。请在对外演示或再分发前阅读以下许可与署名要求。

## 3D Gaussian Splatting 模型

- **flowers / garden / bonsai** 三个场景来自官方 3D Gaussian Splatting 预训练模型包：
  https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/datasets/pretrained/models.zip
- 训练与渲染方法：Kerbl et al., *3D Gaussian Splatting for Real-Time Radiance Field Rendering*, ACM TOG 2023。
- 模型与官方实现由 **INRIA GRAPHDECO** 发布，采用其研究/非商业许可（详见上游仓库的 `LICENSE.md` 与模型包说明）。**本项目不主张这些扫描资产的著作权，也不声明其可用于商业用途。**
- 场景原始数据属于 **Mip-NeRF 360** 数据集（Google Research）；数据集页面：
  https://jonbarron.info/mipnerf360/
  数据集的再分发与使用请遵循其原始许可。
- 本项目对下载的 `.ply` 进行了格式转换、NaN 清理、花野场景的浮尘过滤与球体裁剪，未重新训练模型。

## 渲染与工具链

- **Spark**（`@sparkjsdev/spark`）— World Labs，MIT License。
  https://github.com/sparkjsdev/spark
- **@playcanvas/splat-transform** — PlayCanvas，MIT License。
  https://github.com/playcanvas/splat-transform
- **Three.js** — MIT License。
- **React Three Fiber / drei** — MIT License。
- **MediaPipe Tasks Vision** — Apache-2.0 License。
- **lucide-react** — ISC License。

## 程序化内容

- Blender 程序化花朵模型、花境环境、着色器与全部 UI 设计由本项目生成/编写，除第三方库与上述扫描场景外，不包含其他受版权保护的素材。

## 免责声明

上述 3DGS 扫描仅作为「写实重建」技术样例接入。若你要将本项目用于商业发布，请替换为自有采集或明确授予商用许可的 3DGS 资产，并重新核对上游许可。
