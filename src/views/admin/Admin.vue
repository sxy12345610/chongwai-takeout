<script setup>
import { computed, onMounted } from 'vue'
import { Link as LinkIcon } from 'lucide-vue-next'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { formatMoney, formatPrice, formatDateTime } from '@/utils/format'

const { data: stats, loading, error, run: load } = useAsync(() => adminApi.getStats())

const statCards = computed(() => {
  const c = stats.value?.counts || {}
  const t = stats.value?.today || {}
  return [
    { label: '累计用户数', value: c.users ?? 0, sub: `今日新增订单 ${t.orders ?? 0} 笔` },
    { label: '入驻商家', value: c.merchants ?? 0, sub: `今日营收 ${formatMoney(t.revenue ?? 0)}` },
    { label: '在售商品', value: c.products ?? 0, sub: `累计订单 ${c.orders ?? 0} 笔` },
    { label: '平台订单', value: c.orders ?? 0, sub: `待处理 ${t.pending ?? 0} 笔` },
  ]
})

const trendData = computed(() =>
  (stats.value?.last7Days || []).map((d) => ({ label: d.label, value: d.orders })),
)

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <section v-if="loading || !stats" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载后台数据…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>数据加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <template v-else>
      <div class="admin-cards">
        <article v-for="card in statCards" :key="card.label" class="admin-stat">
          <header class="admin-stat__head">
            <span class="admin-stat__label">{{ card.label }}</span>
          </header>
          <strong class="admin-stat__value">{{ card.value }}</strong>
          <p class="admin-stat__sub">{{ card.sub }}</p>
        </article>
      </div>

      <section class="admin-panel">
        <header class="admin-panel__head">
          <h2>近 7 日订单趋势</h2>
        </header>
        <div class="admin-trend">
          <div v-for="item in trendData" :key="item.label" class="admin-trend__col">
            <div class="admin-trend__bar">
              <span
                class="admin-trend__fill"
                :style="{ height: `${Math.min(100, (item.value / Math.max(1, ...trendData.map((d) => d.value))) * 100)}%` }"
              ></span>
            </div>
            <span class="admin-trend__value">{{ item.value }}</span>
            <span class="admin-trend__label">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <section class="admin-panel">
        <header class="admin-panel__head">
          <h2>最新订单</h2>
        </header>
        <div v-if="stats.latestOrders.length === 0" class="admin-empty">
          <strong>暂无订单</strong>
          <p>有新订单后会展示在这里。</p>
        </div>
        <table v-else class="admin-table">
          <thead>
            <tr>
              <th>订单号</th>
              <th>商家</th>
              <th>用户</th>
              <th>金额</th>
              <th>状态</th>
              <th>下单时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in stats.latestOrders" :key="order.id">
              <td>{{ order.orderNo }}</td>
              <td>{{ order.merchantName || '—' }}</td>
              <td>{{ order.userName || '匿名用户' }}</td>
              <td>{{ formatPrice(order.total) }}</td>
              <td>
                <span class="admin-tag" :class="`is-${order.status}`">{{ order.status }}</span>
              </td>
              <td>{{ formatDateTime(order.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div class="admin-grid-2">
        <section class="admin-panel">
          <header class="admin-panel__head">
            <h2>热销菜品 Top 5</h2>
          </header>
          <div v-if="stats.hotDishRanking.length === 0" class="admin-empty">
            <strong>暂无数据</strong>
          </div>
          <div v-else class="admin-rank">
            <div
              v-for="(dish, index) in stats.hotDishRanking.slice(0, 5)"
              :key="dish.name"
              class="admin-rank__row"
              :class="{ 'is-top': index < 3 }"
            >
              <span class="admin-rank__index">{{ index + 1 }}</span>
              <div class="admin-rank__info">
                <p class="admin-rank__name">{{ dish.name }}</p>
                <p class="admin-rank__meta">{{ dish.merchantName }} · 售出 {{ dish.quantity }} 份</p>
              </div>
              <strong class="admin-rank__value">{{ formatMoney(dish.revenue) }}</strong>
            </div>
          </div>
        </section>

        <section class="admin-panel">
          <header class="admin-panel__head">
            <h2>商家营收排行</h2>
          </header>
          <div v-if="stats.merchantRanking.length === 0" class="admin-empty">
            <strong>暂无数据</strong>
          </div>
          <div v-else class="admin-rank">
            <div
              v-for="(merchant, index) in stats.merchantRanking.slice(0, 5)"
              :key="merchant.id"
              class="admin-rank__row"
              :class="{ 'is-top': index < 3 }"
            >
              <span class="admin-rank__index">{{ index + 1 }}</span>
              <div class="admin-rank__info">
                <p class="admin-rank__name">{{ merchant.name }}</p>
                <p class="admin-rank__meta">{{ merchant.orders }} 笔订单</p>
              </div>
              <strong class="admin-rank__value">{{ formatMoney(merchant.revenue) }}</strong>
            </div>
          </div>
        </section>
      </div>

      <p class="admin-footnote">
        <LinkIcon :size="12" />
        数据实时来自 PostgreSQL；金额由后端按整数分计算，前端仅做展示换算。
      </p>
    </template>
  </div>
</template>
