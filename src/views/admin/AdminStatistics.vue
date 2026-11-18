<script setup>
import { computed, onMounted } from 'vue'
import { TrendingDown, TrendingUp, Users, Wallet } from 'lucide-vue-next'
import { adminApi } from '@/api/admin'
import { useAsync } from '@/composables/useAsync'
import { formatMoney } from '@/utils/format'

const { data: stats, loading, error, run: load } = useAsync(() => adminApi.getStats())

const todayCards = computed(() => {
  const t = stats.value?.today || {}
  const c = stats.value?.counts || {}
  return [
    { label: '今日订单', value: t.orders ?? 0, icon: TrendingUp, tone: 'blue' },
    { label: '今日营收', value: formatMoney(t.revenue ?? 0), icon: Wallet, tone: 'green' },
    { label: '待处理订单', value: t.pending ?? 0, icon: TrendingDown, tone: 'orange' },
    { label: '注册用户', value: c.users ?? 0, icon: Users, tone: 'purple' },
  ]
})

const trendData = computed(() =>
  (stats.value?.last7Days || []).map((d) => ({ label: d.label, value: d.revenue })),
)

const maxTrend = computed(() => Math.max(1, ...trendData.value.map((d) => d.value)))

onMounted(load)
</script>

<template>
  <div class="admin-page">
    <section v-if="loading || !stats" class="admin-loading">
      <span class="admin-spinner"></span>
      <span>正在加载统计数据…</span>
    </section>

    <section v-else-if="error" class="admin-error">
      <strong>统计加载失败</strong>
      <p>{{ error.message }}</p>
      <button class="admin-error__retry" @click="load">重新加载</button>
    </section>

    <template v-else>
      <div class="admin-cards">
        <article v-for="card in todayCards" :key="card.label" class="admin-stat">
          <header class="admin-stat__head">
            <span class="admin-stat__label">{{ card.label }}</span>
            <span class="admin-stat__icon"><component :is="card.icon" :size="16" /></span>
          </header>
          <strong class="admin-stat__value">{{ card.value }}</strong>
          <p class="admin-stat__sub">实时数据</p>
        </article>
      </div>

      <section class="admin-panel">
        <header class="admin-panel__head">
          <h2>近 7 日营收趋势（元）</h2>
        </header>
        <div class="admin-trend">
          <div v-for="item in trendData" :key="item.label" class="admin-trend__col">
            <div class="admin-trend__bar">
              <span class="admin-trend__fill" :style="{ height: `${(item.value / maxTrend) * 100}%` }"></span>
            </div>
            <span class="admin-trend__value">{{ formatMoney(item.value) }}</span>
            <span class="admin-trend__label">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <div class="admin-grid-2">
        <section class="admin-panel">
          <header class="admin-panel__head">
            <h2>热销菜品 Top 10</h2>
          </header>
          <div v-if="stats.hotDishRanking.length === 0" class="admin-empty">
            <strong>暂无数据</strong>
          </div>
          <div v-else class="admin-rank">
            <div
              v-for="(dish, index) in stats.hotDishRanking"
              :key="`${dish.name}-${index}`"
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
              v-for="(merchant, index) in stats.merchantRanking"
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
    </template>
  </div>
</template>
