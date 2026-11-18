<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'
</script>

<template>
  <PageScaffold title="商家详情" subtitle="重庆外语外事学院 · 校园外卖" tag="菜单">
    <view class="merchant-box">
      <text class="cw-section-title">商家信息</text>
      <view class="cw-skeleton" style="width: 56%" />
      <view class="cw-skeleton" style="width: 76%" />
      <text class="cw-muted merchant-tip">
        将通过 GET /merchants/:id 与 GET /merchants/:id/products 获取真实数据
      </text>
    </view>

    <view class="cw-empty">商品列表待接入</view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.merchant-tip {
  display: block;
  margin-top: 20rpx;
}
</style>
