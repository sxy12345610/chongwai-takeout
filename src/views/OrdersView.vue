<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Store,
  XCircle,
} from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import {
  cancelOrder,
  canCancelOrder,
  formatOrderTime,
  getStatusLabel,
  orders,
  orderStatuses,
} from '@/utils/orders'
import { formatPrice } from '@/utils/format'

const route = useRoute()

const statusKeys = ['all', ...orderStatuses.map((status) => status.key)]

function normalizeStatus(value) {
  return statusKeys.includes(value) ? value : 'all'
}

// 支持从个人中心携带状态参数进入，自动筛选对应订单
const activeStatus = ref(normalizeStatus(route.query.status))

watch(
  () => route.query.status,
  (value) => {
    activeStatus.value = normalizeStatus(value)
  },
)

const tabs = computed(() => [
  { key: 'all', label: '全部', count: orders.length },
  ...orderStatuses.map((status) => ({
    ...status,
    count: orders.filter((order) => order.status === status.key).length,
  })),
])

const filteredOrders = computed(() => {
  const list =
    activeStatus.value === 'all'
      ? orders
      : orders.filter((order) => order.status === activeStatus.value)
  return [...list].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
})

function orderItemCount(order) {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

function handleCancel(order) {
  cancelOrder(order.id)
}
</script>

<template>
  <div class="page container orders-page">
    <header class="page-head">
      <div>
        <h1 class="page-head__title">我的订单</h1>
        <p class="page-head__desc">
          共 {{ orders.length }} 笔订单，不同商家分别记录，数据保存在本地浏览器。
        </p>
      </div>
    </header>

    <nav class="status-tabs" aria-label="订单状态筛选">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="{ 'is-active': activeStatus === tab.key }"
        :aria-pressed="activeStatus === tab.key"
        @click="activeStatus = tab.key"
      >
        {{ tab.label }}
        <small v-if="tab.count">{{ tab.count }}</small>
      </button>
    </nav>

    <section v-if="filteredOrders.length" class="order-list">
      <article
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card card"
      >
        <header class="order-card__head">
          <RouterLink :to="`/shop/${order.merchantId}`" class="order-card__shop">
            <Store :size="16" />
            {{ order.merchantName }}
            <ChevronRight :size="14" />
          </RouterLink>
          <span class="status-tag" :class="`status-tag--${order.status}`">
            {{ getStatusLabel(order.status) }}
          </span>
        </header>

        <ul class="order-card__items">
          <li v-for="item in order.items" :key="item.id">
            <span class="order-card__thumb">
              <img
                v-if="item.image"
                :src="item.image"
                :alt="`${item.name}图片`"
                loading="lazy"
              />
            </span>
            <span class="order-card__name">{{ item.name }}</span>
            <span class="order-card__qty">×{{ item.quantity }}</span>
            <span class="order-card__price">
              {{ formatPrice(item.price * item.quantity) }}
            </span>
          </li>
        </ul>

        <div class="order-card__meta">
          <span><Clock :size="12" /> {{ formatOrderTime(order.createdAt) }}</span>
          <span>订单号 {{ order.orderNo }}</span>
        </div>

        <footer class="order-card__foot">
          <p>
            共 {{ orderItemCount(order) }} 件
            <strong>{{ formatPrice(order.total) }}</strong>
          </p>
          <div class="order-card__actions">
            <button
              v-if="canCancelOrder(order)"
              type="button"
              class="order-card__cancel"
              @click="handleCancel(order)"
            >
              <XCircle :size="13" />
              取消订单
            </button>
            <RouterLink :to="`/order/${order.id}`" class="order-card__detail">
              查看详情
              <ChevronRight :size="14" />
            </RouterLink>
          </div>
        </footer>
      </article>
    </section>

    <EmptyState
      v-else
      :icon="ClipboardList"
      :title="activeStatus === 'all' ? '暂无订单' : `暂无${getStatusLabel(activeStatus)}订单`"
      description="点一份校园美食，开启你的第一单。"
    >
      <RouterLink to="/shops" class="btn btn--primary">去点餐</RouterLink>
    </EmptyState>
  </div>
</template>

<style scoped>
.orders-page {
  padding-bottom: 12px;
}

.status-tabs {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  margin-bottom: 16px;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.status-tabs::-webkit-scrollbar {
  display: none;
}

.status-tabs button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 8px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background-color: #f2f7fc;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.status-tabs button small {
  color: #9ca9b7;
  font-size: 9.5px;
  font-weight: 600;
}

.status-tabs button:hover {
  color: var(--brand-primary);
  border-color: #d5e8f8;
}

.status-tabs button.is-active {
  background-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.18);
}

.status-tabs button.is-active small {
  color: rgba(255, 255, 255, 0.78);
}

.order-list {
  display: grid;
  gap: 14px;
}

.order-card {
  overflow: hidden;
  padding: 14px 15px;
}

.order-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--border-soft);
}

.order-card__shop {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.order-card__shop svg:first-child {
  flex: none;
  color: var(--brand-primary);
}

.status-tag {
  flex: none;
  padding: 4px 9px;
  border-radius: var(--radius-pill);
  font-size: 10px;
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

.order-card__items {
  display: grid;
  gap: 9px;
  padding: 12px 0;
}

.order-card__items li {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 9px;
}

.order-card__thumb {
  position: relative;
  width: 44px;
  height: 44px;
  overflow: hidden;
  border-radius: 11px;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.order-card__thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-card__name {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 650;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.order-card__qty {
  color: var(--text-secondary);
  font-size: 11px;
}

.order-card__price {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;
}

.order-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding-top: 9px;
  border-top: 1px dashed var(--border-soft);
  color: var(--text-secondary);
  font-size: 10px;
}

.order-card__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.order-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 11px;
}

.order-card__foot p {
  color: var(--text-secondary);
  font-size: 11px;
}

.order-card__foot p strong {
  margin-left: 6px;
  color: var(--brand-primary);
  font-size: 17px;
  font-weight: 800;
}

.order-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-card__cancel {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 7px 11px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.order-card__cancel:hover {
  color: #c25b5b;
  border-color: #efcaca;
}

.order-card__detail {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 7px 12px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 10.5px;
  font-weight: 700;
}

@media (min-width: 760px) {
  .order-card {
    padding: 16px 18px;
  }

  .order-card__name {
    font-size: 13.5px;
  }

  .status-tag {
    font-size: 10.5px;
  }
}
</style>
