<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Megaphone,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
} from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import ShopDishCard from '@/components/ShopDishCard.vue'
import { merchants } from '@/data/merchants'
import { getAvailableDishesByMerchant } from '@/data/dishes'
import {
  getMerchantCartCount,
  getMerchantCartTotal,
} from '@/utils/cart'
import { formatPrice } from '@/utils/format'

const route = useRoute()
const activeCategory = ref('全部')
const imageFailed = ref(false)

const merchant = computed(() =>
  merchants.find((item) => item.id === route.params.id),
)

const merchantDishes = computed(() =>
  merchant.value ? getAvailableDishesByMerchant(merchant.value.id) : [],
)

const menuCategories = computed(() => [
  '全部',
  ...new Set(merchantDishes.value.map((dish) => dish.menuCategory)),
])

const visibleDishes = computed(() => {
  if (activeCategory.value === '全部') return merchantDishes.value
  return merchantDishes.value.filter(
    (dish) => dish.menuCategory === activeCategory.value,
  )
})

const shopCartCount = computed(() =>
  getMerchantCartCount(merchant.value?.id),
)
const shopCartTotal = computed(() =>
  getMerchantCartTotal(merchant.value?.id),
)

watch(
  () => route.params.id,
  () => {
    activeCategory.value = '全部'
    imageFailed.value = false
  },
  { immediate: true },
)

function categoryCount(category) {
  if (category === '全部') return merchantDishes.value.length
  return merchantDishes.value.filter((dish) => dish.menuCategory === category)
    .length
}
</script>

<template>
  <div v-if="merchant" class="page container shop-detail">
    <section class="shop-hero" aria-label="商家封面">
      <div
        class="shop-hero__fallback"
        :style="{
          backgroundImage: `linear-gradient(135deg, ${merchant.cover.from}, ${merchant.cover.to})`,
        }"
      >
        <Store :size="48" :stroke-width="1.4" />
      </div>
      <img
        v-if="merchant.image && !imageFailed"
        :src="merchant.image"
        :alt="`${merchant.name}封面`"
        decoding="async"
        @error="imageFailed = true"
      />
      <div class="shop-hero__shade" aria-hidden="true"></div>
      <RouterLink to="/shops" class="shop-hero__back">
        <ArrowLeft :size="17" />
        返回商家列表
      </RouterLink>
      <span class="shop-hero__category">{{ merchant.categoryLabel }}</span>
    </section>

    <section class="shop-info card">
      <div class="shop-info__title">
        <div>
          <h1>{{ merchant.name }}</h1>
          <p>{{ merchant.description }}</p>
        </div>
        <span :class="{ 'is-closed': !merchant.isOpen }">
          <i aria-hidden="true"></i>
          {{ merchant.isOpen ? '营业中' : '休息中' }}
        </span>
      </div>

      <div class="shop-stats">
        <div>
          <Star :size="18" fill="currentColor" />
          <span><strong>{{ merchant.rating.toFixed(1) }}</strong><small>商家评分</small></span>
        </div>
        <div>
          <ShoppingBag :size="18" />
          <span><strong>{{ merchant.monthlySales }}</strong><small>月售订单</small></span>
        </div>
        <div>
          <Clock :size="18" />
          <span><strong>{{ merchant.deliveryTime }} 分钟</strong><small>预计配送</small></span>
        </div>
        <div>
          <span class="shop-stats__currency">¥</span>
          <span><strong>{{ merchant.minOrder }} 元</strong><small>起送价格</small></span>
        </div>
      </div>

      <div class="shop-notice">
        <Megaphone :size="17" />
        <p><strong>商家公告</strong>{{ merchant.announcement }}</p>
      </div>
    </section>

    <section class="menu-layout" aria-label="商家菜品菜单">
      <aside class="menu-categories card">
        <span class="menu-categories__title">菜品分类</span>
        <button
          v-for="category in menuCategories"
          :key="category"
          type="button"
          :class="{ 'is-active': activeCategory === category }"
          :aria-pressed="activeCategory === category"
          @click="activeCategory = category"
        >
          <span>{{ category }}</span>
          <small>{{ categoryCount(category) }}</small>
        </button>
      </aside>

      <div class="menu-content">
        <header class="menu-content__head">
          <div>
            <h2>{{ activeCategory === '全部' ? '全部菜品' : activeCategory }}</h2>
            <p>新鲜现做，把校园好味道送到你身边</p>
          </div>
          <span>{{ visibleDishes.length }} 道</span>
        </header>

        <div class="dish-list">
          <ShopDishCard
            v-for="dish in visibleDishes"
            :key="dish.id"
            :dish="dish"
          />
        </div>
      </div>
    </section>

    <div class="checkout-bar">
      <div class="checkout-bar__inner">
        <div class="checkout-bar__cart" aria-hidden="true">
          <ShoppingCart :size="24" />
          <span v-if="shopCartCount">{{ shopCartCount }}</span>
        </div>
        <div class="checkout-bar__amount">
          <strong aria-live="polite">{{ formatPrice(shopCartTotal) }}</strong>
          <small>
            {{ shopCartCount ? `已选 ${shopCartCount} 件 · 仅统计本店` : '还未选购本店商品' }}
          </small>
        </div>
        <RouterLink to="/cart" class="checkout-bar__button">
          去结算
          <ChevronRight :size="16" />
        </RouterLink>
      </div>
    </div>
  </div>

  <div v-else class="page container">
    <EmptyState
      :icon="Store"
      title="没有找到这家商家"
      description="商家可能已下架，返回列表看看其他校园美味吧。"
    >
      <RouterLink to="/shops" class="btn btn--primary">返回商家列表</RouterLink>
    </EmptyState>
  </div>
</template>

<style scoped>
.shop-detail {
  padding-top: 18px;
  padding-bottom: 126px;
}

.shop-hero {
  position: relative;
  overflow: hidden;
  height: 200px;
  border-radius: 22px;
  background-color: var(--brand-primary);
  box-shadow: var(--shadow-card);
}

.shop-hero > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-hero__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.8);
}

.shop-hero__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(12, 35, 56, 0.35), transparent 48%, rgba(12, 35, 56, 0.32));
}

.shop-hero__back {
  position: absolute;
  top: 14px;
  left: 14px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 11px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 650;
  backdrop-filter: blur(8px);
}

.shop-hero__category {
  position: absolute;
  right: 14px;
  bottom: 62px;
  padding: 5px 10px;
  border-radius: var(--radius-pill);
  background-color: rgba(23, 105, 170, 0.86);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 650;
  backdrop-filter: blur(8px);
}

.shop-info {
  position: relative;
  margin: -46px 10px 0;
  padding: 18px 16px 14px;
}

.shop-info__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.shop-info__title > div {
  min-width: 0;
}

.shop-info__title h1 {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.shop-info__title p {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.65;
}

.shop-info__title > span {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
  padding: 5px 8px;
  border-radius: var(--radius-pill);
  background-color: #eaf8f2;
  color: #218365;
  font-size: 10px;
  font-weight: 700;
}

.shop-info__title > span i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #2eaa82;
}

.shop-info__title > span.is-closed {
  background-color: #eff2f5;
  color: #7b8793;
}

.shop-info__title > span.is-closed i {
  background-color: #9aa6b2;
}

.shop-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  margin-top: 16px;
  padding: 13px 4px;
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
}

.shop-stats > div {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  color: var(--brand-secondary);
}

.shop-stats > div:first-child {
  color: #eda52f;
}

.shop-stats > div > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shop-stats strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shop-stats small {
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 9px;
  white-space: nowrap;
}

.shop-stats__currency {
  display: grid;
  flex: none;
  place-items: center;
  width: 18px;
  height: 18px;
  color: var(--brand-secondary);
  font-size: 18px;
  font-weight: 700;
}

.shop-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 11px;
  border-radius: 12px;
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
}

.shop-notice svg {
  flex: none;
  margin-top: 1px;
}

.shop-notice p {
  color: var(--text-secondary);
  font-size: 10.5px;
  line-height: 1.6;
}

.shop-notice strong {
  margin-right: 8px;
  color: var(--brand-primary);
}

.menu-layout {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  align-items: start;
  gap: 10px;
  margin-top: 18px;
}

.menu-categories {
  position: sticky;
  top: calc(var(--header-height) + 14px);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 6px;
}

.menu-categories__title {
  padding: 5px 4px 8px;
  color: var(--text-secondary);
  font-size: 9.5px;
  font-weight: 650;
  text-align: center;
}

.menu-categories button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 10px 3px;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.menu-categories button small {
  color: #9ca9b7;
  font-size: 9px;
  font-weight: 500;
}

.menu-categories button.is-active {
  background-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.18);
}

.menu-categories button.is-active small {
  color: rgba(255, 255, 255, 0.75);
}

.menu-content {
  min-width: 0;
}

.menu-content__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 43px;
  margin-bottom: 10px;
  padding: 0 2px;
}

.menu-content__head h2 {
  font-size: 15px;
  font-weight: 750;
}

.menu-content__head p {
  display: none;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.menu-content__head > span {
  flex: none;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 10px;
  font-weight: 700;
}

.dish-list {
  display: grid;
  gap: 10px;
}

.checkout-bar {
  position: fixed;
  right: 0;
  bottom: calc(69px + env(safe-area-inset-bottom));
  left: 0;
  z-index: 45;
  padding: 0 12px;
  pointer-events: none;
}

.checkout-bar__inner {
  display: flex;
  align-items: center;
  gap: 11px;
  max-width: 1080px;
  margin: 0 auto;
  padding: 10px 11px;
  border: 1px solid rgba(214, 229, 242, 0.95);
  border-radius: 19px;
  background-color: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 36px rgba(23, 65, 102, 0.2);
  backdrop-filter: blur(16px);
  pointer-events: auto;
}

.checkout-bar__cart {
  position: relative;
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.checkout-bar__cart span {
  position: absolute;
  top: -5px;
  right: -5px;
  display: grid;
  place-items: center;
  min-width: 19px;
  height: 19px;
  padding: 0 5px;
  border: 2px solid #ffffff;
  border-radius: var(--radius-pill);
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 9px;
  font-weight: 750;
}

.checkout-bar__amount {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.checkout-bar__amount strong {
  color: var(--brand-primary);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.checkout-bar__amount small {
  overflow: hidden;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 9.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.checkout-bar__button {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 3px;
  padding: 12px 17px;
  border-radius: 13px;
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 7px 16px rgba(23, 105, 170, 0.2);
}

@media (min-width: 700px) {
  .shop-hero {
    height: 270px;
  }

  .shop-info {
    margin: -54px 24px 0;
    padding: 23px 24px 18px;
  }

  .shop-info__title h1 {
    font-size: 26px;
  }

  .shop-info__title p {
    font-size: 12px;
  }

  .shop-stats {
    margin-top: 20px;
    padding-block: 16px;
  }

  .shop-stats strong {
    font-size: 15px;
  }

  .shop-stats small {
    font-size: 10px;
  }

  .shop-notice {
    padding: 12px 14px;
  }

  .shop-notice p {
    font-size: 11.5px;
  }

  .menu-layout {
    grid-template-columns: 142px minmax(0, 1fr);
    gap: 18px;
    margin-top: 24px;
  }

  .menu-categories {
    padding: 12px 9px;
  }

  .menu-categories button {
    flex-direction: row;
    justify-content: space-between;
    padding: 12px 11px;
    font-size: 12px;
  }

  .menu-content__head p {
    display: block;
  }

  .checkout-bar {
    bottom: 20px;
    padding-inline: 24px;
  }
}

@media (max-width: 370px) {
  .shop-detail {
    padding-inline: 10px;
  }

  .shop-info {
    margin-inline: 5px;
    padding-inline: 12px;
  }

  .shop-stats {
    gap: 0;
  }

  .shop-stats > div {
    gap: 3px;
  }

  .shop-stats svg {
    display: none;
  }

  .menu-layout {
    grid-template-columns: 80px minmax(0, 1fr);
    gap: 7px;
  }

  .checkout-bar__inner {
    gap: 8px;
  }

  .checkout-bar__button {
    padding-inline: 13px;
  }
}
</style>
