# 重外校园外卖平台 · API 接口规划

> 文档版本：v0.1（第一阶段：架构审计与设计）
> 协议：HTTPS + RESTful JSON
> 基础路径：`/api/v1`
> 认证：JWT（Access Token 短时 + Refresh Token）
> 金额：**整数分**，字段名统一 `*_cents`
> 时间：ISO 8601 字符串（服务端 UTC，前端按 `Asia/Shanghai` 展示）

---

## 1. 通用约定

### 1.1 响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "traceId": "b7f1c2..."
}
```

- `code = 0` 表示成功；非 0 为业务错误码。
- HTTP 状态码同时语义化：200/201 成功、400 参数错误、401 未登录、403 无权限、404 不存在、409 状态冲突、422 业务校验失败、500 服务异常。

### 1.2 分页

请求：`?page=1&pageSize=20`（`pageSize` ≤ 100）
返回：

```json
{
  "list": [],
  "page": 1,
  "pageSize": 20,
  "total": 128
}
```

### 1.3 认证头

```
Authorization: Bearer <access_token>
```

### 1.4 角色与权限标识

| 标识 | 说明 | 判定方式 |
| --- | --- | --- |
| `GUEST` | 未登录 | 无 Token |
| `USER` | 学生用户 | 有效 Token，无其他角色 |
| `MERCHANT_OWNER` | 商家店主 | `merchant_users.role = OWNER` |
| `MERCHANT_STAFF` | 商家店员 | `merchant_users.role = STAFF` |
| `RIDER` | 配送员 | `delivery_persons.status = ACTIVE` |
| `ADMIN` | 平台管理员 | 管理员表或 `users.is_admin`（待确认实现方式） |

### 1.5 幂等与安全

- 下单：请求头 `Idempotency-Key`（客户端 UUID），服务端缓存 10 分钟，重复请求返回同一批订单。
- 支付回调：按 `out_trade_no` 幂等处理。
- 所有写接口校验资源归属，禁止依赖前端传入的 `userId` / `merchantId` 作为授权依据。
- 金额字段由服务端计算，**请求中的金额字段一律忽略**。

### 1.6 错误码（示例）

| code | 含义 |
| --- | --- |
| 1001 | 参数校验失败 |
| 2001 | 未登录或 Token 过期 |
| 2002 | 无权限访问该资源 |
| 3001 | 商家不存在或未营业 |
| 3002 | 商品不存在 / 已下架 |
| 3003 | 未达到起送价 |
| 3004 | 库存不足 |
| 4001 | 购物车为空 |
| 5001 | 订单状态不允许该操作 |
| 6001 | 支付单不存在或已关闭 |
| 6002 | 支付金额不一致 |
| 7001 | 配送任务状态不允许该操作 |

---

## 2. 认证与用户

### 2.1 微信小程序登录

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /auth/wx-login` |
| 权限 | `GUEST` |
| 主要参数 | `code`（wx.login 临时凭证）、`nickname?`、`avatarUrl?` |
| 返回 | `accessToken`、`refreshToken`、`expiresIn`、`user { id, nickname, avatarUrl, phone? }` |
| 说明 | 服务端用 `code` 调微信 `code2Session` 换 `openid`；首次登录自动创建用户 |

### 2.2 刷新令牌

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /auth/refresh` |
| 权限 | 携带 Refresh Token |
| 主要参数 | `refreshToken` |
| 返回 | 新的 `accessToken`、`expiresIn` |
| 说明 | Refresh Token 轮换，旧 Token 立即失效 |

### 2.3 退出登录

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /auth/logout` |
| 权限 | `USER` |
| 主要参数 | — |
| 返回 | `{ success: true }` |
| 说明 | 服务端吊销 Refresh Token |

### 2.4 当前用户信息

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /users/me` |
| 权限 | `USER` |
| 主要参数 | — |
| 返回 | `id`、`nickname`、`avatarUrl`、`phone`、`roles[]` |
| 说明 | 管理后台登录后也通过该接口获取角色 |

### 2.5 修改个人资料

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /users/me` |
| 权限 | `USER` |
| 主要参数 | `nickname?`、`avatarUrl?` |
| 返回 | 更新后的用户对象 |
| 说明 | 手机号绑定单独接口，避免与资料修改耦合 |

### 2.6 绑定手机号（可选）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /users/me/phone` |
| 权限 | `USER` |
| 主要参数 | `code`（微信手机号快速验证 code）或 `phone + smsCode`（**方案待确认**） |
| 返回 | `{ phone }` |
| 说明 | 是否强制绑定手机号 **待确认** |

---

## 3. 商家与商品（学生端 / 公开）

### 3.1 商家列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchants` |
| 权限 | `GUEST` |
| 主要参数 | `categoryKey?`、`keyword?`、`isOpen?`、`page?`、`pageSize?` |
| 返回 | 商家分页列表（`id/name/cover/rating/monthlySales/minOrderCents/deliveryFeeCents/deliveryTimeMin/isOpen/tags`） |
| 说明 | 仅返回 `status = ACTIVE` 的商家；支持按分类与名称模糊搜索 |

### 3.2 商家详情

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchants/:merchantId` |
| 权限 | `GUEST` |
| 主要参数 | — |
| 返回 | 商家完整信息（含公告、起送价、配送费、营业状态） |
| 说明 | 停业商家可返回基础信息，但前端需禁止下单 |

### 3.3 商家菜单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchants/:merchantId/products` |
| 权限 | `GUEST` |
| 主要参数 | `menuCategory?`、`keyword?` |
| 返回 | 商品数组（按 `menuCategory` 分组或平铺，由前端决定） |
| 说明 | 只返回 `is_available = true` 且未软删除的商品 |

### 3.4 平台分类

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /categories` |
| 权限 | `GUEST` |
| 主要参数 | — |
| 返回 | `[{ key, name, sortOrder }]` |
| 说明 | 对应现有 `foodCategories` |

### 3.5 商家评价列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchants/:merchantId/reviews` |
| 权限 | `GUEST` |
| 主要参数 | `page?`、`pageSize?` |
| 返回 | 评价分页（评分、内容、图片、匿名标记、时间） |
| 说明 | 首版可只展示，不做回复 |

---

## 4. 收货地址

### 4.1 地址列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /addresses` |
| 权限 | `USER` |
| 主要参数 | — |
| 返回 | 当前用户地址数组（含 `isDefault`） |
| 说明 | 只返回本人数据 |

### 4.2 新增地址

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /addresses` |
| 权限 | `USER` |
| 主要参数 | `contactName`、`phone`、`campusArea?`、`building?`、`room?`、`detail?`、`isDefault?` |
| 返回 | 新建地址对象（含 `id`） |
| 说明 | `isDefault=true` 时事务内取消旧默认 |

### 4.3 修改地址

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /addresses/:addressId` |
| 权限 | `USER`（仅本人） |
| 主要参数 | 同新增，字段均可选 |
| 返回 | 更新后的地址 |
| 说明 | 修改不影响历史订单快照 |

### 4.4 删除地址

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `DELETE /addresses/:addressId` |
| 权限 | `USER`（仅本人） |
| 主要参数 | — |
| 返回 | `{ success: true }` |
| 说明 | 删除默认地址后不自动指定新默认（由前端引导），或后端自动选择最近一条（**待确认**） |

### 4.5 设为默认

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /addresses/:addressId/default` |
| 权限 | `USER`（仅本人） |
| 主要参数 | — |
| 返回 | `{ success: true }` |
| 说明 | 事务内先取消旧默认再设置 |

---

## 5. 购物车

### 5.1 获取购物车

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /cart` |
| 权限 | `USER` |
| 主要参数 | — |
| 返回 | 按商家分组的购物车：`groups[{ merchantId, merchantName, items[], subtotalCents }]`、`totalCents` |
| 说明 | 价格取商品当前价；下架商品标记 `invalid=true` |

### 5.2 加入购物车

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /cart/items` |
| 权限 | `USER` |
| 主要参数 | `productId`、`quantity`（默认 1） |
| 返回 | 更新后的购物车项 |
| 说明 | 同商品累加数量；校验商品存在、上架、商家营业、库存 |

### 5.3 修改数量

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /cart/items/:itemId` |
| 权限 | `USER`（仅本人） |
| 主要参数 | `quantity`（1..99） |
| 返回 | 更新后的购物车项 |
| 说明 | 数量为 0 时等价删除 |

### 5.4 删除购物车项

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `DELETE /cart/items/:itemId` |
| 权限 | `USER`（仅本人） |
| 主要参数 | — |
| 返回 | `{ success: true }` |

### 5.5 清空购物车

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `DELETE /cart` |
| 权限 | `USER` |
| 主要参数 | `merchantId?`（不传则清空全部） |
| 返回 | `{ success: true }` |

---

## 6. 订单

### 6.1 结算预览

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders/preview` |
| 权限 | `USER` |
| 主要参数 | `addressId?`、`items?`（不传则用购物车） |
| 返回 | 按商家拆分的费用明细：`groups[{ merchantId, subtotalCents, deliveryFeeCents, discountCents, totalCents, minOrderReached }]`、`grandTotalCents` |
| 说明 | 只计算不落库，供确认订单页展示；所有金额以服务端为准 |

### 6.2 创建订单（拆单）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders` |
| 权限 | `USER` |
| 主要参数 | `addressId`、`note?`、`items?`（不传则用购物车）、`clientRequestId` |
| 返回 | `checkoutGroupNo`、`orders[{ id, orderNo, merchantId, status, totalCents }]`、`paymentAmountCents` |
| 说明 | 一次请求按商家生成多笔订单；事务内扣库存、写快照、清购物车；`Idempotency-Key` 必填 |

### 6.3 我的订单列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /orders` |
| 权限 | `USER` |
| 主要参数 | `status?`、`page?`、`pageSize?` |
| 返回 | 订单分页（含商家名、商品摘要、总额、状态、时间） |
| 说明 | 只返回本人订单；按 `createdAt DESC` |

### 6.4 订单详情

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /orders/:orderId` |
| 权限 | `USER`（仅本人）/ `MERCHANT_*`（仅本店）/ `ADMIN` |
| 主要参数 | — |
| 返回 | 订单完整信息 + 明细快照 + 支付状态 + 配送任务状态 + 地址快照 |
| 说明 | 商品改价/删除不影响快照 |

### 6.5 取消订单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders/:orderId/cancel` |
| 权限 | `USER`（仅本人） |
| 主要参数 | `reason` |
| 返回 | 更新后的订单 |
| 说明 | 仅 `PENDING`（商家未接单）可取消；已支付则同时发起退款；恢复库存 |

### 6.6 确认收货（可选）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders/:orderId/confirm` |
| 权限 | `USER`（仅本人） |
| 主要参数 | — |
| 返回 | 更新后的订单 |
| 说明 | 仅在配送任务已送达、订单仍为 `DELIVERING` 时使用；是否启用 **待确认** |

### 6.7 提交评价

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders/:orderId/review` |
| 权限 | `USER`（仅本人，订单 `COMPLETED`） |
| 主要参数 | `rating`（1..5）、`content?`、`images?`、`isAnonymous?` |
| 返回 | 评价对象 |
| 说明 | 一单一评，重复提交返回 409 |

---

## 7. 支付（微信）

### 7.1 创建预支付单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /payments/wechat/prepay` |
| 权限 | `USER` |
| 主要参数 | `checkoutGroupNo`（或 `orderIds[]`） |
| 返回 | 小程序调起支付所需参数：`timeStamp`、`nonceStr`、`package`、`signType`、`paySign`，以及 `paymentId` |
| 说明 | 服务端创建 `payments` 记录并调用微信统一下单；金额以订单为准，**不接受前端金额** |

### 7.2 支付结果查询

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /payments/:paymentId/status` |
| 权限 | `USER`（仅本人订单组） |
| 主要参数 | — |
| 返回 | `status`、`paidAt`、`orders[{ orderId, status }]` |
| 说明 | 前端支付返回后轮询该接口，不依赖前端结果判定成功 |

### 7.3 主动查单（服务端补偿）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /payments/:paymentId/query` |
| 权限 | `ADMIN` / 内部定时任务 |
| 主要参数 | — |
| 返回 | 渠道查单结果与本地支付状态 |
| 说明 | 用于回调丢失时补偿，幂等 |

### 7.4 关闭支付单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /payments/:paymentId/close` |
| 权限 | `ADMIN` / 内部任务 |
| 主要参数 | — |
| 返回 | `{ success: true }` |
| 说明 | 超时未支付时关闭，并取消关联订单、恢复库存 |

### 7.5 微信支付回调（Webhook）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /payments/wechat/notify` |
| 权限 | 公开（微信平台，必须验签） |
| 主要参数 | 微信回调报文（含 `resource` 密文） |
| 返回 | `{ code: "SUCCESS", message: "成功" }` |
| 说明 | 验证签名 → 解密 → 校验金额 → 幂等更新 `payments` 与订单；失败返回非 SUCCESS 触发重试 |

### 7.6 申请退款

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /orders/:orderId/refund` |
| 权限 | `USER`（本人）/ `MERCHANT_OWNER`（本店）/ `ADMIN` |
| 主要参数 | `reason`、`amountCents?`（默认全额） |
| 返回 | 退款单（`outRefundNo`、`status`） |
| 说明 | 是否允许部分退款 **待确认**；退款结果以微信回调为准 |

### 7.7 退款回调（Webhook）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /payments/wechat/refund-notify` |
| 权限 | 公开（微信平台，必须验签） |
| 主要参数 | 微信退款回调报文 |
| 返回 | `{ code: "SUCCESS" }` |
| 说明 | 更新 `refunds`、`payments` 状态，必要时更新订单 |

---

## 8. 商家后台

> 所有接口均要求 `MERCHANT_OWNER` / `MERCHANT_STAFF`，服务端从 Token 解析 `merchantId`，**不接受前端指定其他商家**。

### 8.1 店铺信息

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchant/profile` |
| 权限 | `MERCHANT_*` |
| 主要参数 | — |
| 返回 | 本店信息（名称、公告、起送价、配送费、配送时间、营业状态） |

### 8.2 修改店铺信息

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /merchant/profile` |
| 权限 | `MERCHANT_OWNER` |
| 主要参数 | `name?`、`announcement?`、`minOrderCents?`、`deliveryFeeCents?`、`deliveryTimeMin?`、`description?` |
| 返回 | 更新后的店铺信息 |
| 说明 | `STAFF` 无权限修改店铺主体信息（**待确认**是否放开公告） |

### 8.3 营业状态开关

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /merchant/open` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `isOpen` |
| 返回 | `{ isOpen }` |

### 8.4 商品列表（商家）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchant/products` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `keyword?`、`isAvailable?`、`page?`、`pageSize?` |
| 返回 | 本店商品分页（含库存、销量、上下架状态） |

### 8.5 新增商品

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /merchant/products` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `name`、`priceCents`、`stock`、`categoryId?`、`menuCategory?`、`description?`、`imageUrl?`、`isHot?` |
| 返回 | 新商品对象 |
| 说明 | `merchantId` 由 Token 决定 |

### 8.6 修改商品

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /merchant/products/:productId` |
| 权限 | `MERCHANT_*`（仅本店商品） |
| 主要参数 | 同新增，均可选 |
| 返回 | 更新后的商品 |
| 说明 | 改价只影响后续订单，历史订单使用快照 |

### 8.7 上下架

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /merchant/products/:productId/availability` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `isAvailable` |
| 返回 | `{ isAvailable }` |

### 8.8 删除商品

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `DELETE /merchant/products/:productId` |
| 权限 | `MERCHANT_OWNER` |
| 主要参数 | — |
| 返回 | `{ success: true }` |
| 说明 | 软删除（`deleted_at`），不影响历史订单 |

### 8.9 商家订单列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchant/orders` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `status?`、`keyword?`（订单号/收货人）、`page?`、`pageSize?` |
| 返回 | 本店订单分页 |
| 说明 | 强制 `merchant_id = 当前商家` |

### 8.10 接单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /merchant/orders/:orderId/accept` |
| 权限 | `MERCHANT_*` |
| 主要参数 | — |
| 返回 | 更新后的订单 |
| 说明 | `PENDING → PREPARING`，要求已支付；重复操作返回 409 |

### 8.11 拒单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /merchant/orders/:orderId/reject` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `reason` |
| 返回 | 更新后的订单 |
| 说明 | `PENDING → CANCELLED`，已支付自动发起退款、恢复库存 |

### 8.12 出餐 / 待配送

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /merchant/orders/:orderId/ready` |
| 权限 | `MERCHANT_*` |
| 主要参数 | — |
| 返回 | `{ order, deliveryTask }` |
| 说明 | 创建或更新配送任务为 `PENDING`（待分配） |

### 8.13 商家统计

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchant/stats/overview` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `range=today\|7d\|30d` |
| 返回 | 订单数、营业额、客单价、取消率、热销商品 TopN |
| 说明 | 对应现有后台统计页；数据由 SQL 聚合，不再前端计算 |

### 8.14 商家趋势

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /merchant/stats/trend` |
| 权限 | `MERCHANT_*` |
| 主要参数 | `days=7` |
| 返回 | `[{ date, orderCount, revenueCents }]` |
| 说明 | 供 ECharts 使用 |

---

## 9. 配送端

### 9.1 我的配送任务

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /delivery/tasks` |
| 权限 | `RIDER` |
| 主要参数 | `status?`、`page?`、`pageSize?` |
| 返回 | 任务分页（取货/送达地址、联系人、订单号、状态） |
| 说明 | 只返回 `delivery_person_id = 自己` 的任务 |

### 9.2 可抢任务列表（抢单模式）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /delivery/tasks/available` |
| 权限 | `RIDER` |
| 主要参数 | — |
| 返回 | 未分配的 `PENDING` 任务列表 |
| 说明 | 仅抢单模式启用；派单模式可不下发该接口 |

### 9.3 接单

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /delivery/tasks/:taskId/accept` |
| 权限 | `RIDER` |
| 主要参数 | — |
| 返回 | 更新后的任务 |
| 说明 | 并发抢单使用条件更新，只有一个配送员成功 |

### 9.4 取餐

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /delivery/tasks/:taskId/pickup` |
| 权限 | `RIDER`（仅本人任务） |
| 主要参数 | — |
| 返回 | `{ task, order }` |
| 说明 | 任务 `ACCEPTED → PICKED_UP`，订单 `PREPARING → DELIVERING` |

### 9.5 送达

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /delivery/tasks/:taskId/deliver` |
| 权限 | `RIDER`（仅本人任务） |
| 主要参数 | `proofImages?`（可选送达凭证） |
| 返回 | `{ task, order }` |
| 说明 | 任务 `PICKED_UP → DELIVERED`，订单 `DELIVERING → COMPLETED` |

### 9.6 异常上报（可选）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `POST /delivery/tasks/:taskId/exception` |
| 权限 | `RIDER` |
| 主要参数 | `type`、`remark?` |
| 返回 | `{ success: true }` |
| 说明 | 首版是否实现 **待确认** |

### 9.7 配送员上线 / 下线

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /delivery/me/online` |
| 权限 | `RIDER` |
| 主要参数 | `isOnline` |
| 返回 | `{ isOnline }` |

---

## 10. 平台管理后台

> 全部要求 `ADMIN`。管理后台可复用现有 Vue 3 页面，仅把 LocalStorage 读写替换为以下接口。

### 10.1 平台概览

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/stats/overview` |
| 主要参数 | `range=today\|7d\|30d` |
| 返回 | 总订单、已完成、已取消、总营业额、商家数、用户数、配送中任务数 |
| 说明 | 对应现有 `Admin.vue` / `AdminStatistics.vue` |

### 10.2 平台趋势

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/stats/trend` |
| 主要参数 | `days=7` |
| 返回 | `[{ date, orderCount, revenueCents }]` |

### 10.3 商家排行 / 菜品排行

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/stats/rankings` |
| 主要参数 | `type=merchant\|product`、`limit=10` |
| 返回 | 排行数组（名称、订单数、营业额/销量） |

### 10.4 商家列表（管理）

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/merchants` |
| 主要参数 | `status?`、`keyword?`、`page?`、`pageSize?` |
| 返回 | 全平台商家分页 |
| 说明 | 与 `GET /merchants` 不同，包含待审核/停用商家 |

### 10.5 审核 / 停用商家

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /admin/merchants/:merchantId/status` |
| 主要参数 | `status`（`ACTIVE` / `SUSPENDED` / `CLOSED`）、`reason?` |
| 返回 | 更新后的商家 |
| 说明 | 停用后学生端不可下单 |

### 10.6 商家账号管理

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/merchants/:merchantId/users`、`POST /admin/merchants/:merchantId/users`、`DELETE /admin/merchants/:merchantId/users/:userId` |
| 主要参数 | `userId`、`role` |
| 返回 | 账号关联列表 / 新建关联 / 解绑结果 |
| 说明 | 对应 `merchant_users` |

### 10.7 平台订单列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/orders` |
| 主要参数 | `status?`、`merchantId?`、`keyword?`、`page?`、`pageSize?` |
| 返回 | 全平台订单分页 |
| 说明 | 对应现有 `AdminOrders.vue` |

### 10.8 平台商品列表

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/products` |
| 主要参数 | `merchantId?`、`isAvailable?`、`keyword?`、`page?`、`pageSize?` |
| 返回 | 全平台商品分页 |
| 说明 | 对应现有 `AdminProducts.vue`，可强制下架违规商品 |

### 10.9 强制下架商品

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `PATCH /admin/products/:productId/availability` |
| 主要参数 | `isAvailable`、`reason?` |
| 返回 | `{ isAvailable }` |

### 10.10 用户管理

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/users`、`PATCH /admin/users/:userId/status` |
| 主要参数 | `keyword?`、`status?`；修改时 `status` |
| 返回 | 用户分页 / 更新结果 |
| 说明 | 是否首版实现 **待确认** |

### 10.11 配送员管理

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/delivery-persons`、`POST /admin/delivery-persons`、`PATCH /admin/delivery-persons/:id/status` |
| 主要参数 | `userId`、`realName`、`phone`、`status` |
| 返回 | 配送员列表 / 新建 / 状态更新 |
| 说明 | 对应 `delivery_persons` |

### 10.12 配送任务管理

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/delivery-tasks`、`POST /admin/delivery-tasks/:taskId/assign` |
| 主要参数 | `status?`、`deliveryPersonId?`；派单时 `deliveryPersonId` |
| 返回 | 任务分页 / 派单结果 |
| 说明 | 手动派单模式使用 |

### 10.13 支付与退款查询

| 项 | 内容 |
| --- | --- |
| 方法 / 路径 | `GET /admin/payments`、`GET /admin/refunds`、`POST /admin/refunds/:refundId/retry` |
| 主要参数 | `status?`、`dateFrom?`、`dateTo?`、`page?` |
| 返回 | 支付/退款分页；重试结果 |
| 说明 | 用于对账与异常处理 |

---

## 11. 接口与现有页面对照

| 现有页面 | 目标接口 |
| --- | --- |
| `Home.vue` | `GET /merchants`、`GET /merchants/:id/products`（热门）、`GET /categories` |
| `ShopList.vue` | `GET /merchants`、`GET /categories` |
| `ShopDetail.vue` | `GET /merchants/:id`、`GET /merchants/:id/products`、购物车接口 |
| `Cart.vue` | `GET /cart`、`PATCH /cart/items/:id`、`DELETE /cart/items/:id` |
| `Checkout.vue` | `POST /orders/preview`、`POST /orders`、`POST /payments/wechat/prepay` |
| `Orders.vue` | `GET /orders` |
| `OrderDetail.vue` | `GET /orders/:id`、`POST /orders/:id/cancel`、`POST /orders/:id/confirm` |
| `ProfileView.vue` | `GET /users/me`、`PATCH /users/me` |
| `Address.vue` | `/addresses` 系列 |
| `Admin.vue` | `GET /admin/stats/overview`、`GET /admin/stats/trend` |
| `AdminOrders.vue` | `GET /admin/orders`、`POST /merchant/orders/:id/*`（商家身份） |
| `AdminProducts.vue` | `/merchant/products` 系列 |
| `AdminShops.vue` | `GET /merchant/profile`、`PATCH /merchant/profile` |
| `AdminStatistics.vue` | `GET /admin/stats/*` |

---

## 12. 待确认事项

1. 管理后台是「平台管理员」还是「商家」身份登录？现有一个后台同时承担两种视角，目标架构建议拆分或按角色显示不同菜单。
2. 平台管理员账号如何创建（数据库初始化 / 环境变量 / 后台邀请）。
3. 是否保留支付宝渠道。
4. 是否强制绑定手机号。
5. 配送模式：平台统一配送 / 商家自配送 / 学生兼职抢单。
6. 是否需要订单实时推送（WebSocket / 微信订阅消息），首版建议轮询。
7. 是否需要部分退款。
8. 图片存储方案（本地 / 对象存储 / CDN）待确定。
