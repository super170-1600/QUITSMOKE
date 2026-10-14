# 共生星图 S4 服务端实施交付

2026-10-13。用户已确认 S4 数据契约，并授权继续实现服务端；**未授权执行生产数据库迁移**。

状态：服务端 SQL、完整迁移和协议适配已实现，隔离 PostgreSQL 验证通过。真实 CloudBase 部署、双账号线上验收、页面真实业务启用尚未执行，不能把整个 S4 称为已完成。

## 实现结果

### 鼓励事务

- 认证和家庭/目标身份在函数体内校验；只允许同家庭支持者向戒烟者发送。
- 旧鼓励表与光效附属记录在一个事务内写入，保留既有反应枚举和家庭动态。
- 同一 sender/request_id 重试返回原记录；相同 key 不同内容拒绝。
- 服务端 10 秒冷却通过事务锁串行检查，重复请求先处理幂等回执。
- 已查看只有真实接收者能标记，重复标记不重置首次时间；没有假在线、假送达声明。
- 留言不在请求回执里再存明文。内容一致性使用 PostgreSQL 内置 SHA-256；回执只留事件 ID。删除旧鼓励级联删除光效，原请求重试不能复活已删记录。

### 计划与权限

- 四类计划沿用已确认核验规则，从原 checkins 读取事实，完全不读取或输出私人备注、感受或烟瘾。
- 缺失日不算零支；连续记录允许有烟；累计上限必须完整日期覆盖；场景目标只能由本人明确确认。
- proposed / accepted / active / completed / missed / cancelled / expired 有服务端状态守卫。
- 目标 `goal_revision` 与命令 `version` 分开：修改目标重回提案，新目标不继承旧自主确认；旧事件保留。
- 核验完成记录 event_id。重复核验不产生第二个完成事件；更正导致失效记录 corrected，再达成递增 completion_cycle。
- shared_summary 默认 false；仅戒烟者可开放/撤回摘要。支持者自己的未共享提案进度为 null，不是虚假的零值。
- 每计划最多两位当前家庭支持者，不改变或删除现有家庭成员；计划行锁和唯一约束保护参与关系。
- 客户端不能提交 progress/completed 或冒充角色；版本不符拒绝覆盖，保留输入重读后再提交。
- 历史 RPC 排除支持者的逐日自主确认事件/日期；历史用于重建，不把本地动画称为永久成就。
- 用户退出家庭后立即无法继续读取/写入，旧异步响应仍受前端账号/目标作用域检查。

### 安全边界与事务

- 内部核验和响应投影放在 `nico_private` schema，撤销客户端 schema 使用和内部函数执行权限，避免 CloudBase 将它们当成 public RPC 暴露。
- 原始新表不直接授予客户端 SELECT/INSERT/UPDATE/DELETE，只通过鉴权后的 public RPC 返回许可字段。
- SECURITY DEFINER 函数固定空 search_path；public RPC 明确检查 JWT authenticated 和身份。
- 家庭关系、目标角色、请求锁、计划版本和写入处于同一事务。返回成功前已写回执；中途失败整个事务回滚。
- 不改旧表列、认证 helper、RLS、打卡统计、函数或触发器。迁移只新增五张表、索引、内部 schema 和新函数。

## RPC 清单

| RPC | 功能 |
|---|---|
| nico_constellation_capabilities | contract_version=1、provider、timezone、功能能力 |
| nico_send_encouragement | 原子发送与幂等回执 |
| nico_list_encouragements | 本人发送/接收的光效记录，最多 100 条 |
| nico_mark_encouragement_read | 接收者首次已查看时间 |
| nico_list_plans | 许可的目标/状态/摘要，最多 100 条 |
| nico_list_plan_events | 可重建历史，最多 100 条，过滤私人确认日期 |
| nico_mutate_plan | create/revise/accept/activate/verify/cancel/expire/join/confirm/share |

计划采用明确的 **Asia/Shanghai** 服务端日历日期；页面接入时需使用能力回执的 timezone 进行计划日期展示，不能依据客户端任意时钟判定完成。原打卡的日期字段与公式保持原样。

## 完整迁移文件

- [CloudBase bigint 完整迁移](migrations/constellation-s4-cloudbase.migration.sql)
- [Supabase UUID 完整迁移](migrations/constellation-s4-supabase.migration.sql)

此前 `.draft.sql` 是仅结构的审阅草案，不用于真实服务部署。完整 `.migration.sql` 包含 schema 与 RPC，在一个事务中安装；能力接口与其他函数一起提交。

迁移内有部署确认标记：必须在**明确选定、已授权的目标数据库会话**先设置 `nico.s4_deployment_approved='v1'`，否则迁移失败。该标记只是防误执行，不替代用户授权、数据库权限和备份。

完整迁移为一次性安装，不自动覆盖已存在的 nico_* 对象；重复执行会失败并回滚。若目标库已有人执行旧草案或有同名对象，应先只读核对，再制作差异迁移，不直接删除已有数据。

未提供默认破坏性回滚脚本：已产生数据后，回滚应先关闭业务入口并保留新表，再按真实数据状态制定恢复方案。未修改旧业务可继续使用原模块。

## 本轮文件

新增：

- `scripts/constellation-rpc.template.sql` — 服务端完整事务逻辑。
- `scripts/build-constellation-migration.mjs` — 两种 provider 的完整迁移生成器。
- `scripts/verify-constellation-database.mjs` — 隔离 PostgreSQL 实际执行验证。
- `docs/migrations/constellation-s4-{cloudbase,supabase}.migration.sql`。
- 本报告及 `artifacts/constellation-s4/database-verification.json`。

修改：

- `scripts/constellation-schema.template.sql` 和两份生成的 `.draft.sql` — goal_revision、shared 历史事件与逐日确认唯一索引。
- `src/features/constellation/domain/persistenceContract.ts` — 共享动作与隐私受限历史事件解码。
- `src/features/constellation/adapters/remote.ts` — 历史请求接口。
- `src/features/constellation/adapters/remote.test.ts` — 共享和自主确认日期隐私回归。
- 契约报告增加本次批准状态引用。

独立测试运行时放在被 gitignore 的 `artifacts/constellation-db-runtime`，版本 `@electric-sql/pglite@0.5.9`；没有写入应用 package.json/package-lock，也没有增加产品运行依赖。

## 验证结果

### 实际 PostgreSQL SQL 验证

`node scripts/verify-constellation-database.mjs`：四组隔离数据库验证全部通过。

1. CloudBase bigint 角色矩阵与业务核验。
2. Supabase UUID 角色矩阵与业务核验。
3. CloudBase 仓库完整原始 schema/RLS/触发器上安装新迁移。
4. Supabase 仓库完整原始 schema/RLS/触发器上安装新迁移。

覆盖：

- 匿名、其他家庭、第三方收件箱、直接读取原表和调用内部 helper 均拒绝。
- 真实数字 ID 字符串、事务鼓励、重复 key 回执、不同内容冲突、冷却。
- 注入光效附属写入失败，确认旧鼓励和回执一起回滚；同 key 重试成功。
- 接收者已查看、支持者不可接受/核验、未共享提案进度 null。
- 零支、有烟、缺失、补录、更正、再次达成与一次事件。
- 累计实际支数、全范围覆盖、自主确认、目标修改不继承旧确认。
- 未来激活拒绝、取消/过期状态、两位陪伴上限、共享撤回。
- 版本冲突、禁止客户端 progress、无效目标整笔回滚。
- 删除鼓励级联删除光效，回执中没有复制的留言明文，删除后不能凭原请求恢复事件。
- 退出家庭移除访问。
- 比对旧函数定义、旧触发器定义和原打卡记录，迁移前后完全一致；新事务写入的旧鼓励仍能按原 RLS 读取。

[结构化 SQL 结果](../artifacts/constellation-s4/database-verification.json)

测试是 PostgreSQL WASM 中实际运行 SQL，不是仅字符串检查或模拟业务函数。边界：auth.users/JWT 是合成 fixture；CloudBase baseline 的 pgcrypto 安装语句在该 WASM 环境中略去，使用 PostgreSQL 内置 gen_random_uuid；不模拟厂商网关、网络或真实 JWT 签发。

### 项目检查

- `npm test`：42 个文件、195 项通过。
- `npm run build`：TypeScript 与 Vite 通过，仍有既有大包及混合导入警告。
- 客户端协议的权限/账号切换/回执/历史隐私测试通过；新接口未实例化接入现有页面。
- 没有视觉或 GLB 修改，本轮不新增视觉截图或声称测得新 FPS。

## 尚未完成的 S4 验收

- 真正 CloudBase 测试环境部署、JWT/PG 网关/RLS 验证。
- 多连接同时提交、两位真实支持者/两个真实账号、真实断网不确定提交/重试、账户切换。
- 服务端全量计划核验性能和长期历史分页；当前列表上限 100，既未做无限历史，也不宣称完整长期档案。
- 打卡保存后的显式计划重新核验接入；本轮没有向原 checkins 增加触发器或偷偷修改旧保存流程。
- 页面映射真实家庭成员、请求重试 key 管理、真实收件/计划/历史入口和能力失败提示。

当前不启用真实 UI，不进入 S5。下一步先在明确授权的 CloudBase 测试数据库执行完整迁移并验收，再接入页面；生产部署需要另行授权。以上剩余项意味着 S4 尚未整体验收完成。
