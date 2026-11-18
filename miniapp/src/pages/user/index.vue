<script setup lang="ts">
import PageScaffold from '@/components/PageScaffold.vue'

function goOrders() {
  uni.navigateTo({ url: '/pages/order/list' })
}

function goAddress() {
  uni.navigateTo({ url: '/pages/address/list' })
}
</script>

<template>
  <PageScaffold title="我的" subtitle="重庆外语外事学院 · 校园外卖" tag="个人中心">
    <view class="profile-row">
      <view class="avatar">
        <text class="avatar-text">重外</text>
      </view>
      <view class="profile-text">
        <text class="cw-section-title">未登录</text>
        <text class="cw-muted profile-tip">微信登录将在后续任务接入</text>
      </view>
    </view>

    <view class="menu-list">
      <view class="menu-item" @tap="goOrders">
        <text>我的订单</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goAddress">
        <text>收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item">
        <text>关于平台</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </PageScaffold>
</template>

<style lang="scss" scoped>
.profile-row {
  display: flex;
  align-items: center;
}

.avatar {
  width: 104rpx;
  height: 104rpx;
  margin-right: 24rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1769aa 0%, #4e9fdf 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.profile-text {
  display: flex;
  flex-direction: column;
}

.profile-tip {
  margin-top: 8rpx;
}

.menu-list {
  margin-top: 32rpx;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #eef2f6;
  font-size: 28rpx;

  &:last-child {
    border-bottom: none;
  }
}

.menu-arrow {
  color: #c2ccd6;
  font-size: 34rpx;
}
</style>
