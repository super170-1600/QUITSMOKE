# CloudBase 前端最小链路检查单

此检查单用于 `VITE_BACKEND_PROVIDER=cloudbase`。准备两个测试账号：A（quitter）和 B（supporter）。每一步成功后再继续下一步，并同时查看浏览器 Network 与 Console。

1. 在 CloudBase 控制台或可信服务端创建 A（当前官方 SDK 不允许网页端仅用户名 + 密码注册）：确认 `auth.users` 新增用户，`public.profiles` trigger 自动生成同 ID 的 profile。
2. 登录 A：确认进入应用，而不是停留在 `/login`。
3. 刷新浏览器：确认 session 恢复并仍能进入受保护页面。
4. 读取 profile：确认“我的”和桌面顶部显示昵称；Network 中业务查询携带登录 token。
5. A 创建家庭：确认 `create_family` 成功，返回业务 UUID `family_id` 和邀请码。
6. 同样创建并登录 B，用邀请码加入：确认 `join_family_by_invite_code` 成功；同一账号不能再加入第二个家庭。
7. 切回 A，创建或更新 smoking profile。
8. A 新建当天 check-in；确认列表、首页和趋势读取正常。
9. A 修改同一 check-in；确认是 UPDATE，`unique(user_id, checkin_date)` 未产生重复行。
10. B 登录后读取 A 的戒烟档案和打卡趋势；尝试写入 A 数据应被 RLS 拒绝。
11. B 向 A 发送快捷鼓励；刷新后两端均能读取。
12. A 或 B 发送文字消息；发送方本地立即出现，另一端手动刷新后出现。

CloudBase PostgreSQL Realtime 本轮未接入，因此第 11、12 步不要求另一端自动更新。任何失败都应记录 HTTP 状态、CloudBase 错误 code/message 和对应步骤；用户界面只显示统一的友好提示。
