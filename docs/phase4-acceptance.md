# 第四阶段验收报告：Web 管理后台完整性检查

> 验收范围：仅检查与取证，**未修改任何业务代码、数据库结构或配置文件**。
> 环境：前端 `http://localhost:5173`（Vite dev），后端 `http://localhost:3000/api/v1`（Express + Prisma + PostgreSQL），均为本地开发态。
> 验收方式：真实 HTTP 接口调用 + 直接数据库读取核对 + 浏览器页面实测 + 源码静态审查。
> 验收时间：2026-11-19。

---

## 一、已通过的检查项目

### 1. 管理员登录与 JWT（全部通过）

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 管理员登录页可访问、非空白 | ✅ | 浏览器实测 `/#/admin/login`，显示手机号/密码输入框与登录按钮 |
| 管理员账号可正常登录 | ✅ | `POST /auth/login`（admin001）HTTP 200，`roles=["USER","ADMIN"]` |
| 错误密码被拒绝 | ✅ | HTTP 401，未签发 token |
| JWT 正常生成 | ✅ | token 为三段式 JWT（`header.payload.signature`），payload 含 `sub`、`roles`、`exp` |
| JWT 正常传递与校验 | ✅ | 携带 `Authorization: Bearer <token>` 访问 `/auth/me` 返回管理员身份；`/admin/*` 接口正常放行 |
| 伪造 / 无效 Token 被拒绝 | ✅ | 无效 token 访问 `/admin/stats` 返回 HTTP 401 |
| 未登录访问受保护接口 | ✅ | 无 token 访问 `/admin/stats` 返回 HTTP 401（`code=2001`） |
| 普通用户不能访问管理员接口 | ✅ | 临时普通用户（仅 `USER`）访问 `GET /admin/stats`、`GET /admin/products`、`POST /admin/products` 均返回 HTTP 403 |
| 登录页拒绝非管理员账号 | ✅ | [AdminLogin.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/views/admin/AdminLogin.vue) 登录后校验 `roles.includes('ADMIN')`，否则清理登录态并提示“该账号没有平台管理员权限” |
| 退出登录后无法访问受保护页面 | ✅ | 浏览器点击“退出登录”后 URL 回到 `/#/admin/login`；路由守卫 [router/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/router/index.js#L152-L168) 对 `/admin/*` 强制 `isLoggedIn() && isAdmin()` |

### 2. 七个管理页面（浏览器实测，全部通过）

| 页面 | 结果 | 实测证据 |
| --- | --- | --- |
| 数据概览 `/admin` | ✅ | 四张统计卡片：累计用户 1、入驻商家 6、在售商品 36、平台订单 0；含近 7 日趋势、最新订单、热销菜品、商家营收排行，无空白 |
| 数据统计 `/admin/statistics` | ✅ | 统计卡片（今日订单、今日营收、待处理订单、注册用户）+ 近 7 日营收趋势、热销菜品 Top10、商家营收排行；无订单时显示“暂无数据”空态 |
| 商家管理 `/admin/shops` | ✅ | 6 家店铺卡片，含名称/评分/月售/起送价/配送时间，分页“第 1–6 条 / 共 6 条” |
| 商品管理 `/admin/products` | ✅ | 商品表格 36 条（当前页 10 条），含搜索筛选、商品名/商家/分类/售价/库存/月售/状态/操作、分页 |
| 订单管理 `/admin/orders` | ✅ | 筛选区（状态/商家/订单号搜索）正常；当前库 0 订单，正确显示“暂无订单”空态，无崩溃 |
| 用户管理 `/admin/users` | ✅ | 用户表格 1 条（平台管理员 admin001，状态正常），分页“第 1–1 条 / 共 1 条” |
| 分类管理 `/admin/categories` | ✅ | 7 条分类（中式快餐、特色小吃、奶茶饮品、西式美食、水果轻食、特色面食、甜品蛋糕），含 Key/排序/状态/编辑 |

上述页面均未出现空白页、崩溃或“加载失败”常驻提示。

### 3. 真实数据库读写（接口写入 + 直接查库双重核对，全部通过）

以测试商品「火腿炒河粉」（初始 `priceCents=1580`、`stock=100`、`isAvailable=true`）为对象：

| 检查项 | 结果 | 证据（接口返回值 + 直接查库） |
| --- | --- | --- |
| 修改价格真正写库 | ✅ | PATCH 价格 1580→1680，`products.price_cents=1680`，重新拉取列表仍为 1680 |
| 修改库存持久保存 | ✅ | PATCH 库存 100→107，`products.stock=107`，重新拉取仍为 107 |
| 上下架真正写库 | ✅ | PATCH `isAvailable=false`，`products.is_available=false`，重新拉取仍为 false |
| 页面刷新后数据保持修改状态 | ✅ | 每次写入后重新发起独立请求（等价刷新）读取，值均为写入后的值 |
| 恢复原值后一致 | ✅ | 恢复 1580/100/true 后重新拉取完全一致 |
| 订单接单符合状态机 | ✅ | `PENDING → accept → PREPARING`，HTTP 200 |
| 重复接单被状态机拒绝 | ✅ | 再次 accept 返回 HTTP 409（`code=5002`） |
| 越级拒单被拒绝 | ✅ | `PREPARING` 状态下 reject 返回 HTTP 409 |
| 订单完成符合状态机 | ✅ | `PREPARING → complete → COMPLETED`，HTTP 200 |
| 终态不可再操作 | ✅ | 对 COMPLETED 再次 complete 返回 HTTP 409 |
| 下单真实扣减库存 | ✅ | 下单前 100 → 下单后 99（数量 1），直接查库一致 |
| 拒单真实恢复库存 | ✅ | 拒单后 98 → 99，与期望一致 |
| 拒单缺少原因被拦截 | ✅ | `POST /admin/orders/:id/reject` 空 body 返回 HTTP 400 |
| 订单详情与列表一致 | ✅ | `GET /admin/orders/:id` 返回 `COMPLETED`，与操作结果一致 |

### 4. 权限与安全

| 检查项 | 结果 | 证据 |
| --- | --- | --- |
| 普通用户访问管理员接口 403 | ✅ | 三类管理接口实测均 403 |
| 未登录访问受保护接口 401 | ✅ | 无 token 请求返回 401 |
| 管理员接口统一经过 ADMIN 权限验证 | ✅ | [admin.routes.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/admin/admin.routes.js#L26-L27) 全局 `router.use(authenticate, requireRole('ADMIN'))`；[routes/index.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/routes/index.js#L17) 统一挂载 |
| 前端无写死账号密码/密钥 | ✅ | 全量检索 `src/`：无密码、`JWT_SECRET`、admin 密码字面量；登录页仅提示“账号配置于 server/.env”的变量名，不含值 |
| `.env` 被 Git 忽略 | ✅ | `server/.gitignore` 第 5-7 行 `.env` / `.env.*` / `!.env.example`；`git check-ignore` 确认 `server/.env` 已被忽略、`server/.env.example` 例外保留 |
| API 地址未硬编码 | ✅ | [request.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/src/api/request.js#L3-L5) 读取 `VITE_API_BASE_URL`，[.env.development](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/.env.development) 仅含 API 地址，无密钥 |

### 5. 测试数据可恢复性

所有写入测试均使用临时账号与快照恢复，验收结束后已核对：

```
users=1（仅 admin001） merchants=6 products=36 orders=0 categories=7 addresses=0
测试商品：priceCents=1580 stock=100 isAvailable=true（与初始一致）
软删除商品数=0
```

原始业务数据未被删除或修改。

---

## 二、未通过的检查项目

### ❌ 订单幂等性：并发重复提交会生成重复订单（并重复扣库存）

- **现象（实测复现）**：同一用户、同一购物车（1 件商品），并发发出两次 `POST /api/v1/orders`：
  - 响应 1：HTTP 200（`code=0`）
  - 响应 2：HTTP 200（`code=0`）
  - 实际生成 **2 笔订单**（`CW202611190142164803`、`CW202611190142163040`），`checkoutGroupNo` 不同（`GRP...168473`、`GRP...169924`）
  - 库存被 **扣减 2 次**（100 → 98，期望 100 → 99）
- **影响**：用户双击/网络重试/脚本并发时会产生重复订单并超扣库存，属于业务与数据一致性问题。

### ❌ 订单状态流转存在并发竞态：并发重复拒单会重复回补库存

- **现象（实测复现）**：对同一 PENDING 订单并发发出两次 `POST /admin/orders/:id/reject`：
  - 两次均返回 HTTP 200
  - 库存 99 → **101**（期望回到 100），即 **重复回补了 1 份库存**
  - 最终订单状态 `CANCELLED`，`cancelReason` 被后一次覆盖（"并发拒单B"）
- **附带现象**：对同一订单并发两次 `accept`，两次均返回 200（`PREPARING`），虽目标状态一致、未产生错误数据，但说明状态校验与更新非原子。
- **影响**：并发拒单可导致库存虚增；并发操作缺少“条件更新 + 受影响行数校验”。

---

## 三、无法验证的项目（本次未取得运行证据，不予标记通过）

| 项目 | 原因 |
| --- | --- |
| 商品“新增/编辑/删除”与分类“新增/编辑”、商家“编辑”的**浏览器 UI 表单交互** | 本次为避免误改数据，写操作通过接口层实测（已确认真实写库），未在浏览器中逐项点击弹窗表单提交；UI 层仅验证页面渲染 |
| 订单管理在**有真实订单**时的列表/筛选/分页/详情弹窗 UI | 当前数据库订单数为 0（验收测试订单已清理），只能验证空状态；订单动作通过接口层验证 |
| 浏览器逐页 console error 采集 | 页面实测未出现白屏/崩溃，但未对每页系统性抓取控制台日志 |
| 真实支付、退款、配送、数据导出 | 本阶段未接入/未实现，无对应接口，不适用 |
| 生产环境 ADMIN 白名单（`ADMIN_USER_IDS`） | 本地为开发态，走 `SEED_ADMIN_PHONE` 授权分支；生产分支未实测 |

---

## 四、发现的问题及其原因

| # | 问题 | 原因分析 | 严重度 |
| --- | --- | --- | --- |
| 1 | 并发重复下单生成 2 笔订单、重复扣库存 | [order.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order.service.js#L66-L200) 先读购物车再事务写入，**无幂等键、无购物车行锁/唯一约束**；两个事务都读到同一批购物车项后各自建单，`cartItem.deleteMany` 对第二次无实际影响但订单已插入 | 高 |
| 2 | 并发重复拒单重复回补库存 | [order-actions.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order-actions.js#L62-L89) 先 `assertTransition`（基于已读状态）再无条件 `update`；未使用 `updateMany({ where: { id, status: 'PENDING' } })` 做条件更新并校验受影响行数，导致校验与写入之间存在竞态窗口 | 高 |
| 3 | 并发重复接单均返回 200 | [order-actions.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order-actions.js#L48-L60) 同理，缺少乐观锁/条件更新 | 中 |
| 4 | 退出登录仅清前端凭据，服务端 token 仍有效 | 无状态 JWT，无黑名单/吊销机制，TTL 为 2 小时；退出后旧 token 在到期前仍可调用接口（本次已验证前端路由会拦截） | 低 |
| 5 | 前端根目录 `.env.development` 未被 Git 忽略 | 该文件只含 API 地址、无敏感信息；但 `.gitignore` 未覆盖 `.env.*`，存在后续误放敏感变量的风险 | 低 |
| 6 | 学生端（C 端）仍使用 localStorage 本地数据 | `src/data/*`、`src/utils/{cart,orders,addresses,profile}.js` 仍为本地模拟，属本阶段范围外遗留 | 提示（非本阶段范围） |

---

## 五、是否存在数据安全风险

**存在，主要为数据一致性风险，暂未发现越权或密钥泄露风险。**

1. **高**：订单幂等性缺失 → 重复订单、重复扣库存；并发拒单 → 库存虚增（已在本次复用测试商品上真实复现并恢复）。
2. **中**：订单状态流转缺少条件更新，存在并发窗口。
3. **低**：无状态 JWT 退出后不可即时吊销（2 小时窗口）。
4. **未发现**：管理员接口越权（普通用户全部 403）、未登录访问（401）、前端硬编码凭据、`.env` 提交入库、数据库结构被改动。
5. 本次验收所有测试数据已清理并核对基线（users=1 / orders=0 / addresses=0 / 商品价格与库存复原），未污染原有业务数据。

---

## 六、订单幂等性检查结果

**结论：仍然存在重复提交问题，尚未实现幂等。**

证据一（重复下单）：

```
并发两次 POST /api/v1/orders（同一购物车，数量 1）
→ 响应：200 / 200（code 均为 0）
→ 实际订单数：2
→ orderNo：CW202611190142164803 / CW202611190142163040
→ checkoutGroupNo：GRP202611190142168473 / GRP202611190142169924
→ 库存：100 → 98（被扣 2 次）
```

证据二（并发拒单重复回补库存）：

```
并发两次 POST /api/v1/admin/orders/:id/reject
→ 响应：200 / 200
→ 库存：下单后 99 → 拒单后 101（期望 100）
→ 终态 CANCELLED，cancelReason 被后一次覆盖
```

对照：串行重复操作是安全的（重复接单 409、终态重复完成 409），问题集中在**并发**场景。

---

## 七、是否建议进入下一阶段

**建议：先修复订单幂等性/并发竞态（建议作为第四阶段的收尾补丁），再进入第五阶段。**

理由：

1. 管理后台功能面（登录、权限、七个页面、真实读写、错误/空态/分页）验收通过，具备继续推进的基础。
2. 但重复订单与库存虚增属于核心业务数据一致性问题，若在第五阶段（学生端真实下单）之前不修复，问题会在真实下单链路上被放大。
3. 修复范围小、不涉及表结构变更，可在现有代码内完成：
   - 下单：引入幂等键（请求头 `Idempotency-Key`）或结算令牌，并对购物车行加锁/唯一约束（需评估是否新增字段——若禁止改表，可用“结算令牌 + 短 TTL 缓存/事务内锁”方案）。
   - 订单动作：改为条件更新 `updateMany({ where: { id, status: 期望前置状态 } })` 并校验 `count===1`，否则返回 409；库存回补与状态更新保持同一事务。
4. 本次验收**未做任何修复**，等待确认。

---

## 八、本次验收执行明细（示意）

- 接口层自动化检查：32 项，通过 31 项，失败 1 项（幂等性，已单列）。
- 浏览器实测：登录 + 数据概览 1 项通过；店铺/商品/订单/用户/分类/统计 6 个页面 + 退出登录 全部通过。
- 直接数据库核对：商品价格/库存/上下架字段、订单数、用户数、地址数、分类数均与预期一致。
- 测试数据：临时用户、地址、订单全部删除；测试商品恢复原价、原库存、原上架状态。

> 本次仅检查与报告，**未修复任何问题、未进入第五阶段、未部署、未接入真实支付**。
