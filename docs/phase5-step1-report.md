# 第五阶段 · 第 1 项交付报告：uni-app 微信小程序工程

> 本次仅创建独立小程序工程与页面骨架，未实现真实业务、未接入支付、未部署。
> 未修改 `src/`、`server/`、`docs/` 既有内容，未修改数据库与后端代码，未执行 `git init`。

---

## 一、操作前检查结果

| 项 | 结果 |
| --- | --- |
| 项目真实根目录 | `C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\`（双层同名，内层为项目根） |
| Git 根目录 | `git rev-parse --show-toplevel` = `C:/Users/SXY`，与上次一致；项目本身不是独立仓库 |
| 是否执行 git init | **否**（按要求） |
| 既有 `src/` / `server/` / `docs/` | 未删除、未移动、未重命名、未修改 |
| Node / npm | Node 24.x / npm 11.x（构建验证通过） |
| 微信开发者工具 | 已安装：`C:\Users\SXY\微信web开发者工具\微信开发者工具.exe`（注册表 `微信开发者工具 2.01.2510290`） |

---

## 二、创建的文件与目录

新增独立目录 `miniapp/`（官方模板 `dcloudio/uni-preset-vue#vite-ts` 脚手架 + 本项目改造）：

```
miniapp/
├── package.json                 # 工程名 chongwai-miniapp，新增 pinia / sass
├── package-lock.json
├── vite.config.ts               # 新增 @ → src 别名
├── tsconfig.json                # 官方模板（TS + @dcloudio/types）
├── index.html
├── .env.development             # VITE_API_BASE_URL=http://localhost:3000/api/v1
├── .gitignore                   # 忽略 node_modules/dist/unpackage/本地私有配置
├── node_modules/                # 已安装（994 packages）
├── dist/build/mp-weixin/        # 构建产物（已生成）
└── src/
    ├── main.ts                  # createSSRApp + Pinia
    ├── App.vue                  # 全局蓝白主题样式 + onLaunch
    ├── uni.scss                 # 主题变量（#1769AA 主色）
    ├── pages.json               # 9 个页面 + 4 个 TabBar
    ├── manifest.json            # 小程序配置（appid 待填写）
    ├── api/request.ts           # 统一请求层骨架（JWT/统一解包/401 清理）
    ├── stores/app.ts            # Pinia 应用状态骨架
    ├── components/PageScaffold.vue  # 页面通用头部 + 卡片布局
    └── pages/
        ├── index/index.vue          # 首页
        ├── merchant/list.vue        # 商家列表
        ├── merchant/detail.vue      # 商家详情
        ├── cart/index.vue           # 购物车
        ├── order/confirm.vue        # 确认订单
        ├── order/list.vue           # 订单列表
        ├── order/detail.vue         # 订单详情
        ├── user/index.vue           # 个人中心
        └── address/list.vue         # 地址管理
```

未创建任何业务数据或 Mock 数据文件。

---

## 三、使用的技术与依赖版本（实测安装结果）

| 依赖 | 版本 |
| --- | --- |
| @dcloudio/uni-app | `3.0.0-5030420261029002`（官方模板锁定版本，编译器 5.34 / vue3） |
| vue | `3.5.45`（模板声明 `^3.4.21`） |
| pinia | `2.3.1`（本次新增，用于登录态/购物车等） |
| sass | `1.77.8`（本次新增，编译 scss 主题） |
| vite | `5.2.8` |
| typescript | `^4.9.4`（官方模板版本） |
| 其他平台包 | uni-mp-weixin / uni-h5 / uni-cli-shared 等，均与 uni-app 同一版本号 |

> 说明：使用官方模板锁定的同版本矩阵，保证 `vite-plugin-uni` 与各平台包相互兼容；仅额外加入 `pinia` 与 `sass`。

---

## 四、AppID 配置位置（已配置并验证）

AppID 已按微信小程序要求配置在：

| 位置 | 字段 | 当前值 | 说明 |
| --- | --- | --- | --- |
| [miniapp/src/manifest.json](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/miniapp/src/manifest.json#L27-L29) | `mp-weixin.appid` | `wx92612cc326e51c60` | 微信构建实际读取此字段 |
| 同文件 | 顶层 `appid` | `""` | DCloud AppID，保持为空（仅云服务需要） |

> 注意：顶层 `appid` 不是微信 AppID，误填不会生效；微信小程序必须以 `mp-weixin.appid` 为准。
> 已重新执行 `npm run build:mp-weixin`，产物 `dist/build/mp-weixin/project.config.json` 中 `"appid": "wx92612cc326e51c60"` 已验证生效。

> **AppSecret 绝不进入 `miniapp`**：只能配置在后端 `server/.env` 的 `WECHAT_SECRET`，由后端调用微信接口使用。本次未写入任何密钥。

---

## 五、构建命令与结果

```bash
cd miniapp
npm install
npm run build:mp-weixin      # 等价于 uni build -p mp-weixin
```

**构建结果：✅ 成功**

```
编译器版本：5.34（vue3）
正在编译中...
DONE  Build complete.
运行方式：打开 微信开发者工具, 导入 dist\build\mp-weixin 运行。
```

产物目录 `miniapp/dist/build/mp-weixin/` 包含 `app.js`、`app.json`、`app.wxss`、`project.config.json`，以及 9 个页面的 `.js/.json/.wxml/.wxss`。

构建过程中修复了两处模板缺失（属工程初始化，不是业务代码）：

1. `App.vue` 仅有 `<style>`，Vue 编译器要求至少 `<script>` 或 `<template>` → 已补 `<script setup>` 与 `onLaunch`。
2. 缺少 SCSS 预处理器 → 已安装 `sass`。

---

## 六、页面路由验证

`dist/build/mp-weixin/app.json` 实测输出：

```json
"pages": [
  "pages/index/index",
  "pages/merchant/list",
  "pages/merchant/detail",
  "pages/cart/index",
  "pages/order/confirm",
  "pages/order/list",
  "pages/order/detail",
  "pages/user/index",
  "pages/address/list"
]
```

- 9 个页面全部注册，且每个页面均生成了 `.js/.json/.wxml/.wxss` 四类产物文件（逐一核对，无缺失）。
- TabBar 4 项：首页 `pages/index/index`、商家 `pages/merchant/list`、购物车 `pages/cart/index`、我的 `pages/user/index`；`selectedColor=#1769AA`，`color=#7A8B9A`，白底。
- 导航栏：蓝底白字 `navigationBarBackgroundColor=#1769AA`，页面背景 `#F5F8FB`。

---

## 七、微信开发者工具打开情况

| 项 | 结果 |
| --- | --- |
| 是否安装 | ✅ 已安装：`C:\Users\SXY\微信web开发者工具\微信开发者工具.exe`，CLI：`C:\Users\SXY\微信web开发者工具\cli.bat` |
| 是否已自动打开编译产物 | ❌ **未成功**（受环境权限限制） |

尝试命令：

```powershell
& 'C:\Users\SXY\微信web开发者工具\cli.bat' open --project 'C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\miniapp\dist\build\mp-weixin'
```

报错（沙箱内外均复现）：

```
Error: EPERM: operation not permitted, mkdir
'C:\Users\SXY\AppData\Local\微信开发者工具\User Data\8506d07dd8152cd1ffb3e3a30cbdf11c'
```

该目录属于微信开发者工具私有用户数据，当前进程无写权限，**未继续尝试任何绕过手段**。请手动打开：

1. 启动「微信开发者工具」，使用你的微信扫码登录。
2. 选择「导入项目」，目录选择：
   `C:\Users\SXY\Desktop\chongwai-takeout\chongwai-takeout\miniapp\dist\build\mp-weixin`
3. AppID 处填写你的小程序 AppID（或先使用测试号预览）。
4. 在「详情 → 本地设置」勾选「不校验合法域名」（本地 `http://localhost:3000` 联调需要）。
5. 依次点击底部 4 个 Tab 与「我的 → 我的订单 / 收货地址」，可验证 9 个页面跳转。

---

## 八、当前遗留问题

1. ~~**AppID 未填写**~~：已配置 `mp-weixin.appid=wx92612cc326e51c60` 并重新构建，产物 `project.config.json` 已生效（不再是 `touristappid`）。
2. **未自动在微信开发者工具中打开**：因 DevTools 用户数据目录写权限受限（EPERM），需你按上文手动导入。
3. **TabBar 暂无图标**：当前为中文文字型 TabBar（微信允许 `iconPath` 省略）；后续可在 `miniapp/src/static/tabbar/` 添加 81×81 PNG 并补充 `iconPath/selectedIconPath`。
4. **页面仅为骨架**：未接入任何真实接口，未使用 Mock 数据；后续按 `docs/phase5-page-plan.md` 逐页对接。
5. **微信登录仍未实现**：后端 `/auth/wx-login` 仍返回 501（见 `docs/phase5-api-checklist.md`），小程序登录需后续任务配合。
6. **本地请求域名**：`urlCheck=false` 仅用于开发；真机/生产需 HTTPS 合法域名并保持 `project.config.json` 的 `urlCheck` 为默认校验。
7. **TypeScript 版本较旧**（模板 4.9）：当前构建不执行类型检查，`npm run type-check`（vue-tsc 1.x）在 Node 24 下可能报兼容问题；后续接入业务时可考虑升级 TS/vue-tsc。
8. **根目录依赖完整性**：`npm install` 时 npm 11 未自动执行部分包的 install scripts（esbuild 等），但本次构建已成功；若后续构建异常，可执行 `npm rebuild esbuild`。

---

> 本次仅完成工程创建、页面骨架、构建验证，未进入下一项任务，未修改 Web 管理后台与 Express 后端，未部署，未接入真实支付。
