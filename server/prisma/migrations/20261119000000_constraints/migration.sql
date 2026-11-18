-- 数据库级约束：Prisma Schema 无法表达，按 docs/database.md 4.6 / 4.8 用原生 SQL 补充

-- 1. 默认地址唯一：每个用户最多只能有一个默认收货地址（部分唯一索引）
CREATE UNIQUE INDEX "addresses_one_default_per_user"
  ON "addresses" ("user_id")
  WHERE "is_default" = true;

-- 2. 订单金额校验：应付 = 小计 + 配送费 - 优惠，且各项均不为负
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amount_check"
  CHECK (
    "subtotal_cents" >= 0
    AND "delivery_fee_cents" >= 0
    AND "discount_cents" >= 0
    AND "total_cents" = "subtotal_cents" + "delivery_fee_cents" - "discount_cents"
  );
