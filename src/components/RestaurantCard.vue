<script setup>
import { ref } from 'vue'
import { Clock, Star } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import { formatDeliveryFee, formatPrice } from '@/utils/format'

const props = defineProps({
  merchant: {
    type: Object,
    required: true,
  },
  icon: {
    type: [Object, Function],
    default: null,
  },
})

const imageFailed = ref(false)
</script>

<template>
  <RouterLink
    class="merchant-card"
    :to="`/shop/${props.merchant.id}`"
    :aria-label="`查看 ${props.merchant.name} 商家详情`"
  >
    <div
      class="merchant-card__cover"
      :style="{
        backgroundImage: `linear-gradient(135deg, ${props.merchant.cover.from}, ${props.merchant.cover.to})`,
      }"
    >
      <img
        v-if="props.merchant.image && !imageFailed"
        :src="props.merchant.image"
        :alt="`${props.merchant.name}美食图片`"
        loading="lazy"
        decoding="async"
        @error="imageFailed = true"
      />
      <span v-else class="merchant-card__fallback">
        <component :is="props.icon" :size="34" :stroke-width="1.6" />
      </span>
      <span
        class="merchant-card__status"
        :class="{ 'is-closed': !props.merchant.isOpen }"
      >
        <i aria-hidden="true"></i>
        {{ props.merchant.isOpen ? '营业中' : '休息中' }}
      </span>
      <span class="merchant-card__time">
        <Clock :size="11" />
        {{ props.merchant.deliveryTime }} 分钟
      </span>
    </div>

    <div class="merchant-card__body">
      <h3>{{ props.merchant.name }}</h3>

      <p class="merchant-card__stats">
        <span class="merchant-card__rating">
          <Star :size="12" fill="currentColor" :stroke-width="1.5" />
          {{ props.merchant.rating.toFixed(1) }}
        </span>
        <span>月售 {{ props.merchant.monthlySales }}</span>
      </p>

      <ul class="merchant-card__tags">
        <li v-for="tag in props.merchant.tags" :key="tag">{{ tag }}</li>
      </ul>

      <div class="merchant-card__meta">
        <span>起送 {{ formatPrice(props.merchant.minOrder) }}</span>
        <span>{{ formatDeliveryFee(props.merchant.deliveryFee) }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.merchant-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background-color: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: 18px;
  box-shadow: var(--shadow-sm);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.merchant-card:hover {
  transform: translateY(-3px);
  border-color: rgba(23, 105, 170, 0.22);
  box-shadow: var(--shadow-hover);
}

.merchant-card__cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background-position: center;
  background-size: cover;
}

.merchant-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.merchant-card:hover .merchant-card__cover img {
  transform: scale(1.04);
}

.merchant-card__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.92);
}

.merchant-card__status {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--radius-pill);
  background-color: rgba(255, 255, 255, 0.92);
  color: #218365;
  font-size: 9.5px;
  font-weight: 700;
  backdrop-filter: blur(6px);
}

.merchant-card__status i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: #2eaa82;
}

.merchant-card__status.is-closed {
  color: #7b8793;
}

.merchant-card__status.is-closed i {
  background-color: #9aa6b2;
}

.merchant-card__time {
  position: absolute;
  left: 8px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  background-color: rgba(15, 40, 66, 0.55);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  backdrop-filter: blur(6px);
}

.merchant-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 10px 12px 12px;
}

.merchant-card__body h3 {
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.merchant-card__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px 8px;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.merchant-card__rating {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #f0a12f;
  font-weight: 700;
}

.merchant-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.merchant-card__tags li {
  padding: 1px 6px;
  border-radius: 5px;
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 9.5px;
  white-space: nowrap;
}

.merchant-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
}

.merchant-card__meta span:first-child {
  color: var(--text-primary);
  font-weight: 600;
}
</style>
