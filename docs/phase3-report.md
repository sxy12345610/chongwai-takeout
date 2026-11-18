# 重外校园外卖平台 · 第三阶段报告：核心业务 API

> 阶段：第三阶段（核心业务 API 开发）
> 完成时间：2026-11-19
> 后端：Node.js + Express 5 + Prisma 6 + PostgreSQL 18
> 运行地址：http://localhost:3000 ｜ 支付模式：disabled
> 配套文档：`docs/architecture.md`、`docs/database.md`、`docs/api-plan.md`、`docs/migration-plan.md`

---

## 1. 新增与修改文件清单

### 新增

| 文件 | 作用 |
| --- | --- |
| `server/src/utils/id.js` | 订单号 / 结算组号 / 支付单号生成器 |
| `server/src/modules/order/order-state.js` | 订单状态机与流转校验 |
| `server/src/modules/address/address.service.js` | 地址 CRUD + 默认地址唯一（事务） |
| `server/src/modules/address/address.routes.js` | 地址路由 |
| `server/src/modules/cart/cart.service.js` | 购物车 CRUD + 后端实时计价 + 多商家分组 |
| `server/src/modules/cart/cart.routes.js` | 购物车路由 |
| `server/src/modules/order/order.service.js` | 下单拆单 / 列表 / 详情 / 取消（事务 + 防超卖） |
| `server/src/modules/order/order.routes.js` | 订单路由 |
| `server/src/modules/merchant/merchant.middleware.js` | 商家上下文加载（归属商家数据隔离） |
| `server/src/modules/merchant/merchant.service.js` | 商家订单列表 / 详情 / 接单 / 拒单 / 完成 |
| `server/src/modules/merchant/merchant.routes.js` | 商家订单路由 |
| `server/vitest.config.js` | 测试配置（串行执行，避免库存并发污染） |
| `server/tests/global-setup.js` | 测试前后对商品库存拍快照并恢复 |
| `server/tests/helpers.js` | 测试助手（建用户 / 关联商家 / 清理 / 取演示数据） |
| `server/tests/auth.test.js` | 认证测试 |
| `server/tests/address.test.js` | 地址测试 |
| `server/tests/cart.test.js` | 购物车测试 |
| `server/tests/order.test.js` | 订单测试 |
| `server/tests/merchant.test.js` | 商家订单测试 |
| `docs/phase3-report.md` | 本报告 |

### 修改

| 文件 | 变更 |
| --- | --- |
| `server/src/utils/httpError.js` | 补齐业务错误码常量与 `conflict` 助手 |
| `server/src/config/env.js` | 新增可选 `WECHAT_APPID` / `WECHAT_SECRET` / `ADMIN_USER_IDS` |
| `server/src/modules/auth/auth.service.js` | 新增注册 / 开发态测试登录 / 微信登录占位 / 资料修改 / 角色与商家归属解析 |
| `server/src/modules/auth/auth.routes.js` | 新增 register、test-login、wx-login、PATCH /me |
| `server/src/routes/index.js` | 挂载 addresses、cart、orders、merchant 路由，stage 升至 3 |
| `server/package.json` | 新增 `test` 脚本与 vitest / supertest 开发依赖 |
| `server/.env.example` | 文档化微信与管理员白名单环境变量 |

> 未修改数据库业务设计、未新增字段/表、未接入支付、未改动前端页面、未部署。

---

## 2. 用户认证接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | 公开 | 手机号 + 密码注册，密码 bcrypt 哈希；手机号唯一 |
| POST | `/api/v1/auth/login` | 公开 | 手机号 + 密码登录，返回 JWT |
| POST | `/api/v1/auth/test-login` | 公开（仅非生产） | 按手机号查找/创建用户，自动化测试用；`NODE_ENV=production` 时返回 403 |
| POST | `/api/v1/auth/wx-login` | 公开 | 预留 `code2Session`；未配置 `WECHAT_APPID/SECRET` 时返回 501，**绝不伪造成功** |
| GET | `/api/v1/auth/me` | 已登录 | 当前用户信息 + 角色 + 归属商家 id 列表 |
| PATCH | `/api/v1/auth/me` | 已登录 | 修改昵称 / 头像 |

角色判定：`USER`（默认）、`MERCHANT`（`merchant_users` 有记录）、`RIDER`（`delivery_persons` 状态 ACTIVE）、`ADMIN`（`ADMIN_USER_IDS` 环境变量白名单）。JWT 签发时固化角色，商家归属变更后需重新登录。

安全：密码 bcrypt（cost 10）；日志不输出密码 / Token / 密钥；`.env` 已被 `.gitignore` 忽略。

---

## 3. 收货地址接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/addresses` | 已登录 | 当前用户地址列表（默认地址置顶） |
| POST | `/api/v1/addresses` | 已登录 | 新增；首条自动设为默认 |
| PUT | `/api/v1/addresses/:id` | 已登录 | 修改；越权返回 404 |
| DELETE | `/api/v1/addresses/:id` | 已登录 | 删除；越权返回 404 |
| PATCH | `/api/v1/addresses/:id/default` | 已登录 | 设为默认 |

默认地址唯一性：应用层在事务内先取消该用户旧默认，再设新默认；数据库层由 `addresses_one_default_per_user` 部分唯一索引兜底（第二阶段已建）。

---

## 4. 购物车接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/cart` | 已登录 | 返回按商家分组的购物车，金额按数据库最新价格实时计算 |
| POST | `/api/v1/cart/items` | 已登录 | 加购；商品须存在、上架、商家 ACTIVE；重复加购累加数量（上限 99） |
| PATCH | `/api/v1/cart/items/:id` | 已登录 | 修改数量（绝对值） |
| DELETE | `/api/v1/cart/items/:id` | 已登录 | 删除单项 |
| DELETE | `/api/v1/cart` | 已登录 | 清空购物车 |

金额权威在后端：`GET /cart` 每次读取 `products.price_cents` 重算，商品价格变动时返回最新价；支持同一购物车跨多商家；越权操作返回 404。

---

## 5. 订单接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/v1/orders` | 已登录 | 从购物车结算，自动按商家拆单；事务内扣库存、写快照、清购物车 |
| GET | `/api/v1/orders` | 已登录 | 我的订单（可按 status 筛选，分页） |
| GET | `/api/v1/orders/:id` | 已登录 | 订单详情；非本人返回 404 |
| POST | `/api/v1/orders/:id/cancel` | 已登录 | 取消（仅 PENDING），事务内恢复库存 |

下单金额：服务端重新读取价格计算，`忽略前端传入金额`；`total_cents = subtotal_cents + delivery_fee_cents - discount_cents`（discount 暂为 0），数据库 CHECK 约束兜底。订单 `order_items` 保存名称 / 图片 / 菜单分组 / 单价 / 数量快照。

---

## 6. 商家订单接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/v1/merchant/orders` | MERCHANT | 本店订单（强制按 `req.merchantIds` 过滤，可按状态 / 分页） |
| GET | `/api/v1/merchant/orders/:id` | MERCHANT | 本店订单详情；非本店返回 404 |
| POST | `/api/v1/merchant/orders/:id/accept` | MERCHANT | 接单 |
| POST | `/api/v1/merchant/orders/:id/reject` | MERCHANT | 拒单（原因必填），恢复库存 |
| POST | `/api/v1/merchant/orders/:id/complete` | MERCHANT | 完成订单 |

数据隔离：商家归属由 `merchant_users` 解析得到 `req.merchantIds`，**不接受前端传入 merchantId**；普通用户调用返回 403，跨商家访问返回 404。接单 / 拒单 / 完成均写 pino 日志（含操作人 id）。

---

## 7. 多商家拆单实现说明

下单入口 `POST /orders` 从当前用户购物车读取全部商品：

1. 校验每件商品可售（存在、上架、所属商家 ACTIVE）；
2. 按 `product.merchant_id` 分组，每组独立计算 `subtotal / delivery_fee / discount / total`；
3. 校验每组 `subtotal ≥ merchant.min_order_cents`，否则整单回滚；
4. 生成一个共享的 `checkout_group_no`，每组生成一笔 `orders`（只属于该商家）+ 对应 `order_items` 快照；
5. 所有订单在**同一个 Prisma 事务**内创建，任意一组失败全部回滚，不产生部分订单；
6. 成功后删除已结算的购物车项。

返回 `{ checkoutGroupNo, orders, count }`，`count` 即拆单数量。测试覆盖：单商家 count=1；双商家 count=2 且 `checkout_group_no` 一致、`merchant_id` 各异、总额 = 各订单合计。

---

## 8. 库存并发控制说明

采用**条件更新（CAS）**而非「先查后减」，防止并发超卖：

```sql
UPDATE products
SET stock = stock - ${qty}, updated_at = now()
WHERE id = ${productId}::uuid
  AND is_available = true
  AND deleted_at IS NULL
  AND stock >= ${qty}
```

- `$executeRaw` 返回受影响行数，为 0 即抛 `STOCK`（业务码 3004），事务回滚；
- 整个下单在单一事务内，行级锁保证并发请求串行扣减；
- 取消 / 拒单时在事务内按 `order_items` 数量 `increment` 回补库存（商品已软删也回补，避免库存错乱）；
- 测试覆盖：库存置 0 后下单失败，且同事务中另一商家商品库存**未被扣减**（验证回滚）。

> 注：当前策略为「下单即扣库存」（docs/database.md 6.6 方案 A）。支付成功才扣减 / 超时关单回补属后续支付接入阶段。

---

## 9. 订单状态流转图

本阶段未接入支付与配送，状态机如下（非法跳转一律返回 409）：

```
                 accept              complete
   PENDING ────────────────▶ PREPARING ──────────────▶ COMPLETED
      │                          │
      │ reject / cancel          │
      ▼                          ▼
   CANCELLED ◀───────────────────┘
   （终态，不可再操作）
```

| 动作 | 允许前置状态 | 目标状态 | 副作用 |
| --- | --- | --- | --- |
| 用户下单 | — | `PENDING` | 扣库存、写快照 |
| 商家接单 accept | `PENDING` | `PREPARING` | 写 `accepted_at` |
| 商家拒单 reject | `PENDING` | `CANCELLED` | 原因必填、恢复库存、写 `cancelled_at` |
| 商家完成 complete | `PREPARING` | `COMPLETED` | 写 `completed_at` |
| 用户取消 cancel | `PENDING` | `CANCELLED` | 恢复库存、写 `cancelled_at` |

禁止：`PENDING → COMPLETED`、对已完成/已取消订单再操作、重复接单——均返回业务码 5002。

---

## 10. 自动化测试结果

框架：Vitest 3 + Supertest 7（进程内请求，不依赖端口）。串行执行避免库存并发污染；测试前后对商品库存拍快照并恢复，不污染演示数据。

执行：`cd server && npm test`

```
Test Files  5 passed (5)
     Tests  13 passed (13)
  Duration  6.27s
```

13 项验证点与结果：

| # | 验证点 | 结果 |
| --- | --- | --- |
| 1 | 正常注册并登录 | ✅ |
| 2 | 未登录访问受保护接口返回 401 | ✅ |
| 3 | 用户越权修改/删除他人地址返回 404 | ✅ |
| 4 | 商家越权访问其他商家订单（列表不含 + 详情 404） | ✅ |
| 5 | 普通用户调用商家接口返回 403 | ✅ |
| 6 | 正常添加购物车，金额按数据库价格计算 | ✅ |
| 7 | 不存在的商品不能加入购物车（404 / 码 3002） | ✅ |
| 8 | 单商家正常下单：扣库存、写快照、清购物车 | ✅ |
| 9 | 多商家购物车自动拆单 | ✅ |
| 10 | 多商家订单总金额计算正确 | ✅ |
| 11 | 订单取消后库存恢复 | ✅ |
| 12 | 重复接单、非法状态跳转、拒单缺原因被拒绝 | ✅ |
| 13 | 事务失败（库存不足）不产生部分订单、不扣减他店库存 | ✅ |

---

## 11. 数据库数据完整性检查

测试运行后直连 PostgreSQL 校验：

| 检查项 | 结果 |
| --- | --- |
| 商品分类 | 7（与种子一致） |
| 商家 | 6（与种子一致，未被删除） |
| 菜品 | 36（与种子一致，未被删除） |
| 测试用户残留（phone 以 `t` 开头） | 0 |
| 测试订单残留 | 0 |
| 36 道菜品库存是否恢复初始值 100 | 全部恢复 ✅ |

结论：自动化测试未破坏任何演示数据，测试创建的用户 / 地址 / 购物车 / 订单 / 商家关联已全部清理，商品库存已还原。

---

## 12. 安全与约束落实

- 密码 bcrypt 哈希存储，无明文；日志不含密码 / Token / 密钥；`.env` 不入 Git。
- 所有受保护接口经 `authenticate` + 角色守卫；商家数据强制按 `merchant_users` 归属过滤。
- 订单金额、库存、状态流转均由后端决定，前端传入金额被忽略。
- 微信登录未配置时不伪造成功；`PAYMENT_MODE=disabled`，订单不会被标记为真实支付成功。
- 未修改已确认的数据库业务设计；ADMIN 角色通过环境变量白名单实现，未新增表/字段。
- 未部署、未修改前端页面；前端 `npm run build` 仍通过。

---

## 13. 待确认 / 后续事项

1. 平台管理员是否需要独立数据表（当前用 `ADMIN_USER_IDS` 白名单）—— 如确认需持久化，再评估新增 `admin_users` 表。
2. 库存策略确认（方案 A 下单即扣，已采用）；支付接入后补充「支付成功才扣 / 超时关单回补」。
3. 微信登录真实 `code2Session` 与支付预支付，待商户号 / 证书就绪后接入（见 `docs/payment.md`）。
4. 订单与配送任务联动、评价功能，属后续阶段。

本阶段完成，等待确认后再进入第四阶段。
