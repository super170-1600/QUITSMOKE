# 真实 Supabase 集成验证

> 当前执行状态：本地 `.env` 已配置且 Supabase Auth settings 接口连接成功；数据库 patch 执行状态与真实 A/B/C 多账号流程仍待人工确认。以下“实际结果”在真实验证前必须保持“待验证”，不得以静态构建代替。

本清单不得记录真实密码、access token、anon/publishable key 或测试邮箱。账号标记统一使用 User A/B/C。

## 1. 环境准备

1. 创建 Supabase Project。
2. Dashboard → SQL Editor，执行 `docs/database.sql` 全文；如有错误，停止后续验证并先修复 SQL。
3. Table Editor 确认存在：`profiles`、`families`、`family_members`、`smoking_profiles`、`checkins`、`encouragements`、`messages`。
4. Database → Functions 确认：`handle_new_user`、`is_family_member`、`shares_family_with`、`create_family`、`join_family_by_invite_code`、`leave_current_family`。
5. 确认 `auth.users` 上存在 `on_auth_user_created` trigger，并确认七张业务表已开启 RLS、policies 与 `docs/database.sql` 一致。
6. Authentication → Providers 启用 Email。本地双账号验证可暂时关闭 Confirm Email；若保持开启，必须分别完成验证邮件。
7. Authentication → URL Configuration 设置本地 Site URL `http://localhost:5173`。若 Vite 使用其他端口，以终端实际地址为准。
8. 从 `.env.example` 创建 `.env`，只填写浏览器安全的 URL 和 anon/publishable value，重启 Vite。

## 2. A/B/C 测试矩阵

| 场景 | 操作与预期 | 实际结果 |
|---|---|---|
| User A 注册 | 注册成功；`profiles` 自动出现记录，nickname 为 metadata 或邮箱前缀 | 待验证 |
| A 创建家庭 | 选择 quitter；`create_family` 返回一行 `{ family_id, invite_code }`；A membership 为 quitter | 待验证 |
| A 戒烟设置 | 创建一条自己的 `smoking_profiles` | 待验证 |
| A 今日打卡 | 0 支、烟瘾 2、空备注；`checkin_date` 等于浏览器本地日期 | 待验证 |
| A 刷新 | session、家庭、角色、基线和打卡恢复；Home/Trend 正常 | 待验证 |
| User B 注册 | 使用独立浏览器 Profile/无痕窗口，不能复用 A session；profile trigger 生效 | 待验证 |
| B 加入家庭 | 选择 supporter；RPC 返回 family UUID；B membership 为 supporter | 待验证 |
| B onboarding | 不创建 smoking profile，直接进入 supporter 首页 | 待验证 |
| B 路由限制 | `/setup`、`/checkin` 均重定向 `/home` | 待验证 |
| B 家庭读取 | FamilyView 能读取 A 的真实 streak、今日状态、少吸和节省 | 待验证 |
| B 发鼓励 | 向 A 发送 👏 和“今天也加油”；发送者必须为 B | 待验证 |
| A 看鼓励 | A 重新进入 FamilyView，看到 B nickname、👏 和文字 | 待验证 |
| B 重复绑定 | B 已在 A 家庭时尝试加入或创建另一个家庭，应被明确拒绝 | 待验证 |
| B 退出家庭 | 确认后退出；B 个人数据保留，随后可以加入另一家庭 | 待验证 |
| 创建者退出 | 有剩余成员时所有权移交；最后一人退出时空家庭删除 | 待验证 |
| User C 隔离 | C 不加入 A/B 家庭，不能读取或写入其数据 | 待验证 |

## 3. RPC 与 relation shape

在浏览器 Network response 或临时调试日志中确认，完成后删除临时日志：

- `create_family`：Supabase RPC 应返回数组，首项包含 `family_id`、`invite_code`。
- `join_family_by_invite_code`：应返回 family UUID 字符串。
- `getFamilyMembers`：`profiles!family_members_user_id_fkey(nickname)` 通常返回单个嵌套 object；API 同时兼容 object/array/null。
- `getEncouragements`：`profiles!encouragements_from_user_id_fkey(nickname)` 同样在 API 层兼容 object/array/null。

若真实 shape 不同，只修改 API mapping，不把数据库结构差异扩散到 Vue 页面。

## 4. 必须直接验证的 RLS

以下请求必须使用各用户自己的 authenticated client/JWT，不得使用 `service_role`。不能只依靠隐藏按钮判断权限。

| 身份 | 直接请求 | 预期 |
|---|---|---|
| B | SELECT A `smoking_profiles` | 成功，返回 A 记录 |
| B | SELECT A `checkins` | 成功，返回 A 记录 |
| B | UPDATE A checkin | 失败或更新 0 行 |
| B | DELETE A checkin | 失败或删除 0 行 |
| B | INSERT `user_id=A` checkin | RLS 拒绝 |
| C | SELECT A profile/smoking profile/checkins/encouragements | 返回 0 行 |
| C | INSERT A/B family encouragement | RLS 拒绝 |
| C | 直接 INSERT `family_members` | 权限/RLS 拒绝 |
| C | 使用合法邀请码调用 join RPC | 成功，这是预期授权流程 |

对于 UPDATE/DELETE 的“0 行”结果，应再查询 A 原记录确认没有变化。记录 HTTP 状态、PostgREST error code 与结果，但不要把 token 或密码写入本文档。

## 5. 错误、刷新与请求检查

- 错误邀请码显示“没有找到这个家庭，请检查邀请码”，不显示 SQLSTATE/PostgREST JSON。
- 非法打卡值被 UI 和数据库约束拒绝；长鼓励消息在 200 字前端限制处被阻止。
- A/B 刷新后不应闪现错误 onboarding 页面。
- Network 中不应出现导航循环、同一 membership/profile 的连续重复请求或多次无意义 `getSession`。
- Console 不应出现 unhandled rejection、Vue warning、TypeError、未处理 RLS 错误或 ECharts DOM size error。

## 6. 部署前 Checklist

- [ ] `.env`、`.env.local`、`.env.*.local` 未被提交；`.env.example` 不含真实值。
- [ ] 生产环境只配置 `VITE_SUPABASE_URL` 与浏览器安全的 `VITE_SUPABASE_ANON_KEY`。
- [ ] `npm test`、`vue-tsc -b`、`npm run build` 通过。
- [ ] `dist/_redirects` 存在，直接访问 `/home`、`/family`、`/trend` 不返回 404。
- [ ] Supabase Auth Site URL 和 Redirect URLs 包含生产域名。
- [ ] A/B/C 测试矩阵与 RLS 表格全部填写真实结果。
- [ ] 浏览器 Network/Console 检查完成。

## 7. 验证记录

- Supabase project（只写项目代号，不写 URL/key）：待填写
- database.sql 执行时间与结果：待填写
- 测试日期/浏览器：待填写
- A 流程：待验证
- B 流程：待验证
- C/RLS：待验证
- RPC shape：待验证
- Relation shape：待验证
- Refresh/onboarding：待验证
- Network/Console：待验证
- 发现问题及修复：待填写
