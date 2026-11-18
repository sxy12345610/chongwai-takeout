# 第四阶段遗留问题修复报告：订单幂等性与并发安全

> 范围：仅修复验收发现的两个问题（订单重复提交、并发拒单重复回补库存），并补充真实 PostgreSQL 测试。
> 未进入第五阶段，未部署，未接入真实支付。
> 环境：Express + Prisma + PostgreSQL（本地 `chongwai_takeout` 库），测试为真实数据库读写（无 mock）。

---

## 一、修改文件清单

### 后端代码

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [server/prisma/schema.prisma](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/prisma/schema.prisma) | 修改 | 新增 `CheckoutRequest` 模型；`User` 增加 `checkoutRequests` 关系 |
| [server/prisma/migrations/20261119020000_checkout_idempotency/migration.sql](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/prisma/migrations/20261119020000_checkout_idempotency/migration.sql) | 新增 | 建 `checkout_requests` 表、唯一索引、外键 |
| [server/src/modules/order/order.service.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order.service.js) | 修改 | 订单创建支持 `Idempotency-Key`；抽出 `createOrderSet` 复用同一事务；重放与冲突处理 |
| [server/src/modules/order/order.routes.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order.routes.js) | 修改 | 读取 `Idempotency-Key` 请求头并传给 service |
| [server/src/modules/order/order-actions.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/src/modules/order/order-actions.js) | 修改 | 拒单改为条件更新 + 受影响行数校验，状态/原因/库存同事务 |

### 测试与测试基建

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| [server/tests/order-idempotency.test.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/tests/order-idempotency.test.js) | 新增 | A–I 共 9 个真实数据库用例 |
| [server/tests/helpers.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/tests/helpers.js) | 修改 | `cleanupUsers` 同步清理 `checkout_requests` |
| [server/tests/global-setup.js](file:///C:/Users/SXY/Desktop/chongwai-takeout/chongwai-takeout/server/tests/global-setup.js) | 修改 | 测试前后同时快照/恢复 `stock` 与 `monthlySales`，避免月售被测试累计污染 |

> 前端未改动：当前学生端（C 端）仍为本地模拟数据，尚未真实调用 `POST /orders`；本次无真实下单客户端可接入幂等键。API 已支持该请求头，接入 C 端时需生成并携带。

---

## 二、是否修改 Prisma schema

**是，仅新增，不改动既有表/列，不删除任何数据。**

- 新增模型 `CheckoutRequest`（表 `checkout_requests`）：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID PK | 主键 |
| `user_id` | UUID | 提交人（FK → users，ON DELETE CASCADE） |
| `idempotency_key` | VARCHAR(80) | 客户端幂等键 |
| `request_hash` | VARCHAR(64) | 请求内容 SHA-256 指纹（addressId + note） |
| `checkout_group_no` | VARCHAR(32) | 本次结算组号（多商家拆单共享） |
| `created_at` | TIMESTAMP | 创建时间 |

- 约束：`UNIQUE (user_id, idempotency_key)`、`INDEX (checkout_group_no)`。

> 未在 `orders` 表新增列，未改动订单表结构与既有约束（`orders_amount_check` 等保持原样）。

---

## 三、数据库迁移内容

迁移目录：`20261119020000_checkout_idempotency`，已通过 `prisma migrate deploy` 应用（迁移状态：3 个迁移全部已应用）。

```sql
CREATE TABLE "checkout_requests" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
  "request_hash" VARCHAR(64) NOT NULL,
  "checkout_group_no" VARCHAR(32) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "checkout_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "checkout_requests_checkout_group_no_idx" ON "checkout_requests"("checkout_group_no");
CREATE UNIQUE INDEX "checkout_requests_user_id_idempotency_key_key"
  ON "checkout_requests"("user_id", "idempotency_key");
ALTER TABLE "checkout_requests"
  ADD CONSTRAINT "checkout_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 四、幂等机制实现方式

1. **客户端携带**：`POST /api/v1/orders` 读取 `Idempotency-Key` 请求头（8–80 字符，非法长度返回 400）。
2. **请求指纹**：对 `{ addressId, note }` 做 SHA-256，作为“请求内容”标识；同一键不同指纹 → **409**（`code=5003`），不建单、不扣库存。
3. **原子抢占**：开启交互式事务，**第一步写入 `checkout_requests`**，依赖 `UNIQUE(user_id, idempotency_key)` 保证并发下只有一个事务能插入成功。
4. **并发等待与重复读取**：
   - 第二个并发请求的 INSERT 会在唯一索引上等待首个事务提交/回滚；
   - 首个提交后，第二个收到 `P2002`，事务整体回滚（不产生订单/库存变更），随后读取已提交的幂等记录并**重放首次结果**（按 `checkout_group_no` 查回订单，返回 `replayed: true`）；
   - 首个回滚时，第二个 INSERT 成功，正常执行结算。
5. **多商家拆单**：一条幂等记录对应一个 `checkout_group_no`；同一购物车拆出的所有商家订单共享该组号，作为一次完整结算，重放时整组返回。
6. **事务失败**：幂等记录、库存扣减、订单写入、购物车清空全部在同一事务内；任一步失败整体回滚，**不留下幂等记录、半套订单或半扣库存**（实测见测试 H）。
7. **向后兼容**：未携带 `Idempotency-Key` 的请求按原逻辑执行（每次均为独立结算），保证既有接口与旧测试不受影响。

---

## 五、并发拒单修复方式

`performReject`（商家端与平台管理员端共用）改为：

1. 事务内执行条件更新：
   `UPDATE orders SET status='CANCELLED', cancelled_at=now(), cancel_reason=? WHERE id=? AND status='PENDING'`
2. 校验受影响行数：`count !== 1` 立即抛 `409`（`code=5002`）并回滚；
3. **只有成功将 PENDING 转为 CANCELLED 的请求**才继续在同一事务内按明细回补库存；
4. 状态、拒单原因、库存回补处于同一事务，异常一起回滚；
5. 第二个并发请求更新 0 行 → 409，既不恢复库存，也不会覆盖第一次的 `cancel_reason`。

---

## 六、测试结果（真实 PostgreSQL）

命令：`cd server && npm test`（vitest，真实数据库，无 mock）。

| 用例 | 内容 | 结果 | 证据 |
| --- | --- | --- | --- |
| A | 相同幂等键并发提交两次 | ✅ | 两次均 200，仅 1 笔订单、同一 `checkoutGroupNo`，恰好 1 次 `replayed=true`，库存 -1 |
| B | 相同幂等键串行重复提交 | ✅ | 第二次 200 `replayed=true`，返回同一订单 ID，订单数不变，库存不再扣减 |
| C | 相同幂等键但请求内容不同 | ✅ | 第二次 409（`code=5003`），订单数与库存均未变化 |
| D | 同一订单并发拒单两次 | ✅ | `[200, 409]`，库存只 +1，状态 CANCELLED，`cancelReason` 保留成功那一次，未被覆盖 |
| E | 拒单事务中途异常 | ✅ | 库存置 `int4` 上限触发真实数据库溢出错误 → 接口 500；订单仍 `PENDING`、`cancelReason=null`、`cancelledAt=null`、库存保持原值（整体回滚） |
| F | 不同用户 / 不同幂等键下单 | ✅ | 两笔订单互不相同，库存 -2，各自订单数正确 |
| G | 多商家购物车并发提交 | ✅ | 两次 200，均返回 2 笔订单且同一组号；库中该组恰 2 笔；两商家库存各只扣一次（-2 / -1） |
| H | 下单事务失败后同键重试 | ✅ | 首次 409（库存不足），`checkout_requests` 无残留；恢复库存后同键重试 200 且正常扣库存 |
| I | 商家原状态机回归 | ✅ | 接单→完成正常，已完成再拒单 409 |

**汇总：9/9 通过。**

补充在线冒烟（重启后端后，真实 HTTP + 真实库）：

```
并发同键: 200 200 | 订单数 1 | replayed undefined/true
库存扣减: 100 -> 99
串行重放: 200 | 同订单 true | replayed true
同键不同内容: 409 code 5003
并发拒单: 200 409 | 库存 98 -> 99（期望 +1）| 状态 CANCELLED | 原因 冒烟甲
清理后: users=1 orders=0 checkout_requests=0
```

---

## 七、原有测试回归结果

- 后端全量：**6 个测试文件 / 22 个用例全部通过**。
  - 原有 13 项（auth 3、order 4、merchant 2、address 2、cart 2）**全部继续通过**，未删除或修改任何原有测试。
  - 新增 9 项幂等/并发用例全部通过。
- 前端 `npm run build`：**通过**（vite build，1866 modules，产物正常）。
- 状态机：商家接单/拒单/完成行为不变（测试 I 与原 merchant.test.js 均通过）。
- 权限：未改动认证/鉴权中间件与 admin 路由守卫，管理员接口仍统一 `authenticate + requireRole('ADMIN')`。

---

## 八、数据完整性检查结果

测试结束后核对（真实库）：

```
users=1（仅 admin001） orders=0 checkout_requests=0 products=36 softDeleted=0
示例商品「火腿炒河粉」：priceCents=1580 stock=100 isAvailable=true monthlySales=436（与基线一致）
```

- 测试用户、地址、购物车、订单、幂等记录均已清理（`cleanupUsers` 同步删除 `checkout_requests`）。
- 库存：测试基建在用例前后快照/恢复。
- 月售：本次修复前的测试会累计 `monthlySales`（历史遗留副作用）。已按 `prisma/seed-data.json` 将 4 个产生漂移的演示商品月售恢复为种子基线：
  川味担担面 873→856、茉莉奶绿 754→752、满杯百香果 640→638、冻柠茶 546→496；并把 `monthlySales` 纳入 `global-setup` 的快照/恢复，后续测试不再污染。
- 原有业务数据（商家、商品、分类、管理员）未被删除或结构修改。

---

## 九、尚未解决的问题

1. **未携带 `Idempotency-Key` 的调用方仍无幂等保护**：为保持向后兼容，缺省时按原逻辑执行。C 端接入真实下单时必须在重试/重复点击场景复用同一 UUID。
2. **学生端（C 端）仍为本地模拟**：本次未修改前端；接入时需在 `POST /orders` 携带幂等键。
3. **用户主动取消订单 `cancelOrder` 仍为“先校验后无条件更新”**：与修复前拒单同类，理论上并发重复取消可能重复回补库存。本次按任务范围只修复“拒单”，未改动该路径；建议下一阶段用相同条件更新模式统一处理。
4. **幂等记录无 TTL/归档**：表会随下单量增长，建议后续增加按时间的清理策略。
5. **并发接单**：两次并发 `accept` 仍可能都返回 200（目标状态一致、无数据错误、无重复副作用），未纳入本次修复范围。
6. 幂等键作用域为「用户级」：不同用户使用相同键互不影响（符合预期）。

---

> 本次仅修复与测试，未进入第五阶段、未部署、未接入真实支付。修复过程中仅调整过一次测试断言（并发场景下重放方不确定），业务代码一次通过，未触发两轮上限。
