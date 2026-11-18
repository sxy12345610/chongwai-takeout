# 第五阶段 · 学生端（微信小程序）架构规划

> 本文档基于对当前仓库的实际检查结果编写，未修改任何业务代码、数据库结构或配置。
> 检查日期：2026-11-19。

---

## 一、现有目录结构（实测）

项目实际位于**双层同名目录**：`C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\`

```
chongwai-takeout/                ← 真正的项目根（本文所有相对路径以此为基准）
├── .env.development             # 前端 API 地址：VITE_API_BASE_URL=http://localhost:3000/api/v1
├── .gitignore
├── .github/workflows/deploy.yml
├── .vscode/
├── index.html
├── package.json                 # 前端（Vue 3 + Vite）
├── package-lock.json
├── vite.config.js
├── public/
├── src/                         # Vue 3 Web 前端（学生端页面 + 管理后台）
│   ├── api/                     # request.js / auth.js / admin.js（仅管理后台对接真实 API）
│   ├── components/
│   ├── composables/
│   ├── data/                    # 学生端本地模拟数据（dishes.js / merchants.js 等）
│   ├── layouts/AdminLayout.vue
│   ├── router/index.js          # Hash 路由
│   ├── styles/admin.css
│   ├── utils/                   # 学生端本地存储（cart/orders/addresses/profile）
│   └── views/                   # 10 个学生端页面 + 8 个 admin 页面
├── server/                      # Express + Prisma 后端
│   ├── prisma/{schema.prisma,migrations/,seed.js,seed-data.json}
│   ├── src/{app.js,server.js,config,lib,middleware,modules,routes,utils,bootstrap}
│   ├── tests/                   # 6 个测试文件 / 22 个用例
│   ├── .env / .env.example
│   └── package.json
├── docs/                        # 现有 9 份文档（architecture / api-plan / database / payment / phase3 / phase4×2 …）
└── dist/                        # 前端构建产物
```

**结论**：`src/` 是 Web 前端（含学生端与管理后台），`server/` 是后端，`docs/` 是文档；**没有任何小程序工程目录**。

### package.json 与依赖（实测）

| 项目 | 内容 |
| --- | --- |
| 前端框架 | Vue `^3.5.44`、vue-router `^5.5.1`、axios `^1.21.1`、lucide-vue-next `^1.0.0` |
| 前端构建 | Vite `^8.3.6` + `@vitejs/plugin-vue` `^6.0.10` |
| 语言 | **纯 JavaScript**（前端与后端均无 TypeScript、无 tsconfig） |
| 后端 | Express 5、Prisma 6.19、PostgreSQL、JWT、zod、vitest + supertest |
| 状态管理 | **未使用 Pinia / Vuex** |

### Git 状态（实测）

- `git rev-parse --show-toplevel` 返回 `C:/Users/SXY`：**Git 仓库根目录是用户主目录，项目本身并不是独立 Git 仓库**。
- 因此 `HEAD` / 分支不存在（`fatal: ambiguous argument 'HEAD'`），`git status` 输出的是主目录内容，对项目无参考价值。
- 影响：当前无法通过 Git 分支管理阶段交付；本次**未执行 `git init`**（不修改配置）。建议后续在项目根执行 `git init` 后再开发小程序。

---

## 二、现有前端是否适合直接改造为 uni-app

**不建议直接改造，建议新建独立 `miniapp/` 目录。**

理由（均基于实测）：

| 事实 | 影响 |
| --- | --- |
| 使用 `vue-router` 的 `createWebHashHistory`（[src/router/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/router/index.js)） | 小程序无 DOM/history，必须改用 `pages.json` + `uni.navigateTo` |
| 依赖 `lucide-vue-next`（SVG 组件） | 小程序不支持 SVG DOM 组件，需替换为图标字体或 PNG |
| 大量 `view/hash` 路由 + CSS（px、`style scoped`、`position: fixed`） | 需统一改为 `rpx`、页面级样式，不能直接复用 |
| `src/data/*`、`src/utils/*` 使用 `localStorage` | 小程序无 `localStorage`，须改 `uni.setStorageSync` |
| 学生端页面目前全部使用本地 mock 数据 | 不能直接迁到小程序，需同时接入真实 API |
| 管理后台同样在 `src/` | 降到小程序会误伤后台，必须保留原项目 |

**推荐结构**（新增目录，不动现有文件）：

```
chongwai-takeout/
├── src/            # 保持不变：Web 学生端 + 管理后台
├── server/         # 保持不变
├── docs/           # 本阶段新增规划文档
└── miniapp/        # 新增：uni-app 微信小程序（独立工程）
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.ts
        ├── App.vue
        ├── pages.json
        ├── manifest.json
        ├── uni.scss
        ├── api/            # 统一请求封装 + 各业务模块
        ├── stores/         # Pinia
        ├── pages/          # 9 个页面
        ├── components/
        ├── static/         # 图标、占位图
        └── styles/
```

> 现有 [docs/architecture.md](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/docs/architecture.md) 曾规划 `apps/miniapp/`；本阶段按你要求采用根级 `miniapp/`，两者二选一即可，不影响后端。若希望与旧文档一致，可用 `apps/miniapp/`。

---

## 三、推荐技术方案

| 项 | 推荐 | 说明 |
| --- | --- | --- |
| 框架 | uni-app（Vue 3 + Vite） | 官方 `@dcloudio/uni-app`，一套代码编译到微信小程序 |
| 语言 | TypeScript | 现有项目是 JS，但小程序为**独立新工程**，引入 TS 不冲突；利于接口类型与 Pinia store 维护 |
| 状态管理 | Pinia | 现有 Web 未使用；小程序端用 Pinia 管理登录态、购物车、地址 |
| 请求 | `uni.request` 封装（不引入 axios） | 小程序环境无 XMLHttpRequest；统一拦截 401/403、注入 JWT、解包 `{code,message,data}` |
| UI 风格 | 蓝白主视觉 + 校园元素 | 主色沿用 Web 端 `#1769aa / #4e9fdf` 渐变；首页体现「重庆外语外事学院」校园场景 |
| 图标 | iconfont / PNG | 不使用 lucide SVG |
| 单位 | `rpx` | 适配 750 设计稿 |
| 开发工具 | 微信开发者工具（导入 `miniapp/dist/dev/mp-weixin`） | 本机是否已安装无法从仓库判断，需你确认 |
| 鉴权 | JWT（Bearer） | 与现有后端一致；token 存 `uni.setStorageSync` |

---

## 四、与后端的对接方式

- 基础地址：开发 `http://localhost:3000/api/v1`，生产需为 **HTTPS 且已在小程序后台配置 `request` 合法域名**。
- 统一响应：`{ code: 0, message: 'ok', data, traceId }`；`code !== 0` 视为失败。
- 鉴权：`Authorization: Bearer <accessToken>`；401 统一清登录态回登录页。
- 金额：后端全部为**整数分**（`priceCents` 等），前端展示时除以 100，禁止浮点累加。
- 下单：必须携带 `Idempotency-Key`（UUID），同一笔订单的网络重试**复用同一个键**。

---

## 五、本次检查结论

1. 现有 Web 项目结构清晰，**必须完整保留**；小程序应作为独立工程新增，避免影响管理后台。
2. 现有前端是 JS + vue-router + SVG 图标 + localStorage 的 Web 技术栈，**不适合直接改造成 uni-app**。
3. 后端已具备学生端绝大多数读接口与购物车/地址/订单写接口，**微信登录尚未真正实现**（详见 `phase5-api-checklist.md`）。
4. 项目不是独立 Git 仓库，建议开发前先 `git init`（本次未执行）。
5. 未创建任何小程序文件、未修改任何业务代码与数据库结构。
