# 重外校园外卖平台 · 现有代码审查与可复用性分析

> 阶段：第一阶段（仅审查与规划）
> 审查时间：2026-11-18
> 审查范围：`package.json`、`src/` 全部页面/组件/工具/数据、`public/`、路由、LocalStorage、Git 状态
> 说明：本文件只陈述事实与判断，未修改任何业务代码。

---

## 0. 仓库当前状态说明

| 项 | 状态 |
| --- | --- |
| 项目根目录 | `c:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout` |
| 业务代码 | Vue 3 + Vite 演示版，完整可构建 |
| 文档 | `docs/` 下已有本阶段要求的 6 份文档 |
| 后端目录 | 已存在 `server/` 骨架（`package.json`、`prisma/schema.prisma`、种子脚本、健康检查代码），**尚未安装依赖、未连接数据库、未实现任何业务 API**，且 schema 尚未包含配送表 |
| Git | 项目目录 **不是 Git 仓库**，`git remote -v` 无远程地址；`C:\Users\SXY` 下另有一个无 remote 的仓库，需避免误提交 |
| 演示数据 | 6 家商家、36 道菜品、本地图片 36 + 6 张 |

> `server/` 是此前一次「阶段 1」请求中创建的半成品，与本阶段「只生成文档」的要求存在冲突。**是否保留请确认**；本阶段未继续开发、也未删除。

---

## 1. 技术栈与依赖（实测）

| 类别 | 依赖 / 版本 |
| --- | --- |
| 框架 | `vue ^3.5.44` |
| 路由 | `vue-router ^5.5.1`（Hash 模式） |
| 图标 | `lucide-vue-next ^1.0.0` |
| 构建 | `vite ^8.3.6`、`@vitejs/plugin-vue ^6.0.10` |
| 语言 | JavaScript（无 TypeScript） |
| 样式 | 原生 CSS + CSS 变量，无 UI 组件库 |
| 图表 | 无 ECharts，后台柱状图为自研 CSS 组件 |
| 状态 | Vue `reactive` / `computed` / `deep watch` |
| 持久化 | LocalStorage |
| 后端 | **未接入**（`server/` 仅为骨架） |
| 小程序 | **未开发** |
| 测试 | **无单元测试 / E2E** |

---

## 2. 目录与资源

```
src/
├── main.js / App.vue / style.css
├── router/index.js           15 条路由
├── layouts/AdminLayout.vue
├── data/                     6 个文件：merchants、dishes、categories、navigation、avatars
├── utils/                    8 个文件：cart、orders、addresses、profile、adminStats、format、image、categoryIcons
├── components/               8 个：AppHeader、AppTabBar、DishCard、RestaurantCard、ShopDishCard、EmptyState、UserAvatar、admin/TrendBarChart
└── views/                    10 个学生端 + 5 个管理端
```

- **静态资源不在 `src/assets`**，而是放在 `public/images/`（`dishes/` 36 张、`shops/` 6 张），通过 `utils/image.js` 的 `localImage()` 拼接 `BASE_URL`。
- 分类图标为 `utils/categoryIcons.js` 映射的 lucide 组件，不是图片资源。

---

## 3. 页面逐项核查（实际功能，而非文件名）

### 3.1 学生端

| 页面 | 实际已实现 | 未实现 / 演示性质 |
| --- | --- | --- |
| 首页 `Home.vue` | 欢迎区、商家/菜品搜索、8 个分类入口、6 家商家卡片、热门菜品（仅上架） | 无真实推荐算法、无定位 |
| 商家列表 `ShopList.vue` | 关键词搜索、分类筛选、营业状态、评分/月售/起送价/配送时长 | 无分页、无距离排序 |
| 商家详情 `ShopDetail.vue` | 封面、公告、评分、左右分栏菜单、按店内分类切换、加购/增减/删除、底部购物车栏 | 无规格选择、无评价、无库存 |
| 购物车 `CartView.vue` | 按商家分组、勾选结算、数量增减、删除、按店计算小计/配送费/优惠、总额 | 选择状态不持久化；无失效商品处理 |
| 确认订单 `Checkout.vue` | 读取已存地址、收货人/电话校验、按商家拆单预览、备注、满 30 减 3、提交生成多笔订单、清空已结算商品 | **支付为模拟**（按钮文案明确“模拟支付”），无真实支付 |
| 我的订单 `OrdersView.vue` | 订单列表、状态标签、状态筛选 | 无分页、无实时推送 |
| 订单详情 `OrderDetail.vue` | 商品快照、金额明细、收货信息、状态时间线、取消订单 | **含“模拟商家接单/开始配送/确认送达”按钮**，学生可自行推进状态（演示逻辑） |
| 个人中心 `ProfileView.vue` | 头像/昵称/手机号编辑、订单状态入口、地址/关于/后台入口 | 无登录/退出、无真实账号 |
| 收货地址 `Address.vue` | 增删改查、默认地址唯一、表单校验 | 仅本机 LocalStorage，无用户隔离 |
| 平台介绍 `About.vue` | 静态介绍、明确标注演示性质 | 无 CMS 配置 |

### 3.2 管理端

| 页面 | 实际已实现 | 未实现 / 演示性质 |
| --- | --- | --- |
| 后台首页 `Admin.vue` | 今日订单/营业额/商品总数/待处理订单、7 天订单与营业额柱状图、热销排行、最新订单 | 数据来自本地订单；无权限控制；无 ECharts |
| 订单管理 `AdminOrders.vue` | 全量订单、状态 Tabs、商家筛选、单号搜索、详情弹窗、接单/拒绝/配送/完成 | 无登录、无商家隔离、无退款、无配送员 |
| 商品管理 `AdminProducts.vue` | 列表、商家/状态筛选、搜索、新增/编辑弹窗、改价、上下架、删除 | 无真实库存、无图片上传（只能选本地已有图） |
| 店铺管理 `AdminShops.vue` | 商家卡片、编辑名称/公告/起送价/配送时间/营业状态 | 无入驻审核、无资质、无多商家账号 |
| 数据统计 `AdminStatistics.vue` | 总订单/完成/取消/总营业额、商家排行、菜品排行、7 天订单图 | 前端聚合本地数据；无 ECharts；无法按时间范围查询 |

### 3.3 明确未实现的能力

- 真实注册/登录、JWT、角色权限；
- 商家入驻、商家账号、平台管理员；
- 后端 API、PostgreSQL、Prisma 运行时；
- 商品库存与并发扣减；
- 真实微信支付；
- 微信小程序（uni-app）；
- 配送员与配送任务；
- 评价系统；
- ECharts 图表；
- 图片上传与对象存储；
- 订单实时更新（WebSocket / 轮询）；
- 单元测试与端到端测试。

---

## 4. 路由核查

共 15 条，全部可访问：

- 学生端：`/`、`/shops`、`/shop/:id`、`/cart`、`/checkout`、`/orders`、`/order/:id`、`/profile`、`/address`、`/about`
- 管理端：`/admin`、`/admin/orders`、`/admin/products`、`/admin/shops`、`/admin/statistics`（嵌套 `AdminLayout`）

问题：

1. 无路由守卫，任何人可直接访问 `/admin`；
2. 无 404 兜底路由；
3. 管理端与学生端共用同一个 Web 应用，通过 `App.vue` 判断路径隐藏学生端导航。

---

## 5. 数据来源与 LocalStorage

| Key | 内容 | 风险 |
| --- | --- | --- |
| `chongwai_merchants` | 商家数组（含起送价、配送费、营业状态、公告） | 无商家归属、可被任意修改 |
| `chongwai_dishes` | 菜品数组（价格、销量、分类、上下架、热门） | 无库存、价格由前端决定 |
| `chongwai_cart` | 购物项（商品快照 + 数量） | 不跨设备、不区分用户 |
| `chongwai_orders` | 订单（拆单、金额、状态、地址快照） | 前端生成、无支付凭证、可篡改 |
| `chongwai_addresses` | 地址（默认唯一） | 无用户隔离 |
| `chongwai_profile` | 昵称、头像、手机号 | 无账号体系 |

结论：数据结构与真实业务字段接近，可以作为**数据库种子与字段设计参考**，但**不能作为正式业务存储**。

---

## 6. 重复代码与明显问题

| 级别 | 问题 | 位置 | 建议 |
| --- | --- | --- | --- |
| P0 | 管理后台无鉴权，学生入口可直接进入 | `/admin`、`ProfileView.vue` | 后端接入后加登录与角色守卫 |
| P0 | 学生端可模拟推进订单状态 | `OrderDetail.vue` | 迁移后删除该演示入口，只允许商家/配送端操作 |
| P0 | 模拟支付按钮 | `Checkout.vue` | 接入真实支付后替换，禁止沿用 |
| P0 | 无库存，超卖不可控 | `dishes` / 下单 | 服务端库存 + 条件扣减 |
| P0 | 金额在前端计算并落库 | `Checkout.vue`、`utils/orders.js` | 改为服务端计算 |
| P1 | 无用户/商家隔离 | 全部 LocalStorage | 数据库按 `user_id` / `merchant_id` 过滤 |
| P1 | 后台统计全量本地订单 | `utils/adminStats.js` | 服务端按商家聚合 |
| P1 | 图表为 CSS 柱状图，非 ECharts | `components/admin/TrendBarChart.vue` | 迁移后引入 ECharts |
| P1 | 无 404 路由 | `router/index.js` | 增加兜底页 |
| P2 | 金额格式化存在 `formatPrice` 与 `formatMoney` 两套语义 | `utils/format.js` | 统一规则并在后端复用 |
| P2 | 后台样式与全局变量有少量重复定义 | `styles/admin.css`、`style.css` | 抽取共享 token |
| P2 | 无测试、无错误监控 | 全项目 | 后续补充 |
| P2 | 图片仅本地静态文件 | `public/images` | 改对象存储 + CDN |
| 待确认 | `server/` 半成品骨架是否保留 | `server/` | 需确认后再继续 |

> 未发现大段复制粘贴的页面代码；商家/菜品卡片已组件化，金额与状态文案集中在 `utils/`，整体结构清晰。

---

## 7. 可复用性分类

### A. 可以直接保留

| 资产 | 说明 |
| --- | --- |
| `src/style.css` | 蓝白主题变量、基础排版、卡片/按钮规范 |
| `src/utils/format.js` | 金额格式化，可迁移为前后端共享规则 |
| `src/utils/image.js` | 图片路径拼接思路（小程序端替换） |
| `EmptyState.vue`、`UserAvatar.vue` | 纯展示组件 |
| `AdminLayout.vue` | 后台布局，仅需加登录态与菜单权限 |
| 管理端 5 个页面的**模板与样式** | UI 成熟，替换数据层即可 |
| `public/images` | 作为演示与种子资源保留 |
| 6 家商家 / 36 道菜品的文案与图片 | 作为数据库种子 |

### B. 需要修改后保留

| 资产 | 修改点 |
| --- | --- |
| `AppHeader.vue` / `AppTabBar.vue` | 增加登录态、购物车角标改 API |
| 学生端 10 个页面 | 迁移 uni-app：标签、路由、图标、单位适配 |
| `utils/cart.js` | 规则抽到服务端，前端保留展示与乐观更新 |
| `utils/orders.js` | 金额/状态机迁移服务端，前端只做展示 |
| `utils/addresses.js` | 改为 API + 用户隔离 |
| `utils/profile.js` | 改为账号资料 API |
| `utils/adminStats.js` | 改为服务端统计接口 |
| `data/merchants.js` / `dishes.js` / `categories.js` | 去掉 LocalStorage 持久化，转为 API / 种子 |
| `router/index.js` | 增加登录、角色守卫、404 |
| `App.vue` | 区分小程序/管理端壳，保留后台路径判断 |
| `TrendBarChart.vue` | 过渡保留，最终替换为 ECharts |

### C. 需要重新开发

| 能力 | 原因 |
| --- | --- |
| 后端 Express 应用与全部业务 API | 现有 `server/` 只有骨架，无业务 |
| PostgreSQL + Prisma 迁移与种子 | 尚未落地运行 |
| JWT 登录、角色与商家归属 | 完全没有 |
| 商家入驻与商家账号 | 完全没有 |
| 库存与并发控制 | 完全没有 |
| 微信支付（预支付/回调/退款/对账） | 完全没有 |
| 微信小程序（uni-app） | 完全没有 |
| 配送员、配送任务 | 完全没有 |
| 评价系统 | 完全没有 |
| ECharts 数据可视化 | 当前是 CSS 柱状图 |
| 图片上传 / 对象存储 | 当前只能选本地图 |
| 订单实时更新 | 当前靠同浏览器响应式 |

---

## 8. 复用比例估算

| 模块 | 复用率 |
| --- | --- |
| 管理端 UI 与布局 | 80% |
| 学生端 UI 与交互 | 45%（需转 uni-app） |
| 视觉规范 | 90% |
| 业务规则（拆单/金额/状态机/地址快照） | 65%（迁到服务端） |
| 数据层 | 0%（LocalStorage 全部替换） |
| 静态资源 | 80% |
| **整体** | **约 55%** |

---

## 9. 待确认事项

1. 项目 Git 远程仓库地址与默认分支（当前无仓库、无 remote）。
2. 是否保留 `server/` 半成品骨架，还是先删除、待第二阶段重新按文档创建。
3. 是否已有微信支付商户号（决定接入普通商户模式还是服务商模式）。
4. 配送模式：平台统一配送 / 商家自配送 / 两者并存。
5. 是否需要支付宝小程序（当前阶段目标为微信小程序，支付宝可作为后续扩展）。
6. 是否需要用户手机号验证码登录（涉及短信服务与费用）。
