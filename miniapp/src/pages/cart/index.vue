<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'

function goShopping() {
  uni.switchTab({ url: '/pages/merchant/list' })
}
</script>

<template>
  <PageScaffold title="购物车" subtitle="重庆外语外事学院 · 校园外卖" tag="结算">
    <view class="cw-empty">购物车还是空的</view>
    <text class="cw-muted empty-tip">购物车数据将来自 GET /cart</text>
    <view class="cw-primary-btn" @tap="goShopping">去逛逛</view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.empty-tip {
  display: block;
  text-align: center;
}
</style>
