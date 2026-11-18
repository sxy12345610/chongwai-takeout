<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 应用启动；后续在此恢复登录态（读取本地 token 并校验）
})
</script>

<!-- 重外校园外卖 · 全局样式与主题变量 -->
<style lang="scss">
page {
  background-color: #f5f8fb;
  color: #1f2d3d;
  font-size: 28rpx;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 蓝白主视觉基础类 */
.cw-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 24rpx 24rpx 48rpx;
  background-color: #f5f8fb;
}

.cw-hero {
  display: flex;
  align-items: center;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1769aa 0%, #4e9fdf 100%);
  color: #ffffff;
}

.cw-hero__logo {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  margin-right: 24rpx;
  border-radius: 24rpx;
  background-color: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.cw-hero__title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
}

.cw-hero__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.86;
}

.cw-card {
  margin-top: 24rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(23, 105, 170, 0.06);
}

.cw-section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}

.cw-muted {
  color: #7a8b9a;
  font-size: 24rpx;
}

.cw-primary-btn {
  margin-top: 32rpx;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #1769aa 0%, #4e9fdf 100%);
  color: #ffffff;
  font-size: 30rpx;
  text-align: center;
}

.cw-empty {
  padding: 80rpx 0;
  text-align: center;
  color: #9aa9b6;
  font-size: 26rpx;
}

.cw-chip {
  display: inline-flex;
  align-items: center;
  padding: 10rpx 24rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background-color: #eef5fb;
  color: #1769aa;
  font-size: 24rpx;
}

.cw-skeleton {
  height: 24rpx;
  margin-top: 16rpx;
  border-radius: 12rpx;
  background-color: #eef2f6;
}
</style>
