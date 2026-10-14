# NO SMOKING / Family Quit Companion

家庭戒烟打卡 Web App MVP。

## 本地运行
```bash
npm install
cp .env.example .env
npm run dev
```

首页 `/` 现在是公开的 QUITSMOKE 3D 交互封面。悬停光环增强入口反馈，点击后香烟逐步解构、颗粒消散、气流汇入光环，再通过现有鉴权和角色流程进入 `/home`。已有账号可使用右上角登录入口。封面无需后端连接即可显示。

实现采用 Three.js 程序化流线与粒子，无远程模型资源。当前是可调整的交互原型，尚未使用参考图级别的离线建模资产。支持窄屏、键盘、减少动画偏好以及 WebGL 不可用时的静态降级。

本机带有 Codex 浏览器运行时及 Edge 时，可执行 `node scripts/verify-cover.mjs` 验证封面；其他环境可用 `PLAYWRIGHT_MODULE_DIR` 指定已安装的 Playwright 包目录。脚本默认访问 `127.0.0.1:5173`，须先启动开发服务。截图与结果保存在忽略提交的 `artifacts/cover/`。

默认仍使用 Supabase。在 `.env` 中填写 Supabase Project Settings → API 提供的浏览器端配置：

```env
VITE_BACKEND_PROVIDER=supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-browser-safe-anon-or-publishable-value
```

变量名沿用项目现有的 `VITE_SUPABASE_ANON_KEY`；其值必须是浏览器安全的 anon/publishable key。严禁使用 `service_role` 或 secret key。`.env` 与本地变体已被 `.gitignore` 排除。

切换到 CloudBase PostgreSQL 时保留上面的 Supabase 配置以便回滚，并增加：

```env
VITE_BACKEND_PROVIDER=cloudbase
VITE_CLOUDBASE_ENV_ID=quitsmoke-d0gl5n5ge1297c2b5
VITE_CLOUDBASE_PUBLISHABLE_KEY=your-browser-safe-publishable-key
VITE_CLOUDBASE_REGION=ap-shanghai
```

CloudBase 只能使用浏览器安全的 Publishable Key，禁止把 API Key 或 service-role 凭据写入任何 `VITE_` 变量。修改 `.env` 后必须重启 Vite。CloudBase 数据库部署和前端迁移差异见 `docs/CLOUDBASE_MIGRATION.md`。

首次使用前，在 Supabase SQL Editor 执行 `docs/database.sql`。数据库结构与 RLS 说明见 `docs/DATABASE.md`，真实多账号验证步骤见 `docs/REAL_WORLD_TEST.md`。

如果现有 Supabase 项目已经执行过旧版脚本：

1. 执行 `docs/messages_patch.sql`，增加家庭动态、打卡系统事件与 Realtime。
2. 执行 `docs/family_membership_patch.sql`，限制一个账号同时只能加入一个家庭，并增加安全退出家庭 RPC。

两份 patch 都不需要重建原有业务表。

## 构建与部署

```bash
npm test
npm run build
```

生产产物位于 `dist/`。项目使用 Vue Router hash 模式，业务路径为 `/#/home`、`/#/family`、`/#/trend`；公开封面为 `/` 或 `/#/`。部署后还需在 Supabase Authentication → URL Configuration 中加入生产 Site URL。
