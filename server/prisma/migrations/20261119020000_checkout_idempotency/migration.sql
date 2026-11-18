-- 结算幂等表：一次提交订单对应一行，(user_id, idempotency_key) 唯一。
-- 仅新增表与索引，不修改/删除任何既有表或数据。

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

CREATE UNIQUE INDEX "checkout_requests_user_id_idempotency_key_key" ON "checkout_requests"("user_id", "idempotency_key");

ALTER TABLE "checkout_requests"
  ADD CONSTRAINT "checkout_requests_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
