<script setup>
import { computed, ref } from 'vue'
import { Plus, UtensilsCrossed } from 'lucide-vue-next'
import { addToCart, getCartQuantity } from '@/utils/cart'
import { formatPrice } from '@/utils/format'

const props = defineProps({
  dish: {
    type: Object,
    required: true,
  },
})

const quantity = computed(() =>
  getCartQuantity(props.dish.id, props.dish.merchantId),
)
const imageFailed = ref(false)
</script>

<template>
  <article class="dish-card">
    <div class="dish-card__media">
      <img
        v-if="props.dish.image && !imageFailed"
        :src="props.dish.image"
        :alt="`${props.dish.name}菜品图片`"
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      />
      <span v-else class="dish-card__fallback">
        <UtensilsCrossed :size="30" :stroke-width="1.6" />
      </span>
      <span class="dish-card__merchant">{{ props.dish.merchantName }}</span>
    </div>

    <div class="dish-card__body">
      <h3>{{ props.dish.name }}</h3>

      <div class="dish-card__footer">
        <span class="dish-card__price">{{ formatPrice(props.dish.price) }}</span>
        <button
          type="button"
          class="dish-card__add"
          :class="{ 'is-added': quantity > 0 }"
          :aria-label="`将${props.dish.name}加入购物车`"
          @click="addToCart(props.dish)"
        >
          <Plus :size="14" :stroke-width="2.4" />
          <span>{{ quantity > 0 ? `已加 ${quantity}` : '加入' }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.dish-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background-color: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.dish-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}

.dish-card__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: linear-gradient(135deg, #dcecfb, #eaf4ff);
}

.dish-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.dish-card:hover .dish-card__media img {
  transform: scale(1.04);
}

.dish-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--brand-secondary);
}

.dish-card__merchant {
  position: absolute;
  left: 8px;
  bottom: 8px;
  max-width: calc(100% - 16px);
  overflow: hidden;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.9);
  color: var(--brand-primary);
  font-size: 9.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  backdrop-filter: blur(6px);
}

.dish-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 10px 11px 12px;
}

.dish-card__body h3 {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dish-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: auto;
}

.dish-card__price {
  color: var(--brand-primary);
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dish-card__add {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 7px 10px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.dish-card__add:hover {
  background-color: #d9ecff;
  transform: translateY(-1px);
}

.dish-card__add.is-added {
  background-color: var(--brand-primary);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.22);
}

@media (max-width: 360px) {
  .dish-card__add {
    padding: 7px 8px;
    font-size: 10.5px;
  }
}
</style>
