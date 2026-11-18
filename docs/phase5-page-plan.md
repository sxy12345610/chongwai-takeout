# 第五阶段 · 学生端页面与路由规划

> 面向微信小程序（uni-app + Vue 3 + TypeScript + Pinia）。页面数据均来自真实后端 API，**不使用本地 mock**。
> 主视觉：蓝白渐变（主色 `#1769aa` → `#4e9fdf`，浅底 `#f5f8fb`），融入重庆外语外事学院校园元素（校园地标剪影、校名简称「重外」、宿舍楼/教学楼地址标签）。

---

## 一、路由总览（pages.json）

| # | 页面 | 路由 | 说明 |
| --- | --- | --- | --- |
| 1 | 首页 | `pages/home/index` | TabBar 第 1 项 |
| 2 | 商家列表 | `pages/shop/list` | TabBar 第 2 项 |
| 3 | 购物车 | `pages/cart/index` | TabBar 第 3 项 |
| 4 | 订单列表 | `pages/order/list` | TabBar 第 4 项 |
| 5 | 我的 | `pages/mine/index` | TabBar 第 5 项 |
| 6 | 商家详情 | `pages/shop/detail?id=<merchantId>` | 非 Tab 页 |
| 7 | 确认订单 | `pages/order/confirm` | 非 Tab 页 |
| 8 | 订单详情 | `pages/order/detail?id=<orderId>` | 非 Tab 页 |
| 9 | 地址管理 | `pages/address/list` | 非 Tab 页 |

建议另加（本阶段仅规划、可后续再定）：`pages/address/edit?id=`（新增/编辑复用同一页）、`pages/login/index`（微信登录引导页）。

### TabBar 建议

```
首页 / 商家 / 购物车 / 订单 / 我的
```

图标使用本地 PNG（`static/tabbar/*.png`），选中态用主色。

---

## 二、页面明细

### 1. 首页 `pages/home/index`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /categories`（分类金刚区）；`GET /merchants?isOpen=true&pageSize=10`（校园推荐/营业中商家）；搜索跳转商家列表 |
| 页面结构 | 顶部定位条（「重庆外语外事学院 · 綦江校区」）→ 搜索框 → 分类横滑（7 个分类）→ 校园推荐 Banner → 推荐商家卡片列表 |
| 状态 | 加载骨架屏；空态「暂无营业商家」；失败态 + 重试 |
| 交互 | 点击分类 → 商家列表带 `categoryKey`；点击商家 → 商家详情 |
| 说明 | 「校园推荐」暂无专用接口，暂以营业中 + 月售排序实现，文档中已标注为待补接口 |

### 2. 商家列表 `pages/shop/list`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /merchants?keyword&categoryKey&isOpen&page&pageSize` |
| 页面结构 | 搜索框、分类筛选、营业状态筛选（全部/营业中）、商家卡片（封面渐变、名称、评分、月售、起送价、配送费、配送时长、营业状态徽标） |
| 状态 | 分页加载（`onReachBottom` 加载更多）、空态、失败重试、下拉刷新 |
| 交互 | 点击卡片进入 `pages/shop/detail`；停业商家置灰但可查看 |

### 3. 商家详情 `pages/shop/detail`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /merchants/:id`；`GET /merchants/:id/products`（可按 `menuCategory` 本地分组，也可带参请求） |
| 页面结构 | 顶部商家头图/信息（公告、起送、配送费、评分）→ 左侧菜单分类锚点 + 右侧商品列表（图片、名称、描述、价格、月售、加购按钮） |
| 状态 | 加载态、空态「该商家暂无在售商品」、失败重试；商家停业时置灰并禁止加购 |
| 交互 | 加购 → `POST /cart/items`；底部购物车悬浮条（数量、合计、去结算） |
| 说明 | 商品接口无分页，数据量有限可一次加载 |

### 4. 购物车 `pages/cart/index`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /cart`；`PATCH /cart/items/:id`；`DELETE /cart/items/:id`；`DELETE /cart` |
| 页面结构 | 按商家分组的商品列表（图片、名称、单价、步进器、小计）→ 失效商品提示 → 底部合计（含配送费）+ 去结算 |
| 状态 | 空购物车插画 + 「去逛逛」；加载态；失败重试；`invalid=true` 商品标灰并提供移除 |
| 交互 | 数量增减（1–99）、删除二次确认、清空购物车确认；未达起送价时禁用结算并提示差额 |

### 5. 确认订单 `pages/order/confirm`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /addresses`（默认地址）；`GET /cart`（金额与分组）；`POST /orders`（携带 `Idempotency-Key`） |
| 页面结构 | 收货地址卡片（无地址则「去添加」）→ 商家分组商品清单 → 备注输入（≤200）→ 金额明细（小计/配送费/合计）→ 底部提交栏 |
| 状态 | 提交中禁用按钮；失败提示（库存不足 3004 / 未达起送 3003 / 商家停业 3001）；成功后跳订单详情 |
| 关键实现 | 进入页面时生成 UUID 存入页面状态；**点击提交与网络重试复用同一个键**；成功后清空该键；若用户返回修改再进入则重新生成 |
| 说明 | 多商家购物车会生成多条订单（共享 `checkoutGroupNo`），提交成功后跳转订单列表或组内首单详情 |

### 6. 订单列表 `pages/order/list`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /orders?status&page&pageSize` |
| Tab | 全部 / 待处理 / 配送中 / 已完成（对应 `status` 空、`PENDING`(+`PREPARING`)、`DELIVERING`、`COMPLETED`） |
| 页面结构 | 订单卡片（商家名、状态、商品缩略、合计、下单时间、操作按钮） |
| 状态 | 分页加载、空态、失败重试、下拉刷新 |
| 风险标注 | ① 接口仅支持单值 `status`，「待处理」需两次请求合并或后端扩展；② 当前无接口推进到 `DELIVERING`，「配送中」Tab 会长期为空 |
| 交互 | 待处理订单可取消（`POST /orders/:id/cancel`，二次确认）；点击进入订单详情 |

### 7. 订单详情 `pages/order/detail`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /orders/:id` |
| 页面结构 | 状态进度条（待接单 → 制作中 → 配送中 → 已完成/已取消）→ 收货信息 → 商品明细 → 金额明细 → 订单号/下单时间 → 操作（取消/再来一单） |
| 状态 | 加载态、错误态（5001 订单不存在）、状态变更后刷新 |
| 说明 | 学生端只读为主；取消仅 `PENDING` 可用 |

### 8. 我的 `pages/mine/index`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /auth/me` |
| 页面结构 | 用户头像/昵称/手机号 → 订单状态快捷入口（待处理/配送中/已完成）→ 功能列表：收货地址、关于平台、退出登录 |
| 状态 | 未登录时显示「微信登录」按钮；加载失败提示 |
| 交互 | 点击订单入口跳订单列表并带 Tab；地址管理跳 `pages/address/list` |

### 9. 地址管理 `pages/address/list`

| 项 | 内容 |
| --- | --- |
| 数据接口 | `GET /addresses`；`POST /addresses`；`PUT /addresses/:id`；`DELETE /addresses/:id`；`PATCH /addresses/:id/default` |
| 页面结构 | 地址列表（联系人、电话、校区/楼栋/房间、默认徽标）→ 新增按钮 → 编辑/删除/设为默认 |
| 表单字段 | 联系人、手机号、校区区域、楼栋、房间、详细地址、设为默认 |
| 状态 | 空态「还没有收货地址」、提交中、失败提示、删除确认 |
| 说明 | 首条地址自动成为默认；设置默认后旧默认自动取消（后端保证唯一） |

---

## 三、页面与接口映射速查

| 页面 | 主要接口 |
| --- | --- |
| 首页 | `GET /categories`、`GET /merchants` |
| 商家列表 | `GET /merchants` |
| 商家详情 | `GET /merchants/:id`、`GET /merchants/:id/products`、`POST /cart/items` |
| 购物车 | `GET /cart`、`PATCH /cart/items/:id`、`DELETE /cart/items/:id`、`DELETE /cart` |
| 确认订单 | `GET /addresses`、`GET /cart`、`POST /orders`（Idempotency-Key） |
| 订单列表 | `GET /orders`、`POST /orders/:id/cancel` |
| 订单详情 | `GET /orders/:id` |
| 我的 | `GET /auth/me` |
| 地址管理 | `GET/POST/PUT/DELETE /addresses`、`PATCH /addresses/:id/default` |

---

## 四、视觉与体验规范（沿用 Web 蓝白主视觉）

| 项 | 规范 |
| --- | --- |
| 主色 | `#1769aa`，辅助渐变 `#1769aa → #4e9fdf` |
| 背景 | 页面 `#f5f8fb`，卡片 `#ffffff`，圆角 16rpx–24rpx |
| 文字 | 主文本 `#1f2d3d`，次文本 `#7a8b9a`，价格强调 `#e8543f` |
| 校园元素 | 顶部定位「重庆外语外事学院」、首页校园 Banner、地址使用「校区/楼栋/房间」结构 |
| 交互反馈 | 加载骨架、下拉刷新、触底加载、Toast、确认弹窗、空态插画 |
| 适老化 | 字号不小于 24rpx，按钮点击区域不小于 88rpx 高 |
