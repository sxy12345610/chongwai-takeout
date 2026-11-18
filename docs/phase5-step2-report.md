# 第五阶段 · 第 2 项交付报告：首页 UI 与真实数据接入

> 本次仅开发学生端首页并接入真实后端接口；未开发购物车/订单/支付，未修改 Web 管理后台、后端业务代码与数据库结构，AppID 未改动。

---

## 一、修改与新增文件

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [miniapp/src/pages/index/index.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/pages/index/index.vue) | 重写 | 首页 UI：校园头部、搜索、分类、推荐商家、加载/错误/空态、下拉刷新 |
| [miniapp/src/api/catalog.ts](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/api/catalog.ts) | 新增 | `getCategories()`、`listMerchants()`，统一走 `request.ts` |
| [miniapp/src/types/catalog.ts](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/types/catalog.ts) | 新增 | Category / Merchant / PageResult 类型，字段与后端一一对应 |
| [miniapp/src/utils/display.ts](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/utils/display.ts) | 新增 | 金额（分→元）、评分、月售、配送信息格式化；商家图片路径映射 |
| [miniapp/src/components/MerchantCard.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/components/MerchantCard.vue) | 新增 | 统一商家卡片（图片/首字兜底、营业状态、评分、起送、配送） |
| [miniapp/src/pages.json](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/pages.json#L4-L9) | 修改 | 首页开启 `enablePullDownRefresh` |
| `miniapp/src/static/shops/*.jpg` | 新增（6 张） | 从 `public/images/shops/` 复制的真实商家图片，用于小程序本地展示 |

未修改：`pages/merchant/*`、`pages/cart/*`、`pages/order/*`、`pages/user/*`、`pages/address/*`、`App.vue` 全局主题、`request.ts`（沿用上次加固的超时逻辑）、AppID、后端与数据库。

---

## 二、首页实现的功能

1. **顶部校园区域**：蓝色渐变，「重外校园外卖」+「重庆外语外事学院 · 校园专送」+「学生端」标识，高度克制。
2. **搜索区域**：输入框 + 清空 × + 搜索按钮；`confirm-type=search`；按下后调用真实商家接口按名称搜索；下方明确提示「菜品搜索待后续接口支持」。
3. **商品分类**：调用真实 `GET /categories`，4 列网格；无图标资源时使用分类名首字的统一圆形占位；点击跳转商家列表并携带 `categoryKey` 与 `categoryName`。
4. **校园推荐**：调用真实 `GET /merchants`，展示名称、真实图片、评分、月售、配送时长、起送价、配送费、营业状态、标签；点击进入商家详情并携带 `id`。
5. **状态处理**：
   - 加载中：分类与商家骨架屏，避免大面积空白；
   - 失败：显示后端返回的具体错误信息 + 「重新加载」按钮；
   - 空数据：分类「暂无分类数据」、商家「暂无营业中的商家」、搜索「没有找到匹配的商家」；
   - 支持下拉刷新（用户主动触发，不会自动重复请求）。
6. **底部导航**：沿用原生 TabBar 四项（首页/商家/购物车/我的），点击可切换（`pages.json` 中已注册对应页面）。
7. **重复请求控制**：首页仅在 `onLoad` 请求一次；搜索/清空/重试/下拉刷新才再次请求；无 `onShow` 重复拉取。

---

## 三、实际调用的后端接口

| 接口 | 方法 | 参数 | 用途 |
| --- | --- | --- | --- |
| `/api/v1/categories` | GET | 无 | 分类网格 |
| `/api/v1/merchants` | GET | `keyword?`、`page=1`、`pageSize=20` | 推荐商家 / 搜索 |
| `/api/v1/merchants` | GET | `categoryKey?`（由分类点击传给商家列表页） | 分类筛选（列表页尚未消费该参数） |

请求链路：页面 → `api/catalog.ts` → `api/request.ts` → `uni.request`，baseURL 由 `.env.production` 注入为 `http://localhost:3000/api/v1`，超时 15000ms，未关闭超时机制。

### 真实返回字段（实测）

分类（数组元素）：

```
id, key, name, sortOrder
```

商家（`data.list[]`）：

```
id, name, description, announcement, categoryLabel, tags[],
minOrderCents, deliveryFeeCents, deliveryTimeMin, isOpen,
rating, monthlySales, imageUrl, coverFrom, coverTo
```

分页结构：`{ list, page, pageSize, total }`。

页面只展示上述已有字段，未编造评分、销量或标签。

### 实测数据（本机真实库）

- 分类共 7 个：`chinese 中式快餐`、`snack 特色小吃`、`drink 奶茶饮品`、`western 西式美食`、`fruit 水果轻食`、`noodle 特色面食`、`dessert 甜品蛋糕`。
- `categoryKey=chinese` → 1 家「重外美食食堂」。
- `keyword=茶` → 1 家「茶饮小站」。
- `pageSize=20` 的商家列表正常返回，字段与类型定义一致。

---

## 四、图片处理说明

后端 `imageUrl` 为相对路径（如 `/images/shops/tea-station.jpg`），且 Express 未提供静态图片服务。处理方式：

1. 已将 `public/images/shops/` 下 6 张真实商家图片复制到 `miniapp/src/static/shops/`；
2. 前端按文件名映射为 `/static/shops/<文件名>`；
3. 若后端返回 `http(s)` 绝对地址则原样使用；
4. 图片加载失败或为空时，回退为商家名首字 + 渐变底色，不出现破图。

未拼接任何猜测的图片域名。

---

## 五、构建与运行结果

| 项 | 结果 |
| --- | --- |
| 构建命令 | `cd miniapp && npm run build:mp-weixin` |
| 构建结果 | ✅ `DONE Build complete.`（编译器 5.34 / vue3） |
| 产物检查 | `pages/index/index.{js,json,wxml,wxss}` 已生成；页面 JSON 含 `enablePullDownRefresh: true` |
| API 打包检查 | 产物 `api/catalog.js` 中 `/categories`、`/merchants` 正确；`api/request.js` 中 baseURL 为 `http://localhost:3000/api/v1`，`timeout=15000` |
| 静态资源 | `dist/build/mp-weixin/static/shops/` 6 张图片全部复制成功 |
| 主包体积 | 约 **0.97MB**（低于微信主包 2MB 限制） |
| AppID | `wx92612cc326e51c60`，未改动 |
| 微信开发者工具自动重编译 | ❌ 未能由本机命令触发（开发者工具 CLI 受 `EPERM` 用户数据目录权限限制），需你在工具中点击「编译」 |

> 说明：本次无法通过命令行操作微信开发者工具，因此「分类真实显示、商家真实显示、卡片跳转、四个 Tab」需要在工具中点击编译后人工确认；接口返回与编译产物已逐项核对。请求失败/重试逻辑已实现，可在工具中「清缓存 → 停后端」验证错误态。

---

## 六、尚未实现的功能

1. **菜品级搜索**：后端只有商家名 `keyword` 搜索，没有全局菜品搜索接口；首页已明确提示。
2. **分类跳转后的筛选**：已传 `categoryKey`，但商家列表页仍为骨架，尚未消费该参数。
3. **商家详情页**：仍是骨架，点击卡片能跳转并携带 `id`，但未展示真实商家/商品。
4. **分页加载更多**：首页一次取 20 家，未做触底加载（总商家 6 家，当前不触发）。
5. **定位/校区切换**：暂无定位接口，固定展示学校名称。
6. 购物车、订单、支付、微信登录：按要求未开发。

---

## 七、新增错误与警告

- 构建过程：**无新增错误、无新增警告**。
- 运行期观察：本次未引入 `Error: timeout`；此前该错误已确认非业务请求来源，本次未修改基础库或全局请求机制。
- 已知限制：开发者工具未登录时，其自身日志仍会报 `access_token missing`，与本首页代码无关。

---

> 本次到此停止，未开发购物车、订单与支付功能，等待下一步指令。
