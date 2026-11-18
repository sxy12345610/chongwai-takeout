<script setup>
import { computed, ref } from 'vue'
import {
  Clock,
  MapPin,
  Search,
  SearchX,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UtensilsCrossed,
} from 'lucide-vue-next'
import RestaurantCard from '@/components/RestaurantCard.vue'
import DishCard from '@/components/DishCard.vue'
import { foodCategories } from '@/data/categories'
import { merchants } from '@/data/merchants'
import { hotDishes } from '@/data/dishes'
import { categoryIcons } from '@/utils/categoryIcons'

const categories = foodCategories.map((category) => ({
  ...category,
  icon: categoryIcons[category.key],
}))

const searchInput = ref('')
const searchQuery = ref('')
const activeCategory = ref('all')

function submitSearch() {
  searchQuery.value = searchInput.value.trim()
}

function clearSearch() {
  searchInput.value = ''
  searchQuery.value = ''
}

function resetFilters() {
  clearSearch()
  activeCategory.value = 'all'
}

function matchesCategory(item) {
  if (activeCategory.value === 'all') return true
  const keys = item.categoryKeys || [item.categoryKey]
  return keys.includes(activeCategory.value)
}

function matchesQuery(texts) {
  if (!searchQuery.value) return true
  const query = searchQuery.value.toLowerCase()
  return texts.some((text) => text.toLowerCase().includes(query))
}

const filteredMerchants = computed(() =>
  merchants.filter(
    (merchant) => matchesCategory(merchant) && matchesQuery([merchant.name]),
  ),
)

const filteredDishes = computed(() =>
  hotDishes.value.filter(
    (dish) =>
      matchesCategory(dish) &&
      matchesQuery([dish.name, dish.merchantName]),
  ),
)

const hasResults = computed(
  () => filteredMerchants.value.length > 0 || filteredDishes.value.length > 0,
)
</script>

<template>
  <div class="home container">
    <section class="hero">
      <p class="hero__eyebrow">
        <MapPin :size="14" />
        重庆外语外事学院 · 校内配送
      </p>
      <h1 class="hero__title">今天想吃点什么？</h1>
      <p class="hero__subtitle">校园美食，最快 30 分钟送到宿舍楼下。</p>

      <form class="hero__search" role="search" @submit.prevent="submitSearch">
        <Search class="hero__search-icon" :size="19" />
        <input
          v-model="searchInput"
          type="search"
          placeholder="搜索商家或菜品，如 卤肉饭"
          aria-label="搜索商家或菜品"
        />
        <button class="hero__search-btn" type="submit">搜索</button>
      </form>

      <ul class="hero__highlights">
        <li><Truck :size="15" /> 校内配送</li>
        <li><Clock :size="15" /> 平均 30 分钟</li>
        <li><ShieldCheck :size="15" /> 学生专享</li>
      </ul>
    </section>

    <section class="campus-banner" aria-label="校园推荐">
      <div class="campus-banner__content">
        <span class="campus-banner__tag">
          <Sparkles :size="13" />
          校园推荐
        </span>
        <h2>发现重外好味道</h2>
        <p>精选校园美食，开启美好一天</p>
      </div>
      <div class="campus-banner__art" aria-hidden="true">
        <span class="campus-banner__halo campus-banner__halo--one"></span>
        <span class="campus-banner__halo campus-banner__halo--two"></span>
        <span class="campus-banner__plate">
          <UtensilsCrossed :size="36" :stroke-width="1.6" />
        </span>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2 class="section__title">美食分类</h2>
        <span class="section__hint">点击分类筛选商家与菜品</span>
      </div>

      <div class="category-grid">
        <button
          v-for="category in categories"
          :key="category.key"
          type="button"
          class="category"
          :class="{ 'is-active': activeCategory === category.key }"
          :aria-pressed="activeCategory === category.key"
          @click="activeCategory = category.key"
        >
          <span class="category__icon">
            <component :is="category.icon" :size="22" :stroke-width="1.8" />
          </span>
          <span class="category__label">{{ category.label }}</span>
        </button>
      </div>
    </section>

    <div v-if="searchQuery" class="search-status">
      <p>
        <Search :size="14" />
        “{{ searchQuery }}” 的搜索结果：{{ filteredMerchants.length }} 家商家 ·
        {{ filteredDishes.length }} 道菜品
      </p>
      <button type="button" @click="clearSearch">清除搜索</button>
    </div>

    <template v-if="hasResults">
      <section v-if="filteredMerchants.length" class="section">
        <div class="section__head">
          <h2 class="section__title">推荐商家</h2>
          <span class="section__hint">{{ filteredMerchants.length }} 家商家</span>
        </div>

        <div class="merchant-grid">
          <RestaurantCard
            v-for="merchant in filteredMerchants"
            :key="merchant.id"
            :merchant="merchant"
            :icon="categoryIcons[merchant.categoryKeys[0]]"
          />
        </div>
      </section>

      <section v-if="filteredDishes.length" class="section">
        <div class="section__head">
          <h2 class="section__title">热门推荐</h2>
          <span class="section__hint">{{ filteredDishes.length }} 道菜品</span>
        </div>

        <div class="dish-grid">
          <DishCard
            v-for="dish in filteredDishes"
            :key="dish.id"
            :dish="dish"
          />
        </div>
      </section>
    </template>

    <div v-else class="empty card">
      <span class="empty__icon"><SearchX :size="26" /></span>
      <h3>没有找到相关内容</h3>
      <p>试试其他关键词或分类，美味可能就在下一家。</p>
      <button class="btn btn--soft" type="button" @click="resetFilters">
        查看全部美食
      </button>
    </div>

    <footer class="home__footer">
      <Star :size="13" />
      更多校园商家正在入驻中，敬请期待
    </footer>
  </div>
</template>

<style scoped>
.home {
  padding-top: 18px;
}

/* 顶部欢迎与搜索区域 */
.hero {
  position: relative;
  overflow: hidden;
  padding: 24px 20px 22px;
  background: linear-gradient(135deg, #ffffff 0%, #f2f8ff 58%, #eaf4ff 100%);
  border: 1px solid var(--border-soft);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
}

.hero::after {
  content: "";
  position: absolute;
  top: -120px;
  right: -90px;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(40, 120, 200, 0.18), transparent 68%);
  pointer-events: none;
}

.hero__eyebrow {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.hero__title {
  position: relative;
  margin-top: 14px;
  font-size: 28px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.hero__subtitle {
  position: relative;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
}

.hero__search {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 620px;
  margin-top: 18px;
  padding: 6px 6px 6px 14px;
  background-color: #ffffff;
  border: 1px solid #dfeaf6;
  border-radius: var(--radius-pill);
  box-shadow: 0 8px 20px rgba(23, 105, 170, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.hero__search:focus-within {
  border-color: var(--brand-secondary);
  box-shadow: 0 10px 26px rgba(23, 105, 170, 0.16);
}

.hero__search-icon {
  flex: none;
  color: var(--text-secondary);
}

.hero__search input {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 13.5px;
}

.hero__search input::placeholder {
  color: #a9b6c4;
}

.hero__search input::-webkit-search-cancel-button {
  appearance: none;
}

.hero__search-btn {
  flex: none;
  padding: 10px 18px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.hero__search-btn:hover {
  background-color: #125a93;
}

.hero__highlights {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-top: 16px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.hero__highlights li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.hero__highlights svg {
  color: var(--brand-secondary);
}

/* 校园推荐横幅 */
.campus-banner {
  position: relative;
  display: flex;
  align-items: center;
  overflow: hidden;
  margin-top: 16px;
  padding: 22px 20px;
  background: linear-gradient(120deg, #1769aa 0%, #2878c8 62%, #3d8fd8 100%);
  border-radius: 24px;
  color: #ffffff;
  box-shadow: 0 16px 36px rgba(23, 105, 170, 0.2);
}

.campus-banner__content {
  position: relative;
  z-index: 2;
  min-width: 0;
  max-width: calc(100% - 88px);
}

.campus-banner__tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  font-size: 10.5px;
  font-weight: 600;
  backdrop-filter: blur(4px);
}

.campus-banner h2 {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.campus-banner p {
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}

.campus-banner__art {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
}

.campus-banner__halo {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background-color: rgba(255, 255, 255, 0.06);
}

.campus-banner__halo--one {
  top: -54px;
  right: -34px;
  width: 170px;
  height: 170px;
}

.campus-banner__halo--two {
  top: -84px;
  right: -64px;
  width: 250px;
  height: 250px;
  border-style: dashed;
  opacity: 0.6;
}

.campus-banner__plate {
  position: absolute;
  top: 50%;
  right: 20px;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.26);
  color: #ffffff;
  transform: translateY(-50%) rotate(-8deg);
  backdrop-filter: blur(6px);
}

/* 通用区块 */
.section {
  margin-top: 28px;
}

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.section__hint {
  color: var(--text-secondary);
  font-size: 11.5px;
}

/* 分类入口 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  background-color: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease,
    background-color 0.2s ease;
}

.category:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.category__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  transition: background-color 0.2s ease, color 0.2s ease,
    box-shadow 0.2s ease;
}

.category__label {
  color: #55677c;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.category.is-active {
  background-color: #f3f9ff;
  border-color: rgba(23, 105, 170, 0.35);
}

.category.is-active .category__icon {
  background-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(23, 105, 170, 0.25);
}

.category.is-active .category__label {
  color: var(--brand-primary);
}

/* 搜索结果状态 */
.search-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  margin-top: 22px;
  padding: 10px 14px;
  border-radius: 14px;
  background-color: var(--brand-soft);
  border: 1px solid #d9ecff;
  color: var(--brand-primary);
  font-size: 11.5px;
}

.search-status p {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.search-status button {
  flex: none;
  color: var(--brand-secondary);
  font-size: 11px;
  font-weight: 600;
  text-decoration: underline;
}

/* 商家与菜品网格 */
.merchant-grid,
.dish-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

/* 空状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 24px;
  padding: 38px 20px;
  text-align: center;
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
  border-radius: 18px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.empty h3 {
  font-size: 15px;
  font-weight: 700;
}

.empty p {
  margin: 4px 0 16px;
  color: var(--text-secondary);
  font-size: 12.5px;
}

/* 底部说明 */
.home__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 30px 0 10px;
  color: #a3b0bd;
  font-size: 11.5px;
}

.home__footer svg {
  color: var(--brand-secondary);
}

@media (min-width: 720px) {
  .merchant-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .dish-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }
}

@media (min-width: 900px) {
  .home {
    padding-top: 28px;
  }

  .hero {
    padding: 32px 30px 28px;
  }

  .hero__title {
    font-size: 34px;
  }

  .campus-banner {
    padding: 28px 30px;
    margin-top: 20px;
  }

  .campus-banner__content {
    max-width: calc(100% - 130px);
  }

  .campus-banner h2 {
    font-size: 26px;
  }

  .campus-banner__plate {
    right: 34px;
    width: 78px;
    height: 78px;
  }

  .category-grid {
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 12px;
  }

  .category {
    padding: 14px 6px;
  }

  .section {
    margin-top: 32px;
  }

  .section__title {
    font-size: 20px;
  }
}
</style>
