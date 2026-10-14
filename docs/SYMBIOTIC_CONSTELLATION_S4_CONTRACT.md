# 共生星图 S4 数据契约与迁移审阅包 v1

2026-10-13。**状态：接入准备与待确认契约；S4 尚未完成，未连接/修改真实数据库。**

更新：用户已明确“确认这套契约，继续实现服务端”。本文件保留当时的审阅内容；后续已实现内容和验证见 [S4 服务端交付](SYMBIOTIC_CONSTELLATION_S4_SERVER.md)。生产迁移仍未授权、未执行。

依据设计基线第 11 节 S4：

> 用户确认数据契约、权限、迁移、效果留存后接入鼓励类型和共同计划持久化。

用户“下一步”批准进入 S4 工作；本文件把上述尚未确认的具体数据规则变成可审阅方案，确认后继续实现服务器事务、数据库验收与真实 UI 接入。

## 推荐确认方案

1. **身份与成员**：继续使用现有家庭成员和 quitter/supporter 身份。以 `family_id + quitter_id` 隔离一个星图；支持家庭里多个戒烟者。最多两位支持者的空间展示/计划陪伴需要明确选择，不删除现有多余成员，不改家庭加入上限。
2. **共享**：默认不共享私人备注、感受、烟瘾评分，也不共享完整逐日记录。戒烟者逐计划选择“共享摘要”，只开放目标、日期、核验进度、状态。支持者能看自己提出的未共享提案，但进度和覆盖为 `null`，不填假零。服务端不返回私人字段。
3. **鼓励**：保留原 `encouragements` 表和枚举，新增光效附属表。同一事务写旧鼓励 + 光效，旧家庭页仍能显示它。映射提议：glow→heart、starlight→clap、resonance→like、bloom→celebrate、halo→celebrate；真实演出以独立 effect_type 为准，不从旧 reaction 猜测。
4. **已查看**：只在接收者明确打开/重播后写 `read_at`。不是在线、推送送达或对方阅读证明；先采用手动刷新，CloudBase 实时能力未验明前不作实时承诺。
5. **留存**：鼓励随原记录保存，删除原鼓励时光效附属记录级联删除。计划保存版本和达成/更正事件，可重建纪念；更正后标记对应事件被更正，不销毁真实历史，也不再宣称当前仍达标。家庭删除级联删除新数据；退出家庭立即失去访问但不偷偷删除其他成员记录。
6. **完成依据**：服务端从已有 checkins 核验，拒绝客户端传入 progress/completed。场景目标仅戒烟者明确自主确认。计划不写入原成就表，不改原全站统计或打卡公式。

确认范围是以上规则及五张附加表方案；不是立即对生产库执行草案。

## 已核实的环境事实

- 本地 `.env` 的 provider 为 **CloudBase**。仅检查 provider 字段，未输出凭据。
- `docs/database_cloudbase.sql` 采用 bigint 用户 ID，`public.current_user_id()` 与 `current_request_role()`；Supabase 基线使用 UUID 与 `auth.uid()`。
- 后端抽象已有 PostgreSQL/PostgREST `rpc`，CloudBase 对 JSON 字符串响应已有兼容层。
- 旧鼓励 API 有家庭读取、发送及本人删除；无 effect_type/read_at，类型是 heart/like/clap/fire/celebrate/message。
- 当前鼓励 store 的 10 秒冷却主要在客户端。新的发送 RPC 应服务端原子检查冷却；重复请求先返回既有回执，不误被冷却拒绝。
- 旧 checkins RLS 的家庭读取比本次默认共享方案宽；本轮不更改旧 RLS，也不把旧能力当成用户已经授权私人共享。
- 未连接真实 CloudBase/Supabase 检查已部署结构、RPC、RLS 或实时状态。这里的数据库证据来自仓库，不是生产部署证明。

## 五张附加表

| 表 | 用途 | 核心约束 |
|---|---|---|
| nico_plans | 四类目标、归属、提议人、版本、状态、共享开关 | 明确 quitter_id；日期 1–90 天；目标边界；默认不共享 |
| nico_plan_participants | 真实成员 ID 的陪伴参与 | 每计划/用户唯一；服务端按角色核验、锁计划后限制支持者数量 |
| nico_encouragement_effects | 旧鼓励的光效与接收者已查看时间 | encouragement_id 一对一；sender/request 唯一 |
| nico_requests | 不确定网络结果下的幂等回执 | actor/request 唯一；不同内容复用同 key 必须冲突 |
| nico_plan_events | 提案、修改、确认、达成、更正的语义历史 | plan/version/kind/cycle 唯一；自主确认含日期；无私人备注或感受 |

不是改造或替换原业务表。两套 schema 草案已生成：

- [CloudBase bigint 草案](migrations/constellation-s4-cloudbase.draft.sql)
- [Supabase UUID 草案](migrations/constellation-s4-supabase.draft.sql)

**草案只有结构与防御性读取策略，没有 mutation/capability RPC，也不授予客户端直接读写表的权限。单独执行草案不能启用真实服务。** 草案内另有确认标记和 ID 类型预检；不是一份已经 SQL 实机验收的生产迁移。

## 拟实施 RPC 契约

所有请求由认证上下文决定 actor；客户端只指定家庭和目标，服务端必须再次验证，不能信任客户端角色。

| RPC | 请求/回执 | 服务器要求 |
|---|---|---|
| nico_constellation_capabilities | contract_version=1；features: effects/plans/receipts/events | 只有所有服务部署并验收后才能返回可用 |
| nico_send_encouragement | request_id、effect_type、短句；返回已持久化鼓励 | 原子写旧表+附属表+幂等回执；同家庭 supporter→quitter；非本人 |
| nico_list_encouragements | family/quitter；最多 100 条 | 只返回当前发送人或接收者可见记录；用户 ID 必须为字符串 |
| nico_mark_encouragement_read | id；返回原记录与 read_at | 仅收件人；重复标记保持首次时间 |
| nico_list_plans | family/quitter；最多 100 条 | 本人计划、本人提案或明确共享的陪伴摘要；禁返回原始私人记录 |
| nico_mutate_plan | request_id、action、plan_id、expectedVersion、目标字段 | 乐观版本 + 行锁 + 角色/成员校验；结果与 event_id 在同一事务提交 |

计划动作：create/revise/accept/activate/verify/cancel/expire/join/confirm。

- 修改后的目标重新接受，历史自主确认不能自动算进新版本。
- 自动核验沿用 S3 四类事实规则，缺失不当零支；服务端日期/时区还需明确，与账号日历一致，不能信任客户端 today。
- 完成状态转移必须附真实持久化 event_id；重复核验不重复生成事件/纪念。
- 数据更正导致完成条件失效时记录 corrected；再次合法达成递增 completion_cycle，避免覆盖旧事件。
- 服务端必须原子校验当前家庭关系，不能只靠 UI 按钮或 RLS helper。
- SECURITY DEFINER RPC 固定空 search_path、显式认证检查、撤销 public/anon 调用；CloudBase 在函数体内也核验 authenticated。
- 重试使用同一 request_id；相同内容返回原回执，不创建新鼓励或计划。版本冲突保留输入，提示重新读取，禁止自动覆盖。
- 前端切账号、家庭、目标或退出后拒绝旧异步结果；下次操作重新握手。

`RemotePlanMutation` 目前支持目标/生命周期，不接受客户端核验结果。历史列表、共享开关专门动作、服务端周期重核验和撤回/删除流程将在契约确认后补齐；不能把当前 client 准备代码称为完整服务。

## 本轮代码与验证

新增：

- `src/features/constellation/domain/persistenceContract.ts`：带版本的响应解码、角色与目标字段校验、bigint 精度保护。
- `src/features/constellation/adapters/remote.ts`：已有后端 RPC 抽象之上的接入准备；默认未确认，先能力握手，无静默 mock 回退。
- `src/features/constellation/domain/persistentEventGate.ts`：同账户事件重复消费保护；这只是本地动画门，不代替服务器幂等。
- `src/features/constellation/adapters/remote.test.ts`：8 项注入 RPC 的契约回归。
- `scripts/constellation-schema.template.sql`、`scripts/prepare-constellation-schema.mjs`：两种 provider 的 schema 审阅草案生成。
- 两份生成 SQL 和本报告。

未修改旧 API/store/schema/router/UI、GLB 或 S3 样板。新 remote adapter 尚未实例化接入页面，因此当前用户体验与已验收版本一致；本轮没有新的视觉截图，以现有 S3 截图为参照。

验证：

- `npm test`：42 个文件、194 项测试通过。
- 新增测试覆盖：默认禁止请求、服务能力不匹配、bigint 字符串、断网保留 request_id 重试、账号/目标切换、支持者权限、未共享摘要不泄露进度、回执身份校验、完成缺事件禁止庆祝、同事件只消费一次。
- `npm run build`：TypeScript/Vite 通过；保留原有大包和混合导入警告。
- 这些测试使用注入 RPC，**没有声称真实断网、生产 RLS、事务并发或双账号数据库测试已经通过**。
- 新增文件不进入现有视觉组件，draw calls/GLB 不变；未重新测实际设备帧率。

## 确认后要完成的 S4 工作

1. 以当前 CloudBase bigint 环境实现、审阅服务器事务 RPC，补齐共享控制与只输出许可字段的响应投影。
2. 在隔离测试数据库应用迁移，验证 anon、其他家庭、quitter、两位 supporter 的访问矩阵、退出/删除、版本冲突、并发重复请求和事务回滚。
3. 明确授权测试账号后，测试两位支持者、断网重试、切账号隔离、真实事件历史重建；未通过不宣称可用。
4. 然后才启用新 real adapter、映射真实成员 ID，保留模拟入口；发出成功后演出，失败保留输入。
5. 交付 S4 真业务截图、测试与限制，停止等待验收。S5 Hub 正式路径仍不提前开发。

当前只等待对上述数据与权限规则的确认；数据库未变更，S4 未冒充完成。
