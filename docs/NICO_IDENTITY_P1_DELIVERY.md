# NICØ Identity — Phase P1 视觉骨架

2026-10-13。P0 通过后实施。本阶段到此停止，等待视觉确认，不进入 P2。

## 预览

- 戒烟者：http://127.0.0.1:5173/#/__identity-demo
- 支持者：http://127.0.0.1:5173/#/__identity-demo?role=supporter
- 静态降级：http://127.0.0.1:5173/#/__identity-demo?static=1
- [桌面截图](../artifacts/identity-p1/desktop.png)
- [手机截图](../artifacts/identity-p1/mobile.png)
- [支持者截图](../artifacts/identity-p1/supporter.png)
- [个人资料面板](../artifacts/identity-p1/personal-panel.png)
- [手机家庭面板](../artifacts/identity-p1/mobile-family.png)
- [静态晶片](../artifacts/identity-p1/static.png)
- [截图集合](../artifacts/identity-p1/index.html)

## 实现

暖白空间、银色切边、透明晶片及局部暖金反光；中央不加大型标题。晶片只展示样本昵称、角色和“本地样本”，不显示手机号、用户 ID、家庭 ID 或未经验证的注册日期。

设置总览是细分隔线的列表，桌面双列，手机单列。支持者隐藏戒烟设置。点击设置后晶片缩小上移，内容在同一背景中展开；返回与 Escape 恢复入口焦点。

晶片采用 CSS 3D，没有加载 Three.js 或新增依赖。包含前面、背部切边、光学纹理、几何身份符号、接触阴影及微小悬浮。中央移除不透明金属底板，仅切边保留金属层。鼠标倾斜被限制在 5° 内，触摸不依赖倾斜。

系统 prefers-reduced-motion 与静态预览均停止呼吸与倾斜动画；静态显示不依赖 WebGL。

## 文件清单

新增：

- src/features/identity/types.ts
- src/features/identity/ui/IdentityIcon.vue
- src/features/identity/ui/IdentityChip.vue
- src/features/identity/ui/IdentitySettingsList.vue
- src/features/identity/ui/IdentitySpace.vue
- src/features/identity/preview/IdentityDemo.vue
- scripts/verify-identity-p1.mjs
- 本报告

修改：src/router/routes.ts，仅新增 DEV 且 localDemo 的 /__identity-demo 路由。

原 ProfileView、认证、家庭、戒烟 Store、API、数据库及其他模块保留。既有未提交修改未清理或覆盖。

## 验证

- npm test：44 个文件、204 项测试通过。
- npm run build：TypeScript 与 Vite 通过；保留原有大包和混合导入提示。
- node scripts/verify-identity-p1.mjs：通过。
- 桌面 1440×1000、手机 390×844，手机无横向溢出。
- 戒烟者六项入口、支持者五项入口；页面没有可写表单、假保存或假退出。
- 键盘进入、Escape 返回、转场后焦点恢复、点击晶片、刷新、返回链接、最大倾角及静态模式验证通过。
- 预览期间外部网络请求为 0，无业务 API 调用。
- [结构化结果](../artifacts/identity-p1/verification.json)

## 规范差异与 P2 待办

1. 当前所有身份与设置数据都是明确标注的只读样本，尚未绑定真实账户；这是 P1 骨架，不是账户管理交付。
2. CSS 光学外观不具有物理折射或 HDR 环境反射。保留轻量实现，视觉验收后再决定是否需要 WebGL，不以效果图冒充实时场景。
3. 返回图标目前链接到开发晶体预览；真实切面聚合转场在 P2 使用现有 Hub Journey 接入。
4. 退出登录及提交成功边缘光线在 P2 接入真实认证/保存回执后实现。本阶段不提供假成功反馈。
5. 显示面板只读展示样板值；右下静态图标是当前样板的临时预览控制，不宣称全局偏好持久化。
6. 真实隐私面板需保留旧家庭权限与尚未部署的 S4 契约之间的区别，本轮没有启用任何新隐私设置。

P2 将复用 updateMyNickname、saveSmokingProfile、家庭 Store 和 auth.logout，保持原业务契约。视觉验收前不替换原 ProfileView。
