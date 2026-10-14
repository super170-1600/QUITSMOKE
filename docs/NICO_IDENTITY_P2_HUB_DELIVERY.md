# 主晶体入口整合与 Identity P2 交付

2026-10-14。本轮范围：串联开发视觉样板；将个人中心接入已有真实 API、Store 和认证逻辑。没有部署或迁移数据库，没有修改 RLS、API 契约或统计公式。

## 入口整合

- DEV /__hub-module/checkin → 既有 Daily Pulse 本地样板，包含光环档案。
- DEV /__hub-module/progress → Orbital Console 本地样板。
- DEV /__hub-module/support → 共生星图本地样板，新鼓励/计划仍不启用真实写入。
- DEV /__hub-module/profile → Identity 本地视觉样板。
- 成就保留已有真实组件和登录入口；04 保留空白。没有为成就伪造新样本或数据。
- 开发样板 route 使用 localDemo，只在 DEV 存在；正式业务路径仍要求登录，正式 checkin/setting 仍限制支持者。
- 正式 /hub 的数据和家庭支持模块继续沿用真实 TrendView、FamilyView，不把艺术样板数据显示为真实业务。
- 模块内查询参数变化保留晶体共享背景；普通 /profile 在桌面重定向到 /dashboard?module=profile，显示模式切换保持个人模块。

这意味着本轮完成入口连接与身份实际接入，不意味着 Orbital/共生星图等全部艺术样板已经替换正式业务页面。

## Identity P2

- ProfileView 使用 IdentitySpace，替换旧个人中心设置卡片布局。
- 读取真实 profiles，默认晶片只显示昵称、当前家庭角色与已登录状态。
- 资料加载失败显示错误和重新读取；不把失败当空白成功。
- 修改昵称复用 updateMyNickname；仅成功回执更新 auth.profile 和自己的家庭昵称；失败保留输入。
- 戒烟设置复用 saveSmokingProfile，仅当前登录用户的戒烟者身份可写；保持原四个字段、统计公式与缓存失效逻辑。
- 家庭列表显示全部真实成员，不以两条支持轨道删减家庭成员。
- 创建/加入及管理链接沿用原流程。退出家庭复用确认、family.leaveFamily、家庭动态清理，解释管理权移交或最后一人退出的实际影响。
- 原支持者陪伴记录保留在家庭设置面板，复用既有 SupporterActivityCard/Store。
- 隐私展示旧业务规则，不放假隐私开关；S4 新共享规则尚未启用。
- 自动/手机/桌面显示模式沿用现有持久化实现，不新增空主题、粒子或质量开关。
- 账户安全复用退出登录，保留开发诊断入口的环境与角色限制。
- 保存回执确认后触发一次 0.65 秒边缘反馈；减弱动画时省略。
- 账号切换及组件卸载丢弃旧异步结果、输入、错误与成功反馈；不显示用户 ID/家庭 ID。
- 晶体悬浮面板隐藏重复的身份顶部导航；长昵称省略显示，点击身份晶片可查看完整昵称。

## 文件清单

新增：
- src/features/identity/composables/useIdentityAccount.ts
- src/features/identity/composables/useIdentityAccount.test.ts
- scripts/verify-identity-p2-hub.mjs
- 本报告

修改：
- src/views/ProfileView.vue
- src/features/identity/ui/IdentitySpace.vue
- src/features/identity/ui/IdentityChip.vue
- src/components/HubBusinessModule.vue
- src/views/HubModulePreview.vue
- src/router/routes.ts
- src/router/index.ts
- src/router/hubRegression.test.ts
- src/App.vue
- src/styles/hubModules.css

在既有未提交内容上局部修改；没有清理、回滚其他工作。

## 验证

- npm test：45 个文件、212 项通过。
- npm run build：TypeScript 与 Vite 通过；既有混合导入和大包提示保留。
- 新测试覆盖昵称成功/失败、回执身份、账户切换、角色作用域、日期验证、重复点击、卸载后回执、桌面与手机个人深链。
- 浏览器脚本实际运行生产页面/API/Store/路由代码，但在浏览器内存中注入隔离 CloudBase SDK/数据库回执并阻断外部网络；**不是线上账户验收，也没有线上写入**。
- 浏览器验证四个开发模块深链、昵称写入成功与失败、家庭退出取消、显示模式持久化、支持者隐藏戒烟入口、晶体进入/返回及 auth.logout 清理。
- 家庭退出确认后的实际线上 RPC、真实账户切换、网络断开、重登和刷新恢复仍需真实测试环境验证。共生星图 S4 的测试数据库依然未建立。

[结构化浏览器结果](../artifacts/identity-p2-hub/verification.json)

## 预览与截图

- [晶体开发预览](http://127.0.0.1:5173/#/__hub-preview)
- [真实个人入口（需登录）](http://127.0.0.1:5173/#/profile)
- [身份本地样板](http://127.0.0.1:5173/#/__identity-demo)
- [个人中心桌面](../artifacts/identity-p2-hub/profile-desktop.png)
- [昵称确认](../artifacts/identity-p2-hub/nickname-confirmed.png)
- [手机布局](../artifacts/identity-p2-hub/profile-mobile.png)
- [支持者手机](../artifacts/identity-p2-hub/supporter-mobile.png)
- [晶体悬浮面板](../artifacts/identity-p2-hub/profile-crystal-panel.png)

截图里的账户与家庭都是明确的隔离验收数据。

本轮完成后停止，等待确认；正式艺术数据中心及共生星图真实接入、完整 P3 线上验收和生产发布仍未完成。
