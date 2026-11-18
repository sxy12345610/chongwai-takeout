<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'

function goAddress() {
  uni.navigateTo({ url: '/pages/address/list' })
}
</script>

<template>
  <PageScaffold title="确认订单" subtitle="重庆外语外事学院 · 校园外卖" tag="提交">
    <view class="address-box" @tap="goAddress">
      <text class="cw-section-title">收货地址</text>
      <text class="cw-muted address-tip">尚未选择收货地址，点击前往地址管理</text>
    </view>

    <view class="amount-box">
      <view class="amount-row">
        <text class="cw-muted">商品小计</text>
        <text class="amount-value">--</text>
      </view>
      <view class="amount-row">
        <text class="cw-muted">配送费</text>
        <text class="amount-value">--</text>
      </view>
      <view class="amount-row is-total">
        <text>合计</text>
        <text class="amount-value">--</text>
      </view>
    </view>

    <view class="cw-empty">金额与商品明细将在接入购物车接口后展示</view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.address-tip {
  display: block;
  margin-top: 12rpx;
}

.amount-box {
  margin-top: 32rpx;
  padding: 24rpx 0;
  border-top: 1rpx solid #eef2f6;
  border-bottom: 1rpx solid #eef2f6;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;

  &.is-total {
    font-weight: 600;
  }
}

.amount-value {
  color: #e8543f;
  font-weight: 600;
}
</style>
