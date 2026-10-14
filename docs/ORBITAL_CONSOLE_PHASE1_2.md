# Orbital Console：Phase 1 与 Phase 2 静态样板

日期：2026-10-13。用户确认继续数据模块；已完成独立计算契约与静态样板，等待视觉验收。未进入 Phase 3–5。

## Phase 1：计算与契约

calculateInsights 是本模块唯一指标计算入口，摘要和日期序列同源。保留现有 statistics.ts 及其消费者；不改变打卡、成就、家庭或个人中心的现有口径。

- 已记录天数按有效日期去重；有 updatedAt 时选同日较新记录。
- 今天缺失时从昨天核实连续无烟，并返回 todayPending 与 currentStreakThrough；缺口不连接。
- 历史最长按相邻自然日扫描，未来、无效日期不纳入。
- 实际吸烟只累加有效已记录日期，返回覆盖情况。
- 烟瘾只使用 0–10 新评分，0 有效，旧 1–5 不换算；缺失为 null。
- 节省估算用 BigInt 十进制有理数求和，最后一次舍入为两位小数，保留负数；缺参数为 null。每日序列单日舍入，累计摘要直接从原始记录精确汇总，不累加已舍入的每日金额。
- M7 资格与版本契约已建立，当前明确 unknown。官方候选来源未审核、持续无烟精确依据不足，尚不能输出任何“已到达”健康参考节点；不是零个已恢复，也不是完成健康配置。

17 项新测试包含规格样例、闰日/跨月、DST 日期集合、不同时区声明、未来/空/无效记录、同日更新、旧量表、档案改价、金额负值/半分/累计舍入、覆盖缺失及时间筛选不改变累计摘要。时区沿用已有设备 IANA zone；传入的自然日保持其日历含义，不转换为 UTC 时间戳。

固定样板：2026-09-16–10-13，28 日均记录；已记录 28、当前连续 18、最长 18、实际吸烟 20；烟瘾均值 3.9（28 个有效样本）；估算 ¥400.00（基线 15 支/天，20 元/20 支），恢复尚无法确认。所有缩略形态来自显式固定数组，不连接账户，不随机生成指标。

## Phase 2：空间总览

入口：http://127.0.0.1:5173/#/__orbital-demo。仅 DEV 注册，沿用已有 localDemo 协议；正式 /hub、/trend 权限保留。

构图：五层水平悬浮切角玻璃片、透明底座、两条倾斜椭圆轨道、中央小型晶体与有几何厚度的扭转光学丝带、四块独立薄玻璃摘要片。桌面文字投影到真实 3D 面板中心；手机保留 3D 主体，将摘要转换成两列可读布局。

通用 OrbitalConsole 与场景不导入 store、API、NICØ 计算层；模块按配置装配，中央品牌通过插槽注入。ModuleGlyph 四类缩略分别为时间节点、波谱、光柱、晶体路径；缺失波谱断开，恢复节点未确认，不展示虚构医学进度。尚未实现四个完整聚焦视图。

主要材质：

| 部件 | 参数 |
|---|---|
| 主面玻璃 | transmission .87，roughness .025，IOR 1.48，thickness .20，clearcoat 1 |
| 切边玻璃 | transmission .78，roughness .03，IOR 1.52，thickness .22，较深银蓝色，环境反射 2 |
| 薄片/轨道清玻璃 | transmission .97，roughness .065，IOR 1.46，thickness .13 |
| 金属细边 | metalness .9–.95，roughness .19–.21；细边不是粗框 |
| 中央扭转丝带 | 网格厚度 .02；transmission .35、metalness .55，银蓝/香槟金反射 |

复用项目已有且带归属说明的 studio_small_09_1k.hdr，经 PMREM 预滤波；HDR 失败时保留程序化摄影棚环境。暖金主光与银蓝辅光、软阴影；无 Bloom。面板关闭投影，避免透明片产生不合理的大片实心阴影。ACEs 色调映射，曝光 1.03；清晰度主要由切面和反射差异建立。

当前仍是实时栅格化样板，不是离线 CGI：多层玻璃内部的相互折射、全局光照与焦散精度有管线限制。未新增 Blender/GLB 资产，也未将本轮视觉标记为已经达到用户最终美术验收。桌面面板固定正面以保证文字清晰，手机摘要为 2D 玻璃布局；完整空间聚焦态、移动相机交互待后续阶段。

## 文件清单

新增：
- src/features/insights/domain/types.ts
- src/features/insights/domain/metrics.ts
- src/features/insights/domain/money.ts
- src/features/insights/domain/recoveryReferences.ts
- src/features/insights/adapters/insightsAdapter.ts
- src/features/insights/tests/metrics.test.ts
- src/features/insights/config/nicoDomains.ts
- src/features/insights/scene/overviewScene.ts
- src/features/insights/ui/consoleTypes.ts
- src/features/insights/ui/ModuleGlyph.vue
- src/features/insights/ui/OverviewScene.vue
- src/features/insights/ui/OrbitalConsole.vue
- src/features/insights/preview/OrbitalConsoleDemo.vue
- scripts/verify-orbital-preview.mjs
- 本报告及 artifacts/orbital-console-static 验收图片/HTML/JSON。

修改：src/router/routes.ts 仅插入一个 DEV 样板路由；保留已有未提交内容。Phase 0 报告追加阶段进度。verify-halo-upright 重新生成既有档案的回归截图/JSON；未修改其业务代码。

未修改数据库、API、认证守卫、旧业务统计、每日打卡或其他模块组件。

## 测试与截图

- npm test -- src/features/insights/tests/metrics.test.ts：17/17。
- npm test：38 文件，172/172。
- npm run build：类型检查与构建通过；仍有既有 family 动静态导入及大包警告。
- node scripts/verify-orbital-preview.mjs：四类摘要、固定读数、未知恢复、键盘聚焦、桌面边界、手机无横向溢出、无 WebGL 降级、/hub 登录保护；浏览器错误 0、外部请求 0。
- node scripts/verify-halo-upright.mjs：49 日七周档案、鼠标/触控旋转、惯性、按住停止、日期附着、选择、Home 重置通过。

截图：artifacts/orbital-console-static/desktop.png（1440×900）、mobile.png（390×844）、side.png、fallback.png；index.html 汇总。浏览器检查与最后一次渲染统计在 verification.json。

桌面实测：100 draw calls、47,236 三角形、38 geometries、6 textures，DPR 1；最后一次 CPU 渲染提交约 2.2ms，不是 GPU 完成时间。场景仅初始化、HDR 加载、尺寸/视角变化时绘制，无持续 RAF；静态样板不报告 FPS。素材复用 HDR 1,615,248 bytes，约 1.54 MiB；未新增位图/GLB 下载负担。这些是本地测试环境结果，不代表真实手机 GPU 性能。

## 下一步门禁

等待用户验收静态材质和构图，随后才进入 Phase 3 的四个独立聚焦态。Phase 4 再接真实数据、账户/家庭作用域、刷新、转场和 Hub 背景暂停；医疗来源配置、持续无烟证据及旧统计迁移仍需对应范围的明确确认。本轮未接 production store，不声称已经验证真实账户实时刷新。

## 视觉修订：数据面板立在轨道上（2026-10-13）

根据用户新参考图，原四角摘要布局已替换为环绕中央平台的统一水平玻璃环形轨道。轨道中心椭圆半径 4.75 / 3.75，带宽 .76，网格厚度 .08，带精密切角和内外细轨。

四块面板按空间角度 3.45、5.15、.35、2.1 放置；底端高度 .115，与轨道上的透明支座/节点相接。面板竖立、各有轻微 Y 轴转角，前后位置由椭圆节点确定，不按二维四宫格排列。文字和缩略图通过 Three.js 投影得到 CSS 仿射矩阵，侧视角也保持贴合玻璃表面。手机上保留缩小的轨道/面板结构，完整读数仍在下方两列摘要，避免微小文字影响可读性。

本次修改 overviewScene.ts、OrbitalConsole.vue、verify-orbital-preview.mjs 和本报告；更新原静态样板截图。未修改业务计算、其他模块、API 或数据库。

验证脚本新增同一椭圆节点校验、面板底端高度校验及侧视角文字矩阵变化校验；11 项检查通过、浏览器错误 0。全量测试 172/172、构建通过（既有大包/混合导入警告保留）。最新桌面实际统计为 112 draw calls、62,308 三角形、43 geometries、6 textures，最后一次 CPU 提交约 2.3ms；静态按需绘制，无持续 FPS。新截图覆盖 desktop.png、side.png、mobile.png、fallback.png，verification.json 为本次结果，前文初版参数和性能仅作为迭代记录。

仍处于 Phase 2 静态视觉验收，没有加入轨道旋转或领域点击转场。
