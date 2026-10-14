# NICØ 光环视觉结构重设计

日期：2026-10-13。仅视觉及控件组织迭代，等待静态视觉验收。

## 当前结果

- 今日光环与历史节点共用真实 Three.js 立体造型：厚玻璃外环、状态光带、立体光核、烟瘾纹理。
- 使用更强的银蓝 / 暖金对比；光环加厚、放大，配少量玻璃珠与空间阴影。没有依靠 Bloom。
- 打卡页面改为大型主视觉 + 三项编辑入口。一次只展开一个编辑器；吸烟量使用数字步进器，烟瘾使用 0–10 滑条，感受使用六个标签。备注折叠。
- 删除装饰英文、重复状态、提示文案、右侧默认说明。保留日期、输入标签、必要操作与错误反馈。
- 四条玻璃轨道具有不同高度，固定俯视镜头；28 个槽位仍由日期决定，记录缺失不会显示为无烟。
- PC 可直接选择空间节点。手机保留完整展台，通过 01–04 选择七日层，再通过七个互不重叠的 44px 日期触控位选择当天；被选中的 3D 节点出现暖金标记。此取舍避免内圈七个小节点的点击区域互相覆盖。
- WebGL 无法创建时使用原 SVG 映射降级，仍能选择日期并查看详情。

## 实现文件

新增：src/components/OpticalHaloScene.vue。
修改：src/components/HaloArchive.vue、src/views/CheckinView.vue、src/views/PulseDemoView.vue、src/styles/dailyPulse.css、src/visuals/haloVisual.ts。
新增验收：scripts/verify-halo-redesign.mjs。
更新原有浏览器回归控件定位：scripts/verify-daily-pulse.mjs、scripts/verify-pulse-demo.mjs、scripts/verify-hub-phase4.mjs。

API、数据库、认证、权限、统计公式、记录编码、补签规则、保存与草稿实现均未因本次视觉重构修改。保留已有未提交工作。

## 材质与镜头

光环外环 MeshPhysicalMaterial：transmission 0.89、roughness 0.06、thickness 0.2、ior 1.46、clearcoat 1。金属光带 roughness 0.18、metalness 0.7；银色边缘 roughness 0.16、metalness 0.85。

环境反射采用已有 Three.js RoomEnvironment + PMREM，银蓝与暖白方向光；ACES exposure 0.94。地面为 ShadowMaterial，避免地平线和大块白色反射吞掉轮廓。

档案轨道半径 1.45 / 2.29 / 3.13 / 3.97，轨道高度 0.15 / 0.37 / 0.59 / 0.81。PC 相机位置 (0.2, 5.8, 8.4)，最低 FOV 32°；窄屏按宽度自动增加视野。

此阶段没有连续渲染动画循环。仅数据、选择和容器尺寸变化时绘制；DPR 上限 1.5、阴影 1024。采用实时环境折射近似，没有光线追踪、真实焦散或离线 CGI 画质承诺。后续复杂动画与更多粒子等待视觉验收。

## 验证

- npm test：37 个测试文件、152 个测试通过。
- npm run build：类型检查与生产构建通过。项目原有混合动态导入和大包警告仍存在。
- verify-daily-pulse：16 项通过，覆盖当天保存、补签、失败不点亮槽位、固定 4×7、准确详情、时间窗口、Escape、草稿分日期、旧量表、未来日期禁止、移动布局与本地日期 / DST。
- verify-hub-phase4：五个原模块、打卡提交、权限限制、路由、错误重试与手机切换通过。
- verify-pulse-demo：免登录示例、保存与刷新、恢复示例、无外部请求、正式 hub 仍要求登录通过。
- verify-halo-redesign：真实 Canvas、聚焦编辑、滑条、保存与刷新、28 个投影槽位、390×844 首屏保存按钮可见、四层各七个 44px 触控位无横向重叠、无 WebGL 降级及零页面异常通过。

浏览器回归使用隔离测试数据，未写正式数据库。本轮静态截图不是实际手机 GPU 性能测量。

## 验收入口

开发环境：http://127.0.0.1:5173/#/__pulse-demo。
截图合集：artifacts/halo-redesign/index.html。
截图包括每日空状态、PC 每日、PC 档案、选中详情、手机每日、手机档案。

## 2026-10-13：吸烟量与感受反馈修正

之前所有正数吸烟量共用七段断环，焦虑 / 烦躁 / 疲惫共用蓝色。本轮修正：

- 吸烟量通过 log(1+n)/log(201) 压缩到视觉范围，驱动光带覆盖长度、分段数量与黑色微碎片数量 / 尺寸。0 支完整，1–200 支各有不同光带长度；此参数只用于视觉，不是恢复率，不参与统计。
- 焦虑：紫色拉长光核与三条倾斜交错轨道；烦躁：铜橙色切面光核与五枚晶片；疲惫：低饱和蓝色扁光核与低垂弧带。
- 未填写吸烟量时，也可独立预览感受，不产生 0 支记录。清空数字输入不会再被当成零值光环。
- 档案与今日视图共用映射；SVG 降级也使用独立感受色彩和按支数变化的断环。
- 文件：haloVisual.ts、haloVisual.test.ts、OpticalHaloScene.vue、DailyHalo.vue、CheckinView.vue；新增 scripts/verify-halo-states.mjs。
- 验证：154 项单元测试通过；生产构建通过；状态截图检验覆盖 0 / 1 / 5 / 20 / 200 支、六种感受以及先选感受后填吸烟量；原视觉布局 / 保存 / 移动触控 / WebGL 降级回归通过。未新增页面文案，未修改 API、数据库或统计公式。
- 同镜头对照：artifacts/halo-state-feedback/index.html。

## 2026-10-13：七周水平转盘与惯性

用户确认：7 条轨道 × 7 天，共 49 天。轨道平放，每日光环竖立；整盘仅绕竖直轴转动，不上下翻转。

每周日期范围置于展台上方，移除居中的日期范围与计数。按周一至周日分组，包括本周尚未到来的空位；未来槽位禁用，补签开始日期规则保留。archiveDates 默认 28 天接口保留以兼容原调用，新增 archiveWeekDates 专供七周视图。

鼠标和触摸拖动，超过 6px 才识别为拖动；拖动不会误触记录选择。松手角速度上限 2.4 rad/s，指数阻尼 4.2/s，低于 0.012 rad/s 停止；再次按住立即停止。减少动态效果偏好关闭松手惯性，保留直接拖动。方向键转动，Home 复位。关闭弹层取消动画帧。日期点击区域每次旋转重新投影，始终对应原日期。

验证：155 项单元测试通过；生产构建通过；浏览器验证 49 个槽位、七个周标签、PC 拖动、手机触摸、键盘复位、拖动不选中、旋转后正确日期、松手续转与再次按住停止；原布局、保存刷新、手机 44px 触控位和 WebGL 降级通过。业务 API、数据库与统计公式未修改。

截图：artifacts/halo-upright/front.png、rotated.png、mobile.png。测试：scripts/verify-halo-upright.mjs。
