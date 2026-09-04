# 数据库设计

本阶段使用 Supabase Postgres、Auth 与 Row Level Security。数据库接口字段保持 `snake_case`；未来 UI domain model 如需 `camelCase`，应在 API 层显式转换。

## 表与关系

- `profiles`：`auth.users` 的一对一公开资料扩展。Auth 用户删除时级联删除。
- `families`：家庭主体，记录名称、唯一邀请码和创建者。
- `family_members`：用户与家庭的多对多关系，同时保存该用户在该家庭中的 `quitter` 或 `supporter` 身份。
- `smoking_profiles`：用户的一对一戒烟设置，包括开始日期、每日基线、每包支数和价格。
- `checkins`：每日打卡。`(user_id, checkin_date)` 唯一，保证每位用户每天最多一条。
- `encouragements`：家庭内成员之间的表情或文字鼓励。

关系简图：

```text
auth.users 1--1 profiles 1--N family_members N--1 families
                         1--1 smoking_profiles
                         1--N checkins
families 1--N encouragements (from_user_id / to_user_id -> profiles)
```

角色属于 `family_members`，而不是 `profiles`，因为同一用户未来可以在不同家庭承担不同身份。

`checkins` 不保存 streak、累计少吸或 saved_money。这些值由基线、日期和打卡记录派生；持久化会产生重复事实，并可能在历史打卡修改后失去一致性。

## 自动 profile 与更新时间

`on_auth_user_created` 在 Auth 用户创建后调用 `handle_new_user()`。昵称优先使用 `raw_user_meta_data.nickname`，其次使用邮箱 `@` 前内容，最后回退为“用户”。因此 profile 创建不依赖前端额外 INSERT。脚本还会幂等回填 trigger 安装前已经存在的 Auth 用户。

`profiles`、`families`、`smoking_profiles` 和 `checkins` 共用 `set_updated_at()` trigger function。

## RLS 权限模型

六张业务表全部启用 RLS：

- Profile：本人及同家庭成员可读；仅本人可更新。
- Family：成员可读；仅创建者可修改或删除。普通 INSERT 要求 `created_by = auth.uid()`，实际业务应优先使用 `create_family`。
- Family member：家庭成员可查看同家庭成员；不开放普通 INSERT/UPDATE/DELETE policy，成员加入必须走安全 RPC。
- Smoking profile：本人及同家庭成员可读；仅本人可新增、修改、删除。
- Checkin：本人及同家庭成员可读；仅本人可新增、修改、删除。
- Encouragement：家庭成员可读；发送时发送者必须是当前用户，发送者和接收者必须都在指定家庭；仅发送者可删除，不允许更新。

表级权限也按最小操作集合显式授予：匿名角色没有业务表权限，认证角色没有 `family_members` 写权限或 `encouragements` 更新权限。RLS 在这些 grants 之上继续执行行级限制。

`is_family_member(uuid)` 和 `shares_family_with(uuid)` 是 `SECURITY DEFINER` helper，避免 RLS policy 在 `family_members` 上递归。所有 SECURITY DEFINER 函数均设置空 `search_path`，并使用完整 schema 限定表名。业务 helper/RPC 撤销了 `public` 执行权限，只授予 `authenticated`。

## 家庭 RPC

创建家庭：

```ts
const { data, error } = await supabase.rpc('create_family', {
  family_name: '我们的家',
  member_role: 'quitter',
})
```

`create_family` 从 `auth.uid()` 获取创建者，不接受客户端传入 user ID。它在同一数据库事务中创建家庭和创建者成员关系。邀请码为 UUID 派生的 8 位大写字母数字串；INSERT 使用唯一约束检测冲突，最多重试 10 次。函数失败时整个事务回滚，不留下半完成家庭。

加入家庭：

```ts
const { data, error } = await supabase.rpc('join_family_by_invite_code', {
  invite_code: 'A1B2C3D4',
  member_role: 'supporter',
})
```

`join_family_by_invite_code` 同样只使用 `auth.uid()`，验证角色和邀请码后写入成员关系。`unique(family_id, user_id)` 与 `ON CONFLICT DO NOTHING` 使重复加入保持幂等。知道邀请码是加入该家庭的授权凭据。

## 在 Supabase 执行

1. 打开 Supabase Dashboard → SQL Editor。
2. 新建 Query，粘贴并执行 `docs/database.sql` 全文。
3. 确认六张表、函数、trigger 和 policies 已创建。
4. 后续修改应保留在该脚本或正式 migration 中，不要只在 Dashboard 手工修改而不回写代码库。

脚本使用 `create table if not exists`、`create or replace function`、`drop policy/trigger if exists`，可在同一结构版本上重复执行。它不是任意旧 schema 的自动升级器；已有列定义变化时仍应编写 migration。

## 最小人工 RLS 验证

准备三个通过 Email Auth 注册的用户 A、B、C。使用各自登录后取得的用户 JWT 发起 Supabase client 请求，不要使用会绕过 RLS 的 `service_role` key。

1. A 调用 `create_family('测试家庭', 'quitter')`，记录邀请码。
2. B 调用 `join_family_by_invite_code(邀请码, 'supporter')`；C 不加入。
3. A、B 各自创建自己的 `smoking_profiles` 和测试 `checkins`。
4. 以 A 登录：查询 B 的 `profiles` 和 `checkins`，应能读取。
5. 以 C 登录：查询 A/B 的 `profiles` 和 `checkins`，结果应为空。
6. 以 B 登录：尝试 UPDATE A 的 checkin，应更新 0 行。
7. 以 A 登录：尝试用 B 的 `user_id` INSERT checkin，应被 RLS 拒绝。
8. 以 A 登录：向同家庭 B INSERT encouragement，应成功。
9. 以 C 登录：向 A/B 的家庭 INSERT encouragement，应被 RLS 拒绝。

还应验证唯一约束和 CHECK：同一用户同一天重复打卡、超过 200 支、烟瘾不在 1–5、超长备注、非法成员角色和空文字鼓励都应失败。
