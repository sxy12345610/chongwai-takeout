<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'

function onAddAddress() {
  uni.showToast({ title: '地址表单将在后续任务接入', icon: 'none' })
}
</script>

<template>
  <PageScaffold title="收货地址" subtitle="重庆外语外事学院 · 校园外卖" tag="地址管理">
    <view class="cw-empty">还没有收货地址</view>
    <text class="cw-muted empty-tip">地址数据将来自 GET /addresses</text>

    <view class="cw-primary-btn" @tap="onAddAddress">新增地址</view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.empty-tip {
  display: block;
  text-align: center;
}
</style>
