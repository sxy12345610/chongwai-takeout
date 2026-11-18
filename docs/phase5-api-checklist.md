# 第五阶段 · 学生端 API 核对清单

> 基于 `server/src` 实际代码逐项核对，**未修改任何接口**。
> 统一响应：成功 `{ code: 0, message: 'ok', data, traceId }`；失败为非 0 的 `code` + 对应 HTTP 状态。
> 鉴权：`Authorization: Bearer <accessToken>`（JWT，`JWT_ACCESS_TTL=2h`）。
> 金额：全部为整数分（`*Cents`）。

---

## 一、接口逐项核对

### 1. 微信登录

| 项 | 内容 |
| --- | --- |
| 地址 | `POST /api/v1/auth/wx-login` |
| 参数 | `{ code: string }` |
| 返回 | 设计为 `{ accessToken, expiresIn, user }` |
| 权限 | 公开 |
| 实际状态 | ❌ **未真正实现**。未配置 `WECHAT_APPID/WECHAT_SECRET` 时返回 `501`；即使配置了也因 `auth.service.js` 中 `code2Session` 仍为 TODO 而返回 `501 微信登录尚未接入`。 |
| 结论 | 学生端登录前**必须补后端实现**（详见第四节）。 |

补充：`POST /api/v1/auth/test-login`（`{phone}`，仅非生产环境）可用于**开发联调**，不可作为生产登录方式。

### 2. 用户资料

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/auth/me`、`PATCH /api/v1/auth/me` |
| 参数 | GET 无；PATCH `{ nickname?: string(≤30), avatarUrl?: string }` |
| 返回 | `{ id, nickname, avatarUrl, phone, status, roles, merchantIds, deliveryPersonId }` |
| 权限 | 🔒 需要 JWT |
| 实际状态 | ✅ 已实现 |

### 3. 商品分类

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/categories` |
| 参数 | 无 |
| 返回 | 数组 `[{ id, key, name, sortOrder }]`（仅 `isActive=true`） |
| 权限 | 公开 |
| 实际状态 | ✅ 已实现 |

### 4. 商家列表

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/merchants` |
| 参数 | `keyword?`、`categoryKey?`、`isOpen?`（`true/false`）、`page?`(默认1)、`pageSize?`(默认20，最大100) |
| 返回 | `{ list: [merchant], page, pageSize, total }`；merchant 含 `id,name,description,announcement,categoryLabel,tags,minOrderCents,deliveryFeeCents,deliveryTimeMin,isOpen,rating,monthlySales,imageUrl,coverFrom,coverTo` |
| 权限 | 公开 |
| 实际状态 | ✅ 已实现（仅 `ACTIVE` 商家；排序：营业中优先 → 月售倒序） |

### 5. 商家详情

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/merchants/:merchantId` |
| 参数 | 路径 UUID |
| 返回 | 单个 merchant（字段同上，`rating` 为 Number） |
| 权限 | 公开 |
| 实际状态 | ✅ 已实现（`CLOSED` 商家 404） |

### 6. 商家商品列表

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/merchants/:merchantId/products` |
| 参数 | `menuCategory?`、`keyword?`（无分页） |
| 返回 | 数组 `[{ id, merchantId, categoryId, name, description, imageUrl, priceCents, stock, monthlySales, menuCategory, isAvailable, isHot, category:{key,name} }]` |
| 权限 | 公开 |
| 实际状态 | ✅ 已实现（仅上架、未软删；热销/月售排序） |
| 注意 | 返回**数组而非分页对象**；一次返回该商家全部商品 |

### 7. 购物车

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/cart`；`POST /api/v1/cart/items`；`PATCH /api/v1/cart/items/:id`；`DELETE /api/v1/cart/items/:id`；`DELETE /api/v1/cart` |
| 参数 | 添加 `{ productId, quantity?=1 (1-99) }`；修改 `{ quantity (1-99) }` |
| 返回 | GET 返回 `{ items:[...], groups:[{merchantId,merchant,items,subtotalCents,deliveryFeeCents,totalCents}], totalCents, totalQuantity }`；items 含 `id,productId,name,imageUrl,menuCategory,priceCents,unitPriceCents,quantity,subtotalCents,stock,invalid,merchant` |
| 权限 | 🔒 JWT |
| 实际状态 | ✅ 已实现（同商品自动合并；价格以服务端最新价为准） |

### 8. 收货地址管理

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/addresses`；`POST /api/v1/addresses`；`PUT /api/v1/addresses/:id`；`DELETE /api/v1/addresses/:id`；`PATCH /api/v1/addresses/:id/default` |
| 参数 | `{ contactName(1-20), phone(6-20), campusArea?, building?, room?, detail?, isDefault? }` |
| 返回 | 地址对象 `{ id, contactName, phone, campusArea, building, room, detail, isDefault, createdAt, updatedAt }` |
| 权限 | 🔒 JWT（只能操作自己的地址，越权 404） |
| 实际状态 | ✅ 已实现（首条自动默认；默认地址全用户唯一，由数据库部分唯一索引保证） |

### 9. 订单创建

| 项 | 内容 |
| --- | --- |
| 地址 | `POST /api/v1/orders` |
| 参数 | Body `{ addressId?, note?(≤200) }`；Header **`Idempotency-Key`（8–80 字符）** |
| 返回 | `{ checkoutGroupNo, orders: [order], count }`；重放时额外 `replayed: true` |
| 权限 | 🔒 JWT |
| 实际状态 | ✅ 已实现（含第四阶段幂等修复） |
| 幂等规则 | 同键并发 → 只建一组订单、只扣一次库存；同键重复 → 返回原订单；同键不同内容 → `409 code=5003`；失败整体回滚，不留幂等记录 |
| 待办 | 学生端必须在**网络重试时复用同一 UUID**，不能每次重试重新生成 |

订单（order）返回字段：`id, orderNo, checkoutGroupNo, status, userId, merchantId, subtotalCents, deliveryFeeCents, discountCents, totalCents, note, cancelReason, contactName, contactPhone, addressText, acceptedAt, deliveringAt, completedAt, cancelledAt, createdAt, updatedAt, items:[{productId,productName,productImage,menuCategory,unitPriceCents,quantity,subtotalCents}]`。

### 10. 订单列表与详情

| 项 | 内容 |
| --- | --- |
| 地址 | `GET /api/v1/orders`；`GET /api/v1/orders/:id` |
| 参数 | `status?`（单值：`PENDING/PREPARING/DELIVERING/COMPLETED/CANCELLED`）、`page?`、`pageSize?`(默认20，最大100) |
| 返回 | 列表 `{ list:[order], page, pageSize, total }`（含 `merchant:{id,name,imageUrl}`）；详情为单个 order（含 merchant） |
| 权限 | 🔒 JWT（仅本人订单，越权 404） |
| 实际状态 | ✅ 已实现 |

### 11. 用户取消订单

| 项 | 内容 |
| --- | --- |
| 地址 | `POST /api/v1/orders/:id/cancel` |
| 参数 | `{ reason?(≤100) }` |
| 返回 | 取消后的订单对象 |
| 权限 | 🔒 JWT（仅本人） |
| 实际状态 | ✅ 功能已实现（仅 `PENDING` 可取消，事务内恢复库存） |
| 风险 | ⚠️ **存在并发竞态待修复**：`cancelOrder` 仍是“先读状态再无条件 update”，并发重复取消可能重复回补库存（与修复前的拒单同类问题）。列入待修复事项。 |

---

## 二、学生端所需但当前缺失 / 不足的接口

| # | 需求 | 现状 | 建议 |
| --- | --- | --- | --- |
| 1 | 微信登录（code2Session + openid 绑定 + 签发 JWT） | 路由存在但恒返回 501，`code2Session` 为 TODO | 后端实现：`jscode2session` → 按 `wechat_openid` upsert User → 签发 token；返回 `isNewUser` 供前端补资料 |
| 2 | Token 刷新 | 无 `/auth/refresh`（仅有 `JWT_REFRESH_SECRET` 配置项） | 建议新增 refresh 接口，或小程序静默重新登录 |
| 3 | 订单列表多状态筛选 | `status` 仅支持单值 | 「待处理」需 `PENDING+PREPARING`：建议支持逗号分隔多值；否则前端需发两次请求合并 |
| 4 | 「配送中」状态来源 | `DELIVERING` 枚举存在，但**没有任何接口把订单推进到 DELIVERING** | 需补商家/骑手配送流转接口；在此之前该 Tab 长期为空 |
| 5 | 全局商品搜索 | 仅支持「商家名」搜索与「单商家内商品」搜索 | 如需全站搜商品，需新增接口 |
| 6 | 首页「校园推荐」 | 无推荐接口 | 可先用 `/merchants?isOpen=true` 按月售排序占位；推荐位接口后续再补 |
| 7 | 头像 / 图片上传 | 无上传接口，`avatarUrl` 仅接收字符串 | 小程序可先用微信头像临时路径；正式方案需对象存储 + 上传接口 |
| 8 | 创建评价 | 仅有 `GET /merchants/:id/reviews` | 如需评价功能，补 `POST` 接口 |
| 9 | 微信支付 | `PAYMENT_MODE=disabled` | **本阶段明确不接入** |
| 10 | 取消订单并发安全 | 有竞态（见上表 11） | 用与拒单相同的条件更新 + 行数校验 |

---

## 三、错误码（学生端需统一处理）

| code | 含义 | 前端处理 |
| --- | --- | --- |
| 1001 | 参数校验失败 | 提示具体字段 |
| 2001 | 未登录 / Token 过期 | 清 token，重新登录 |
| 2002 | 无权限 | 提示无权限 |
| 3001 | 商家不存在 / 未营业 | 返回商家列表 |
| 3002 | 商品不存在 / 已下架 | 刷新购物车 |
| 3003 | 未达起送价 | 提示补差 |
| 3004 | 库存不足 | 刷新商品/购物车 |
| 4001 | 购物车为空 | 返回商家页 |
| 4002 | 购物车项不存在 | 刷新购物车 |
| 5001 | 订单不存在 | 返回订单列表 |
| 5002 | 订单状态不允许该操作 | 刷新订单详情 |
| 5003 | 重复操作 / 幂等冲突 | 复用原结果或提示 |

---

## 四、微信登录缺失的具体实现点（供下一项任务使用）

1. `server/src/modules/auth/auth.service.js` 中 `wxLogin`：补 `GET https://api.weixin.qq.com/sns/jscode2session?appid=...&secret=...&js_code=...&grant_type=authorization_code`。
2. 处理 `errcode`（如 40029 无效 code、45011 频率限制），不得伪造成功。
3. 按 `openid` upsert 用户（`User.wechatOpenid` 已有唯一索引），并调用 `resolveIdentity` 签发 JWT。
4. AppSecret 只从 `server/.env` 读取，**严禁下发到小程序端或提交 Git**。
5. 未配置时继续返回 501（保持当前“不伪造成功”的行为）。
