# NICØ 全流程接入与旧 UI 清理

2026-10-14。本轮将正式账户流程接到已验收的视觉体系；开发预览继续仅在开发环境提供。

## 正式流程

封面 → 点击光圈打开登录/注册浮窗（保留封面背景）→ 认证成功后消散转场 → 主晶体。未加入家庭的账户也可先访问晶体与个人设置，由可关闭的小浮窗提示创建/加入家庭；家庭相关业务在完成成员身份配置前不可进入。已登录账户点击光圈直接转场。直接访问 `/login` 也呈现封面上的同一浮窗，保留深链目标。

家庭设置修订：`FamilyConnectionForm.vue` 嵌入个人设置的家庭关系，成功后读取实际家庭回执；`FamilySetupView.vue` 已移除，旧 `/family/setup` 深链转至 `/profile?section=family`。退出家庭后留在个人设置，不跳独立向导。`FamilyJoinHint.vue` 在未加入家庭的主晶体上提供轻提示。已加入家庭的戒烟者缺少基线时仍沿用原戒烟设置要求。

数据辨识度修订：增加数据图形对比和单点尺寸，减少透明屏对图形的遮蔽，拉近默认相机；保留玻璃材质层级、四层图标平台及圆盘旋转。少于三条记录时提示实际记录天数，不补造历史数据。

玻璃轮廓修订：平台倒角由 3 段改为 4 段，顶部与关键轮廓使用 0.008–0.009 场景单位的银蓝反射镀边；外环两侧与显示屏上沿独立接光，不增加全局 Bloom。上层仍为清澈主玻璃；辅助层透射率 0.72、粗糙度 0.19；下层及底座采用透射率 0.26、粗糙度 0.32 的缎面石英。悬浮圆盘增加薄透明盘体和细边缘。地面通过 512×512 渐变纹理形成局部冷灰、周边暖白的明暗差，配合柔和背侧轮廓光；纹理和新增几何随场景释放。此前截图保留为 `progress-before-edges.png`、`data-mobile-before-edges.png`，新截图使用原角度与尺寸。构建及包含数据详情、模块返回、手机宽度的浏览器回归通过。仅更改实时场景，不改变 API、数据库或统计口径。

管理员查看工具：仅开发环境的 `administrator` 可打开本地数据预览，调整 7–49 天、原每日支数、实际起始支数、烟瘾和价格，使用既有指标公式计算预览。生成数据只存在组件内存，未调用写入接口、不改变 Store 的真实记录；刷新或切换账户恢复真实数据。此用户名条件仅决定本地视觉工具入口，不授予服务器管理权限。

登录浮窗由 `CoverAuthForm.vue` 复用既有 AuthStore；`LandingView.vue` 负责打开、关闭、焦点限制和成功后的转场，`LoginView.vue` 仅为深链入口。支持 Escape、点击遮罩关闭、焦点恢复、减弱动画和密码清理；认证处理中不允许关闭。仅成功认证后进入转场，失败留在窗口显示错误。

浮窗视觉修订：顶部恢复双环身份图标；账号和密码用输入框内提示呈现，聚焦时隐藏但保留无障碍名称；登录提交与注册切换移至底部。银白边缘、暖金聚焦光线和精简文字保持统一。浏览器回归增加提示隐藏、图标和操作位置检查，桌面与手机截图已更新。

晶体五个模块分别进入每日打卡、数据空间、成就收藏、家庭星图、身份空间。模块共享背景与切面转场；支持者不能进入个人打卡和戒烟设置。旧 `/home`、`/dashboard` 地址保留兼容跳转，不再呈现旧 Dashboard。

## 文件级交付

- 新增 `src/components/WorkflowSpace.vue`、`src/utils/newFlow.ts` 及测试：统一登录和引导外壳、安全的站内登录目标。
- 新增 `src/features/insights/views/InsightsPage.vue`、`adapters/consoleModules.ts` 及测试：正式数据读取、已规定指标、缺失值与零值区分、详情与目标选择。
- 新增 `src/features/constellation/views/FamilySpace.vue`：真实家庭成员、本人状态、既有聊天和快捷鼓励，复用星图与身份晶片。
- 改造 `LoginView.vue`、`FamilySetupView.vue`、`SmokingSetupView.vue`、`AchievementsView.vue`；`ProfileView.vue` 增加家庭设置深链。
- 更新 `App.vue`、路由与回归测试、`HubView.vue`、`HubBusinessModule.vue`、`hubJourney.ts`、`hubModuleRoutes.ts` 及测试，使桌面和手机进入同一套正式页面。
- 更新家庭记录字段映射、光环/数据/晶体/星图渲染生命周期、真实成员配置及身份晶片长昵称样式。
- 更新全局银白主题、模块内嵌样式、仍在使用的 `FamilyChat.vue` 和 `SupporterActivityCard.vue`；保留原消息和陪伴记录行为。陪伴记录不把“已发送”误称为“已送达”。
- 新增 `scripts/verify-new-flow.mjs` 与 `artifacts/new-flow/` 截图和验证结果。

删除以下 18 个旧 UI 文件（业务 Store、API、统计工具继续保留）：

```
src/views/DesktopDashboardView.vue
src/layouts/DesktopLayout.vue
src/views/HomeView.vue
src/views/TrendView.vue
src/views/FamilyView.vue
src/components/AppTabbar.vue
src/components/CigaretteHero.vue
src/components/StatCard.vue
src/components/MetricTrendChart.vue
src/components/SavingsAreaChart.vue
src/components/SmokingHeatmap.vue
src/components/BaselineComparison.vue
src/components/TimeRangeSelector.vue
src/components/FamilyMemberCard.vue
src/components/MilestoneTrack.vue
src/components/QuitterProgressCard.vue
src/components/FamilyMomentCard.vue
src/components/SectionHeader.vue
```

## 验证与截图

- 现有测试：48 个文件、218 项通过。
- 生产构建通过；仍有既有的大包及动态/静态混合导入提示。
- 浏览器回归：登录失败与成功、默认主晶体、旧地址兼容、五个模块进入/返回、真实评分映射、支持者权限、注册引导、手机宽度和退出登录。
- 新增验证：管理员应用预览/返回真实数据不改变原始打卡，未加入家庭时主晶体轻提示、家庭关系内嵌创建与原戒烟设置；截图新增 `family-hint.png`、`progress-admin-preview.png`。
- 验证使用隔离 SDK/数据库回执和家庭 Store 桩，阻断外部网络，没有真实账户或数据库写入。尚需目标环境的真实账号端到端验证。

截图位于 `artifacts/new-flow/`：`login-desktop.png`、`login-mobile.png`、`family-setup.png`、`quit-setup.png`、`checkin.png`、`progress.png`、`data-mobile.png`、`achievements.png`、`support.png`、`profile.png`；验证结果为 `verification.json`。

## 保留边界

每日节省墙：`SavingsWall.vue` 替代节省详情柱形图，每日以卡通人民币钱叠表达原指标的每日差额；钱叠尺寸及层数随金额变化，显示精确的每日估算值与日期，点击后读取当日金额和吸烟量。缺失值留空、零值用中性色、负数保留“超出基线”提示，不夹成零，不改货币计算口径。日期范围与累计数字沿用原详情逻辑。桌面七列、手机三列，墙面可滚动；截图 `savings-wall-desktop.png`、`savings-wall-mobile.png`。生产构建通过，隔离浏览器验证十四个日期、首日 ¥19.50 明细和手机无横向溢出。

鼓励星芒可发现性：本地预设历史为空时提供三颗有明确“示例鼓励”说明的暖金四角星，单独保存至模拟历史且不覆盖已有记录；正式记录不自动补造。真实与模拟星芒均叠加清楚的金色可点击标记，背景小星点保持无交互。预览顶部全屏入口避开中心品牌，嵌入星图适应悬浮面板高度。测试更新为 225 项通过，浏览器验证空历史预设出现三颗星、逐颗追溯入口和持久恢复。

星场与逐星追溯（最新）：撤去核心旁的重复玻璃圈，改为稳定 ID 分布的银蓝/暖金光星，并加入一批合并绘制的远景细星点。记录星具有前后空间深度与轻微呼吸闪烁，减弱动画下保持静止。历史印记显示上限扩展到近期 100 项，鼓励优先保留；背景星仅为空间氛围，不伪造互动。每个可见鼓励星芒都有对应记录点击区域：正式页面显示该记录的发送者、时间、类型与留言，可重播；管理员预览点击单颗星只展示其对应的持久模拟记录。位置由记录 ID 决定，新记录不会重排已有星；按权限读取，不新增后端表。截图 `star-trace-detail.png` 与更新的 `support-immersive.png`。后续旧段落中的 36 项上限和圈形设计已被本条替代。

鼓励历史补充：真实星图新增「鼓励历史」，读取原 `encouragements` 后端表中家庭权限允许的近期最多 100 条，并按当前戒烟者过滤，可查看发送者、类型、时间及重播。重播不发送新请求、不重复产生印记；实时近期数据刷新不会截短已打开的历史列表。发送接口和数据库结构保持原样，补上写入成功回执保护，避免后续滞后读取将新星芒清掉。空间痕迹最多 36 项，为近期鼓励保留最多 18 个配额，其余空间用于打卡，不删除后端历史。管理员模拟历史改为独立、按账户隔离的浏览器存储，重进页面恢复；保存失败回滚，不伪装成功，纯光效预览仍不冒充发送记录。测试现为 50 文件 224 项通过；浏览器验证历史查看/重播、印记不重复、从晶体重新进入后恢复。截图 `encouragement-history.png`。真实账号云端端到端验证尚待目标环境操作，浏览器回归使用隔离回执。

共生星图沉浸与互动痕迹：新增 `ImmersiveToggle.vue`，真实星图与本地样板均可请求浏览器全屏；不支持或拒绝时提供铺满窗口模式。退出或离开页面清理全屏状态，Escape 优先退出沉浸且不误返晶体；弹窗打开时保留原关闭逻辑。新 `interactionTraces.ts` 从当前授权范围的实际打卡、快捷鼓励构建近期 36 项以内的空间记忆：打卡为银蓝玻璃环与小晶体，鼓励为暖金四角星芒。按记录 ID 去重，同一天更正只更新一个光印；聊天不生成鼓励星芒。取消、失败和未保存输入不产生真实痕迹，删除记录后重建视图；这是现有记录的艺术投影，不是新永久成就或新数据库表。本地预设使用独立样本痕迹与模拟发送记录。截图 `support-immersive.png`、`support-traces.png`；测试现为 49 文件 220 项通过，浏览器验证全屏进入退出、14 个实际 fixture 打卡与新确认鼓励生成第 15 项痕迹。共同计划服务尚未启用，不伪造已完成计划记录。

晶体图例：新增 `HubLegend.vue`，右下角空白处将圆环勾选、柱群、星章、三节点连接、同心圆晶片对应到稳定功能面名称，并标明空白预留面。最终样式无底板、边框、阴影及“图例”标题，名称仅中文；删除“拖动旋转”提示，品牌统一 NICØ。原晶体背景、画布尺寸与构图保持原状，不缩小或移位来给说明让路。说明仅在主晶体和开发晶体预览显示，模块展开时隐藏；桌面默认展开、手机默认折叠。未入家庭提示移到左下避免重叠。截图 `hub-legend.png`，构建通过，浏览器验证六项映射与原导航。

全模块预设与可读性：`HubBusinessModule.vue` 为开发环境的管理员提供统一「预设数据」入口，`ModulePresetPreview.vue` 用独立内存数据源展示打卡/49 日档案、数据、成就、星图和身份模块。可预设天数、支数、烟瘾、感受、支持者人数、昵称与展示身份；支持效果、计划样板沿用星图本地工作台。所有模拟修改不调用真实账户写入接口，不伪装持久化设置。切换预设经过原路由离开检查，真实打卡草稿提示继续生效；本地打卡草稿采用单独按账户隔离的 key。返回真实模块恢复原组件。浏览器逐模块对比真实记录、资料和家庭成员，确认未被预设修改；截图为 `checkin-preset.png`、`progress-preset.png`、`achievements-preset.png`、`support-preset.png`、`profile-preset.png`。新增 `readability.css` 提升浅色模块、字段、日期、按钮和详情图的文字对比，白字主按钮、错误反馈与暗场文字按背景保留可读颜色。

背景最终修订：按最新视觉意见，数据页头部、场景画布及悬浮面板底部统一白色。撤去此前地面的冷灰渐变和对应纹理，只使用低透明度阴影接收平面保留悬浮接触关系；玻璃分层、倒角与细反射边缘继续保留。构建与桌面/手机浏览器回归通过，截图已更新。

未修改数据库、权限规则、API 契约或统计公式，未执行生产部署。其他模块与已有未提交工作保留。历史审计与交付文档保留作为迭代记录。

共同计划的新 S4 服务尚无测试部署环境，因此正式页面明确显示未启用；新鼓励元数据、查看时间和细粒度共享尚未启用。家庭读取和快捷鼓励沿用现有服务与权限，不通过前端开关伪造隐私保护。
