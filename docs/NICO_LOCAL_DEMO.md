# 免登录打卡测试版

入口：开发服务 `/#/__pulse-demo`。只在 Vite DEV 注册，生产构建没有该路由。

复用正式 CheckinView、DailyHalo 和 HaloArchive，通过可选 source 注入独立本地仓库；不设置假登录、不更改 auth/family/smoking 账户状态。正式页面默认仍使用原 smoking store。示例覆盖过去 28 天，今天和昨天初始空白，可保存、修改和补签；四圈七槽按真实自然日排列。

浏览器记录仅写 `nico-local-pulse-demo-v1`，草稿仅写 `nico-local-pulse-demo-drafts`。恢复示例操作要求明确确认，只清理测试命名空间。保存失败不更新视图；刷新能读回本地记录。页面顶部明确标注“免登录测试 · 示例数据”，不会暗示已保存到账号。

新增：`src/visuals/pulseDemo.ts`、对应单测、`src/views/PulseDemoView.vue`、`scripts/verify-pulse-demo.mjs`。更新：CheckinView 的可选数据源及草稿命名空间、DEV 路由与专用守卫分支；dailyPulse.css 给隐藏标签增加正确定位容器，修复独立测试页手机横向溢出。

检查：152 项单测通过；类型检查和生产构建通过。真实浏览器验证匿名直达、填写保存、刷新回读、28 个节点、手机布局、恢复示例、零外部请求。正式 `/hub` 仍转到登录页。证据：`artifacts/nico-pulse-demo/verification.json`、archive.png、mobile.png。

无新依赖、无服务器数据写入，保留既有未提交改动。
