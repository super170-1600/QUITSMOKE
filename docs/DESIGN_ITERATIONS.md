# Design iteration log

This file records product-facing UI decisions so later iterations preserve the reasoning behind them.

## Current direction

- Brand tone: calm, mature, lightweight health companion.
- Mobile priority: today status, today action, progress, then family support.
- Desktop priority: a wide analytical dashboard rather than enlarged mobile cards.
- Motion: short, restrained, and disabled by `prefers-reduced-motion`.

## Iterations completed

1. Productized Home, Trend, and Family pages with shared green design tokens and role-aware summaries.
2. Added the SVG/CSS cigarette hero with burning, weak, and extinguished states.
3. Added mobile/desktop display modes with a responsive Desktop Dashboard.
4. Added reusable trend transformations, time ranges, smoking/craving charts, heatmap, savings trend, and baseline comparison.
5. Added milestone progress, bold numeric hierarchy, avatar-based family presentation, page transitions, and restrained micro-interactions.
6. Added a supporter feedback loop using existing encouragement records: today, recent 7 days, total sent, active support days, and recent sent activity.

## Role walkthrough findings

### Quitter

- Strong flow: today state → check-in → trend → longer-term outcomes.
- Continue to protect the primary check-in CTA from secondary content.
- Family encouragement should remain visible without becoming a pressure mechanic.

### Supporter

- Strong flow: see quitter state → understand trend → send encouragement.
- Previous gap: no feedback showing the supporter’s own contribution.
- Current solution: derive a personal support record from existing `encouragements`; no new table or behavior rule.

## Guardrails

- Do not gamify family members against each other.
- Missing check-ins are never zero.
- Supporters never edit quitter data.
- Do not change database, RLS, RPC, or statistics semantics for visual iterations.
# 迭代 3：家庭空间与轻量消息流

- 家庭页默认内容从“成员管理 + 鼓励列表”改为“戒烟进度 + 家庭动态”，成员和邀请码收进次级页签。
- 新增家庭文字消息，保留 `encouragements` 作为快捷 Reaction；旧版定向文字鼓励继续合并显示，不丢历史。
- 新增 Supabase Realtime 订阅，同家庭成员发送消息后可即时刷新。
- 戒烟者打卡会自动生成系统事件；连续无烟达到 3、7、14、30 天时生成里程碑事件。
- 第一版明确不做图片、语音、已读、撤回、文件和群管理。
- Desktop Dashboard 直接嵌入家庭动态，避免桌面模式下 `/family` 重定向后找不到聊天入口。
- 支持者的“我的陪伴”同时统计快捷鼓励和本人发送的家庭文字消息。
- Realtime 同时监听文字消息与快捷鼓励，家庭成员两端都会自动刷新。
# 迭代 4：角色路径一致性与降级体验

- 戒烟者路径发现打卡页仍偏原始表单，与首页、家庭空间的产品感断层；重构为状态预览、常用支数快捷选择、烟瘾语义等级、简短备注和家庭可见提示。
- 0 支时使用明确但克制的成功状态；非 0 支时强调“真实记录”，避免失败或清零措辞。
- 支持者路径发现新增聊天表若尚未部署，可能拖累首页、个人页或桌面 Dashboard；现已将消息加载隔离为可降级功能，核心进度和旧版鼓励仍可使用。
- 家庭动态部分数据失败时展示局部提示，不再把整个家庭页替换成错误页；消息不可用时输入框会禁用，避免无效操作。
- 当前自动化环境无可连接浏览器，本轮体验结论来自角色路径代码审查、状态覆盖、类型检查和构建；真实双账号点击验收仍需在浏览器可用时补做。
- 首页原“新陪伴”没有已读数据支撑，改为“近期家庭动态”，并合并文字消息与发给自己的 Reaction，避免虚假的未读暗示。
# 迭代 5：把家人的回应带回戒烟者首页

- 戒烟者首页此前只有互动数量，情感反馈仍被藏在家庭页；新增“家人刚刚说”卡片，直接展示最新一条来自其他家庭成员的文字或定向 Reaction。
- 系统事件、本人消息以及发给其他人的定向鼓励不会冒充“家人对我的支持”。
- 点击卡片进入家庭动态；数据完全复用现有 `messages` 与 `encouragements`，不增加未读、已读或新数据库字段。
# 迭代 6：聊天状态可信度

- “实时”标签不再永久写死，改为未连接、连接中、实时、需刷新四种真实状态。
- 新消息只在用户原本接近底部时自动跟随；正在阅读历史记录时不会被强制拉回底部。
- 用户主动发送时仍会回到底部，保持即时对话反馈。
- 消息 INSERT 改为列级授权，客户端不能伪造 `created_at` 或 `event_key`，系统事件继续只由数据库触发器生成。
# 迭代 7：多戒烟者上下文连续性

- 支持者首页不再默认且不可见地固定第一位戒烟者；家庭有多位戒烟者时显示轻量选择器。
- 查看趋势、去鼓励和“我的陪伴”入口都会携带当前选中的成员 ID。
- 家庭页读取 `member` 查询参数并定位同一位戒烟者，切换对象时同步更新参数。
- Desktop Dashboard 使用同一选择逻辑，切换后统计、图表和 Reaction 目标一起更新，避免鼓励错人。
# 迭代 8：家庭进度实时联动

- Realtime 收到家庭消息后，不只刷新聊天流；系统打卡或里程碑事件会同步刷新支持者看到的戒烟进度。
- 戒烟者在另一设备完成打卡时，自己的首页与 Desktop Dashboard 也能更新统计。
- 直接复用 `messages` 系统事件作为刷新信号，没有额外开放 `checkins` Realtime，也没有复制统计计算。
# 迭代 9：支持者陪伴节奏

- “我的陪伴”增加近 7 日节奏条，按自然日合并本人发送的文字消息和快捷 Reaction。
- 每天的互动次数通过短柱高度表现，今天单独强调，并显示本周有回应的天数。
- 数据仍由已有记录纯函数派生，不新增打卡、积分、排行榜或数据库字段。
# 迭代 10：快捷鼓励冷却规则校正

- Reaction 冷却从“所有互动全局禁用 1 秒”改为“同一成员 + 同一 Reaction 禁用 10 秒”，恢复最初产品规则。
- 发送某个表情后仍可立即发送其他表情或家庭文字，不阻断自然对话。
- 陪伴记录的本地明细读取上限从 30 提升到 100；无法由有限明细证明终身天数，因此文案改为更诚实的“近期陪伴天”，累计互动继续使用数据库精确计数。
# 迭代 11：双角色首次进入体验

- 家庭创建/加入页从普通 Tab + 单选框改为两段式选择：先选择创建或加入，再通过带用途说明的角色卡选择戒烟者或支持者。
- 提交按钮明确显示“操作 + 当前身份”，降低以错误角色加入家庭的概率。
- 支持者在提交前即可知道会获得进度查看、家庭鼓励和个人陪伴记录。
- 戒烟计划设置按“开始日期、改变前基线、金额估算”分组；强调基线不是每日目标，并提供 5/10/15/20/30 支快捷值。
- 增加每日及 30 天原支出估算，让每包支数和价格字段的用途可见；保存字段和统计公式均未改变。
# 迭代 12：账号入口产品化

- 登录页移除 emoji Demo 首屏，改为与主应用一致的绿色品牌锁定、价值短句和柔和背景层次。
- 登录与注册改为明确模式切换，共用一个主操作按钮，避免两个同级按钮造成选择犹豫。
- 注册需要邮箱确认时展示持久成功页，明确邮箱地址与下一步，不再只依赖瞬时 Toast。
- 常见 Supabase Auth 错误映射为用户可理解的中文提示，仍保留未知错误用于诊断。
- Auth API、session 恢复和路由守卫均未修改。

# 迭代 13：日常入口与次要数据降级

- 首页右上角移除没有通知功能支撑的铃铛，改为显示本人昵称首字的真实“我的”入口，避免制造不可用功能预期。
- 首页的戒烟统计或家庭戒烟者摘要保持核心加载；家庭消息、快捷鼓励和支持者陪伴记录改为独立加载，单项失败不会再让整个首页进入错误页。
- 陪伴记录部分失败时明确显示“部分记录暂未加载”；全部失败时隐藏可能误导的 0 统计，并保留“去鼓励”主操作。
- 底部导航统一使用“家庭”命名，与“家庭空间 / 家庭动态”的产品语言一致。
- 为键盘操作补充清晰的焦点轮廓，不改变触屏视觉层级。

# 迭代 14：发送结果可信与中文输入

- 将“消息/Reaction 已写入”和“写入后的列表刷新”拆成两个结果：数据库写入成功就视为发送成功，后台刷新失败不再误报成发送失败，避免用户重复点击造成重复内容。
- 新消息和 Reaction 使用数据库返回的真实 ID、时间立即合并进家庭动态；支持者的累计互动与最近记录同步更新，随后再用服务器结果校准。
- 聊天输入框识别输入法组合状态，中文输入法按 Enter 确认候选词时不会提前发送；非组合状态下仍保留 Enter 快速发送。

# 迭代 15：品牌封面与家庭绑定安全

- 产品品牌从“无烟之家”统一为 `NO SMOKING`，同步浏览器标题、登录页、手机首页、桌面导航与系统消息身份。
- 登录封面删去大段价值说明和三个文字功能标签，改为一个短标题与“熄灭香烟长出绿叶”的专属视觉图，表单操作保持清晰可见。
- `family_members.user_id` 增加唯一约束；创建与加入 RPC 同时进行显式检查，数据库和前端共同保证每个账号同时只能属于一个家庭。
- 家庭成员页增加带确认说明的“退出家庭”：个人戒烟设置和打卡始终保留；创建者有其他成员时自动移交所有权；最后一位成员退出时才删除空家庭及其家庭动态。
- 前端不再静默选择多条历史成员关系；检测到异常重复绑定会直接报错，避免展示错家庭的数据。
