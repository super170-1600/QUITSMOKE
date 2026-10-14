# Orbital Console 展陈材质与数据装置预览

2026-10-13。本轮遵循最新确认：中央保留四层由下向上缩小、同轴悬浮的玻璃板，各层中心分别放置恢复晶体、收益光柱、烟瘾波带、历程光环。取消中央大数字、指标文字和层序数字。未接入生产账户数据。

## 完成内容

- Hero Glass：近无色中央玻璃，transmission .985、roughness .065、IOR 1.46、thickness .12；倒角使用独立光学边材质，attenuationColor #bbd8dc，仅厚边轻微聚色。
- Structural Glass：轨道、弧面结构，transmission .95、roughness .10、IOR 1.45；弧面采用透明混合与 depthWrite=false，改善对数据装置的遮挡。
- Accent Material：铂银与浅香槟金金属，以及独立低金属度数据陶瓷。玻璃承载结构，数据不统一玻璃化。
- 删除重复轨道、板边金属实线、背景大型玻璃碎片；保留主环轨、中央次环与四个真实开孔槽位。轮廓来自闭合几何、倒角和 HDR 环境反射。
- 暖白环境、暖侧向主光及微弱冷白补光；无 Bloom。透射玻璃不投不透明阴影，避免整块黑影；保留金属/数据的投影。当前为实时近似，并非离线多次玻璃折射或真实焦散。
- 无烟历程显示七个每日光环；烟瘾显示具有宽度和厚度的曲线波带，按固定 0–10 评分尺度；收益总览显示七个累计金额采样光柱，详情仍为每日差额；恢复显示四个待确认节点，不代表医疗状态已达成。
- 中央各层图标保持居中；外围默认无文字。顶部保留 NICØ、日期和品牌。
- 拖动水平旋转与阻尼惯性；方向键旋转，Home 复位；减少动态效果偏好关闭惯性。焦点切换仅改变小型晶核的颜色/尺度，不增加中央数字。
- 各模块可点击进入读数详情；日期、范围切换、键盘打开、Escape 关闭、焦点恢复及浏览器返回可用。

## 本轮文件

- `src/features/insights/scene/overviewScene.ts`：三层材质、主次轨道、真实槽口、弧面曲线几何、独立数据装置、中央图标及短时焦点动画。
- `src/features/insights/ui/OverviewScene.vue`：视角、旋转、焦点桥接及资源生命周期。
- `src/features/insights/ui/OrbitalConsole.vue`：拖动惯性、投影点击区域、图形总览、键盘交互。
- `src/features/insights/ui/ModuleGlyph.vue`：移动/降级图形，累计收益高度归一化。
- `src/features/insights/preview/OrbitalConsoleDemo.vue`：顶部身份、隔离预览、详情路由及焦点管理。
- `src/features/insights/config/nicoDomains.ts`：固定样本、四种可视化映射、累计收益采样。
- `src/features/insights/views/DomainDetail.vue`：隔离预览的日期和数据详情。
- `scripts/verify-orbital-preview.mjs`、`scripts/verify-orbital-interactive.mjs`：视觉、权限、交互回归与截图。

未修改数据库、API、认证、统计公式、每日打卡或其他业务模块；原有未提交文件保留。

## 验证

- `npm test`：38 个文件，172 项通过。
- `npm run build`：通过；既有大块资源和 store 静态/动态混用警告仍存在。
- 预览回归：1440×900、390×844，无横向溢出；四块点击区、侧向投影、WebGL 降级、生产 `/hub` 登录守卫通过，浏览器错误 0。
- 槽口采用真实 Shape 孔和独立槽底；取每面49个几何样本，底边与槽底最大误差约 .000103 世界单位，测试阈值 .002。旋转后仍保持对齐。
- 交互回归：四模块、日期读数、范围过滤、键盘、Escape/焦点恢复、返回、手机触控、惯性与减少动态效果检查通过。
- 最终默认桌面样本：148 draw calls、79,256 三角形、74 几何体、6 纹理；单次 CPU 提交约2.2ms，仅当前本机 Edge 测量，不等同 GPU 时间或设备 FPS。空闲按需渲染，拖动、惯性、短时焦点过渡期间绘制。

截图：`artifacts/orbital-console-static/index.html`；详情与交互记录：`artifacts/orbital-console-interactive/index.html`。入口：`http://127.0.0.1:5173/#/__orbital-demo`。

## 剩余与阶段边界

- 仍是固定样本视觉/交互预览，真实账户适配未启用。
- 现有49日光环档案尚未嵌入数据详情，避免此轮重构既有打卡模块；当前历程详情显示日期光环与三个记录指标。
- 健康参考来源与阈值配置尚待审阅，恢复详情明确显示“尚无法确认”，没有虚构里程碑数值或已达成状态。
- 多层玻璃透射、层间影子、触屏设备 GPU 性能仍需继续视觉验收与真实设备测量。四区域视觉权重是设计指导，不作为屏幕面积或验收数值。
- 等待视觉验收后再推进生产数据接入及其余阶段。
