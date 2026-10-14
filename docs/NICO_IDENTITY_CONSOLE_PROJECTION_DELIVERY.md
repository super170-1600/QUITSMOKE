# NICØ Identity Console / Identity Projection 视觉迭代

日期：2026-10-13。用户授权两处视觉变更。本轮为本地样板，不接真实账户、不调用业务接口、不执行数据库迁移；P2 真实设置接入仍未开始。

## 本轮结果

个人中心六项入口改为薄光学控制单元：英文识别码、功能名、纤细图标、边缘一次滑光。没有厚玻璃容器。支持者仍隐藏戒烟设置。

新增统一底线输入 IdentityField，聚焦暖金底线、明确文字错误。昵称输入实时更新样板晶片；“预览更改”只校验本地输入，不持久化，不产生假保存成功或账户反馈。底部改为“本地样板 · 不保存”。

新增 IdentityCard full/compact 与 identityTokens.css，复用 IdentityModel、银色、暖金、玻璃表面、精细边缘参数；full 保留大晶片，compact 使用独立简洁布局，不缩小整张大卡。暗场微型晶片只展示样本支持者昵称和角色，不暴露技术 ID。

星图保留一核双轨。光核沿各自开放轨道做缓慢小范围移动。点击支持者时 Three.js 光核向相机前景移动并收小，同步展开暗色身份晶片。五种鼓励预览使用粒子、流星、波纹、光瓣、星环造型。操作后晶片蓄能约 0.65 秒，光核约 0.85 秒回到原轨道，再调用已有鼓励演出。

这是 Three.js 光核移动与 CSS 晶片展开的组合，不是 GLB 网格拓扑真正变形成玻璃卡。鼓励传播仍复用既有空间曲线效果，尚未改为严格沿轨道采样的传输。

## 角色与失败处理

- 默认模拟戒烟者只可预览，无发送入口。
- 样板设置中的“体验身份”明确切换模拟戒烟者、知夏或亦安。
- 只有当前模拟支持者自己的晶片可模拟发送；发送处理函数也检查身份，不仅隐藏按钮。
- 戒烟者可查看收到的本页模拟记录；支持者只查看自己的记录，其他支持者晶片不显示第三方记录。
- 模拟提交失败保留输入和晶片，不触发成功演出；重试成功后才蓄能、收拢、播放。
- 账号真实权限未因此启用；真实数据接入必须继续使用 S4 服务端鉴权与可靠回执。
- 系统减弱动画、关闭场景动画时光核前移与返回直接完成，CSS 蓄能动画停用。

## 文件清单

新增：
- src/features/identity/ui/IdentityCard.vue
- src/features/identity/ui/identityTokens.css
- src/features/identity/ui/IdentityField.vue
- src/features/constellation/ui/IdentityProjection.vue
- scripts/verify-identity-projection.mjs
- 本报告

修改：
- src/features/identity/types.ts：六项英文识别码。
- src/features/identity/ui/IdentityChip.vue：采用共享表面参数。
- src/features/identity/ui/IdentitySpace.vue：使用 IdentityCard。
- src/features/identity/ui/IdentitySettingsList.vue：精密控制单元。
- src/features/identity/preview/IdentityDemo.vue：昵称本地预览及底线输入。
- src/features/constellation/scene/scene.ts：光核前景投影、回轨、轻微轨道运动、减弱动画和生命周期处理。
- src/features/constellation/ui/ConstellationCanvas.vue：暴露光核投影控制。
- src/features/constellation/ui/ConstellationWorkbench.vue：同步模拟角色入口。
- src/features/constellation/preview/ConstellationDemo.vue：身份投影、模拟发送守卫与记录过滤。

无新依赖，无数据库/RLS/API/统计公式修改，原 ProfileView 保留。

## 预览与截图

- [Identity Console](http://127.0.0.1:5173/#/__identity-demo)
- [Identity Projection](http://127.0.0.1:5173/#/__constellation-demo)：点击任一支持者光核；“⋯”可切换模拟身份。
- [控制台桌面](../artifacts/identity-console-projection/console.png)
- [底线表单](../artifacts/identity-console-projection/form.png)
- [戒烟者只预览](../artifacts/identity-console-projection/projection-quitter.png)
- [支持者本人晶片](../artifacts/identity-console-projection/projection-own.png)
- [星环蓄能](../artifacts/identity-console-projection/charge-halo.png)
- [控制台手机](../artifacts/identity-console-projection/console-mobile.png)
- [投影手机](../artifacts/identity-console-projection/projection-mobile.png)

## 验证

npm test：44 个文件、204 项通过。npm run build：TypeScript 和 Vite 通过，既有大包与混合导入警告保留。

浏览器验证昵称实时预览、空昵称错误、光核前移与回到原位置、仅本人可模拟发送、第三方记录不显示、失败保留输入且不庆祝、蓄能与回轨后演出、手机与减弱动画。外部网络请求为 0。结构化结果见 artifacts/identity-console-projection/verification.json。

本轮停在视觉验收，不部署、不启用真实账户设置或真实鼓励。后续若确认，再做 P2 真实设置接入；S4 真实鼓励仍受测试数据库尚未建立的条件限制。
