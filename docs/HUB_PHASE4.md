# Phase 4 — 现有业务模块接入

本阶段把晶体的五个功能面接入原有业务组件，保留 04 空白面。背景和 Three.js 场景持续存在；模块使用统一银白、暖光、半透明玻璃面板。没有新增依赖，没有修改数据库、API、统计计算、账户存储或消息实时订阅实现。

## 模块与复用

| 功能面 | 内容 | 原有实现 |
|---|---|---|
| 01 打卡 | 吸烟量、烟瘾、感受、记录提交 | CheckinView + smoking store |
| 02 数据 | 趋势、日历、节省记录、家庭成员切换 | TrendView + 原有图表和统计 |
| 03 成就 | 当前连续无烟、1/3/7/14/30 天里程碑、最长连续无烟、累计记录 | MilestoneTrack + 原有统计；新增独立呈现页面 |
| 04 | 空白预留 | 不加载业务内容 |
| 05 支持 | 家庭进展、消息、鼓励、邀请、成员管理 | FamilyView + 原有 family/message/encouragement stores |
| 06 我的 | 资料、家庭身份、戒烟设置、显示模式、退出 | ProfileView + 原有设置与认证流程 |

成就采用已有 currentStreak 的当前达标状态，没有新增永久徽章、历史奖励数据库或新的健康计算。

## 文件清单

新增：

- `src/components/HubBusinessModule.vue`：动态加载五个业务组件、未登录及支持者打卡访问提示。
- `src/views/AchievementsView.vue`：既有里程碑和统计的独立呈现。
- `src/styles/hubModules.css`：只作用于模块容器的光学面板主题、桌面排版及手机适配。
- `src/visuals/hubModuleRoutes.ts`、对应 `.test.ts`：既有受保护路径与模块 query 的严格映射。
- `scripts/verify-hub-phase4.mjs`：隔离浏览器业务组件回归、截图与验收页生成。
- 本报告。

更新：

- `src/App.vue`：共享晶体背景上加载模块，保留模块身份与显示模式切换；设置编辑沿用原页面。
- `src/views/HubView.vue`：功能面进入相应模块；修复 Escape 提前取消转场时场景卸载的竞态。
- `src/views/HubModulePreview.vue`：开发入口接同一业务组件，匿名状态不读取真实业务数据。
- `src/router/index.ts`：保留原有认证、角色、引导守卫；桌面/手机转换携带经过验证的模块 query。
- `src/components/AppTabbar.vue`：模块内部切换携带模块身份；常规旧页面保留旧行为。
- `src/views/CheckinView.vue`：模块内保存后进入数据模块，原有非模块保存流程不变。
- `src/views/FamilyView.vue`：查看成员趋势携带数据模块身份，保留 member query。
- `src/views/ProfileView.vue`：桌面显示模式切换保留个人模块。
- `scripts/verify-hub-phase3.mjs`：补充真实图标抬升、加载面板复用、连续开关与取消回归。

原有未提交的 Blender、GLB、首页、灯光和其他阶段文件均保留，未清理或重置。

## 检查结果

- Vitest：32 个测试文件、133 个测试通过。
- `npm run build`：类型检查及生产构建通过；仍有原有依赖混合导入与较大 chunk 提示。
- Phase 3 浏览器回归：真实 3D 图标抬升、同一场景/面板复用、姿态保留、返回后悬停不重开、Escape、连续 Enter、浏览器后退、五个面、减少动效、刷新、手机端、匿名九条受保护路径、WebGL 丢失处理通过。
- Phase 4：五个原有业务组件加载、打卡表单调用现有提交 action、手机不横向溢出、支持者打卡限制、错误重试、正式桌面模块路径、桌面/手机切换保留模块、原有支持者路由守卫和匿名访问提示通过。
- 浏览器截图：`artifacts/hub-phase4/index.html`；机器结果：同目录 `verification.json`。

## 验证边界与后续调整

浏览器验收注入的是隔离 Pinia 测试记录，所有外部网络请求被阻断，提交 action 由测试替身捕获参数。截图清楚标注测试数据，不向真实数据库写入。真实账号的打卡持久化、邀请、消息发送与实时订阅仍需在用户自己的登录环境验收；本轮未声称验证真实后端写入。

图表继续使用原有吸烟/无烟颜色语义，未改统计公式。邀请、确认、编辑表单等次级流程继续使用原有组件；本轮优先完成五个主要模块与共享玻璃容器。后续可依据视觉反馈逐个精修卡片、图表配色与次级弹窗，而不更换业务实现。

本阶段完成后停留在视觉与业务接入验收，不自动推进新阶段。
