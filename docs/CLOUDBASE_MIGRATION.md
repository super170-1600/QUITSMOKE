# Supabase → CloudBase PostgreSQL 迁移说明

本文对应当前项目的 CloudBase 专用数据库文件：

- `database_cloudbase.sql`：全新 CloudBase PostgreSQL 环境的完整结构、函数、权限和 RLS。
- `messages_patch_cloudbase.sql`：仅供“已有 bigint 版 CloudBase 核心表、尚未安装聊天表”的环境补装聊天功能。
- 原有 `database.sql`、`messages_patch.sql` 仍是 Supabase 版本，不应在 CloudBase 执行。

## 1. 目标环境约束

这两份 SQL 按当前项目已经实测的 CloudBase 环境编写：

- `auth.users.id` 是 `bigint`。
- 登录请求的 JWT `sub` 可以安全转换为同一个 `bigint` 用户 ID。
- `auth.users` 至少有 `id`、`name`、`username`、`email` 字段。
- 数据库存在 `anon`、`authenticated`、`service_role` 三种角色。

> 重要：CloudBase 的公开文档目前也描述了 `auth.users.id = varchar(64)` 的另一种 PG 环境形态。项目的实测实例与该文档形态不同，因此 `database_cloudbase.sql` 会在第一张业务表创建前检查 `auth.users.id`，不是 `bigint` 就立即终止。不要删除该检查，也不要把 bigint 脚本用于 varchar 型环境。

部署前先在目标环境执行：

```sql
select
  c.column_name,
  c.data_type,
  c.udt_name
from information_schema.columns c
where c.table_schema = 'auth'
  and c.table_name = 'users'
  and c.column_name in ('id', 'sub', 'name', 'username', 'email')
order by c.ordinal_position;
```

还必须用一次真实登录后的请求验证 JWT `sub` 与 `auth.users.id` 相同。SQL 编辑器本身通常没有用户 JWT，不能用编辑器里返回 `null` 判断登录链路是否正确。

CloudBase 官方资料可参考：[PG 身份认证](https://docs.cloudbase.net/authentication-v2/auth/auth-pg)、[PG 模式概述](https://docs.cloudbase.net/quick-start/pg-overview)、[PostgreSQL 快速开始](https://docs.cloudbase.net/en/database/postgresql/quickstart)。发生冲突时，以目标实例实际表结构和网关注入的 claims 为准。

## 2. 用户 ID 类型变化

数据库中的业务实体仍使用 UUID，用户引用改为 bigint：

| 对象 | CloudBase 类型 |
| --- | --- |
| `profiles.id` | `bigint`，引用 `auth.users(id)` |
| `families.id` | `uuid` |
| `families.created_by` | `bigint` |
| `family_members.id` | `uuid` |
| `family_members.user_id` | `bigint` |
| `smoking_profiles.id` | `uuid` |
| `smoking_profiles.user_id` | `bigint` |
| `checkins.id` | `uuid` |
| `checkins.user_id` | `bigint` |
| `encouragements.from_user_id` / `to_user_id` | `bigint` |
| `messages.id` / `family_id` | `uuid` |
| `messages.sender_id` | `bigint` |

`shares_family_with()` 的用户参数以及 `create_family()`、`join_family_by_invite_code()`、`leave_current_family()` 内部用户变量也已改成 bigint。RPC 仍不接受客户端提供的 `user_id`，身份只能来自请求 JWT。

### 旧数据不能直接强转

Supabase Auth 用户 ID 是 UUID，不能直接转换成 CloudBase bigint。迁移真实数据时必须：

1. 先通过 CloudBase Auth 的受支持方式创建或导入用户。
2. 建立一次性的 `Supabase UUID → CloudBase bigint` 映射，通常以经过验证的邮箱或外部账号标识匹配。
3. 导入 `profiles` 及所有用户引用表时用映射替换 ID。
4. 家庭、打卡、消息等业务 UUID 可以原样保留，但所有用户外键必须先完成映射。
5. 对映射数量、空值、重复邮箱和孤立外键做审计后再切流量。

不要自行向 `auth.users` 插入伪造记录；Auth 用户导入应使用 CloudBase 支持的管理接口或控制台能力。

## 3. JWT 与统一身份 helper

CloudBase 版创建了：

```sql
public.current_user_id()      returns bigint
public.current_request_role() returns text
```

`current_user_id()` 先读取目标控制台提示的 `request.jwt.claim.sub`；没有该单值设置时，再读取 PostgREST 标准的 `request.jwt.claims` JSON 中的 `sub`。它对以下情况都返回 `null`，不会抛出 cast 错误：

- claim 不存在；
- 空字符串；
- claims 不是合法 JSON；
- `sub` 不是纯数字；
- 数字超出 bigint 范围。

所有 RLS、家庭 helper 和用户操作 RPC 都只调用该 helper，不再散落 `auth.uid()` 或复杂的 `current_setting(...)` 表达式。`current_request_role()` 同样集中处理单值 claim 和 PostgREST claims JSON。

CloudBase 网关会把 JWT 转成数据库角色和 `request.jwt.claims`，这是 PostgREST 权限链的一部分：[架构与权限模型](https://docs.cloudbase.net/database/configuration/db/postgresql/initialization)。

## 4. Auth 用户与 profile trigger

Supabase 版使用 `raw_user_meta_data ->> 'nickname'`。CloudBase 专用 trigger 不引用这个未确认存在的字段，昵称顺序改为：

1. `auth.users.name`
2. `auth.users.username`
3. `auth.users.email` 的 `@` 前缀
4. `用户`

脚本会先回填已有 Auth 用户，再安装 `auth.users` 的 `AFTER INSERT` trigger。`profiles.id` 保留到 `auth.users.id` 的外键。

虽然 CloudBase PG 支持标准 PostgreSQL 外键和 trigger，但不同托管版本可能限制对 `auth` schema 建 trigger 的权限。应使用 SQL 编辑器的管理员身份执行。如果目标租户明确拒绝在 `auth.users` 创建 trigger，不要降低 RLS 或让前端任意插入 profile；应把 profile 初始化改为受信任的服务端 Auth hook/云函数，并作为单独迁移任务处理。

## 5. RLS 与 RPC 安全

保留的权限语义：

- 用户只能更新自己的 profile。
- 用户只能新增、修改、删除自己的 smoking profile 和 check-in。
- 同家庭成员可以只读查看彼此 profile、戒烟档案和打卡。
- supporter 无法修改 quitter 的戒烟数据。
- 家庭成员只能读取本家庭的鼓励和消息。
- 鼓励发送人、文字消息发送人必须等于当前 JWT 用户。
- 加入/创建家庭都不能传入可伪造的用户 ID。
- 每个用户最多属于一个家庭；退出家庭继续走受控 RPC。

`anon` 没有任何业务表权限。`authenticated` 只得到业务所需的最小表权限。`service_role` 具有管理权限，并按 CloudBase 语义绕过 RLS；它只能用于可信服务端，绝不能进入 Vite 环境变量或浏览器 bundle。

CloudBase 官方 RPC 文档指出，当前网关层可能不会把 `GRANT EXECUTE` 当作 RPC 端点的完整安全边界。因此：

- 所有面向用户的 `SECURITY DEFINER` RPC 都在函数体内再次检查 `role = authenticated` 和 `current_user_id() is not null`。
- `GRANT` / `REVOKE` 仍保留，作为 PostgreSQL 层的纵深防御。
- `is_family_member()` / `shares_family_with()` 对匿名调用直接返回 false。
- trigger-only 函数不接收客户端 user ID，且撤销了 PUBLIC 权限。

参见 CloudBase 的 [RPC 安全说明](https://docs.cloudbase.net/database/postgresql/rpc)。

## 6. SQL 执行顺序

### 全新 CloudBase 环境

1. 确认该环境是 PostgreSQL 模式，完成第 1 节的字段检查。
2. 备份目标环境。
3. 在 SQL 编辑器中执行整个 `docs/database_cloudbase.sql`。
4. **不要再执行** `messages_patch_cloudbase.sql`，因为完整脚本已经包含 messages。
5. 创建测试用户并验证 profile trigger。
6. 用两个不同家庭的测试用户验证 RLS，再开始导入真实业务数据。
7. 完成前端 CloudBase 适配后再切换生产流量。

完整脚本使用事务包装；任一结构、字段或权限检查失败时应整体回滚。

### 已有 CloudBase bigint 核心库、仅缺聊天功能

1. 确认 `public.profiles.id` 已是 bigint，并且已有 `current_user_id()` 和 `is_family_member(uuid)`。
2. 执行 `docs/messages_patch_cloudbase.sql`。
3. 不要执行 Supabase 的 `docs/messages_patch.sql`。

### 通过 ExecutePGSql 自动部署

CloudBase 的 `ExecutePGSql` 对多语句和部分 DDL 有额外限制。本文两份文件以“SQL 编辑器整份执行”为交付形式；若改成 CI/CD，应使用 SQL-aware migration runner 按语句和事务边界处理，不能按文本中的分号粗暴切分 PL/pgSQL 函数。CloudBase 对 DDL 执行限制的说明见[常见错误速查](https://docs.cloudbase.net/database/postgresql/troubleshooting/common-errors)。

## 7. 兼容性清单

| 项目 | 处理结果 |
| --- | --- |
| `auth.uid()` | CloudBase 文件中不使用；统一为 `public.current_user_id()` |
| JWT claim | helper 兼容单值 `request.jwt.claim.sub` 与 PostgREST `request.jwt.claims` JSON |
| `auth.users.id` | 按实测环境使用 bigint，并有 fail-fast 类型检查 |
| `raw_user_meta_data` | 不使用；昵称改读 `name` / `username` / `email` |
| `anon` / `authenticated` / `service_role` | 按 CloudBase 三角色模型显式 GRANT/RLS |
| `SECURITY DEFINER` | 保留 `SET search_path = ''`，用户 RPC 增加函数体内身份检查 |
| `gen_random_uuid()` | 保留业务 UUID；脚本显式启用 CloudBase 支持的 `pgcrypto` |
| PostgREST CRUD / RPC | 数据库端兼容；RPC 名称和参数名保持不变 |
| `notify pgrst` | CloudBase 文件中删除，不假设可直接控制托管网关 schema cache |
| `supabase_realtime` publication | CloudBase 文件中删除，不创建或伪造同名 publication |
| Supabase Realtime channel | 不兼容性未被证明，前端必须单独改造 |

CloudBase 确认支持 PostgreSQL、PostgREST CRUD/RPC、GRANT 和 RLS；`pgcrypto` 也在 CloudBase 扩展说明中使用：[连接 PostgreSQL](https://docs.cloudbase.net/database/postgresql/connecting-to-postgresql)、[`tencentdb_scf`/pgcrypto 说明](https://docs.cloudbase.net/en/database/postgresql/tencentdb-scf)。

## 8. 哪些功能数据库端可直接保留

- 六类核心业务数据与 messages 表的关系结构。
- 一人一个家庭约束。
- 创建、加入、退出家庭的事务逻辑和 RPC 名称。
- smoking profile、check-in、鼓励、家庭消息的 RLS 业务语义。
- 打卡自动生成家庭事件和 3/7/14/30 天里程碑。
- 原有 statistics.ts 计算口径；它不依赖数据库厂商。
- ECharts、页面布局和其他纯前端展示逻辑。

“数据库端兼容”不等于浏览器可以直接复用 Supabase Session。当前前端已经增加 provider adapter；通过环境变量切换后，业务 API、Pinia 和 UI 会继续复用同一套代码。

## 9. 当前前端适配状态

### Auth：已完成最小接入

`src/services/cloudbase.ts` 使用 `@cloudbase/js-sdk` 初始化 CloudBase；`src/services/backend/` 把两种 SDK 的用户和 Session 映射到统一前端模型。Supabase client 和 Auth 实现仍然保留，可以随时切回。

CloudBase 模式当前支持：

- 用户名 + 密码登录和退出；
- local persistence 下的 session 恢复及 auth state change；
- 登录后读取 `profiles`；
- Router 继续使用同一个 Auth store 守卫；
- 前端域模型不再依赖 Supabase `Session` 类型。

用户名 + 密码的注册入口已经接到官方 `auth.signUp()` 并有统一错误映射，但当前官方 Web SDK 的注册流程要求邮箱或手机号验证，不接受“仅用户名 + 密码”直接创建账号。CloudBase 控制台只开启“用户名密码登录”不会解除这项限制。现阶段应在控制台/可信服务端创建测试用户；若要开放自助注册，需要后续增加邮箱或手机号 OTP 页面，不能在浏览器中放置管理密钥。

CloudBase JS SDK 的初始化和 PG 访问方式参见[官方 Quick Start](https://docs.cloudbase.net/en/database/postgresql/quickstart)。

### 数据 API：已接入统一 adapter

当前 `src/api/*.ts` 通过 `src/services/backend/database.ts` 获取统一数据库客户端。CloudBase adapter 使用官方 `app.rdb().from(...)` 和 `app.rdb().rpc(...)`；Supabase adapter 使用原 client。statistics、visualization、Pinia 和页面没有复制。

RPC 的业务名称和参数保持：

- `create_family({ family_name, member_role })`
- `join_family_by_invite_code({ invite_code, member_role })`
- `leave_current_family()`

CloudBase RPC 基于 PostgREST，调用路径/形态兼容，但 SDK 的返回对象和错误类型仍应逐项确认：[CloudBase RPC](https://docs.cloudbase.net/en/api-reference/webv2/postgresql/rpc)。

### bigint：统一为字符串

数据库用户 ID 是 bigint。TypeScript 域模型、Auth 映射和数据库行映射统一把用户 ID 表示为 `string`，不会创建浏览器 `BigInt`。原始 CloudBase current user 优先读取顶层字符串字段 `user.uid`；v3 标准 User 则使用 JWT `sub`/SDK `id`。`user_metadata.uid` 属于 provider metadata，不能作为 PostgreSQL/RLS 身份。数据库 adapter 偶尔返回 `number` 或 `bigint` 时也只调用 `String(value)`，不会在浏览器中做数值运算或安全整数判断。

### Realtime：本轮明确停用

当前 `src/api/message.ts` 使用 Supabase：

```text
channel(...).on('postgres_changes', ...)
```

CloudBase 公布的 `watch()` 文档主要描述文档数据库监听，不能据此假定 PostgreSQL 具有 Supabase channel 协议或存在 `supabase_realtime` publication。因此 CloudBase SQL 刻意不添加任何 publication。

CloudBase provider 下 `subscribeToFamilyActivity()` 当前返回 no-op，并把状态置为 `idle`。普通消息和鼓励 CRUD 可用；发送文字消息后 store 会立即合并结果并重新读取列表。后续按顺序选择：

1. 先保留消息 CRUD，发送成功后刷新，并在家庭页激活时短轮询；
2. 再确认目标 CloudBase PG 环境正式支持的变更订阅接口；
3. 用该接口替换 `subscribeFamilyActivity()`，保持 store 和 UI 不变。

在官方 PG 实时接口被确认前，不要创建名为 `supabase_realtime` 的 publication，也不要声称 Supabase Realtime 可直接工作。

## 10. 环境变量调整

在项目 `.env` 中使用：

```dotenv
VITE_BACKEND_PROVIDER=cloudbase
VITE_CLOUDBASE_ENV_ID=quitsmoke-d0gl5n5ge1297c2b5
VITE_CLOUDBASE_PUBLISHABLE_KEY=your-publishable-key
VITE_CLOUDBASE_REGION=ap-shanghai
```

- `VITE_CLOUDBASE_PUBLISHABLE_KEY` 可进入浏览器，用于 anon/public 客户端初始化。
- CloudBase API Key / service-role 凭据绝不能使用 `VITE_` 前缀，也不能出现在前端。
- 保留 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`；把 `VITE_BACKEND_PROVIDER` 改回 `supabase` 即可回滚。
- 网关基础地址通常可由环境 ID/SDK生成；只有项目决定绕过 SDK 使用 HTTP 时，才新增专用的公开 gateway URL 配置。
- 修改 Vite 环境变量后必须重启 `npm run dev`。

环境变量名是本项目的建议命名；最终需由新的 CloudBase client 模块统一读取，不应散落在页面组件里。

## 11. 上线前最小验证矩阵

至少使用三个账号：家庭 A 的 quitter、家庭 A 的 supporter、家庭 B 的成员。

1. 登录请求调用 `current_user_id()`，返回值应等于对应 `auth.users.id`。
2. 未登录请求读取业务表应为空或 403；调用 create/join/leave RPC 应返回 42501。
3. quitter 可以新增和修改自己的 smoking profile/check-in。
4. supporter 可以读取同家庭 quitter 数据，但写入 quitter 数据应失败。
5. 家庭 B 不能读取家庭 A 的 family、members、encouragements、messages。
6. 伪造 `user_id`、`from_user_id` 或 `sender_id` 应被 RLS 拒绝。
7. 同一用户第二次创建/加入另一家庭应命中唯一约束或 RPC 检查。
8. quitter 打卡后应生成一条幂等系统消息；编辑同一条 check-in 不应重复生成。
9. 家庭创建者退出时应转移创建人；最后一名成员退出时家庭被删除，个人戒烟数据保留。
10. 在未接入 PG realtime 前，消息发送后的显式刷新/轮询应能看到新消息。

完成以上验证后，才能把 Supabase 配置从生产前端移除。

## 12. CloudBase 静态网站托管与前端路由

CloudBase 静态网站托管部署使用 Vue Router 的 hash 模式。生产地址中的业务路由会带有 `#`，例如：

```text
https://your-domain.example/#/login
https://your-domain.example/#/home
https://your-domain.example/#/family/setup
https://your-domain.example/#/trend
```

`#` 后面的路径由浏览器和 Vue Router 处理，请求静态托管时仍然只请求站点根目录的 `index.html`。因此本项目不再依赖服务器端 SPA fallback、404 rewrite 或将所有业务路径重写到 `index.html`，直接刷新带 hash 的业务地址不会请求 `/home`、`/family/setup` 等不存在的静态对象。

登录后的 `redirect` 继续作为 Vue Router query 使用，例如 `/#/login?redirect=/home`。代码只把 `/home` 交给 `router.replace()`，不手工拼接 `#`，因此不会产生双 hash URL。

该调整只影响前端 URL 表现，不影响 CloudBase Auth、PostgreSQL、RLS、RPC、API adapter 或业务数据。将 `VITE_BACKEND_PROVIDER` 切回 `supabase` 时仍使用同一套 hash router；Cloudflare 或其他静态托管环境同样可直接部署，不影响后端回滚能力。URL 中出现 `#` 是预期行为。
