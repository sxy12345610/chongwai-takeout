<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Merchant } from '@/types/catalog'
import { formatDeliveryFee, formatMinOrder, formatRating, formatSales, resolveShopImage } from '@/utils/display'

const props = defineProps<{ merchant: Merchant }>()
const emit = defineEmits<{ (e: 'select', merchant: Merchant): void }>()

const broken = ref(false)
const imageSrc = computed(() => resolveShopImage(props.merchant.imageUrl))
const coverStyle = computed(() => {
  const from = props.merchant.coverFrom || '#1769aa'
  const to = props.merchant.coverTo || '#4e9fdf'
  return { background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }
})
</script>

<template>
  <view class="shop-card" @tap="emit('select', merchant)">
    <view class="shop-cover" :style="coverStyle">
      <image
        v-if="imageSrc && !broken"
        class="shop-cover__img"
        :src="imageSrc"
        mode="aspectFill"
        @error="broken = true"
      />
      <text v-else class="shop-cover__initial">{{ merchant.name.slice(0, 1) }}</text>
      <view class="status-badge" :class="merchant.isOpen ? 'is-open' : 'is-closed'">
        {{ merchant.isOpen ? '营业中' : '休息中' }}
      </view>
    </view>

    <view class="shop-body">
      <view class="shop-title-row">
        <text class="shop-name">{{ merchant.name }}</text>
        <text class="shop-rating">★ {{ formatRating(merchant.rating) }}</text>
      </view>

      <text v-if="merchant.description" class="shop-desc">{{ merchant.description }}</text>

      <view class="shop-meta">
        <text class="shop-sales">{{ formatSales(merchant.monthlySales) }}</text>
        <text class="shop-dot">·</text>
        <text class="shop-delivery">{{ merchant.deliveryTimeMin }}分钟</text>
      </view>

      <view class="shop-footer">
        <text class="shop-min-order">{{ formatMinOrder(merchant.minOrderCents) }}</text>
        <text class="shop-fee">{{ formatDeliveryFee(merchant.deliveryFeeCents) }}</text>
      </view>

      <view v-if="merchant.tags && merchant.tags.length" class="shop-tags">
        <text v-for="tag in merchant.tags.slice(0, 2)" :key="tag" class="shop-tag">{{ tag }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.shop-card {
  display: flex;
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(23, 105, 170, 0.06);
}

.shop-cover {
  position: relative;
  flex-shrink: 0;
  width: 168rpx;
  height: 168rpx;
  margin-right: 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-cover__img {
  width: 100%;
  height: 100%;
}

.shop-cover__initial {
  color: #ffffff;
  font-size: 56rpx;
  font-weight: 700;
  opacity: 0.9;
}

.status-badge {
  position: absolute;
  left: 0;
  top: 0;
  padding: 4rpx 12rpx;
  border-bottom-right-radius: 16rpx;
  font-size: 20rpx;
  color: #ffffff;

  &.is-open {
    background-color: rgba(46, 158, 91, 0.92);
  }

  &.is-closed {
    background-color: rgba(122, 139, 154, 0.92);
  }
}

.shop-body {
  flex: 1;
  min-width: 0;
}

.shop-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.shop-name {
  max-width: 340rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shop-rating {
  flex-shrink: 0;
  font-size: 24rpx;
  color: #f0a020;
}

.shop-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9aa9b6;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.shop-meta {
  display: flex;
  align-items: center;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #7a8b9a;
}

.shop-dot {
  margin: 0 8rpx;
}

.shop-footer {
  display: flex;
  align-items: center;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #1769aa;
}

.shop-fee {
  margin-left: 16rpx;
  color: #7a8b9a;
}

.shop-tags {
  display: flex;
  margin-top: 12rpx;
}

.shop-tag {
  margin-right: 12rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background-color: #eef5fb;
  color: #1769aa;
  font-size: 20rpx;
}
</style>
