<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock,
  MapPin,
  NotebookPen,
  Phone,
  ReceiptText,
  Store,
  Truck,
  User,
  XCircle,
} from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import {
  advanceOrderStatus,
  canCancelOrder,
  cancelOrder,
  formatOrderTime,
  getOrderById,
  getStatusLabel,
  orderStatuses,
} from '@/utils/orders'
import { formatPrice } from '@/utils/format'

const route = useRoute()

const order = computed(() => getOrderById(route.params.id))

const steps = orderStatuses.filter((status) => status.key !== 'cancelled')

const currentStepIndex = computed(() =>
  steps.findIndex((step) => step.key === order.value?.status),
)

const advanceLabels = {
  pending: '模拟商家接单',
  preparing: '模拟开始配送',
  delivering: '模拟确认送达',
}

const advanceLabel = computed(() =>
  advanceLabels[order.value?.status] || '',
)

const itemCount = computed(() =>
  order.value
    ? order.value.items.reduce((total, item) => total + item.quantity, 0)
    : 0,
)

function handleAdvance() {
  if (!order.value) return
  advanceOrderStatus(order.value.id)
}

function handleCancel() {
  if (!order.value) return
  cancelOrder(order.value.id)
}
</script>

<template>
  <div v-if="order" class="page container order-detail">
    <header class="page-head">
      <div>
        <RouterLink to="/orders" class="detail-back">
          <ArrowLeft :size="15" />
          返回订单列表
        </RouterLink>
        <h1 class="page-head__title">订单详情</h1>
        <p class="page-head__desc">
          {{ getStatusLabel(order.status) }} · 共 {{ itemCount }} 件商品
        </p>
      </div>
      <span class="status-tag" :class="`status-tag--${order.status}`">
        {{ getStatusLabel(order.status) }}
      </span>
    </header>

    <section class="card status-card">
      <div v-if="order.status === 'cancelled'" class="cancelled-banner">
        <XCircle :size="18" />
        该订单已取消，取消后不可恢复。
      </div>

      <ol v-else class="status-steps">
        <li
          v-for="(step, index) in steps"
          :key="step.key"
          :class="{
            'is-done': index <= currentStepIndex,
            'is-current': index === currentStepIndex,
          }"
        >
          <span class="status-steps__dot">
            <Check v-if="index < currentStepIndex" :size="11" :stroke-width="3" />
            <i v-else aria-hidden="true"></i>
          </span>
          <span class="status-steps__label">{{ step.label }}</span>
        </li>
      </ol>

      <p class="demo-hint">
        <CircleAlert :size="14" />
        状态流转为前端演示流程，不代表真实商家已接单或骑手已配送。
      </p>
    </section>

    <section class="card detail-section">
      <div class="detail-section__title">
        <Store :size="17" />
        <h2>{{ order.merchantName }}</h2>
        <RouterLink :to="`/shop/${order.merchantId}`">进店看看</RouterLink>
      </div>

      <ul class="detail-items">
        <li v-for="item in order.items" :key="item.id">
          <span class="detail-items__thumb">
            <img
              v-if="item.image"
              :src="item.image"
              :alt="`${item.name}图片`"
              loading="lazy"
            />
          </span>
          <div class="detail-items__info">
            <h3>{{ item.name }}</h3>
            <p>{{ formatPrice(item.price) }} × {{ item.quantity }}</p>
          </div>
          <strong>{{ formatPrice(item.price * item.quantity) }}</strong>
        </li>
      </ul>
    </section>

    <section class="card detail-section">
      <div class="detail-section__title">
        <MapPin :size="17" />
        <h2>收货信息</h2>
      </div>
      <dl class="info-list">
        <div>
          <dt><User :size="13" /> 收货人</dt>
          <dd>{{ order.contactName || '未填写' }}</dd>
        </div>
        <div>
          <dt><Phone :size="13" /> 联系电话</dt>
          <dd>{{ order.phone || '未填写' }}</dd>
        </div>
        <div>
          <dt><MapPin :size="13" /> 收货地址</dt>
          <dd>{{ order.address || '未填写' }}</dd>
        </div>
        <div>
          <dt><NotebookPen :size="13" /> 订单备注</dt>
          <dd>{{ order.note || '无' }}</dd>
        </div>
      </dl>
    </section>

    <section class="card detail-section">
      <div class="detail-section__title">
        <ReceiptText :size="17" />
        <h2>金额明细</h2>
      </div>
      <dl class="info-list info-list--amount">
        <div>
          <dt>商品金额</dt>
          <dd>{{ formatPrice(order.subtotal) }}</dd>
        </div>
        <div>
          <dt><Truck :size="13" /> 配送费</dt>
          <dd>{{ formatPrice(order.deliveryFee) }}</dd>
        </div>
        <div>
          <dt>优惠金额</dt>
          <dd :class="{ 'is-discount': order.discount > 0 }">
            {{ order.discount > 0 ? `-${formatPrice(order.discount)}` : '¥0' }}
          </dd>
        </div>
        <div class="info-list__payable">
          <dt>实际支付</dt>
          <dd>{{ formatPrice(order.total) }}</dd>
        </div>
      </dl>
    </section>

    <section class="card detail-section">
      <div class="detail-section__title">
        <Clock :size="17" />
        <h2>订单信息</h2>
      </div>
      <dl class="info-list">
        <div>
          <dt>订单编号</dt>
          <dd>{{ order.orderNo }}</dd>
        </div>
        <div>
          <dt>下单时间</dt>
          <dd>{{ formatOrderTime(order.createdAt) }}</dd>
        </div>
        <div>
          <dt>当前状态</dt>
          <dd>{{ getStatusLabel(order.status) }}</dd>
        </div>
      </dl>
    </section>

    <div class="detail-actions">
      <button
        v-if="advanceLabel"
        type="button"
        class="btn btn--primary"
        @click="handleAdvance"
      >
        {{ advanceLabel }}
      </button>
      <button
        v-if="canCancelOrder(order)"
        type="button"
        class="btn btn--soft detail-actions__cancel"
        @click="handleCancel"
      >
        <XCircle :size="15" />
        取消订单
      </button>
      <p v-else-if="order.status !== 'cancelled'" class="detail-actions__hint">
        订单已进入{{ getStatusLabel(order.status) }}，不可取消。
      </p>
    </div>
  </div>

  <div v-else class="page container">
    <EmptyState
      :icon="ReceiptText"
      title="没有找到这笔订单"
      description="订单可能不存在，返回列表查看其他订单。"
    >
      <RouterLink to="/orders" class="btn btn--primary">返回订单列表</RouterLink>
    </EmptyState>
  </div>
</template>

<style scoped>
.order-detail {
  padding-bottom: 24px;
}

.detail-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
  color: var(--brand-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.status-tag {
  align-self: flex-start;
  padding: 6px 11px;
  border-radius: var(--radius-pill);
  font-size: 10.5px;
  font-weight: 700;
}

.status-tag--pending {
  background-color: #fdf3e3;
  color: #b17a1e;
}

.status-tag--preparing {
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.status-tag--delivering {
  background-color: #e7f6f1;
  color: #1f8a6b;
}

.status-tag--completed {
  background-color: #eef3f7;
  color: #5f7387;
}

.status-tag--cancelled {
  background-color: #f7eef0;
  color: #9b6470;
}

.status-card {
  padding: 16px;
}

.status-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
}

.status-steps li {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #a3b1bf;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.status-steps li::before {
  content: "";
  position: absolute;
  top: 9px;
  right: 50%;
  left: -50%;
  height: 2px;
  background-color: #e4edf6;
}

.status-steps li:first-child::before {
  display: none;
}

.status-steps li.is-done::before {
  background-color: var(--brand-primary);
}

.status-steps__dot {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 2px solid #dbe6f1;
  border-radius: 50%;
  background-color: #ffffff;
  color: #ffffff;
}

.status-steps li.is-done {
  color: var(--brand-primary);
}

.status-steps li.is-done .status-steps__dot {
  border-color: var(--brand-primary);
  background-color: var(--brand-primary);
}

.status-steps li.is-current .status-steps__dot {
  box-shadow: 0 0 0 4px rgba(23, 105, 170, 0.14);
}

.cancelled-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 13px;
  border-radius: 12px;
  background-color: #f7eef0;
  color: #9b6470;
  font-size: 12px;
  font-weight: 600;
}

.demo-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 14px;
  padding-top: 11px;
  border-top: 1px dashed var(--border-soft);
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.6;
}

.demo-hint svg {
  flex: none;
  margin-top: 1px;
}

.detail-section {
  margin-top: 14px;
  padding: 16px;
}

.detail-section__title {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 12px;
  color: var(--brand-primary);
}

.detail-section__title h2 {
  color: var(--text-primary);
  font-size: 14.5px;
  font-weight: 750;
}

.detail-section__title a {
  margin-left: auto;
  color: var(--brand-secondary);
  font-size: 11px;
  font-weight: 600;
}

.detail-items {
  display: grid;
  gap: 10px;
}

.detail-items li {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.detail-items__thumb {
  position: relative;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border-radius: 12px;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.detail-items__thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-items__info h3 {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.detail-items__info p {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.detail-items li > strong {
  color: var(--brand-primary);
  font-size: 12.5px;
  font-weight: 750;
  white-space: nowrap;
}

.info-list {
  display: grid;
  gap: 9px;
  margin: 0;
}

.info-list > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.info-list dt {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.info-list dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  text-align: right;
  word-break: break-all;
}

.info-list--amount dd.is-discount {
  color: #d9743f;
}

.info-list__payable {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.info-list__payable dt {
  color: var(--text-primary);
  font-weight: 700;
}

.info-list__payable dd {
  color: var(--brand-primary);
  font-size: 20px;
  font-weight: 800;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.detail-actions__cancel {
  color: #b25d5d;
  background-color: #fdefef;
}

.detail-actions__hint {
  color: var(--text-secondary);
  font-size: 11px;
}

@media (min-width: 760px) {
  .status-card,
  .detail-section {
    padding: 20px;
  }

  .status-steps {
    gap: 8px;
  }

  .status-steps li {
    font-size: 11px;
  }
}
</style>
