<script setup>
import { computed, ref } from 'vue'
import { Minus, Plus, UtensilsCrossed } from 'lucide-vue-next'
import {
  addToCart,
  decrementCartItem,
  getCartQuantity,
} from '@/utils/cart'
import { formatPrice } from '@/utils/format'

const props = defineProps({
  dish: {
    type: Object,
    required: true,
  },
})

const imageFailed = ref(false)
const quantity = computed(() =>
  getCartQuantity(props.dish.id, props.dish.merchantId),
)
</script>

<template>
  <article class="shop-dish-card card">
    <div class="shop-dish-card__media">
      <span class="shop-dish-card__fallback">
        <UtensilsCrossed :size="27" :stroke-width="1.6" />
      </span>
      <img
        v-if="props.dish.image && !imageFailed"
        :src="props.dish.image"
        :alt="`${props.dish.name}菜品图片`"
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      />
    </div>

    <div class="shop-dish-card__body">
      <div class="shop-dish-card__heading">
        <h3>{{ props.dish.name }}</h3>
        <span>月售 {{ props.dish.monthlySales }}</span>
      </div>
      <p class="shop-dish-card__description">{{ props.dish.description }}</p>

      <div class="shop-dish-card__footer">
        <span class="shop-dish-card__price">
          {{ formatPrice(props.dish.price) }}
        </span>

        <button
          v-if="quantity === 0"
          type="button"
          class="shop-dish-card__add"
          :aria-label="`将${props.dish.name}加入购物车`"
          @click="addToCart(props.dish)"
        >
          <Plus :size="14" :stroke-width="2.5" />
          加入
        </button>

        <div v-else class="shop-dish-card__stepper" aria-label="商品数量">
          <button
            type="button"
            :aria-label="`减少${props.dish.name}数量`"
            @click="decrementCartItem(props.dish.id, props.dish.merchantId)"
          >
            <Minus :size="13" :stroke-width="2.5" />
          </button>
          <span aria-live="polite">{{ quantity }}</span>
          <button
            type="button"
            :aria-label="`增加${props.dish.name}数量`"
            @click="addToCart(props.dish)"
          >
            <Plus :size="13" :stroke-width="2.5" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.shop-dish-card {
  display: grid;
  grid-template-columns: 94px minmax(0, 1fr);
  gap: 11px;
  padding: 10px;
}

.shop-dish-card__media {
  position: relative;
  align-self: start;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  border-radius: 13px;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.shop-dish-card__media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.shop-dish-card:hover .shop-dish-card__media img {
  transform: scale(1.04);
}

.shop-dish-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--brand-secondary);
}

.shop-dish-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shop-dish-card__heading h3 {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 750;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shop-dish-card__heading > span {
  display: block;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 9.5px;
}

.shop-dish-card__description {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 10.5px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.shop-dish-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  margin-top: auto;
  padding-top: 7px;
}

.shop-dish-card__price {
  color: var(--brand-primary);
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
}

.shop-dish-card__add {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 7px 10px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 10.5px;
  font-weight: 700;
  box-shadow: 0 5px 12px rgba(23, 105, 170, 0.18);
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.shop-dish-card__add:hover {
  background-color: #125a93;
  transform: translateY(-1px);
}

.shop-dish-card__stepper {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.shop-dish-card__stepper button {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.shop-dish-card__stepper button:last-child {
  background-color: var(--brand-primary);
  color: #ffffff;
}

.shop-dish-card__stepper span {
  min-width: 22px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 750;
  text-align: center;
}

@media (min-width: 700px) {
  .shop-dish-card {
    grid-template-columns: 122px minmax(0, 1fr);
    gap: 15px;
    padding: 13px;
  }

  .shop-dish-card__heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .shop-dish-card__heading h3 {
    font-size: 15px;
  }

  .shop-dish-card__heading > span {
    flex: none;
    margin-top: 0;
    font-size: 10.5px;
  }

  .shop-dish-card__description {
    font-size: 11.5px;
  }
}
</style>
