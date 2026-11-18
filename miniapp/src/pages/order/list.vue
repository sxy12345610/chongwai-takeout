<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'
</script>

<template>
  <PageScaffold title="我的订单" subtitle="重庆外语外事学院 · 校园外卖" tag="订单">
    <view class="tab-row">
      <text class="tab-item is-active">全部</text>
      <text class="tab-item">待处理</text>
      <text class="tab-item">配送中</text>
      <text class="tab-item">已完成</text>
    </view>

    <view class="cw-empty">
      订单数据将来自 GET /orders，当前为页面骨架
    </view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.tab-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tab-item {
  padding: 10rpx 20rpx;
  color: #7a8b9a;
  font-size: 26rpx;

  &.is-active {
    color: #1769aa;
    font-weight: 600;
  }
}
</style>
