# 重外校园外卖平台 · 架构审查与目标架构

> 阶段：第一阶段（审查与规划，不落地代码）
> 更新时间：2026-11-18
> 配套文档：`database.md`、`api-plan.md`、`payment.md`、`migration-plan.md`、`code-audit.md`

---

## 1. 项目现状摘要

- 现有项目：Vue 3 + Vite 8 + Vue Router 5（Hash）+ 原生 CSS + lucide-vue-next。
- 已实现：学生端 10 页（首页、商家列表/详情、购物车、结算、订单、个人中心、地址、介绍）与商家管理后台 5 页（首页、订单、商品、店铺、统计）。
- 数据：全部存于 LocalStorage（6 个键），包含 6 家演示商家、36 道菜品。
- 支付：**模拟**，无真实支付；订单详情存在“模拟商家接单/配送/送达”按钮。
- 后端：**未接入**（`server/` 仅有半成品骨架）。
- 小程序：**未开发**。
- Git：项目目录不是 Git 仓库，无远程地址。
- 详细逐项核查见 `docs/code-audit.md`。

结论：现有项目是一个**完成度较高的前端演示系统**，UI 与业务流程可作为目标系统的蓝本，但不能直接承载真实交易。

---

## 2. 目标产品形态

| 端 | 使用者 | 形态 | 技术 |
| --- | --- | --- | --- |
| 用户端 | 学生/教师 | 微信小程序 | uni-app + Vue 3 + JavaScript |
| 管理后台 | 平台管理员、商家、配送调度 | Web（保留现有 Vue 项目） | Vue 3 + Vite + ECharts |
| 后端 | — | REST API | Node.js + Express |
| 数据库 | — | PostgreSQL | Prisma ORM |

角色与权限：

| 角色 | 入口 | 权限范围 |
| --- | --- | --- |
| 普通用户 `USER` | 微信小程序 | 自己的资料、地址、购物车、订单、评价 |
| 商家 `MERCHANT` | Web 后台 | 自己店铺的商品、订单、配送、经营数据 |
| 配送员 `DELIVERY` | Web 后台（移动端适配） | 分配给自己的配送任务 |
| 平台管理员 `ADMIN` | Web 后台 | 商家审核、全局订单/数据、异常处理 |

> 商家与配送员身份通过 `merchant_users`、`delivery_persons` 关联，避免在 `users` 中硬编码多角色。

---

## 3. 目标架构

```
微信小程序（uni-app）
        │ HTTPS / JWT
        ▼
   Nginx（HTTPS / 静态资源）
        │
        ├── 管理后台（Vue 3 静态包）
        │
        ▼
Node.js + Express REST API
  ├── auth（微信登录 / 后台登录）
  ├── catalog（商家/分类/商品/评价）
  ├── cart / orders / payments
  ├── merchant（店铺、商品、订单、统计）
  ├── delivery（配送任务）
  └── admin（审核、全局统计）
        │ Prisma
        ▼
PostgreSQL           对象存储 + CDN
（业务数据）          （商品图/头像）
```

### 3.1 后端分层

```
routes → middleware（JWT/角色/校验/限流） → modules（控制器）
       → services（金额、库存、状态机、事务） → Prisma
```

约束：

- 金额、库存、订单状态只能由 service 层决定；
- 所有写操作使用事务；
- 统一响应：`{ code, message, data }`；
- 统一错误码：401 未登录、403 无权限、409 状态冲突、422 参数错误。

### 3.2 管理后台

- 保留现有 Vue 项目与页面结构；
- 新增登录页与路由守卫；
- 数据层由 `src/data`、`src/utils` 的 LocalStorage 改为 `src/api`；
- 图表由自研 CSS 柱状图替换为 **ECharts**（订单趋势、营业额、排行）；
- 商家账号登录后只能看到自己店铺数据。

### 3.3 微信小程序

- uni-app + Vue 3 + JavaScript；
- 页面：登录、首页、商家列表、商家详情、购物车、结算、订单列表/详情、个人中心、地址；
- 登录：`wx.login` → 后端换取 JWT；
- 支付：`wx.requestPayment`（详见 `payment.md`）；
- 状态同步：首版轮询（15~30 秒），后续可升级 WebSocket。

---

## 4. 新项目目录（建议）

```
chongwai-takeout/
├── apps/
│   ├── admin/                 # 由现有根项目迁移（迁移后期执行）
│   │   ├── src/
│   │   ├── index.html
│   │   └── package.json
│   └── miniapp/               # uni-app 微信小程序
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── api/
│       │   ├── store/
│       │   └── styles/
│       ├── manifest.json
│       ├── pages.json
│       └── package.json
├── server/
│   ├── src/
│   │   ├── modules/           # auth/users/merchants/products/cart/orders/payments/delivery/reviews/stats
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── config/
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── .env.example
│   └── package.json
├── packages/
│   └── shared/                # 金额、状态枚举、校验规则（前后端复用）
├── docs/
└── package.json
```

**迁移原则**：

1. 当前阶段**不移动任何现有文件**；
2. 现有 `src/`、`public/`、`vite.config.js` 原位保留，保证演示版随时可运行；
3. 新增 `server/`、`apps/miniapp/`、`docs/`，后台迁移放到后期；
4. 现有静态图片在对象存储接入前继续可用。

---

## 5. 多商家核心方案

### 5.1 数据隔离

- 商品、订单、评价、配送任务均带 `merchant_id`；
- 商家接口通过 `merchant_users` 解析当前 `merchantId`，**禁止前端传商家 ID**；
- service 层再次校验资源归属；
- 平台管理员可跨商家查询，普通商家不可。

### 5.2 购物车拆单

```
购物车（跨商家）
  → 按 merchant_id 分组
  → 每组生成一笔订单（独立配送费/优惠/状态）
  → 共享 checkout_group_no
  → 支付单按组创建，payment_orders 记录分摊
```

### 5.3 服务端定价

- 商品小计、配送费、优惠、应付总额全部由服务端计算；
- 前端 `preview` 接口只用于展示，提交时重新计算；
- 金额统一整数分。

### 5.4 库存

- 下单事务内条件扣减：
  `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`
- 扣减失败回滚整单；
- 取消/拒单恢复库存；
- 超时未支付自动关单并恢复。

### 5.5 订单状态

```
PENDING（待接单） → PREPARING（制作中） → DELIVERING（配送中） → COMPLETED（已完成）
        └→ CANCELLED（已取消）
```

配送任务状态由 `delivery_tasks` 管理：待分配 `PENDING` → 已接单 `ACCEPTED` → 已取餐 `PICKED_UP` → 已送达 `DELIVERED`，异常/取消为 `CANCELLED`。

---

## 6. 非功能性设计

### 6.1 安全

- 密码 Argon2id 或 bcrypt（cost ≥ 12），禁止明文；
- JWT access + refresh，密钥走环境变量；
- 支付私钥、API v3 密钥只存服务端，`.env` 与证书目录加入 `.gitignore`；
- 支付回调验签、金额核对、幂等；
- 接口限流（登录、下单、支付）；
- 输入校验（zod）；
- 上传限制类型与大小。

### 6.2 性能

- 列表分页；
- 索引：`products(merchant_id, is_available)`、`orders(user_id, created_at)`、`orders(merchant_id, status)`；
- 统计按日聚合，订单量大后加汇总表；
- 图片 CDN。

### 6.3 可观测性

- 结构化日志（pino），请求 ID；
- 支付回调单独日志与告警；
- `/healthz` 存活、`/readyz` 数据库就绪；
- 关键指标：下单成功率、支付成功率、超时未接单数。

### 6.4 部署

- 后端 Docker 或 PM2 + Nginx；
- PostgreSQL 托管并每日备份；
- 管理后台静态部署；
- 小程序通过微信开发者工具上传审核；
- 环境区分 dev / staging / prod。

---

## 7. 架构决策记录

| 编号 | 决策 | 理由 |
| --- | --- | --- |
| ADR-01 | 保留现有 Vue 项目作为 Web 管理后台 | UI 与后台页面成熟，改造成本最低 |
| ADR-02 | 学生端用 uni-app 重写为微信小程序 | 小程序无法运行 DOM 页面，支付需原生 API |
| ADR-03 | 单后端 + 单数据库，多端共用 | 数据必须统一 |
| ADR-04 | 金额整数分 | 避免浮点误差 |
| ADR-05 | 订单按商家拆分，组号聚合支付 | 与现有拆单逻辑一致 |
| ADR-06 | 库存条件更新 | 防并发超卖 |
| ADR-07 | 首版轮询同步订单状态 | 降低复杂度 |
| ADR-08 | 图片对象存储 | 小程序包体与多端共享 |
| ADR-09 | ECharts 仅用于管理后台 | Web 端可视化成熟，小程序不用 |

---

## 8. 现状与目标差异

| 能力 | 现状 | 目标 |
| --- | --- | --- |
| 账号 | 无 | 微信登录 + 后台账号 |
| 商家 | 静态演示数据 | 入驻、账号、归属 |
| 商品 | LocalStorage | 数据库 + 库存 + 上传 |
| 购物车 | 浏览器 | 服务端、跨端 |
| 订单 | 前端生成/前端算钱 | 服务端事务定价 |
| 支付 | 模拟按钮 | 微信支付 |
| 后台 | 无鉴权 | JWT + 角色 |
| 配送 | 无 | 配送员 + 任务 |
| 评价 | 无 | 订单评价 |
| 图表 | CSS 柱状图 | ECharts |
| 数据 | LocalStorage | PostgreSQL + 对象存储 |
