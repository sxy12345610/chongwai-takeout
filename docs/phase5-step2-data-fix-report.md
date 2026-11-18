# 第五阶段 · 第 2 项数据异常修复报告

> 本次仅修复首页/商家页数据显示问题，未改动数据库结构、AppID、后端业务代码与 Web 管理后台，未使用 Mock 数据。

---

## 一、具体原因

分两类问题，均已用代码与构建产物取证：

### 1. 商家列表页：**此前确实没有实现**（真实代码缺陷）

修复前 [pages/merchant/list.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/pages/merchant/list.vue) 只有静态骨架：

- 「全部 / 营业中」只是文字，没有点击处理；
- 没有调用 `GET /merchants`；
- 页面写着「商家数据将来自 GET /merchants，当前为页面骨架」。

所以商家页显示旧占位是**代码原因**，不是缓存。

### 2. 首页：**你运行的是旧构建产物**（非代码原因）

实测证据：

| 检查 | 结果 |
| --- | --- |
| 全仓库检索旧文案「分类数据来自 /categories」「推荐商家将在接入商家列表接口后展示」 | **只命中修复前的商家列表页**，首页源码中已不存在 |
| 编译产物 `dist/build/mp-weixin/pages/index/index.js` 与 `.wxml` | `old=false`（无旧文案），`new=true`（含「校园推荐 / 商品分类」） |
| 产物时间 | `index.js` 与 `api/catalog.js` 均为本次构建时间（02:42） |
| 是否有多份 miniapp 副本 | 桌面仅存在 `...\chongwai-takeout\chongwai-takeout\miniapp` 一份 |

结论：首页源码与最新产物都是新版本；微信开发者工具中看到旧首页，是因为它加载的是**第 1 项任务的旧构建**（或未重新编译/未重新导入最新 `dist/build/mp-weixin`）。旧占位文案是第 1 项骨架版本的产物。

---

## 二、修改文件

| 文件 | 修改内容 |
| --- | --- |
| [miniapp/src/pages/merchant/list.vue](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/pages/merchant/list.vue) | 重写为真实商家列表：调用 `GET /merchants`、全部/营业中筛选、分类参数、分页、下拉刷新、加载/错误/空态 |
| [miniapp/src/pages.json](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/pages.json#L10-L18) | 商家列表开启 `enablePullDownRefresh` |

首页 `index.vue` **未修改**（已核对为正确的真实接口实现）。

---

## 三、真实请求结果（本机后端 + PostgreSQL）

### 分类：`GET /api/v1/categories`

实测返回 7 个：

| key | name |
| --- | --- |
| chinese | 中式快餐 |
| snack | 特色小吃 |
| drink | 奶茶饮品 |
| western | 西式美食 |
| fruit | 水果轻食 |
| noodle | 特色面食 |
| dessert | 甜品蛋糕 |

### 商家：`GET /api/v1/merchants?page=1&pageSize=20`

实测 `total=6`：茶饮小站、重外美食食堂、川味小厨、快乐汉堡、深夜小吃、甜心水果，均 `isOpen=true`。

### 筛选参数验证

| 请求 | 结果 | 说明 |
| --- | --- | --- |
| `?isOpen=false` | `total=0` | 证明 `isOpen` 参数被后端真实执行 |
| `?isOpen=true` | `total=6` | 与「全部」相同，因为当前 6 家全部营业，界面看起来一致属正常 |
| `?categoryKey=drink` | 1 家「茶饮小站」 | 证明分类参数名与后端一致（是 `categoryKey`，不是 id） |
| `?keyword=茶` | 1 家「茶饮小站」 | 商家名搜索可用 |

> 注意：后端只识别 `categoryKey`，首页点击分类时传递的就是 `categoryKey`（已在上一项实现），商家列表页现已消费该参数。

---

## 四、请求配置核对

| 项 | 实际值 |
| --- | --- |
| 小程序构建 baseURL | 编译产物 `api/request.js` 中为 `http://localhost:3000/api/v1`（来自 `.env.production`） |
| 超时 | `15000ms`，未关闭 |
| 响应解包 | 后端 `{ code, message, data, traceId }`；`code===0` 时取 `data`，否则抛错 |
| 失败处理 | 首页/商家页均捕获并展示错误文案 + 「重新加载」按钮，无静默吞错 |
| 重复请求 | 首页仅 `onLoad` 一次；列表页 `onLoad` 一次，切换筛选/重试/下拉/触底才再次请求，并用请求序号丢弃过期响应 |
| localhost 可达性 | 本机 Node 实测 `/categories`、`/merchants` 均 200；开发者工具与后端同机，需保持 `urlCheck=false`（项目已配置） |

---

## 五、构建验证结果

| 项 | 结果 |
| --- | --- |
| 构建命令 | `cd miniapp && npm run build:mp-weixin` |
| 构建结果 | ✅ `DONE Build complete.`（02:42） |
| 首页产物 | 无旧占位文案，含「校园推荐 / 商品分类」 |
| 商家列表产物 | `listMerchants=true`、`onLoad=true`、`onReachBottom=true`；WXML 含「全部 / 营业中 / 骨架屏」 |
| 商家列表页配置 | `enablePullDownRefresh: true` |
| 静态图片 | `static/shops/` 6 张真实图片存在 |
| 主包体积 | 约 **0.97MB** |
| AppID | `wx92612cc326e51c60`，未改动 |

---

## 六、请在开发者工具中这样重新加载（关键）

命令行无法直接操作你的开发者工具（此前 CLI 因用户数据目录权限 `EPERM` 被拒），请手动执行：

1. 确认开发者工具标题栏中的项目路径是：
   `C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\miniapp\dist\build\mp-weixin`
   （不是 `miniapp` 根目录、也不是旧副本）
2. 点击工具栏「编译」；
3. 若仍显示旧内容：菜单「工具 → 清除缓存 → 全部清除」，然后再次「编译」；
4. 仍不行：关闭项目 → 「导入项目」重新选择上述目录；
5. 确认后端在运行（`http://localhost:3000/api/v1/categories` 可访问），并在「详情 → 本地设置」勾选「不校验合法域名」。

判断是否为新版本：

- 新首页：蓝色渐变头部 + 搜索框 + 7 个分类圆形图标 + 商家卡片；
- 旧版本：卡片里直接写着「分类数据来自 /categories」；
- 若后端未启动，新版本应显示「首页加载失败」和「重新加载」按钮，而不是旧文案。

---

## 七、验收项状态

| 验收项 | 状态 |
| --- | --- |
| 首页显示真实 7 个分类 | 接口与产物已验证；界面需你按第六节重新编译后确认 |
| 首页显示真实商家 | 接口与产物已验证（6 家）；同上 |
| 商家页显示真实商家列表 | 已实现并构建；同上 |
| 营业中筛选有效 | 已实现；后端 `isOpen=false` 返回 0、`isOpen=true` 返回 6，证明筛选真实生效 |
| 请求失败显示错误与重试 | 已实现（首页、商家列表均有错误卡片 +「重新加载」） |

> 受环境权限限制，无法由我自动操控微信开发者工具做最终肉眼确认；以上「已验证」指代码、编译产物和真实接口响应，不含 GUI 截图。

---

## 八、遗留问题

1. 当前 6 家商家全部营业，「全部」与「营业中」结果相同；可用后台把某商家设为停业后再验证差异。
2. 商家详情页仍是骨架（点击卡片可跳转并携带 `id`）。
3. 菜品级搜索仍无后端接口，首页已提示。
4. 首页/列表页图片使用本地 `static/shops` 映射；若后续新增商家图片，需要同步复制图片或改为 CDN 地址。

> 本次到此停止，未开发购物车、订单与支付功能。
