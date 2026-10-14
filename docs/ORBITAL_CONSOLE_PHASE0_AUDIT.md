# NICØ Orbital Console — Phase 0 只读审计

审计日期：2026-10-13。
状态：Phase 0 已完成；2026-10-13 用户确认继续数据模块，随后完成 Phase 1 与 Phase 2 静态样板，见 ORBITAL_CONSOLE_PHASE1_2.md。视觉验收前不进入 Phase 3–5。

## 1. 设计基线与审计边界

完整阅读的正确文档：
C:/Users/73161/Downloads/NICO_88E79F95E6AEB8E583_Orbital_Console_AEE6BDA7E6BC_v1.md。
标题：NICØ｜戒烟数据中心 Orbital Console 实施规格 v1.0。

项目 docs/NICO_戒烟数据中心_Orbital_Console_实施规格_v1.md 当前不存在。另一份先前附件是每日打卡规格，不作为数据中心规格使用。

规格中提到旧 4×7 / 28 日档案。用户随后已明确确认 7×7 / 49 日自然周水平转盘、小光环竖立、平面旋转及惯性；以用户最新确认优先，保留这些已验收成果，不改回旧档案。

本轮只读取代码、SQL 定义、资产、依赖和测试文件；不修改业务代码、路由、认证、数据库、API 或已有未提交文件。唯一新增文件是本审计报告。

数据库审计为仓库 SQL、API 和类型的静态契约审计，没有连接线上数据库；不能把本报告当作线上约束、触发器和 RLS 已部署的证明。未读取密钥或账号数据。

## 2. 当前架构与复用入口

- Vue 3.5 + TypeScript + Vite + Pinia + Vue Router，Three.js 0.186；已有 Vant、ECharts。无需引入 React、第二套 3D 引擎或新图表依赖。
- Hub 数据面为 progress：HubBusinessModule.vue 动态载入 TrendView.vue。手机目标 /trend?module=progress；桌面目标 /dashboard?module=progress。权限仍由原路由守卫及家庭上下文处理。
- TrendView.vue：趋势 / 日历 / 成果三个标签；MetricTrendChart、SmokingHeatmap、SavingsAreaChart、BaselineComparison 等负责展示。
- DesktopDashboardView.vue 也消费现有统计和可视化函数；AchievementsView、家庭摘要同样消费旧连续天数及统计契约。
- 事实来源为 smokingStore.checkins 和 smokingProfile；支持者通过 familyStore.selectedQuitter / quitterSummaries 读取已有家庭权限允许的戒烟者记录。
- 日期工具已有 addLocalDays、parseLocalDate、differenceInLocalCalendarDays；使用自然日运算，不能换成固定毫秒差。

## 3. 数据库与 API

### 当前持久化契约

smoking_profiles：user_id 唯一、quit_start_date 为 date、baseline_daily_cigarettes 非负整数、cigarettes_per_pack 正整数、price_per_pack numeric(10,2)，有创建 / 修改时间。

checkins：user_id + checkin_date 唯一；cigarettes 0–200 整数；craving_level 1–5；note 长度限制；创建 / 修改时间。仓库 SQL 包含本人写入、本人 / 同家庭读取策略。

Supabase 与 CloudBase 经 services/backend 统一封装。两种用户 ID 已归一化为字符串；新适配器必须沿用账户隔离与 family 读取契约，不能在 UI 自行替换用户 ID。

### 0–10 烟瘾兼容

新评分和感受当前编码在 note 的 @nico/v1: JSON 中；api/checkin.ts 使用 decodePulseNote，模型暴露 cravingScore 与 mood。旧 craving_level 仍保留 1–5。

新平均分和波谱必须只采用有效的 0–10 cravingScore；旧 1–5 记录没有可逆精确换算，不能擅自倍乘或填 0。旧记录计入吸烟量和记录天数，但不计入新评分样本。

### 可复用 API

- api/checkin.ts：getCheckinByDate、getCheckinsBetween、getCheckinsForUserBetween；无需先新增聚合端点。
- api/smokingProfile.ts：本人和指定家庭戒烟者档案读取。
- saveDailyCheckin 已通过用户 / 日期读取后更新或创建；唯一键冲突会读取并更新同日，保留原 createdAt。

## 4. 七项指标：现状与规格差异

| 指标 | 当前实现 | 新规格与最小方案 |
|---|---|---|
| M1 累计已记录天数 | statistics.ts 按有效计划日期扫描，recordedDays 计已有记录 | 复用日期去重 / 扫描方式；显式过滤无效与未来日期，附 sourceRange、coverage |
| M2 当前连续无烟 | 从今天倒推，今天无记录即 0 | 今天未打卡时从昨天起核实；返回 currentStreakThrough、今日待确认；缺口不能跨越 |
| M3 最长连续无烟 | 相邻已记录 0 支累加，缺日或吸烟中断 | 现有规则基本可复用；补签后重算，未来记录不纳入 |
| M4 实际累计吸烟 | actualCigarettes 对有效计划范围已有记录求和 | 可复用求和规则，名称明确为“已记录的累计吸烟”；附 n/m 记录覆盖 |
| M5 平均烟瘾 | 没有独立 0–10 平均指标；旧趋势读取 cravingLevel 1–5 | 新增 mean / sampleDays；0 有效、null 排除；波谱缺失段断开，旧量表不冒充新评分 |
| M6 节省估算 | 基线 × 所有计划日 − 实吸，缺日等同 0；负值 max(0)；Number 运算 | 仅记录日 Σ(基线 − 当日实吸) × 单价；保留负数；十进制 / 分单位精确汇总，最后统一舍入；参数缺失为 null |
| M7 健康参考里程碑 | MilestoneTrack 是 1/3/7/14/30 天奖励，无医学来源配置 | 与成就奖励分离；版本化官方来源与适用条件；无法确认时 eligibility=unknown，显示“尚无法确认”而非已恢复或 0 个已达成 |

M6 示例差异：计划 2 天、日基线 15、价格 20 / 20 支，只有一天记录 2 支；新估算为 ¥13，另一日未知不能省钱。记录一天 20 支则该日估算为 −¥5，不能截为 0。

累计指标不因 7D / 30D / 90D 筛选偷偷变成区间指标。时间筛选默认控制详细序列；如显示区间合计须明确字段名。M2/M3 与健康参考条件仍按截至统计日的全历史。

## 5. 时区、金额、恢复的关键缺口

### 统计时区

现有 SmokingProfileModel 无 timezone 和 currency；getLocalDateString 使用设备本地时区。nico_checkin_validation_patch.sql 是未自动部署草案，写入采用 Asia/Shanghai，注释已指出与设备本地的冲突。

建议首版明确沿用当前设备时区并在 Summary 中返回实际 IANA zone，币种为现有人民币语义 CNY；不静默改历史日期。若决定全产品统一 Asia/Shanghai，需单独确认对打卡写入、缓存与历史日期的影响。本轮没有执行 SQL。

### 金额

数据库有两位小数金额，但前端模型为 number。新的金额适配以十进制字符串 / 整数分与有理数处理；逐日差额只累加已记录日，最终一次舍入。基线 0、价格 0 是有效设置，不等于缺失。包支数缺失 / 非正应返回 null 或明确配置错误。

### 健康参考与来源待确认

现有 quit_start_date 仅是日期，不是最后一支烟的精确时间，也不证明持续无烟；漏签期间不可推断用户没有吸烟。createdAt 不能充当戒烟起始时间。医学参考不能直接复用成就奖励节点。

候选来源已在线核对存在，但尚未生成或批准参考配置：

| 来源 | 页面版本 | 下一步 | 当前产品状态 |
|---|---|---|---|
| CDC，Benefits of Quitting Smoking，https://www.cdc.gov/tobacco/about/benefits-of-quitting.html | 页面标注 2024-05-15；本轮核对 2026-10-13 | 挑选适用阶段，记录来源版本、条件及文本；不将群体参考当成用户生理测量 | 未启用 |
| WHO，Tobacco: Health benefits of smoking cessation，https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation | 本轮核对页面；配置版本和选用条目仍待确认 | 与 CDC 交叉核对；不混用相互不同的阈值或任意取最早值 | 未启用 |

Phase 1 可实现 M7 的明确未知状态与资格判断契约；不会用随机亮起的晶体或模型记忆填充医学数据。达到状态要等来源配置与可核实的持续无烟依据齐备。

## 6. 刷新路径与唯一计算边界

saveDailyCheckin → updateCachedCheckin 同日替换 / 加入 → 已有 statistics 时 recalculateStatistics → statisticsLoadedForUser 置空，下次 ensureStatisticsLoaded 重读。

saveSmokingProfile 更新档案并使统计缓存失效。family.quitterSummaries 是独立读取后的快照，需走现有 loadQuitterSummaries 重读，不能假定本人补签直接刷新另一账号的家庭快照。

新 Summary 和 DailyPoint 应由同一个 metrics.ts 实现；UI 不计算公式，适配器只转换现有数据与权限上下文。缓存键须区分用户、查看对象、时区、统计日期、档案参数及记录版本 / 内容变化，不能只按日期缓存。

重要兼容风险：旧 statistics.ts / visualization.ts 及消费页面仍使用旧 M2/M6 口径。Phase 1 不直接重写它们。新权威七指标契约采用不同且明确的字段，旧字段作为兼容接口保留；这只是迁移期间的范围隔离，不能宣称全站已统一。Phase 4 若需要全站统一，先列出家庭 / 成就 / 桌面消费点及数值变化，取得确认后再由兼容适配器委托到唯一计算层，禁止视图复制公式。

## 7. Three.js 与资产审计

- public/models/quitsmoke-seal-study.glb：1,772,820 bytes，约 1.69 MiB。包含导航晶体、香烟、内部封印与面标识，属于 Hub 业务资产；不把整份 GLB 硬塞进通用 Orbital Console。
- public/environments/studio_small_09_1k.hdr：1,615,248 bytes，约 1.54 MiB，已有反射环境及来源说明，可复用。
- hubAssetScene.ts：GLTFLoader、PMREM、反射卡片、冷暖灯光、资源释放、ResizeObserver、动效减弱、性能信息；有 setPaused，但当前未找到外部调用。
- hubPhotons.ts：空间轨道、透明材质、InstancedMesh 粒子、暖金焦散近似。路径和业务语义耦合，复用材质 / 曲线构造思路，不能不加区分地导入整套特效。
- OpticalHaloScene.vue：当前每日 / 档案造型以及按需重绘。DailyHalo 与 haloVisual 的确定性数据映射可供 Journey 时间画廊使用，保留已验收档案。
- 当前已有多个场景构造器，没有一个已经完全通用化的共享渲染管理器。Phase 2 样板独立运行、静态按需绘制；Phase 4 嵌入 Hub 时必须协调背景暂停 / 恢复，避免两个重型场景各自持续 RAF。不能因“复用场景”反而继承香烟业务或重复循环。

## 8. 文件级实施计划与阶段门禁

### Phase 1：计算与契约

计划新增：
- src/features/insights/domain/types.ts：Summary、DailyPoint、覆盖、区间及资格状态。
- src/features/insights/domain/metrics.ts：七指标唯一计算与序列。
- src/features/insights/domain/money.ts：十进制金额解析、精确汇总与舍入。
- src/features/insights/domain/recoveryReferences.ts：候选 / 经批准配置分离，资格未知默认安全显示。
- src/features/insights/adapters/insightsAdapter.ts：现有 CheckinModel / SmokingProfileModel → 领域输入，不负责公式。
- tests/metrics、money、adapter、recovery：规格八组样例及更新、缺失、负节省、日期边界、旧评分、账户切换。

先只使用隔离样本和真实形态 DTO，不接生产页面，不迁库。交付精确数值样例及测试结果，再汇报下一阶段。

### Phase 2：静态空间视觉样板

计划新增：
- ui/OrbitalConsole.vue：通用 modules 配置 / 插槽外壳，不含 NICØ 指标或 API。
- ui/OverviewScene.vue、scene/overviewScene.ts：中央多层倾斜玻璃平台、椭圆轨道及四个薄玻璃悬浮片；静态按需绘制、统一释放和性能计数。
- config/nicoDomains.ts：journey / craving / savings / recovery 装配。
- preview/OrbitalConsoleDemo.vue、scripts/verify-orbital-preview.mjs：DEV 隔离入口、固定样本声明、截图与性能测试。

可能最小修改：router/routes.ts 只加 DEV 样板入口，沿用现有 localDemo 协议；不增加正式免登录数据入口、不改认证守卫。

交付：1440×900 与 390×844 静态截图、必要角度、实际 draw calls / 三角形 / 渲染时间或可测帧率、资产大小、WebGL 降级。静态样板没有连续帧率时必须明确说明，不能编造 FPS。

【强制门禁】用户视觉验收前，不进入 Phase 3/4，不接真数据，不做复杂镜头转场。

### Phase 3：四个独立聚焦态

新增 FocusHost.vue 及 JourneyView、CravingView、SavingsView、RecoveryView：
- journey：时间画廊，复用每日光环并链接既有 7×7 档案。
- craving：玻璃波带与精确 0–10 波谱，缺日断开，显示样本量。
- savings：透明暖金光柱群，基线下方允许负柱，明确估算与币种。
- recovery：纵深晶体节点路径，未知 / 未到达 / 参考已满足三态分离。

3D 做空间与材质，精确读数、尺度、日期和交互使用稳定的 SVG / Canvas / DOM，不把四类领域简单换色为圆环。

### Phase 4：真实数据与无障碍

新增或接入 InsightsView.vue、useInsights.ts；最小修改 HubBusinessModule.vue 的 progress 装配及必要的现有路由参数，保留原 /trend /dashboard 协议与权限。

根据审计确认范围修改 refresh 适配、HubView 背景暂停 / 恢复。真实数据、补签 / 修改刷新、time filter、账户切换、返回和焦点恢复、44px 触控、reduce-motion、完整 2D 可操作降级一起验收。旧统计消费者统一属于单独明确的兼容接线事项，不悄悄改家庭或成就口径。

### Phase 5：全量回归

规格七指标与八组样例逐项验收；执行现有单元、类型与构建、权限 / 路由 / 打卡回归、新状态机和视觉截图对比。测量 LCP、实际交互帧率与手机滚动 / 触控表现；对照 Phase 2 已批准样板，列未达标、技术债和具体文件。

## 9. 验证状态与剩余问题

Phase 0 新增 / 修改文件：只有 docs/ORBITAL_CONSOLE_PHASE0_AUDIT.md，未改代码或数据库。

本阶段没有新 UI，因此没有新视觉截图。现有页面截图不作为新空间视觉样板的验收证据。

本阶段未重新执行测试或构建，避免把先前通过结果当作新指标已通过的证据。仓库最近一次记录为 37 个测试文件 / 155 项测试通过、生产构建通过；当前旧测试尚未验证新 M2/M5/M6/M7 口径。

已核对命令：npm test；npm run build（vue-tsc -b && vite build）；scripts/verify-daily-pulse.mjs、verify-hub-phase4.mjs、verify-halo-redesign.mjs、verify-halo-upright.mjs。新阶段将保留这些回归并增加专属测试。

需要确认后再编码的事项：
1. 接受 M2/M6 新口径与旧页面存在迁移期间差异，Phase 1 只新增独立权威契约，暂不覆盖旧消费者。
2. 首版时区沿用设备本地并显式标注 / 返回 IANA zone，币种采用现有 CNY，不迁库；统一产品时区另行确认。
3. 恢复指标来源和持续无烟依据不足时，显示未知，不借用成就天数充当健康已达成。
4. 保留已验收的 49 日七周档案。Phase 2 只做静态空间样板；未获视觉验收不进入 Phase 3。

## 10. 用户补充的美术门禁

用户要求：材质有质感、画面高级，降低反复纠正成本。Phase 2 优先保证美术质量。

静态样板必须逐张检查：
- 光学玻璃有可感知厚度、边缘折射、冷暖环境反射与明暗变化；中央平台各层之间有间隙、投影和透视，主体轮廓清楚。
- 金属边缘纤细、精密，暖金只在少量有光源依据的位置集中；暖白背景支持轮廓对比。
- 轨道确有前后遮挡，四块薄玻璃面板有稳定可读的文字承载面、不同空间深度；平台保持主视觉，面板信息精简。
- 总览样板先验证静态光照、材质和构图，再加入真实数据与复杂动画。优先复用已验证 Blender → GLB → Three.js 管线制作需要精密厚度 / 切角的资产，同时保持通用外壳独立。
- 主动检查 1440×900、390×844 和至少一个侧向细节镜头；提供截图与实际性能数据。代码 / 测试通过不能替代美术验收。
