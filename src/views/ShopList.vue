<script setup>
import { computed, ref } from 'vue'
import { Search, SearchX, Store, X } from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import RestaurantCard from '@/components/RestaurantCard.vue'
import { merchants } from '@/data/merchants'
import { categoryIcons } from '@/utils/categoryIcons'

const categories = [
  { key: 'all', label: '全部' },
  { key: 'chinese', label: '中式快餐' },
  { key: 'snack', label: '特色小吃' },
  { key: 'drink', label: '奶茶饮品' },
  { key: 'western', label: '西式美食' },
  { key: 'fruit', label: '水果轻食' },
]

const keyword = ref('')
const activeCategory = ref('all')

const filteredMerchants = computed(() => {
  const query = keyword.value.trim().toLowerCase()

  return merchants.filter((merchant) => {
    const matchesKeyword = !query || merchant.name.toLowerCase().includes(query)
    const matchesCategory =
      activeCategory.value === 'all' ||
      merchant.categoryKeys.includes(activeCategory.value)

    return matchesKeyword && matchesCategory
  })
})

function resetFilters() {
  keyword.value = ''
  activeCategory.value = 'all'
}
</script>

<template>
  <div class="page container shop-list-page">
    <header class="page-head">
      <div>
        <span class="page-eyebrow">
          <Store :size="14" />
          重外精选
        </span>
        <h1 class="page-head__title">校园美食商家</h1>
        <p class="page-head__desc">发现好味道，从宿舍到餐桌都快人一步。</p>
      </div>
      <span class="shop-count">{{ filteredMerchants.length }} 家商家</span>
    </header>

    <section class="filter-panel card" aria-label="商家搜索与分类筛选">
      <form class="shop-search" role="search" @submit.prevent>
        <Search :size="18" />
        <input
          v-model="keyword"
          type="search"
          placeholder="搜索商家名称，如 川味小厨"
          aria-label="搜索商家名称"
        />
        <button
          v-if="keyword"
          type="button"
          class="shop-search__clear"
          aria-label="清空搜索关键词"
          @click="keyword = ''"
        >
          <X :size="15" />
        </button>
        <button type="submit" class="shop-search__submit">搜索</button>
      </form>

      <nav class="category-nav" aria-label="商家分类">
        <button
          v-for="category in categories"
          :key="category.key"
          type="button"
          :class="{ 'is-active': activeCategory === category.key }"
          :aria-pressed="activeCategory === category.key"
          @click="activeCategory = category.key"
        >
          {{ category.label }}
        </button>
      </nav>
    </section>

    <div class="result-head">
      <p>
        {{ categories.find((item) => item.key === activeCategory)?.label }}
        <span v-if="keyword.trim()"> · “{{ keyword.trim() }}”</span>
      </p>
      <button
        v-if="keyword || activeCategory !== 'all'"
        type="button"
        @click="resetFilters"
      >
        重置筛选
      </button>
      <span v-else>全部优质校园商家</span>
    </div>

    <section v-if="filteredMerchants.length" class="merchant-grid">
      <RestaurantCard
        v-for="merchant in filteredMerchants"
        :key="merchant.id"
        :merchant="merchant"
        :icon="categoryIcons[merchant.categoryKeys[0]]"
      />
    </section>

    <EmptyState
      v-else
      :icon="SearchX"
      title="没有找到相关商家"
      description="换个商家名称或分类试试，更多美味正在等你发现。"
    >
      <button type="button" class="btn btn--soft" @click="resetFilters">
        查看全部商家
      </button>
    </EmptyState>
  </div>
</template>

<style scoped>
.shop-list-page {
  padding-top: 22px;
}

.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  color: var(--brand-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.shop-count {
  flex: none;
  padding: 7px 12px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 11.5px;
  font-weight: 700;
}

.filter-panel {
  padding: 12px;
}

.shop-search {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 5px 5px 12px;
  border: 1px solid #dce9f5;
  border-radius: 15px;
  background-color: #f8fbff;
  color: var(--text-secondary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.shop-search:focus-within {
  border-color: var(--brand-secondary);
  box-shadow: 0 0 0 3px rgba(40, 120, 200, 0.09);
}

.shop-search input {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  background: transparent;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  font-size: 13px;
}

.shop-search input::placeholder {
  color: #9baaba;
}

.shop-search input::-webkit-search-cancel-button {
  appearance: none;
}

.shop-search__clear {
  display: grid;
  flex: none;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #e7eff7;
  color: var(--text-secondary);
}

.shop-search__submit {
  flex: none;
  padding: 9px 17px;
  border-radius: 11px;
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.category-nav {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  margin-top: 12px;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.category-nav::-webkit-scrollbar {
  display: none;
}

.category-nav button {
  flex: none;
  padding: 8px 13px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background-color: #f2f7fc;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.category-nav button:hover {
  color: var(--brand-primary);
  border-color: #d5e8f8;
}

.category-nav button.is-active {
  background-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.18);
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 2px 12px;
  color: var(--text-secondary);
  font-size: 11px;
}

.result-head p {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.result-head p span {
  color: var(--text-secondary);
  font-weight: 500;
}

.result-head button {
  flex: none;
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 600;
}

.merchant-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (min-width: 760px) {
  .filter-panel {
    padding: 16px;
  }

  .merchant-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }
}

@media (max-width: 370px) {
  .shop-search__submit {
    padding-inline: 12px;
  }

  .merchant-grid {
    gap: 9px;
  }
}
</style>
