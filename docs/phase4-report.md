# 第四阶段交付报告：Web 管理后台对接真实后端 API

> 范围：将现有 Vue 3 + Vite 管理后台与 Express + Prisma + PostgreSQL 后端做真实接口对接。
> 约束：保留现有结构与页面，不推倒重写；业务数据全部走后端 REST API，禁止 LocalStorage / 写死数据模拟真实业务；不修改已确认的数据库结构；不接真实支付、不部署。
> API 基础地址：`http://localhost:3000/api/v1`（开发环境由 `VITE_API_BASE_URL` 注入）。

---

## 一、修改 / 新增文件清单

### 后端（`server/src/`）

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [modules/admin/admin.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/admin/admin.service.js) | 新增 | 平台管理员服务：统计聚合、全平台订单/商家/商品/用户/分类的增删改查 |
| [modules/admin/admin.routes.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/admin/admin.routes.js) | 新增 | `/api/v1/admin/*` 路由，全部经 `authenticate + requireRole('ADMIN')` 守卫，zod 参数校验 |
| [modules/order/order-actions.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order-actions.js) | 新增 | 抽离共享订单动作（`orderSelect` + `performAccept/performReject/performComplete`），商家端与管理员端复用同一份状态机与库存恢复逻辑 |
| [bootstrap/admin.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/bootstrap/admin.js) | 新增 | `ensureAdminUser()`：仅非生产 + 配置了 `SEED_ADMIN_PHONE` 时，启动时 upsert 管理员账号（bcrypt 哈希密码） |
| [routes/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/routes/index.js) | 修改 | 挂载 `router.use('/admin', adminRoutes)` |
| [modules/auth/auth.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/auth/auth.service.js) | 修改 | `resolveIdentity` 查用户 phone；仅非生产下匹配 `SEED_ADMIN_PHONE` 授予 ADMIN（生产不生效，仍走 `ADMIN_USER_IDS` 白名单） |
| [modules/merchant/merchant.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/merchant/merchant.service.js) | 修改 | 重构为 `findMerchantOrder`（越权返回 404）+ 调用共享 `perform*`，行为不变 |
| [config/env.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/config/env.js) | 修改 | 新增 `SEED_ADMIN_PHONE`、`SEED_ADMIN_PASSWORD` |
| [server.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/server.js) | 修改 | 启动前 `await ensureAdminUser()` |
| `server/.env` / `server/.env.example` | 修改 | 新增 `SEED_ADMIN_PHONE=admin001`、`SEED_ADMIN_PASSWORD=Admin@123456`（仅开发态） |

### 前端（`src/`）

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [.env.development](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/.env.development) | 新增 | `VITE_API_BASE_URL=http://localhost:3000/api/v1` |
| [api/request.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/api/request.js) | 新增 | axios 单例；baseURL 取环境变量；请求拦截注入 `Authorization: Bearer`；响应拦截解包 `{code,message,data}`，401 清 token 并派发 `api:unauthorized` |
| [api/auth.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/api/auth.js) | 新增 | `login/logout/getToken/getUser/isLoggedIn/isAdmin/fetchMe`，token 存 localStorage `cw_admin_token` |
| [api/admin.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/api/admin.js) | 新增 | `adminApi`，含字段适配器：后端整数分 ↔ 前端元、状态 `UPPER` ↔ `lower`、字段映射（`priceCents→price` 等） |
| [composables/useAsync.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/composables/useAsync.js) | 新增 | `loading/error/data/run` 异步封装 |
| [composables/useToast.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/composables/useToast.js) | 新增 | 全局 toast |
| [components/admin/Pagination.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/components/admin/Pagination.vue) | 新增 | 复用分页组件 |
| [views/admin/AdminLogin.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminLogin.vue) | 新增 | 管理员登录页（手机号 + 密码，校验 ADMIN 角色） |
| [views/admin/AdminUsers.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminUsers.vue) | 新增 | 用户管理页 |
| [views/admin/AdminCategories.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminCategories.vue) | 新增 | 分类管理页 |
| [views/admin/Admin.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/Admin.vue) | 重写 | 数据概览：真实用户/商家/商品/订单 + 近 7 日趋势 + 商家/热销榜 + 最新订单 |
| [views/admin/AdminStatistics.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminStatistics.vue) | 重写 | 数据统计页，真实数据图表 |
| [views/admin/AdminShops.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminShops.vue) | 重写 | 商家管理：列表 + 详情 + 编辑（含非 ACTIVE 商家） |
| [views/admin/AdminProducts.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminProducts.vue) | 重写 | 商品管理：查询/新建/编辑/上下架/软删除，分页 |
| [views/admin/AdminOrders.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminOrders.vue) | 重写 | 订单管理：列表 + 详情 + 状态流转（接单/拒单/完成），对齐后端状态机 |
| [router/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/router/index.js) | 修改 | 新增 `/admin/login`、`AdminUsers`、`AdminCategories` 路由；`beforeEach` 守卫校验 `isLoggedIn() && isAdmin()`，监听 `api:unauthorized` 跳登录 |
| [layouts/AdminLayout.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/layouts/AdminLayout.vue) | 修改 | 顶栏显示真实管理员昵称/手机号 + 登出；挂载全局 toast；导航新增「用户管理」「分类管理」；移除“演示/本地数据”文案 |
| [utils/format.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/utils/format.js) | 修改 | 新增 `formatDateTime` |
| [styles/admin.css](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/styles/admin.css) | 修改 | 追加 error/loading/toast/用户区/分页通用样式 |
| `package.json` | 修改 | 新增依赖 `axios` |

> 数据库结构：**未做任何修改**，未新增字段或表；商品删除采用软删（`deletedAt`，该字段已存在于 schema）。

---

## 二、已完成的页面与接口对接

所有 `/api/v1/admin/*` 接口均挂在 `authenticate + requireRole('ADMIN')` 之后，非管理员访问返回 403。

| 页面 | 对接接口 | 状态 |
| --- | --- | --- |
| 登录页 `/admin/login` | `POST /auth/login`（校验返回 roles 含 ADMIN） | ✅ |
| 数据概览 `/admin` | `GET /admin/stats`（counts / today / last7Days / merchantRanking / hotDishRanking / latestOrders） | ✅ |
| 数据统计 `/admin/statistics` | `GET /admin/stats` | ✅ |
| 商家管理 `/admin/shops` | `GET /admin/merchants`、`GET /admin/merchants/:id`、`PATCH /admin/merchants/:id` | ✅ |
| 商品管理 `/admin/products` | `GET /admin/products`、`POST /admin/products`、`PATCH /admin/products/:id`、`DELETE /admin/products/:id`（软删） | ✅ |
| 订单管理 `/admin/orders` | `GET /admin/orders`、`GET /admin/orders/:id`、`POST /admin/orders/:id/accept`、`POST /admin/orders/:id/reject`、`POST /admin/orders/:id/complete` | ✅ |
| 用户管理 `/admin/users` | `GET /admin/users` | ✅ |
| 分类管理 `/admin/categories` | `GET /admin/categories`、`POST /admin/categories`、`PATCH /admin/categories/:id` | ✅ |

所有页面均已加入：加载中状态、空数据状态、请求失败提示 + 重试、表格分页、新增/编辑/删除的确认与结果反馈。订单操作严格对齐后端状态机（`PENDING→接单/拒单`，`PREPARING→完成`），未在前端臆造 `delivering` 等后端不存在的状态。

---

## 三、已经真实可用的功能

- 管理员登录与权限校验（JWT + ADMIN 角色，路由守卫 + 接口守卫双重校验）。
- 数据概览：真实读取 PostgreSQL 中用户/商家/商品/订单数量、近 7 日趋势、商家销量榜、热销商品榜、最新订单。
- 商家管理：真实查询商家列表/详情，编辑商家信息（含起送价、配送费、营业状态、上下架状态等），真实写库。
- 商品管理：真实查询/新建/编辑/上下架/软删除商品，价格、库存、分类等真实写库；中文商品名 UTF-8 存读正确。
- 订单管理：真实查询全平台订单与详情，按后端状态机执行接单/拒单/完成；拒单事务内恢复库存并写日志（与商家端共享逻辑）。
- 用户管理：真实查询用户列表。
- 分类管理：真实读取/新建/编辑分类。
- 统一请求层：单一 axios 实例，JWT 注入、401 自动清理并跳转登录、错误统一解包；无页面重复写请求配置；API 地址走环境变量，未在前端代码写入任何密钥/密码。

开发态管理员账号：`admin001` / `Admin@123456`（仅非生产环境由 `SEED_ADMIN_PHONE` 引导创建；生产环境必须使用 `ADMIN_USER_IDS` 白名单，该引导逻辑不生效）。

---

## 四、尚未实现的后端接口（本阶段刻意未做，非范围）

以下能力本阶段未实现，前端未对其发起调用，也未伪造成功响应：

| 模块 | 未实现接口 / 能力 | 说明 |
| --- | --- | --- |
| 用户 | `PATCH /admin/users/:id`（启用/停用）、用户详情、删除用户 | 当前仅列表只读 |
| 商家 | `POST /admin/merchants`（新增）、`DELETE /admin/merchants`（删除）、商家入驻审核流 | 当前仅查询 + 编辑状态字段 |
| 分类 | `DELETE /admin/categories/:id`（删除） | 当前仅新增/编辑，避免误删导致商品外键悬空 |
| 订单 | 退款、管理员取消（非拒单）、配送任务分配、导出 | 支付未接入，退款无意义；配送任务不在本阶段 |
| 统计 | 自定义时间范围、CSV/Excel 导出 | 当前 stats 为固定聚合 |
| 权限 | 角色授予/回收（ADMIN 白名单管理） | 生产走 `ADMIN_USER_IDS` 环境变量 |

---

## 五、测试与构建结果

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 后端测试 | `cd server; npm test`（vitest） | ✅ 5 个测试文件 / **13 个用例全部通过**，无回归（auth/order/merchant/address/cart） |
| 前端构建 | `npm run build`（vite build） | ✅ 通过，产物 `dist/`（gzip 后 JS 98.93 kB / CSS 13.87 kB） |
| API 端到端冒烟 | node fetch 真实请求 | ✅ admin001 登录返回 `roles=[USER,ADMIN]`；`/admin/stats`、`/orders`、`/merchants`、`/products`、`/categories`、`/users` 均返回真实数据 |
| DB 完整性 | 接口计数核对 | ✅ categories=7、merchants=6、products=36、orders=0、users=1（admin001）；测试自清理，无脏数据 |
| 浏览器冒烟 | 登录→各页面→登出 | ✅ 概览/订单空态/店铺/商品分页/分类/用户/统计图表/登出/无 token 重定向均正常，无 console error |
| 权限校验 | 非管理员写操作 | ✅ 返回 403 |
| 中文编码 | 中文商品名存读 | ✅ UTF-8 正确（用 node fetch 验证） |

---

## 六、当前遗留问题

1. **学生端（C 端）仍使用本地 mock 数据**：本阶段范围仅管理后台，学生端首页/菜单/购物车/订单尚未接入真实 API，属下一阶段范围。
2. **订单数据为 0**：当前库中无真实订单，订单页与概览的“最新订单”“近 7 日趋势”均展示空态（空数据状态已实现，行为正确），但缺少订单流转的端到端可视化验证数据。可由学生端下单或测试注入后观察。
3. **管理员账号仅开发态引导**：生产环境需手动配置 `ADMIN_USER_IDS` 白名单，否则无 ADMIN 账号可登录后台——这是刻意的安全设计，需在部署文档中明确。
4. **统计维度固定**：`/admin/stats` 聚合口径固定（今日、近 7 日、全量榜单），暂不支持自定义时间区间与导出。
5. **商品图片**：新建/编辑商品的 `imageUrl` 仍为手动填写 URL，未接入图片上传服务（本阶段无文件存储）。

---

## 七、下一阶段建议

1. **学生端（C 端）真实接口对接**：首页商家列表、商家详情与菜单、购物车、下单、订单列表/详情、收货地址、用户登录注册，全部接入现有后端 API；移除 C 端 mock 数据。
2. **补全管理后台缺失能力**：按业务优先级补用户启停、商家新增/审核、分类删除（需处理商品外键）、订单退款（支付接入后）、统计导出。
3. **真实下单联调**：用学生端产生真实订单，端到端验证下单→商家/管理员接单→完成的全链路与库存扣减/恢复。
4. **支付接入（独立阶段）**：按 `docs/payment.md` 规划接入，完成后再开放退款能力。
5. **管理员生产化**：将 `ADMIN_USER_IDS` 白名单管理、密码强度、登录失败限流纳入部署与安全加固。
6. **前端构建产物部署**：本阶段仅验证 build 可通过，未部署；部署时配置生产环境 `VITE_API_BASE_URL` 与后端同源/反代，避免 CORS 与硬编码地址。

---

> 本阶段到此结束，**未进入第五阶段、未部署、未接入真实支付**。请确认后再进入下一阶段。
