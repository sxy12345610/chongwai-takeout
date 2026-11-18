<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  tag?: string
}>()
</script>

<template>
  <view class="cw-page">
    <view class="cw-hero">
      <view class="cw-hero__logo">重外</view>
      <view class="hero-text">
        <text class="cw-hero__title">{{ title }}</text>
        <text class="cw-hero__sub">{{ subtitle || '重庆外语外事学院 · 校园外卖' }}</text>
      </view>
      <text v-if="tag" class="hero-tag">{{ tag }}</text>
    </view>

    <view class="cw-card">
      <slot />
      <view class="build-note">
        <text class="cw-muted">页面骨架已就绪，业务数据将在后续任务接入真实后端 API。</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-tag {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.2);
  font-size: 22rpx;
}

.build-note {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #eef2f6;
}
</style>
