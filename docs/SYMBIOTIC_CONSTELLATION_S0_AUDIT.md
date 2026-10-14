# NICØ 共生星图 · Phase S0 只读审计

日期：2026-10-13。基线：交付包内完整 Markdown、两份 SVG 与 PNG。只检查仓库代码和仓库 SQL，未连接生产数据库、未验证已部署策略，也未修改应用代码、依赖、数据库、API 或原有未提交文件。新增内容仅为解包的设计参考和本审计报告。本轮未运行测试或构建，因为未改应用代码。

## 1. 设计落点

采用一核双轨：中央分瓣透明生命核心，内部银白呼吸丝带，不放香烟；两条非闭合轨道具有不同倾角、深度和扭转；支持光核同等权重；默认只高亮一个计划弧，最多三个近期纪念迹点。暖白背景、清透主材质、暖金局部高光与暗部反射，不复制示意图中的交接标签。

先提供独立模拟预览，不替换现有家庭界面。0/1/2 支持者布局、图层开关、材质 A/B、固定和观察视角、桌面/手机截图都属于 S1。五种鼓励效果是 S2；计划验证与真实打卡联动是 S3；新持久化和权限是单独批准的 S4；Hub联动是S5。

## 2. 已有能力与文件级复用

| 文件 | 已有能力 | 星图中的复用方式 |
|---|---|---|
| `src/config/hubModules.ts` | 六个稳定面 ID；05 `support`，04 `reserved` 禁用 | 原 ID、normal 和权限不变 |
| `src/visuals/hubJourney.ts`、`hubModuleRoutes.ts` | support → `/family`；桌面可走 `/dashboard?module=support` | S5复用切面转场/返回状态，不另做不受保护的生产路由 |
| `src/components/HubBusinessModule.vue` | 支持模块加载 FamilyView；登录与支持者打卡限制 | S1–S3不替换生产组件，S5再接入 |
| `src/visuals/hubAssetScene.ts`、`hubInteraction.ts`、`hubPhotons.ts` | GLB、HDR、拖拽拾取、减弱动画、转场、释放资源 | 复用资产加载和生命周期模式；新场景独立，避免修改Hub外观 |
| `src/stores/family.ts`、`src/api/family.ts` | 家庭关系、quitter/supporter、邀请、退出、选择戒烟者、摘要 | 将选中的戒烟者作为核心，不默认取第一人；支持者以userId去重 |
| `src/views/FamilyView.vue`、`src/components/FamilyChat.vue` | 家庭动态、聊天、快捷鼓励、刷新和失败处理 | 聊天保留为次级浮层，不用它充当星图主视觉 |
| `src/stores/encouragement.ts`、`src/api/encouragement.ts` | heart/like/clap/fire/celebrate/message、成功后更新、冷却、账号隔离 | 现有快捷鼓励仍有效；新五种视觉类型独立mock，不改旧type含义 |
| `src/stores/message.ts`、`src/api/message.ts` | 消息发送、读取、账号隔离、订阅清理 | 真实请求结果与动画事件分离 |
| `src/views/CheckinView.vue`、`src/stores/smoking.ts`、`src/api/checkin.ts` | 日期切换、补录、0–200支、新烟瘾评分、感受、校验、真实提交 | S3复用现有流程，成功返回才播放日常确认脉冲 |
| `src/utils/statistics.ts`、`familySummary.ts` | 当前/最长连续无烟、实际支数、缺失覆盖 | 不修改公式；计划验证另建纯函数，明确选择口径 |
| `src/stores/accountScope.ts` | 账号切换失效标记、清理业务store与订阅 | 新UI状态、mock与事件队列接入清理生命周期 |
| `public/environments/studio_small_09_1k.hdr`、`assets/blender` | 现有HDR及Blender→GLB流程 | 复用环境与导出流程；现有香烟封印GLB不能直接作为生命核心 |

## 3. 身份与人数

- 家庭可以有多个戒烟者，已有 `selectedQuitterId`；星图核心必须对应明确选中的戒烟者。
- 代码与检查到的成员RPC/SQL没有“最多两位支持者”限制。S1用明确模拟的0/1/2人；真实接入前需要确定超过两人时的选择或产品限制，不能静默截断，更不能擅自拒绝已有家庭成员。
- 路由拦截支持者访问 `/checkin` 和 `/setup`，Hub组件也限制支持者打卡。API创建绑定当前登录用户，更新同时过滤userId，不能代填另一人的记录。
- 仓库Supabase SQL的打卡写入策略主要是“本人”，未额外限定quitter角色。前端角色限制不等于部署后的后端角色鉴权；S4必须确认实际部署规则，不宣称已通过双账号安全验证。

## 4. 打卡与统计差异

- 文档引用旧量表1–5；当前每日光环界面已是0–10烟瘾评分与感受，不应倒退。数据库基础字段仍为1–5，已有日常模块在备注编码中保留新评分和感受，并在API解码。星图不新增任何这种编码，不把计划/光效塞进备注。
- 当前保存校验吸烟量0–200整数；编码后备注≤300字符，用户备注另有160字符限制，不能承诺仍可输入300字自由文本。
- `family.ts`的打卡model转换仅保留旧cravingLevel/note，未携带解码后的cravingScore和mood。若未来展示这些数据需专门适配，且先确认共享权限；不能直接把旧1–5当新0–10。
- 当前业务statistics从今天倒推连续零支，今天缺失则当前连续为0；新的数据中心domain有todayPending口径，可从昨天展示已验证连续。两种口径不能混用或为了动效全局改公式。S3明确复用当前家庭统计，展示截止日期，计划则按日期范围逐日核验。
- 缺失不算0支；非零打卡仍是成功记录。纪念不等同永久成就，补录/编辑后不能反复自动授予。

## 5. 鼓励与实时能力

现有 `encouragements` 字段是id、family_id、from_user_id、to_user_id、type、message、created_at；type受旧六种枚举约束。没有effect_type、read_at、投递状态。新glow/starlight/resonance/bloom/halo不可直接写入type，也不能以五个旧reaction名伪装独立特效留存。

消息文本上限500，文字鼓励上限200，各自复用原验证。现有store带sending、成功结果更新、账号失效检查、10秒快捷鼓励冷却；新发送仍需明确后端确认。远端收到或已读不能从本地演出推断。

Supabase代码有messages和encouragements的变更订阅；实际服务发布/权限仍待部署验证。CloudBase分支明确未实现订阅，返回idle。可以保留手动刷新，未来轮询必须另外实施并诚实标识；当前没有可承诺的即时在线送达。

## 6. 隐私与数据库边界

仓库SQL允许同家庭读取打卡完整行，family摘要也加载完整checkins；未发现细粒度“共享烟瘾/感受/备注”的权限字段。新星图默认只放必要的记录状态/统计，不能把技术可读取等同用户授权。S4审议字段级共享、访问控制与CloudBase实际实现。

| 新能力 | 现在的处理 | 后续可能的契约（未实施） |
|---|---|---|
| 五种光效及可选短留言 | 独立mock事件协议 | 扩展鼓励类型字段/独立事件表，保留旧reaction语义 |
| 未读/重播 | mock收件箱，可本地重播明确样本 | 收件人read状态、事件ID、去重；不要求假“实时在线” |
| 共同计划 | mock adapter + 四类纯验证函数 | plan、版本、参与者、提议/接受者、verification_mode、状态转移及幂等契约 |
| 永久纪念/历史达成时间 | 可重建视觉样本，不说永久解锁 | 先核实真实事件历史，再决定是否新增纪念表 |
| 两人/字段共享限制 | 样板只覆盖0/1/2，生产保持原规则 | 用户明确选择人数政策、共享授权后再决定迁移 |

本轮未发现可复用的共同计划表/API。上述是需要设计的新契约清单，不是现在要创建的数据表；只在S4单独批准后迁移。

## 7. 最小侵入实施计划

| 阶段 | 预计新增/修改文件 | 验收后停止点 |
|---|---|---|
| S1静态样板 | 新`src/features/constellation/preview/ConstellationDemo.vue`、`ui/ConstellationCanvas.vue`、`scene/{scene,core,orbits,planArc,photons}.ts`、`adapters/mock.ts`、`types.ts`；在`router/routes.ts`仅加DEV localDemo路由；新增独立Blender核心资产和导出脚本 | 1440×900、390×844、0/1/2成员、不同角度、图层开关、材质A/B、错误/降级截图；记录draw calls/三角形，不预报FPS |
| S2光效 | 新`effects/{glow,starlight,resonance,bloom,halo}.ts`、`ui/EncouragementPicker.vue`、mock事件队列 | 五种效果可辨认、取消/重播、重复触发、减弱动画、隐藏页面与清理验证 |
| S3计划/打卡 | 新`domain/{planValidation,planLifecycle}.ts`及测试、`ui/{CheckinSheet,PlanEditor,PlanDetail,RelicGallery}.vue`、只读真实适配器 | 零支/非零/缺失/补录/编辑、四计划验证、支持者无写入、失败保留输入；新计划明确mock |
| S4真实接入 | 新真实adapter；只有批准后的迁移、API/types/store及共享权限修改 | 两账号、断网重试、幂等、去重、退出、历史重建；实际后端验证 |
| S5Hub整合 | 修改`HubBusinessModule.vue`、支持模块入口、必要的journey桥接；保留04空白、其他faceId与原路由权限 | 进入/返回朝向、深链、手机、WebGL丢失、重复进出、无障碍与实际设备性能 |

场景用三层艺术结构：清澈生命核心、具有厚度和扭转的开放丝带、少量光子/计划节点；光效与业务成功事件解耦。中央资产优先独立Blender建模，GLB不烘焙人物或业务状态；Three.js运行时拾取目标与Vue可访问按钮同步投影。避免通用蓝色描边玻璃和大量高亮线条。

## 8. 风险与阶段决定

优先风险：支持者数量规则尚不一致、家庭完整记录可读与新隐私约束不同、旧新烟瘾量表、当前连续统计口径不同、CloudBase无实时、新计划/光效/已读/永久纪念无持久化。视觉风险：多层透射排序、丝带遮挡、手机玻璃层数与GPU负担。验证必须区分本机CPU提交时间、实际帧率与真实低性能手机测试。

S0完成。应用代码零修改；按交付规范“零代码修改，等待确认”，下一步仅制作S1独立空间样板，之后再次视觉验收，不一次性进入全部阶段。
