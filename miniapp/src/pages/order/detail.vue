<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'
</script>

<template>
  <PageScaffold title="订单详情" subtitle="重庆外语外事学院 · 校园外卖" tag="详情">
    <view class="steps">
      <text class="step is-active">待接单</text>
      <text class="step">制作中</text>
      <text class="step">配送中</text>
      <text class="step">已完成</text>
    </view>

    <view class="cw-empty">
      订单明细将来自 GET /orders/:id，当前为页面骨架
    </view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.steps {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step {
  color: #9aa9b6;
  font-size: 24rpx;

  &.is-active {
    color: #1769aa;
    font-weight: 600;
  }
}
</style>
