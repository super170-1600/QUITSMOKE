# NICØ 共生星图 · S1 空间视觉样板

2026-10-13。完成独立开发预览 `/__constellation-demo`，仅使用明确标识的模拟成员、模拟计划与纪念样本。S2鼓励演出、S3业务联动、S4持久化及S5 Hub替换均未进入。

## 视觉与布局

- 真实 Blender 4.5.9 资产，保存独立 `.blend` 并导出 GLB，由 Three.js 加载。原封印晶体及香烟资产保留不变。
- 生命核心由八片有厚度、有间隙的曲面玻璃瓣构成，内部三条开放银白/香槟呼吸丝带和小型珠光核。不放香烟或密集灰尘。
- 两条开放轨道分别沿横向和纵深旋转，具有宽度、扭转、厚度及渐窄端点。以真实前后遮挡形成穿插，不用屏幕平面椭圆。
- 双支持者显示两个同尺寸光核；单支持者只显示A轨与一个模拟光核；零支持者保留空轨、无光核并出现邀请预留入口。没有在线、已发送或已读声明。
- 一个模拟计划弧：七节点、三个示意亮点；两个微型纪念迹点。数据未写入后端或本地存储。
- 使用现有HDR、暖侧光、微弱冷银轮廓、窄条反射光卡和暗反射卡。没有Bloom。地面接触影为可控近似，不声称真实焦散。
- 材质A：Physical glass，transmission=1、roughness=.045、IOR=1.46、thickness=.11；材质B：通透优先，transmission=.35、opacity=.28、depthWrite=false。金属丝带与轨道玻璃独立材质。B不等同完整物理折射。
- 首次短提示可关闭；品牌、NICØ、固定样本标记为默认文字。设置收在右上角“⋯”，可切0/1/2人、材质、机位及六图层；光子密度独立控制。
- 可慢速拖拽观察，Home或复位按钮恢复机位。光核与节点有DOM可访问点击区域，点击仅解释样板范围。关闭返回原焦点，弹层背景不可聚焦。

## 文件清单

新增：

- `scripts/blender/build_constellation.py`：独立核心和轨道的可复现建模、原生保存、GLB导出。
- `assets/blender/nico-constellation.blend`（Blender自动保留的同名 `.blend1` 为本资产备份）。
- `public/models/nico-constellation.glb`。
- `src/features/constellation/types.ts`：预览契约、六图层与性能报告类型。
- `src/features/constellation/adapters/mock.ts`：无真实账号/存储的模拟成员和计划。
- `src/features/constellation/scene/scene.ts`：GLB、HDR、独立材质、光源、轨道锚点、计划/纪念样本、粒子实例、相机及生命周期。
- `src/features/constellation/ui/ConstellationCanvas.vue`：异步取消、可见性、上下文丢失、资源清理。
- `src/features/constellation/preview/ConstellationDemo.vue`：独立页面、设置、少文字、访问提示和预留入口。
- `scripts/verify-constellation.mjs`：截图与浏览器回归。

唯一既有源码修改：`src/router/routes.ts`新增一个DEV-only且localDemo标记的预览路由。保留已有未提交修改。未安装依赖、未改任何数据库、API、认证、统计或家庭/打卡/数据中心业务。

## 验收记录

- `npm test`：38个文件、172项通过。
- `npm run build`：通过；既有store静态/动态混用和大chunk警告保留。
- 浏览器验证：0/1/2模拟支持者，A/B，3/4与侧角，核心单独展示、光子关闭、拖动观察、键盘打开、Escape、390×844无横向溢出、上下文丢失后的可访问降级、生产 `/family` 仍要求登录。运行页面错误0，外部请求0。
- 画廊：`artifacts/constellation-s1/index.html`。桌面1440×900；手机390×844；包含 `two-A`、`one-A`、`zero-A`、`two-B`、`side-A`、`core-only`、`photons-off`、`mobile`、`fallback`。
- GLB：427,648字节（约418KiB）；双人A本机Edge headless报告56 draw calls、49,958绘制三角形、36几何体、4纹理；CPU提交采样2.1ms。HDR为复用文件，不包含在GLB体积。
- S1空闲按需渲染，拖动/设置改变时绘制；没有持续公转/呼吸RAF，不能用空闲值承诺60FPS。未完成真实手机GPU帧率和内存基准；390×844是浏览器视口检查，不是物理手机性能证明。

## 生命周期与差异

离开路由中止GLB fetch；晚到HDR/GLB释放资源；可见区域外或标签隐藏停止绘制；没有S2粒子生命周期或业务提交动画。WebGL失败/丢失进入2D样板入口，不阻塞原有页面。

设计包示意图是交接结构，网页保留一核双轨及前后层次，去掉说明框。当前内部丝带偏精细银白金属光学结构，尚未实现复杂透明薄膜/多次散射；地面仅接触影近似；本轮无离线Cycles对照、无动态鼓励录屏。观察旋转不是生产自由交互方案。没有实际邀请、打卡提交、共同计划或永久纪念，所有入口均明确样板说明。

S1交付后停止。按规范每阶段视觉验收后再继续，下一步S2五种独立鼓励效果不在本轮自动实施。
