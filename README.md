# 无烟之家 / Quit Smoking Family

家庭戒烟打卡 Web App MVP。

## 本地运行
```bash
npm install
cp .env.example .env
npm run dev
```

在 `.env` 中填写 Supabase Project Settings → API 提供的浏览器端配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-browser-safe-anon-or-publishable-value
```

变量名沿用项目现有的 `VITE_SUPABASE_ANON_KEY`；其值必须是浏览器安全的 anon/publishable key。严禁使用 `service_role` 或 secret key。`.env` 与本地变体已被 `.gitignore` 排除。

首次使用前，在 Supabase SQL Editor 执行 `docs/database.sql`。数据库结构与 RLS 说明见 `docs/DATABASE.md`，真实多账号验证步骤见 `docs/REAL_WORLD_TEST.md`。

## 构建与部署

```bash
npm test
npm run build
```

生产产物位于 `dist/`。项目使用 Vue Router history 模式；`public/_redirects` 会随构建复制到产物，为 Cloudflare Pages 的 `/home`、`/family`、`/trend` 等直接访问提供 SPA fallback。部署后还需在 Supabase Authentication → URL Configuration 中加入生产 Site URL。
