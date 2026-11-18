<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  Check,
  ChevronRight,
  Info,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-vue-next'
import EmptyState from '@/components/EmptyState.vue'
import {
  allCartSelected,
  cartCount,
  cartItems,
  cartMerchantGroups,
  clearCart,
  clearCartSelection,
  decrementCartItem,
  incrementCartItem,
  isGroupSelected,
  isItemSelected,
  removeCartItem,
  selectAllCartItems,
  selectedCount,
  selectedTotal,
  toggleGroupSelection,
  toggleItemSelection,
} from '@/utils/cart'
import { formatPrice } from '@/utils/format'

const router = useRouter()

const allSelected = computed(() => allCartSelected.value)

function toggleAll() {
  if (allSelected.value) clearCartSelection()
  else selectAllCartItems()
}

function goCheckout() {
  if (selectedCount.value === 0) return
  router.push('/checkout')
}

function hideBrokenImage(event) {
  event.currentTarget.style.display = 'none'
}
</script>

<template>
  <div class="page container cart-page">
    <header class="page-head">
      <div>
        <h1 class="page-head__title">购物车</h1>
        <p class="page-head__desc">
          共 {{ cartCount }} 件商品，已选 {{ selectedCount }} 件，数据保存在本地浏览器。
        </p>
      </div>

      <button
        v-if="cartItems.length"
        type="button"
        class="clear-button"
        @click="clearCart"
      >
        <Trash2 :size="14" />
        清空购物车
      </button>
    </header>

    <template v-if="cartItems.length">
      <div class="cart-groups">
        <section
          v-for="group in cartMerchantGroups"
          :key="group.merchantId"
          class="cart-group card"
        >
          <header class="cart-group__head">
            <div class="cart-group__merchant">
              <button
                type="button"
                class="select-box"
                :class="{ 'is-checked': isGroupSelected(group) }"
                role="checkbox"
                :aria-checked="isGroupSelected(group)"
                :aria-label="`选择${group.merchantName}全部商品`"
                @click="toggleGroupSelection(group)"
              >
                <Check :size="12" :stroke-width="3" />
              </button>
              <div class="cart-group__title">
                <RouterLink :to="`/shop/${group.merchantId}`">
                  <Store :size="15" />
                  {{ group.merchantName }}
                  <ChevronRight :size="14" />
                </RouterLink>
                <p>
                  {{ group.count }} 件商品 · 本店小计
                  <strong>{{ formatPrice(group.total) }}</strong>
                </p>
              </div>
            </div>
            <span class="cart-group__badge">商家独立分组</span>
          </header>

          <div class="cart-list">
            <article
              v-for="item in group.items"
              :key="`${item.merchantId}:${item.id}`"
              class="cart-item"
            >
              <button
                type="button"
                class="select-box select-box--item"
                :class="{ 'is-checked': isItemSelected(item) }"
                role="checkbox"
                :aria-checked="isItemSelected(item)"
                :aria-label="`选择${item.name}`"
                @click="toggleItemSelection(item)"
              >
                <Check :size="12" :stroke-width="3" />
              </button>

              <div class="cart-item__media">
                <span class="cart-item__fallback">
                  <ShoppingBag :size="20" />
                </span>
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="`${item.name}图片`"
                  loading="lazy"
                  decoding="async"
                  @error="hideBrokenImage"
                />
              </div>

              <div class="cart-item__info">
                <h2>{{ item.name }}</h2>
                <p>单价 {{ formatPrice(item.price) }}</p>
                <span class="cart-item__price">
                  {{ formatPrice(item.price * item.quantity) }}
                </span>
              </div>

              <div class="cart-item__actions">
                <div class="stepper">
                  <button
                    type="button"
                    :aria-label="`减少${item.name}数量`"
                    @click="decrementCartItem(item.id, item.merchantId)"
                  >
                    <Minus :size="13" :stroke-width="2.4" />
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button
                    type="button"
                    :aria-label="`增加${item.name}数量`"
                    @click="incrementCartItem(item.id, item.merchantId)"
                  >
                    <Plus :size="13" :stroke-width="2.4" />
                  </button>
                </div>
                <button
                  type="button"
                  class="cart-item__remove"
                  :aria-label="`移除${item.name}`"
                  @click="removeCartItem(item.id, item.merchantId)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <p class="cart-tip card">
        <Info :size="15" />
        提交订单时，不同商家的商品会分别生成独立订单，各自计算配送费与订单编号。
      </p>
    </template>

    <EmptyState
      v-else
      :icon="ShoppingBag"
      title="购物车还是空的"
      description="去商家列表挑一份校园美食，开启今天的好味道。"
    >
      <RouterLink to="/shops" class="btn btn--primary">去逛商家</RouterLink>
    </EmptyState>

    <div v-if="cartItems.length" class="cart-checkout">
      <div class="cart-checkout__inner">
        <button
          type="button"
          class="cart-checkout__select"
          :aria-pressed="allSelected"
          @click="toggleAll"
        >
          <span class="select-box" :class="{ 'is-checked': allSelected }">
            <Check :size="12" :stroke-width="3" />
          </span>
          全选
        </button>

        <div class="cart-checkout__sum">
          <strong>{{ formatPrice(selectedTotal) }}</strong>
          <small>已选 {{ selectedCount }} 件 · 不含配送费</small>
        </div>

        <button
          type="button"
          class="cart-checkout__btn"
          :disabled="selectedCount === 0"
          @click="goCheckout"
        >
          去结算
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-page {
  padding-bottom: 110px;
}

.clear-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-pill);
  background-color: var(--surface);
  border: 1px solid var(--border-soft);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.clear-button:hover {
  color: var(--brand-primary);
  border-color: rgba(23, 105, 170, 0.3);
}

/* 选择框 */
.select-box {
  display: grid;
  flex: none;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid #cfdde9;
  border-radius: 7px;
  background-color: #ffffff;
  color: transparent;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease;
}

.select-box.is-checked {
  border-color: var(--brand-primary);
  background-color: var(--brand-primary);
  color: #ffffff;
}

/* 商家分组 */
.cart-groups {
  display: grid;
  gap: 16px;
}

.cart-group {
  overflow: hidden;
}

.cart-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  background: linear-gradient(120deg, #f2f8ff, #ffffff);
  border-bottom: 1px solid var(--border-soft);
}

.cart-group__merchant {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.cart-group__title {
  min-width: 0;
}

.cart-group__title a {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.cart-group__title a svg:first-child {
  color: var(--brand-primary);
}

.cart-group__title p {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 11px;
}

.cart-group__title p strong {
  color: var(--brand-primary);
}

.cart-group__badge {
  flex: none;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 10px;
  font-weight: 600;
}

/* 商品行 */
.cart-list {
  padding: 0 16px;
}

.cart-item {
  display: grid;
  grid-template-columns: 20px 64px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-soft);
}

.cart-item:last-child {
  border-bottom: 0;
}

.cart-item__media {
  position: relative;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: 14px;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.cart-item__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--brand-secondary);
}

.cart-item__info {
  min-width: 0;
}

.cart-item__info h2 {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cart-item__info p {
  overflow: hidden;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 10.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cart-item__price {
  display: inline-block;
  margin-top: 6px;
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 700;
}

.cart-item__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
}

.stepper button {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #ffffff;
  color: var(--brand-primary);
  transition: background-color 0.2s ease;
}

.stepper button:hover {
  background-color: #e2f1ff;
}

.stepper span {
  min-width: 22px;
  color: var(--brand-primary);
  font-size: 11.5px;
  font-weight: 700;
  text-align: center;
}

.cart-item__remove {
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.cart-item__remove:hover {
  color: #d15b5b;
}

.cart-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 14px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.6;
}

.cart-tip svg {
  flex: none;
  margin-top: 1px;
  color: var(--brand-secondary);
}

/* 底部结算栏 */
.cart-checkout {
  position: fixed;
  right: 0;
  bottom: calc(69px + env(safe-area-inset-bottom));
  left: 0;
  z-index: 45;
  padding: 0 12px;
  pointer-events: none;
}

.cart-checkout__inner {
  display: flex;
  align-items: center;
  gap: 10px;
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

.cart-checkout__select {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 4px 2px;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
}

.cart-checkout__sum {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  text-align: right;
}

.cart-checkout__sum strong {
  color: var(--brand-primary);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.2;
}

.cart-checkout__sum small {
  overflow: hidden;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 9.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cart-checkout__btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 12px 16px;
  border-radius: 13px;
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 750;
  box-shadow: 0 7px 16px rgba(23, 105, 170, 0.2);
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.cart-checkout__btn:hover:not(:disabled) {
  background-color: #125a93;
}

.cart-checkout__btn:disabled {
  background-color: #c3d5e4;
  box-shadow: none;
  cursor: not-allowed;
}

@media (min-width: 900px) {
  .cart-page {
    padding-bottom: 96px;
  }

  .cart-checkout {
    bottom: 20px;
    padding-inline: 24px;
  }
}

@media (max-width: 420px) {
  .cart-group__badge {
    display: none;
  }

  .cart-item {
    grid-template-columns: 20px 56px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .cart-item__media {
    width: 56px;
    height: 56px;
  }

  .cart-checkout__btn {
    padding-inline: 12px;
  }
}

@media (max-width: 350px) {
  .cart-checkout__select {
    font-size: 0;
    gap: 0;
  }
}
</style>
