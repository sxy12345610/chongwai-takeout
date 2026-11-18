# GitHub 部署准备报告

> 本次仅做检查、构建验证与方案规划；**未初始化 Git、未创建远程仓库、未提交、未推送、未部署**，未修改业务代码、数据库结构与配置。

---

## 一、当前 Git 环境

| 项 | 实测结果 |
| --- | --- |
| 项目真实根目录 | `C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\` |
| `git rev-parse --show-toplevel` | **`C:/Users/SXY`**（仓库根是用户主目录，不是项目目录） |
| 当前分支 | `master`，**尚无任何提交**（unborn branch） |
| 提交数量 / 已跟踪文件 | **0 / 0** |
| `git remote -v` | **空**（没有配置任何远程仓库） |
| `.git` 位置 | 仅存在 `C:\Users\SXY\.git`；项目目录、`Desktop`、外层 `chongwai-takeout` 均**没有** `.git` |
| 项目工作区状态 | `git status --short -- .` → `?? ./`，即整个项目**完全未被跟踪** |

### 结论与安全隔离方案

- 当前“仓库”是家目录的**空仓库**（0 提交、0 文件、无远程），项目全部处于未跟踪状态。
- **绝对不要**在 `C:/Users/SXY` 执行 `git add .` / `git commit`：会把家目录里的个人文件纳入版本控制。
- 推荐方案（需你确认后再执行）：
  1. 在项目根 `C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\` 执行 `git init`，形成独立仓库（嵌套仓库不会影响家目录的空仓库）；
  2. 添加 `.gitignore` 增补项（见第三节建议）；
  3. `git add` 前先 `git status` 复核，确认只包含本项目文件；
  4. 关联你在 GitHub 新建的空仓库并首次提交/推送。
- 不建议直接复用家目录仓库，也不建议改写任何历史（当前也没有历史）。

---

## 二、敏感信息检查

### 1. 环境文件现状

| 文件 | 内容性质 | 是否会被提交 | 结论 |
| --- | --- | --- | --- |
| `server/.env` | 含真实 `DATABASE_URL`（含密码）、`JWT_SECRET`(64)、`JWT_REFRESH_SECRET`(64)、`SEED_ADMIN_PASSWORD` 等 | **不会**（`server/.gitignore` 第 5 行 `.env`，已用 `git check-ignore -v` 验证） | 安全 |
| `server/.env.example` | `postgresql://USER:PASSWORD@localhost:5432/...`、`JWT_SECRET=replace-with-random-64-chars`、`WECHAT_SECRET=` 空 | 会提交（应当提交） | 安全，均为占位值 |
| `miniapp/.env.development` | 仅 `VITE_API_BASE_URL=http://localhost:3000/api/v1` | 会提交 | 无密钥，但上线前需换 HTTPS |
| `miniapp/.env.production` | 同上（本地地址） | 会提交 | 无密钥，但上线前必须替换 |
| 根目录 `.env.development` | 仅 `VITE_API_BASE_URL=http://localhost:3000/api/v1` | 会提交 | 无密钥 |
| 根目录 `.env.production` | **不存在** | — | 构建时 API 地址回退到 localhost（见第四节） |

### 2. 源码硬编码扫描

在 `src/`、`server/src/`、`miniapp/src/` 中检索 `postgresql://`、`postgres://`、`sk-`、`WECHAT_SECRET=`、`JWT_SECRET=`：

- 仅命中 `server/.env.example` 的两行占位示例；
- **未发现**真实数据库密码、JWT 密钥、微信 AppSecret、第三方 API Key 写入源码；
- 小程序端 `request.ts` 不含任何密钥，AppID `wx92612cc326e51c60` 为公开标识，可提交。

### 3. 历史提交检查

- 家目录仓库 **0 次提交、0 个跟踪文件**，项目从未被提交过；
- 因此**不存在历史提交泄露密钥的问题**，无需改写历史；
- 注意：一旦按推荐方案新建仓库，首次提交前务必再次执行 `git status` 复核暂存范围。

### 4. 备份 / 日志 / 数据文件

- 未发现 `*.sql` 数据导出、`*.dump`、`*.bak`、备份目录；
- `server/prisma/migrations/**/*.sql` 仅为**表结构迁移脚本**（应提交，不含业务数据）；
- 项目内未发现日志文件（`node_modules` 内的 `lint.log` 属依赖包，已被忽略）；
- 根 `.gitignore` 已忽略 `node_modules`、`dist`、`*.log`、`*.local`；`server/.gitignore` 另外忽略 `certs/`、`*.pem/*.p12/*.pfx`。

### 5. 建议的忽略规则增补（本次未修改文件）

根 `.gitignore` 目前**没有**通用 `.env` 规则（仅靠 `server/.gitignore` 生效）。建议首次提交前补充：

```gitignore
# 环境变量（保留无密钥示例）
.env
.env.local
.env.*.local
!.env.example
```

`miniapp/.env.development`、`miniapp/.env.production` 仅含 API 地址，可选择保留；后端任何环境文件一律不得提交。

---

## 三、Web 前端部署条件

| 项 | 实测结果 |
| --- | --- |
| `package.json` build 命令 | `"build": "vite build"`（`npm run build`） |
| 构建输出目录 | `dist/`（Vite 默认） |
| Vite `base` | `'./'`（[vite.config.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/vite.config.js#L7-L8)），适配 GitHub Pages 子路径 |
| 路由模式 | `createWebHashHistory()`（[router/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/router/index.js#L23-L25)），Hash 路由，**刷新不会 404** |
| 静态图片 | `localImage()` 使用 `import.meta.env.BASE_URL + 'images/...'`，子路径部署可用 |
| `.nojekyll` | 构建产物 `dist/.nojekyll` 已存在，避免下划线目录被 Jekyll 忽略 |
| API 地址 | 源码走 `VITE_API_BASE_URL`；但**仓库没有根级 `.env.production`**，本次构建产物中仍含 `http://localhost:3000/api/v1` |
| 构建结果 | ✅ `vite v8.3.8`，1866 modules，`dist/index.html` + `assets/index-*.js`(294.77 kB) + `assets/index-*.css`(88.32 kB)，耗时 1.54s |
| 产物 HTML | 资源引用为 `./assets/...`，Hash 路由 + 相对 base，可直接放 Pages 子路径 |

### 重要事实（务必知悉）

1. **学生端 Web 页面仍使用本地演示数据**（`src/data/merchants.js`、`dishes.js` 等，标注为“演示商家”），未接后端；部署到 Pages 后公网访问看到的是演示内容，不是 PostgreSQL 数据。
2. **管理后台使用真实 API**，但构建时 API 指向 `localhost`。公网访客浏览器访问的是自己的 localhost，管理后台将无法登录。
3. 后端生产 CORS 当前为 `origin: false`（[server/src/app.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/app.js#L15-L17)），**GitHub Pages 域名无法跨域调用后端**，必须改为允许 `https://<用户名>.github.io`。
4. 后端返回的 `imageUrl` 为 `/images/...` 绝对路径，部署在 Pages 子路径时会指向域名根目录，管理后台图片可能 404，需要前端做 BASE_URL 前缀处理（下一阶段修改项）。

---

## 四、部署架构建议

```
GitHub 仓库（代码，唯一事实源）
├── GitHub Pages  ← 只托管 Vue Web 静态产物（dist）
├── 云端 Node.js  ← 运行 Express（HTTPS 域名 + 反向代理）
├── 云端 PostgreSQL ← 业务数据（后端私有网络访问）
└── miniapp/      ← 代码托管在仓库，通过微信开发者工具上传，不经 Pages
```

- **GitHub Pages 不能运行 Express，也不能运行 PostgreSQL**，只能托管静态文件；
- 小程序不通过 GitHub Pages 发布，需使用微信开发者工具上传/发布；
- 现有 `.github/workflows/deploy.yml` 已具备 Pages 部署流程：检出 → Node 22 → `npm ci` → `npm run build` → 上传 `dist` → `deploy-pages`；
- Pages 设置需选择 **Source: GitHub Actions**；如用仓库子路径，`base: './'` + Hash 路由已适配。

### 上线前必须补充的环境配置

| 项 | 位置 | 说明 |
| --- | --- | --- |
| Web 构建 API 地址 | GitHub Actions 变量 / 根级 `.env.production` | 如 `VITE_API_BASE_URL=https://api.你的域名/api/v1` |
| 后端环境变量 | 云平台 Secrets | `DATABASE_URL`、`JWT_SECRET`、`JWT_REFRESH_SECRET`、`PORT`、`NODE_ENV=production`、`WECHAT_APPID/SECRET`（如启用登录） |
| CORS 白名单 | 后端代码/配置 | 允许 `https://<用户名>.github.io`（当前生产为 `false`） |
| 数据库迁移 | 部署流程 | `npx prisma migrate deploy`（不要用 `migrate dev`） |
| HTTPS | 云平台/反向代理 | Pages 为 HTTPS，后端必须 HTTPS，否则混合内容被拦截 |

---

## 五、需要你提供 / 确认的信息

1. **GitHub 账号与仓库**：用户名、仓库名、Public/Private；是否允许我在项目根执行 `git init` 并创建首次提交（暂不推送）。
2. **后端托管方案**：Render / Railway / Fly.io / 腾讯云轻量 / 阿里云 ECS 等，或暂不部署。
3. **后端公开域名**：用于 `VITE_API_BASE_URL` 与 CORS 白名单。
4. **PostgreSQL 方案**：云数据库连接串（请勿直接贴在对话中，建议你自己填入平台 Secrets）。
5. **学生端 Web 是否接真实 API**：当前为演示数据；若要公网可点餐，需要单独排期对接。
6. 是否同意在首次提交前为根 `.gitignore` 增补 `.env` 规则（本次未改）。
7. 小程序 AppID 已配置，无需再提供；**AppSecret 不要发给 AI，只放云端环境变量**。

---

## 六、风险与结论

| 风险 | 等级 | 说明 |
| --- | --- | --- |
| 在家目录仓库提交 | 高 | 会把个人文件纳入版本控制；必须隔离 |
| 公网 API 指向 localhost | 高 | Pages 上的管理后台无法登录 |
| 生产 CORS `origin:false` | 高 | Pages 域名无法调用后端 |
| 学生端仍是演示数据 | 中 | 公网展示内容非真实数据库 |
| 图片绝对路径 | 中 | 子路径部署时管理后台图片可能 404 |
| 小程序 API 仍为 localhost | 中 | 真机/体验版需 HTTPS 域名与合法域名配置 |
| 密钥泄露 | 低 | 当前无历史提交；`.env` 已被忽略；示例文件为占位值 |

**结论：当前代码可以安全地提交到新的 GitHub 仓库（尚无历史泄露），但还不能直接“网页公开可用”。** 需先完成：仓库隔离初始化 → 后端部署与 HTTPS → CORS 白名单 → 构建注入 API 地址 → Pages 首次发布。

> 本次到此停止，未创建仓库、未提交、未推送、未部署，等待你的确认与下一步指令。
