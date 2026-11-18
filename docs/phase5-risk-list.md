# 第五阶段 · 学生端开发风险清单

> 依据实际代码与配置检查结果整理。等级：P0（阻塞）/ P1（高）/ P2（中）/ P3（低）。
> 本次仅规划，未修改任何代码与配置。

---

## 一、需要你提供 / 确认的配置信息

| # | 项目 | 当前状态 | 需要你做什么 |
| --- | --- | --- | --- |
| 1 | 微信小程序 **AppID** | 仓库中不存在（无 `manifest.json`、`project.config.json`） | 在微信公众平台注册小程序后，将 AppID 填入 `miniapp/manifest.json` 的 `mp-weixin.appid`。AppID 不是密钥，可提供 |
| 2 | 微信 **AppSecret** | `server/.env` 中 `WECHAT_SECRET` 为空 | **请你自己**在 `server/.env` 本地填写，**不要发给 AI、不要提交 Git**。后端只从环境变量读取 |
| 3 | 微信开发者工具 | 无法从仓库判断是否安装 | 安装并登录微信开发者工具，导入 `miniapp/dist/dev/mp-weixin` 目录 |
| 4 | 合法请求域名 | 未配置 | 小程序后台「开发管理 → 服务器域名」配置 `request` 合法域名；**必须 HTTPS**，生产域名需备案。本地联调可在开发者工具勾选「不校验合法域名」 |
| 5 | 图片域名 | 商品/商家图片在库中为相对路径 `/images/...` | 小程序 `<image>` 需完整 HTTPS 地址：需把 `static/images` 部署到 HTTPS 静态站点，或打包进小程序 `static/`（注意主包 2MB 限制） |
| 6 | 生产环境 API 地址 | 仅 `.env.development` 指向 `http://localhost:3000` | 上线前需准备 HTTPS 域名并在小程序端配置；本地开发用内网 IP/域名联调 |
| 7 | 是否使用 TS | 现有项目为纯 JS | 建议小程序新工程用 TypeScript；若希望统一 JS 也可，需你确认 |

> 当前 `server/.env` 中 `WECHAT_APPID` 为空，因此 `/auth/wx-login` 直接返回 501，**不存在伪造登录**。

---

## 二、P0 阻塞项（不解决无法完成学生端登录）

| # | 风险 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P0-1 | 微信登录未实现 | [auth.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/auth/auth.service.js#L149-L167)：`wxLogin` 恒返回 501，`code2Session` 为 TODO | 学生端无法真实登录，只能用开发态 `test-login` | 先实现 `code2Session` + 按 openid upsert + 签发 JWT；未配置时保持 501 |
| P0-2 | 缺少 AppID / 合法域名 | 仓库无小程序配置 | 无法真机预览与真机登录 | 按上表 1、3、4 准备 |

---

## 三、P1 高优先级

| # | 风险 | 证据 | 影响 | 建议 |
| --- | --- | --- | --- | --- |
| P1-1 | 取消订单并发竞态 | `order.service.js` 的 `cancelOrder` 仍是“先读状态 → 无条件 update → 恢复库存” | 并发重复取消可能重复回补库存（与修复前拒单同类） | 用与 `performReject` 相同的条件更新 + `count===1` 校验 + 同事务 |
| P1-2 | 「配送中」Tab 无数据来源 | `DELIVERING` 枚举存在，但无任何接口推进到该状态 | 订单页「配送中」长期为空 | 规划配送流转接口（商家/骑手）；在此之前该 Tab 可先隐藏或标注“即将开放” |
| P1-3 | 订单列表状态仅支持单值 | `GET /orders?status=` 直接赋给 Prisma where | 「待处理」= PENDING + PREPARING 需发两次请求 | 后端支持多值筛选，或前端合并两次结果 |
| P1-4 | JWT 2 小时过期且无刷新接口 | 仅有 `JWT_REFRESH_SECRET` 配置，无 `/auth/refresh` 路由 | 用户使用中途掉登录 | 小程序静默重新 `wx.login` 换取 token；或后续补 refresh |
| P1-5 | 下单幂等键使用不当 | 需要前端生成 UUID 并在重试复用 | 每次重试新键 → 重复订单风险回归 | 在确认订单页进入时生成一次 UUID；提交失败重试复用；成功或主动离开后丢弃 |
| P1-6 | 现有学生端页面为本地 mock | `src/data/*`、`src/utils/*` 使用 localStorage | 不能直接复制到小程序 | 小程序页面必须重新对接真实 API（见 `phase5-api-checklist.md`） |

---

## 四、P2 中优先级

| # | 风险 | 说明 | 建议 |
| --- | --- | --- | --- |
| P2-1 | 商品/商家图片为相对路径 | 数据库中 `imageUrl` 形如 `/images/dishes/x.jpg` | 小程序端做 URL 拼接，或后端返回绝对地址；域名需 HTTPS |
| P2-2 | 商品列表无分页 | `GET /merchants/:id/products` 返回数组 | 单商家商品量可控；若后续增大再补分页 |
| P2-3 | 无全局商品搜索 / 推荐接口 | 仅商家名与单商家内商品搜索 | 首页推荐先用商家排序占位，后续补接口 |
| P2-4 | 无头像上传接口 | `PATCH /auth/me` 只接受 URL 字符串 | 先用微信头像临时路径；正式方案需对象存储 |
| P2-5 | 项目不是独立 Git 仓库 | `git rev-parse --show-toplevel` = `C:/Users/SXY` | 开发前在项目根 `git init`（本次未执行） |
| P2-6 | 技术栈差异（Web → 小程序） | vue-router Hash、lucide SVG、localStorage、px | 小程序独立工程，使用 `pages.json`、PNG/iconfont、`uni.setStorageSync`、`rpx` |
| P2-7 | 主包体积限制 | 微信主包 2MB | 图片放 CDN/分包，避免打包大量图片 |
| P2-8 | 金额单位 | 后端全为整数分 | 前端统一格式化（分/100），禁止浮点累加 |

---

## 五、P3 低优先级

| # | 风险 | 说明 |
| --- | --- | --- |
| P3-1 | 并发接单仍可能双 200 | 目标状态一致、无数据错误；未在本次修复范围 |
| P3-2 | 幂等记录无 TTL | `checkout_requests` 会随下单量增长，建议后续按时间清理 |
| P3-3 | 微信登录需隐私合规 | 新版小程序获取头像/昵称需用户授权与隐私协议 |
| P3-4 | 评价创建接口缺失 | 当前仅能查看评价 |
| P3-5 | 跨端样式差异 | 小程序不支持部分 CSS（如 `position: sticky` 兼容性），需实测 |

---

## 六、安全与合规红线（开发时须遵守）

1. **AppSecret 只存后端 `.env`**，不得写入小程序代码、不得提交 Git、不得发给 AI。
2. **不得伪造微信登录**：未配置或 `code2Session` 失败时必须返回错误，不能返回假 token。
3. **不得把 JWT 写入日志**；小程序端 token 存 `uni.setStorageSync`，退出即清除。
4. **不接入真实微信支付**（`PAYMENT_MODE=disabled`），本阶段所有支付入口保持只读或提示“暂未开通”。
5. 管理后台与学生端共用同一后端，**不得绕过 ADMIN 权限**；学生端不调用 `/admin/*`。
6. 订单提交必须携带 `Idempotency-Key`；对 `409/5003` 不得盲目重试新键。
7. 测试数据不得写入演示商家/商品的持久化状态；如需造数必须可清理（沿用现有 `tests/helpers.js` 模式）。

---

## 七、建议的开发顺序（下一项任务参考）

1. 后端：实现 `wx-login`（code2Session + openid upsert + JWT），补 `cancelOrder` 并发修复（可选同批）。
2. 初始化 `miniapp/`（uni-app + Vue 3 + TS + Pinia），封装 `uni.request` 与统一错误处理。
3. 登录态与 TabBar 骨架 → 首页/商家列表/商家详情（纯读接口，风险最低）。
4. 购物车 → 地址管理 → 确认订单（幂等键）→ 订单列表/详情 → 我的。
5. 联调：真机 + 开发者工具，验证合法域名、登录、下单幂等、取消订单。
6. 最后再考虑配送/评价/支付等缺失能力。

> 本次仅完成前置检查与规划，未创建小程序工程、未修改任何代码或数据库，未进入下一项任务。
