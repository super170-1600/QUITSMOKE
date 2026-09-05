# Codex 开发任务

按顺序实现，不要一次性重构全部项目。每完成一阶段先运行 `npm run build`。

## Stage 1：接入 Supabase Auth
- 实现邮箱注册、登录、退出、session 恢复。
- 添加路由守卫：未登录只能访问 /login。
- 新建 `src/stores/auth.ts` 与 `src/api/auth.ts`。
- 不在组件中直接散落 Supabase 调用。

## Stage 2：数据库与 RLS
创建迁移 SQL：profiles、families、family_members、smoking_profiles、checkins、encouragements。
- checkins 唯一约束 `(user_id, checkin_date)`。
- 所有业务表开启 RLS。
- 用户只能修改自己的数据；同一家庭成员可读取戒烟者公开给家庭的数据。
- 写 `docs/database.sql`。

## Stage 3：真实打卡 CRUD
- `src/api/checkin.ts`：getTodayCheckin/getCheckins/upsertCheckin。
- CheckinView 从数据库读取当天记录，支持新增和修改。
- 提交成功 toast，失败显示明确错误。

## Stage 4：首页统计
- `src/stores/smoking.ts`。
- 接入 smoking_profiles 与 checkins。
- 计算 planDays/currentStreak/longestStreak/savedCigarettes/savedMoney/7日下降比例。
- missing 日期既不算无烟也不算吸烟，连续无烟遇 missing 终止。

## Stage 5：家庭系统
- 创建家庭、生成唯一邀请码、邀请码加入。
- family_members 建立成员关系。
- FamilyView 展示同家庭戒烟者当天状态与关键统计。

## Stage 6：鼓励
- 表情鼓励 + 最多 100 字文本。
- 同家庭可发送和读取。
- 防止重复狂点：同一发送者对同一接收者同一表情 10 秒内前端禁用。

## Stage 7：趋势图
- 加入 ECharts。
- 7/30 天吸烟量折线或柱状图。
- 展示 baseline 参考线。

## Stage 8：PWA
- manifest、icon、service worker。
- 可添加到 iOS/Android 主屏幕。

## 工程约束
- TypeScript strict；禁止滥用 any。
- 页面组件不直接写复杂 SQL/业务统计。
- API、store、view 分层。
- Mobile First，优先 375/390/414px。
- 不加入 AI、聊天、社区、支付、Redis、Docker、独立后端。

## 后续用户授权：轻量家庭动态

在原阶段任务完成后，用户明确授权将家庭页演进为轻量家庭空间。该授权只覆盖：

- 家庭文字消息；
- 继续使用 `encouragements` 的快捷 Reaction；
- 打卡与 3/7/14/30 天里程碑系统事件；
- Supabase Realtime 家庭内刷新；
- 支持者查看本人的陪伴记录。

仍然禁止完整 IM 能力，包括语音、视频、图片、文件、已读回执、撤回和群管理；也不扩展为公开社区。
