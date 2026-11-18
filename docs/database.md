# 重外校园外卖平台 · 数据库设计

> 文档版本：v0.2（第一阶段：架构审计与设计）
> 数据库：PostgreSQL 15+
> ORM：Prisma 6.x
> 金额单位：**整数分（Int）**，字段统一 `*_cents`
> 时间：`timestamptz`（Prisma `DateTime`），统一 UTC 存储
> 核心表：14 张（users、merchants、merchant_users、categories、products、addresses、carts、cart_items、orders、order_items、payments、delivery_persons、delivery_tasks、reviews）+ 辅助表 `payment_orders` / `refunds`

---

## 1. 设计原则

1. **服务端是唯一金额权威**：订单、支付金额全部由服务端计算并落库，前端金额只用于展示。
2. **订单商品快照**：`order_items` 保存商品名称、图片、单价、数量，商品后续改价/删除不影响历史订单。
3. **支付与订单分离**：`payments` 独立记录渠道交易，订单只关心业务状态。
4. **一次结算可拆多单**：多商家购物车生成多笔 `orders`，通过 `checkout_group_no` 归组，一次支付通过 `payment_orders` 分摊。
5. **库存并发安全**：使用条件更新（`UPDATE ... WHERE stock >= qty`），不采用「先查后减」。
6. **软删除**：商品、商家使用状态字段或 `deleted_at`，避免破坏历史订单外键。
7. **地址快照**：`orders` 保存收货人、电话、地址文本，`address_id` 仅作追溯。
8. **所有写操作事务化**：下单、取消、退款、状态流转必须在事务内完成。
9. **LocalStorage 只保留非业务缓存**（如登录前草稿），不得作为最终业务数据库。

---

## 2. 实体关系概览

```
users 1 ──< addresses
users 1 ──1 carts ──< cart_items >── products
users 1 ──< orders >── merchants
users 1 ──< merchant_users >── merchants
merchants 1 ──< products >── categories
orders 1 ──< order_items >── products（可选外键，快照为主）
orders 1 ──< payments（通过 payment_orders 多对多）
payments 1 ──< refunds
orders 1 ──1 reviews
orders 1 ──1 delivery_tasks >── delivery_persons
```

- 一个用户可下多笔订单；一笔订单只属于一个商家（多商家拆单）。
- 一个商家可有多个商家账号（`merchant_users`），角色分为店主/店员。
- 一次支付可覆盖多笔订单（`payment_orders`）；退款按订单维度记录。
- 一笔订单对应 0 或 1 个配送任务；一个配送员可承接多个任务（`delivery_persons` 1 ──< `delivery_tasks`）。

---

## 3. 枚举

| 枚举 | 取值 | 说明 |
| --- | --- | --- |
| `UserStatus` | `ACTIVE` / `DISABLED` | 用户状态 |
| `MerchantStatus` | `PENDING` / `ACTIVE` / `SUSPENDED` / `CLOSED` | 入驻审核与经营状态 |
| `MerchantUserRole` | `OWNER` / `STAFF` | 商家账号角色 |
| `OrderStatus` | `PENDING` / `PREPARING` / `DELIVERING` / `COMPLETED` / `CANCELLED` | 与现有前端状态一一对应 |
| `PaymentProvider` | `WECHAT`（首版）；`ALIPAY` 待确认 | 目标形态为微信小程序，支付宝是否保留 **待确认** |
| `PaymentStatus` | `PENDING` / `PAID` / `FAILED` / `CLOSED` / `REFUNDED` / `PARTIALLY_REFUNDED` | 支付状态 |
| `RefundStatus` | `PENDING` / `PROCESSING` / `SUCCESS` / `FAILED` | 退款状态 |
| `DeliveryPersonStatus` | `ACTIVE` / `DISABLED` | 配送员账号状态 |
| `DeliveryTaskStatus` | `PENDING` / `ACCEPTED` / `PICKED_UP` / `DELIVERED` / `CANCELLED` | 配送任务状态 |

> 现有前端状态映射：待接单=`PENDING`、制作中=`PREPARING`、配送中=`DELIVERING`、已完成=`COMPLETED`、已取消=`CANCELLED`。
>
> 订单状态与配送任务状态**解耦**：订单 `DELIVERING` 由配送任务 `PICKED_UP` 触发；任务 `DELIVERED` 后订单才可置 `COMPLETED`（具体联动规则见 6.5）。

---

## 4. 表结构

### 4.1 `users` 用户

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| phone | varchar(20) | UNIQUE, NULL | 手机号（支付宝/微信用户可能为空） |
| password_hash | varchar(255) | NULL | Argon2id 哈希，禁止明文 |
| nickname | varchar(30) | NOT NULL | 昵称 |
| avatar_url | text | NULL | 头像 |
| wechat_openid | varchar(64) | UNIQUE, NULL | 微信小程序 openid |
| wechat_unionid | varchar(64) | NULL | 微信 unionid（可选） |
| alipay_user_id | varchar(64) | UNIQUE, NULL | 支付宝 user_id |
| status | UserStatus | 默认 ACTIVE | |
| created_at / updated_at | timestamptz | | |

索引：`phone`、`wechat_openid`、`alipay_user_id` 唯一索引。

### 4.2 `merchants` 商家

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| name | varchar(50) | NOT NULL | 店铺名 |
| description | text | | 简介 |
| announcement | varchar(200) | | 公告 |
| category_label | varchar(20) | | 展示分类，如「中式快餐」 |
| tags | text[] | 默认 `{}` | 店铺标签（如「现炒现做」），对应现有前端 `tags` |
| min_order_cents | int | ≥0 | 起送价（分） |
| delivery_fee_cents | int | ≥0 | 配送费（分） |
| delivery_time_min | int | ≥1 | 预计配送分钟 |
| is_open | boolean | 默认 true | 营业开关（学生端可见） |
| rating | decimal(2,1) | 默认 5.0 | 评分 |
| monthly_sales | int | 默认 0 | 月售（可由订单聚合刷新） |
| image_url / cover_from / cover_to | text | | 封面图与渐变兜底 |
| status | MerchantStatus | 默认 PENDING | 审核/停用状态 |
| created_at / updated_at | timestamptz | | |

索引：`(status, is_open)`。

### 4.3 `merchant_users` 商家账号关联

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| id | uuid | PK |
| merchant_id | uuid | FK → merchants.id，ON DELETE CASCADE |
| user_id | uuid | FK → users.id，ON DELETE CASCADE |
| role | MerchantUserRole | 默认 OWNER |
| created_at | timestamptz | |

唯一约束：`(merchant_id, user_id)`；索引：`user_id`。

### 4.4 `categories` 分类

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| id | uuid | PK |
| key | varchar(20) | UNIQUE（chinese/noodle/western/drink/fruit/snack） |
| name | varchar(20) | NOT NULL |
| sort_order | int | 默认 0 |
| is_active | boolean | 默认 true |

### 4.5 `products` 商品

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| merchant_id | uuid | FK → merchants | 所属商家 |
| category_id | uuid | FK → categories, NULL | 平台分类 |
| name | varchar(50) | NOT NULL | |
| description | varchar(200) | | |
| image_url | text | | 对象存储地址 |
| price_cents | int | >0 | 单价（分） |
| stock | int | ≥0 | 库存 |
| monthly_sales | int | 默认 0 | 展示销量 |
| menu_category | varchar(20) | | 店内菜单分组（如「招牌推荐」） |
| is_available | boolean | 默认 true | 上架状态 |
| is_hot | boolean | 默认 false | 首页热门 |
| deleted_at | timestamptz | NULL | 软删除 |
| created_at / updated_at | timestamptz | | |

索引：`(merchant_id, is_available, deleted_at)`、`(category_id)`。

### 4.6 `addresses` 收货地址

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| user_id | uuid | FK → users | 归属用户 |
| contact_name | varchar(20) | NOT NULL | |
| phone | varchar(20) | NOT NULL | |
| campus_area | varchar(30) | | 校区/园区（对应现有 `campusArea`） |
| building | varchar(30) | | 楼栋 |
| room | varchar(30) | | 房间号 |
| detail | varchar(100) | | 补充说明 |
| is_default | boolean | 默认 false | 默认地址唯一 |
| created_at / updated_at | timestamptz | | |

索引：`user_id`。
默认地址唯一由**部分唯一索引**保证（Prisma 不支持，写在迁移 SQL 中）：

```sql
CREATE UNIQUE INDEX addresses_one_default_per_user
ON addresses (user_id)
WHERE is_default = true;
```

切换默认地址时必须在事务内先取消旧默认，再设置新默认。

### 4.7 `carts` / `cart_items` 购物车

`carts`：`id`、`user_id`（UNIQUE）、`created_at`、`updated_at`。

`cart_items`：

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| id | uuid | PK |
| cart_id | uuid | FK → carts，CASCADE |
| product_id | uuid | FK → products |
| quantity | int | 1..99 |
| created_at / updated_at | timestamptz | |

唯一约束：`(cart_id, product_id)`；加购使用 `upsert` 累加数量。

> 购物车不保存价格权威值；展示时读取商品当前价格，结算时服务端重新计算。

### 4.8 `orders` 订单

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| order_no | varchar(32) | UNIQUE | 业务单号（如 `CW202611181230xxxx`） |
| checkout_group_no | varchar(32) | NOT NULL | 一次结算的组号（拆单聚合） |
| user_id | uuid | FK → users | 下单用户 |
| merchant_id | uuid | FK → merchants | 订单归属商家 |
| address_id | uuid | FK → addresses, SET NULL | 仅追溯，可为空 |
| contact_name | varchar(20) | NOT NULL | 收货人快照 |
| contact_phone | varchar(20) | NOT NULL | 电话快照 |
| address_text | varchar(200) | NOT NULL | 完整地址快照 |
| status | OrderStatus | 默认 PENDING | |
| subtotal_cents | int | ≥0 | 商品小计 |
| delivery_fee_cents | int | ≥0 | 配送费 |
| discount_cents | int | ≥0 | 优惠金额 |
| total_cents | int | ≥0 | 应付 = 小计 + 配送费 - 优惠 |
| note | varchar(200) | | 备注 |
| cancel_reason | varchar(100) | | |
| accepted_at / delivering_at / completed_at / cancelled_at | timestamptz | NULL | 状态时间 |
| created_at / updated_at | timestamptz | | |

索引：`(user_id, created_at DESC)`、`(merchant_id, status, created_at DESC)`、`(checkout_group_no)`、`order_no` 唯一。

约束（应用层 + 数据库 CHECK）：`total_cents = subtotal_cents + delivery_fee_cents - discount_cents`，且各项 ≥ 0。

### 4.9 `order_items` 订单明细（快照）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | PK |
| order_id | uuid | FK → orders，CASCADE |
| product_id | uuid | FK → products，SET NULL（商品可删） |
| product_name | varchar(50) | 下单时名称快照 |
| product_image | text | 下单时图片快照 |
| menu_category | varchar(20) | 菜单分组快照 |
| unit_price_cents | int | 下单时单价 |
| quantity | int | 数量 |
| subtotal_cents | int | 单价 × 数量 |

索引：`order_id`。

### 4.10 `payments` 支付单

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| checkout_group_no | varchar(32) | NOT NULL | 与订单组号一致 |
| provider | PaymentProvider | NOT NULL | 首版 `WECHAT`；`ALIPAY` 待确认 |
| out_trade_no | varchar(64) | UNIQUE | 商户支付单号 |
| provider_trade_no | varchar(64) | UNIQUE, NULL | 渠道交易号 |
| amount_cents | int | >0 | 支付金额（服务端计算） |
| status | PaymentStatus | 默认 PENDING | |
| prepay_id | varchar(128) | NULL | 微信 prepay_id |
| payer_openid / payer_user_id | varchar(64) | NULL | 付款人标识 |
| raw_notify | jsonb | NULL | 最近一次回调原文（脱敏） |
| paid_at | timestamptz | NULL | |
| created_at / updated_at | timestamptz | | |

索引：`checkout_group_no`、`(status, created_at)`。

### 4.11 `payment_orders` 支付-订单分摊（辅助表）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| id | uuid | PK |
| payment_id | uuid | FK → payments，CASCADE |
| order_id | uuid | FK → orders |
| amount_cents | int | 该订单分摊金额 |

唯一约束：`(payment_id, order_id)`；索引：`order_id`。

> 单商家结算时该表只有一行；多商家合并支付时按订单金额拆分，用于退款与对账。

### 4.12 `refunds` 退款

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | PK |
| payment_id | uuid | FK → payments |
| order_id | uuid | FK → orders |
| out_refund_no | varchar(64) | 商户退款单号，UNIQUE |
| provider_refund_no | varchar(64) | 渠道退款单号 |
| amount_cents | int | 退款金额 |
| reason | varchar(100) | 原因 |
| status | RefundStatus | 默认 PENDING |
| raw_notify | jsonb | 回调原文 |
| refunded_at | timestamptz | |
| created_at / updated_at | timestamptz | |

索引：`payment_id`、`order_id`。

### 4.13 `reviews` 评价

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| order_id | uuid | UNIQUE, FK → orders | 一单一评 |
| user_id | uuid | FK → users | |
| merchant_id | uuid | FK → merchants | 便于商家维度查询 |
| rating | smallint | 1..5 | |
| content | varchar(500) | | |
| images | jsonb | | 图片 URL 数组 |
| is_anonymous | boolean | 默认 false | |
| created_at | timestamptz | | |

索引：`(merchant_id, created_at DESC)`。

### 4.14 `delivery_persons` 配送员

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| user_id | uuid | FK → users，UNIQUE | 配送员登录账号（复用 users，避免两套认证） |
| real_name | varchar(20) | NOT NULL | 真实姓名 |
| phone | varchar(20) | NOT NULL | 联系电话 |
| status | DeliveryPersonStatus | 默认 ACTIVE | 是否可接单 |
| is_online | boolean | 默认 false | 在线接单状态（实时刷新） |
| current_task_count | int | 默认 0 | 配送中任务数，用于派单限流 |
| created_at / updated_at | timestamptz | | |

索引：`(status, is_online)`；`user_id` 唯一。

> 配送员由平台管理员维护；**是否允许学生兼职配送、是否需要独立 App/小程序端 待确认**。首版可先只做平台统一配送。

### 4.15 `delivery_tasks` 配送任务

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | uuid | PK | |
| task_no | varchar(32) | UNIQUE | 配送任务号 |
| order_id | uuid | FK → orders，UNIQUE | 一笔订单至多一个配送任务 |
| merchant_id | uuid | FK → merchants | 冗余商家维度，便于按商家统计 |
| delivery_person_id | uuid | FK → delivery_persons, NULL | 未派单时为空 |
| status | DeliveryTaskStatus | 默认 PENDING | |
| pickup_address | varchar(200) | NOT NULL | 取货地址快照（商家门店） |
| dropoff_address | varchar(200) | NOT NULL | 送达地址快照（订单地址） |
| contact_name / contact_phone | varchar(20) | NOT NULL | 收货人快照 |
| delivery_fee_cents | int | ≥0 | 本单配送费（用于配送员结算统计） |
| assigned_at / accepted_at / picked_up_at / delivered_at / cancelled_at | timestamptz | NULL | 各节点时间 |
| created_at / updated_at | timestamptz | | |

索引：`(status, created_at)`、`(delivery_person_id, status)`、`order_id` 唯一。

> 派单方式（手动派单 / 抢单 / 自动分配）**待确认**。表结构对三种方式均兼容：`delivery_person_id` 为空即待分配。

### 4.16 多商家数据隔离说明

- **行级隔离依据**：`products`、`orders`、`categories`（如为商家私有）、`delivery_tasks` 均携带 `merchant_id`；商家端所有查询强制附加 `merchant_id = 当前登录商家`。
- **权限校验在服务端**：从 `merchant_users` 解析当前用户归属商家，**不接受前端传入的 merchant_id 作为授权依据**。
- **配送员隔离**：配送员只能读取 `delivery_person_id = 自己` 的任务，平台管理员可见全部。
- **用户隔离**：学生端只能访问 `user_id = 自己` 的地址、购物车、订单、评价。
- **后续可选**：生产环境可叠加 PostgreSQL Row Level Security（RLS）作为第二道防线，首版以应用层强制过滤为主。

---

## 5. Prisma Schema 草案

> 该文件放在 `server/prisma/schema.prisma`。当前阶段仅设计，未初始化数据库。

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserStatus {
  ACTIVE
  DISABLED
}

enum MerchantStatus {
  PENDING
  ACTIVE
  SUSPENDED
  CLOSED
}

enum MerchantUserRole {
  OWNER
  STAFF
}

enum OrderStatus {
  PENDING
  PREPARING
  DELIVERING
  COMPLETED
  CANCELLED
}

enum PaymentProvider {
  WECHAT
  ALIPAY // 待确认：目标形态为微信小程序，是否保留支付宝渠道未定
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  CLOSED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum RefundStatus {
  PENDING
  PROCESSING
  SUCCESS
  FAILED
}

enum DeliveryPersonStatus {
  ACTIVE
  DISABLED
}

enum DeliveryTaskStatus {
  PENDING
  ACCEPTED
  PICKED_UP
  DELIVERED
  CANCELLED
}

model User {
  id            String        @id @default(uuid()) @db.Uuid
  phone         String?       @unique @db.VarChar(20)
  passwordHash  String?       @map("password_hash") @db.VarChar(255)
  nickname      String        @db.VarChar(30)
  avatarUrl     String?       @map("avatar_url")
  wechatOpenid  String?       @unique @map("wechat_openid") @db.VarChar(64)
  wechatUnionid String?       @map("wechat_unionid") @db.VarChar(64)
  alipayUserId  String?       @unique @map("alipay_user_id") @db.VarChar(64)
  status        UserStatus    @default(ACTIVE)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  addresses     Address[]
  cart          Cart?
  orders        Order[]
  reviews       Review[]
  merchantUsers MerchantUser[]
  deliveryPerson DeliveryPerson?

  @@map("users")
}

model Merchant {
  id              String         @id @default(uuid()) @db.Uuid
  name            String         @db.VarChar(50)
  description     String?
  announcement    String?        @db.VarChar(200)
  categoryLabel   String?        @map("category_label") @db.VarChar(20)
  minOrderCents   Int            @default(0) @map("min_order_cents")
  deliveryFeeCents Int           @default(0) @map("delivery_fee_cents")
  deliveryTimeMin Int            @default(20) @map("delivery_time_min")
  isOpen          Boolean        @default(true) @map("is_open")
  rating          Decimal        @default(5.0) @db.Decimal(2, 1)
  monthlySales    Int            @default(0) @map("monthly_sales")
  imageUrl        String?        @map("image_url")
  coverFrom       String?        @map("cover_from") @db.VarChar(20)
  coverTo         String?        @map("cover_to") @db.VarChar(20)
  status          MerchantStatus @default(PENDING)
  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  products      Product[]
  orders        Order[]
  merchantUsers MerchantUser[]
  reviews       Review[]
  deliveryTasks DeliveryTask[]

  @@index([status, isOpen])
  @@map("merchants")
}

model MerchantUser {
  id         String           @id @default(uuid()) @db.Uuid
  merchantId String           @map("merchant_id") @db.Uuid
  userId     String           @map("user_id") @db.Uuid
  role       MerchantUserRole @default(OWNER)
  createdAt  DateTime         @default(now()) @map("created_at")

  merchant Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([merchantId, userId])
  @@index([userId])
  @@map("merchant_users")
}

model Category {
  id        String   @id @default(uuid()) @db.Uuid
  key       String   @unique @db.VarChar(20)
  name      String   @db.VarChar(20)
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  products  Product[]

  @@map("categories")
}

model Product {
  id           String    @id @default(uuid()) @db.Uuid
  merchantId   String    @map("merchant_id") @db.Uuid
  categoryId   String?   @map("category_id") @db.Uuid
  name         String    @db.VarChar(50)
  description  String?   @db.VarChar(200)
  imageUrl     String?   @map("image_url")
  priceCents   Int       @map("price_cents")
  stock        Int       @default(0)
  monthlySales Int       @default(0) @map("monthly_sales")
  menuCategory String?   @map("menu_category") @db.VarChar(20)
  isAvailable  Boolean   @default(true) @map("is_available")
  isHot        Boolean   @default(false) @map("is_hot")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  merchant   Merchant     @relation(fields: [merchantId], references: [id])
  category   Category?    @relation(fields: [categoryId], references: [id])
  cartItems  CartItem[]
  orderItems OrderItem[]

  @@index([merchantId, isAvailable, deletedAt])
  @@index([categoryId])
  @@map("products")
}

model Address {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  contactName String   @map("contact_name") @db.VarChar(20)
  phone       String   @db.VarChar(20)
  campusArea  String?  @map("campus_area") @db.VarChar(30)
  building    String?  @db.VarChar(30)
  room        String?  @db.VarChar(30)
  detail      String?  @db.VarChar(100)
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]

  @@index([userId])
  @@map("addresses")
}

model Cart {
  id        String     @id @default(uuid()) @db.Uuid
  userId    String     @unique @map("user_id") @db.Uuid
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items     CartItem[]

  @@map("carts")
}

model CartItem {
  id        String   @id @default(uuid()) @db.Uuid
  cartId    String   @map("cart_id") @db.Uuid
  productId String   @map("product_id") @db.Uuid
  quantity  Int
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  cart    Cart    @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@unique([cartId, productId])
  @@map("cart_items")
}

model Order {
  id              String      @id @default(uuid()) @db.Uuid
  orderNo         String      @unique @map("order_no") @db.VarChar(32)
  checkoutGroupNo String      @map("checkout_group_no") @db.VarChar(32)
  userId          String      @map("user_id") @db.Uuid
  merchantId      String      @map("merchant_id") @db.Uuid
  addressId       String?     @map("address_id") @db.Uuid
  contactName     String      @map("contact_name") @db.VarChar(20)
  contactPhone    String      @map("contact_phone") @db.VarChar(20)
  addressText     String      @map("address_text") @db.VarChar(200)
  status          OrderStatus @default(PENDING)
  subtotalCents   Int         @map("subtotal_cents")
  deliveryFeeCents Int        @map("delivery_fee_cents")
  discountCents   Int         @default(0) @map("discount_cents")
  totalCents      Int         @map("total_cents")
  note            String?     @db.VarChar(200)
  cancelReason    String?     @map("cancel_reason") @db.VarChar(100)
  acceptedAt      DateTime?   @map("accepted_at")
  deliveringAt    DateTime?   @map("delivering_at")
  completedAt     DateTime?   @map("completed_at")
  cancelledAt     DateTime?   @map("cancelled_at")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  user         User         @relation(fields: [userId], references: [id])
  merchant     Merchant     @relation(fields: [merchantId], references: [id])
  address      Address?     @relation(fields: [addressId], references: [id], onDelete: SetNull)
  items        OrderItem[]
  paymentOrders PaymentOrder[]
  refunds      Refund[]
  review       Review?
  deliveryTask DeliveryTask?

  @@index([userId, createdAt(sort: Desc)])
  @@index([merchantId, status, createdAt(sort: Desc)])
  @@index([checkoutGroupNo])
  @@map("orders")
}

model OrderItem {
  id             String  @id @default(uuid()) @db.Uuid
  orderId        String  @map("order_id") @db.Uuid
  productId      String? @map("product_id") @db.Uuid
  productName    String  @map("product_name") @db.VarChar(50)
  productImage   String? @map("product_image")
  menuCategory   String? @map("menu_category") @db.VarChar(20)
  unitPriceCents Int     @map("unit_price_cents")
  quantity       Int
  subtotalCents  Int     @map("subtotal_cents")

  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@map("order_items")
}

model Payment {
  id              String          @id @default(uuid()) @db.Uuid
  checkoutGroupNo String          @map("checkout_group_no") @db.VarChar(32)
  provider        PaymentProvider
  outTradeNo      String          @unique @map("out_trade_no") @db.VarChar(64)
  providerTradeNo String?         @unique @map("provider_trade_no") @db.VarChar(64)
  amountCents     Int             @map("amount_cents")
  status          PaymentStatus   @default(PENDING)
  prepayId        String?         @map("prepay_id") @db.VarChar(128)
  payerOpenid     String?         @map("payer_openid") @db.VarChar(64)
  payerUserId     String?         @map("payer_user_id") @db.VarChar(64)
  rawNotify       Json?           @map("raw_notify")
  paidAt          DateTime?       @map("paid_at")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  paymentOrders PaymentOrder[]
  refunds       Refund[]

  @@index([checkoutGroupNo])
  @@index([status, createdAt])
  @@map("payments")
}

model PaymentOrder {
  id          String @id @default(uuid()) @db.Uuid
  paymentId   String @map("payment_id") @db.Uuid
  orderId     String @map("order_id") @db.Uuid
  amountCents Int    @map("amount_cents")

  payment Payment @relation(fields: [paymentId], references: [id], onDelete: Cascade)
  order   Order   @relation(fields: [orderId], references: [id])

  @@unique([paymentId, orderId])
  @@index([orderId])
  @@map("payment_orders")
}

model Refund {
  id               String       @id @default(uuid()) @db.Uuid
  paymentId        String       @map("payment_id") @db.Uuid
  orderId          String       @map("order_id") @db.Uuid
  outRefundNo      String       @unique @map("out_refund_no") @db.VarChar(64)
  providerRefundNo String?      @map("provider_refund_no") @db.VarChar(64)
  amountCents      Int          @map("amount_cents")
  reason           String?      @db.VarChar(100)
  status           RefundStatus @default(PENDING)
  rawNotify        Json?        @map("raw_notify")
  refundedAt       DateTime?    @map("refunded_at")
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  payment Payment @relation(fields: [paymentId], references: [id])
  order   Order   @relation(fields: [orderId], references: [id])

  @@index([paymentId])
  @@index([orderId])
  @@map("refunds")
}

model Review {
  id          String   @id @default(uuid()) @db.Uuid
  orderId     String   @unique @map("order_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  merchantId  String   @map("merchant_id") @db.Uuid
  rating      Int
  content     String?  @db.VarChar(500)
  images      Json?
  isAnonymous Boolean  @default(false) @map("is_anonymous")
  createdAt   DateTime @default(now()) @map("created_at")

  order    Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id])
  merchant Merchant @relation(fields: [merchantId], references: [id])

  @@index([merchantId, createdAt(sort: Desc)])
  @@map("reviews")
}

model DeliveryPerson {
  id               String               @id @default(uuid()) @db.Uuid
  userId           String               @unique @map("user_id") @db.Uuid
  realName         String               @map("real_name") @db.VarChar(20)
  phone            String               @db.VarChar(20)
  status           DeliveryPersonStatus @default(ACTIVE)
  isOnline         Boolean              @default(false) @map("is_online")
  currentTaskCount Int                  @default(0) @map("current_task_count")
  createdAt        DateTime             @default(now()) @map("created_at")
  updatedAt        DateTime             @updatedAt @map("updated_at")

  user  User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks DeliveryTask[]

  @@index([status, isOnline])
  @@map("delivery_persons")
}

model DeliveryTask {
  id               String             @id @default(uuid()) @db.Uuid
  taskNo           String             @unique @map("task_no") @db.VarChar(32)
  orderId          String             @unique @map("order_id") @db.Uuid
  merchantId       String             @map("merchant_id") @db.Uuid
  deliveryPersonId String?            @map("delivery_person_id") @db.Uuid
  status           DeliveryTaskStatus @default(PENDING)
  pickupAddress    String             @map("pickup_address") @db.VarChar(200)
  dropoffAddress   String             @map("dropoff_address") @db.VarChar(200)
  contactName      String             @map("contact_name") @db.VarChar(20)
  contactPhone     String             @map("contact_phone") @db.VarChar(20)
  deliveryFeeCents Int                @default(0) @map("delivery_fee_cents")
  assignedAt       DateTime?          @map("assigned_at")
  acceptedAt       DateTime?          @map("accepted_at")
  pickedUpAt       DateTime?          @map("picked_up_at")
  deliveredAt      DateTime?          @map("delivered_at")
  cancelledAt      DateTime?          @map("cancelled_at")
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")

  order          Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  merchant       Merchant        @relation(fields: [merchantId], references: [id])
  deliveryPerson DeliveryPerson? @relation(fields: [deliveryPersonId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@index([deliveryPersonId, status])
  @@map("delivery_tasks")
}
```

---

## 6. 关键事务与并发

### 6.1 创建订单（事务伪代码）

```js
await prisma.$transaction(async (tx) => {
  const cartItems = await tx.cartItem.findMany({
    where: { cartId },
    include: { product: true },
  })

  // 1. 校验：商品存在、已上架、店铺营业、达到起送价
  // 2. 服务端计算金额（分），前端金额字段忽略
  const groupNo = generateCheckoutGroupNo()

  for (const merchantGroup of groupByMerchant(cartItems)) {
    // 3. 条件扣减库存，失败则抛错回滚
    for (const item of merchantGroup.items) {
      const result = await tx.$executeRaw`
        UPDATE products
        SET stock = stock - ${item.quantity}, updated_at = now()
        WHERE id = ${item.productId}::uuid
          AND is_available = true
          AND deleted_at IS NULL
          AND stock >= ${item.quantity}
      `
      if (result === 0) throw new BusinessError('STOCK_NOT_ENOUGH', item.name)
    }

    // 4. 写订单 + 明细快照
    const order = await tx.order.create({ data: { /* ... */ } })

    // 5. 累计月售
    await tx.product.updateMany({
      where: { id: { in: merchantGroup.items.map((i) => i.productId) } },
      data: { monthlySales: { increment: 1 } },
    })
  }

  // 6. 清空已下单的购物车项
  await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } })
})
```

### 6.2 支付回调幂等

```js
await prisma.$transaction(async (tx) => {
  // 行锁，避免并发回调
  const payment = await tx.$queryRaw`
    SELECT * FROM payments WHERE out_trade_no = ${outTradeNo} FOR UPDATE
  `
  if (payment.status === 'PAID') return // 已处理，直接返回成功
  if (payment.amount_cents !== notifyAmountCents) throw new Error('金额不一致')

  await tx.payment.update({
    where: { id: payment.id },
    data: { status: 'PAID', providerTradeNo, rawNotify, paidAt: new Date() },
  })
  // 更新组内订单为已支付/待接单
})
```

### 6.3 取消订单

- 仅允许 `PENDING` 且未支付或已支付可退款的场景；
- 事务内：订单置 `CANCELLED`、恢复库存、写退款单（如已支付）；
- 退款渠道回调后更新 `refunds` 与 `payments` 状态。

### 6.4 默认地址切换

```sql
BEGIN;
UPDATE addresses SET is_default = false WHERE user_id = $1 AND is_default = true;
UPDATE addresses SET is_default = true WHERE id = $2 AND user_id = $1;
COMMIT;
```

### 6.5 订单与配送状态联动

| 触发动作 | 允许的前置状态 | 订单 | 配送任务 |
| --- | --- | --- | --- |
| 商家接单 | 订单 `PENDING` 且支付成功 | `PENDING → PREPARING` | 不变（或此时创建任务） |
| 商家出餐 / 派单 | 订单 `PREPARING` | 保持 `PREPARING` | `PENDING → ACCEPTED`（绑定配送员） |
| 配送员取餐 | 任务 `ACCEPTED` | `PREPARING → DELIVERING` | `ACCEPTED → PICKED_UP` |
| 配送员送达 | 任务 `PICKED_UP` | `DELIVERING → COMPLETED` | `PICKED_UP → DELIVERED` |
| 取消（未取餐） | 订单 `PENDING/PREPARING` | `→ CANCELLED` | `→ CANCELLED` |

> 每次状态流转必须：校验前置状态 → 更新订单/任务 → 写时间戳 → 同一事务提交。禁止跨状态跳跃（如 `PENDING` 直接 `COMPLETED`）。

### 6.6 库存策略待确认

- 现有前端**没有库存字段**，商品可无限加购。
- 方案 A（推荐，简单）：下单即扣库存，取消/超时未支付自动回补；
- 方案 B：支付成功才扣库存（需解决并发超卖与支付前占位）；
- 方案 C：库存仅做展示与限购，不阻断下单（适合校园食堂档口）。

> 首版建议采用方案 A，库存初始值由商家在后台维护；具体策略 **待确认**。

---

## 7. 现有 LocalStorage 数据映射

| 现有 Key | 目标表 | 说明 |
| --- | --- | --- |
| `chongwai_merchants` | `merchants` | 补齐 `status=ACTIVE`，金额转分 |
| `chongwai_dishes` | `products` + `categories` | `menuCategory` 保留，`categoryKey` 映射 `categories.key` |
| `chongwai_cart` | `carts` + `cart_items` | 迁移期间不导入游客购物车，登录后重建 |
| `chongwai_orders` | `orders` + `order_items` | 仅作为演示数据，不与真实订单混存；如导入需标记 `is_demo` |
| `chongwai_addresses` | `addresses` | 绑定到迁移后的默认用户 |
| `chongwai_profile` | `users` | 昵称/头像，密码重新设置 |

迁移脚本（`server/prisma/seed.js`）只导入：

- 6 家商家；
- 6 个分类；
- 36 道菜品（作为商家商品，库存给一个合理初始值，如 100）；
- 1 个演示商家账号 + 1 个演示用户（密码通过环境变量注入，不写死）。

**不导入**历史 LocalStorage 订单与地址，避免把演示数据写进真实库。

---

## 8. 统计查询设计

后台首页与统计页所需指标：

| 指标 | 查询 |
| --- | --- |
| 今日订单数 | `COUNT(*) FROM orders WHERE merchant_id=$1 AND created_at >= $today` |
| 今日营业额 | `SUM(total_cents) WHERE status <> 'CANCELLED' AND created_at >= $today` |
| 商品总数 | `COUNT(*) FROM products WHERE merchant_id=$1 AND deleted_at IS NULL` |
| 待处理订单 | `COUNT(*) WHERE status='PENDING'` |
| 最近 7 天趋势 | `GROUP BY date_trunc('day', created_at)`，按本地时区转换 |
| 商家排行 | 按 `merchant_id` 聚合非取消订单营业额 |
| 热销菜品 | `SUM(order_items.quantity) GROUP BY product_name` |

建议：

- 统计接口按 `merchant_id` 强制过滤；
- 订单量增大后增加 `daily_stats` 汇总表（可选，不在首版）；
- 统一时区：数据库存 UTC，统计按 `Asia/Shanghai` 换算。
