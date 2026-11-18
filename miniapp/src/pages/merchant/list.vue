<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { listMerchants } from '@/api/catalog'
import type { Merchant } from '@/types/catalog'
import MerchantCard from '@/components/MerchantCard.vue'

type FilterType = 'all' | 'open'

const PAGE_SIZE = 20

const merchants = ref<Merchant[]>([])
const total = ref(0)
const page = ref(1)

const filter = ref<FilterType>('all')
const categoryKey = ref('')
const categoryName = ref('')
const keyword = ref('')

const loading = ref(true)
const loadingMore = ref(false)
const error = ref('')

let requestSeq = 0

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

async function fetchPage(targetPage: number, append: boolean): Promise<void> {
  const seq = ++requestSeq
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
    error.value = ''
  }

  try {
    const result = await listMerchants({
      categoryKey: categoryKey.value || undefined,
      keyword: keyword.value || undefined,
      isOpen: filter.value === 'open' ? true : undefined,
      page: targetPage,
      pageSize: PAGE_SIZE,
    })
    if (seq !== requestSeq) return
    merchants.value = append ? merchants.value.concat(result.list) : result.list
    total.value = result.total
    page.value = result.page
  } catch (e) {
    if (seq !== requestSeq) return
    if (append) {
      uni.showToast({ title: toMessage(e, '加载更多失败'), icon: 'none' })
    } else {
      error.value = toMessage(e, '商家加载失败，请重试')
    }
  } finally {
    if (seq === requestSeq) {
      loading.value = false
      loadingMore.value = false
    }
    uni.stopPullDownRefresh()
  }
}

function switchFilter(next: FilterType): void {
  if (filter.value === next) return
  filter.value = next
  void fetchPage(1, false)
}

function retry(): void {
  void fetchPage(1, false)
}

function openMerchant(merchant: Merchant): void {
  uni.navigateTo({ url: `/pages/merchant/detail?id=${merchant.id}` })
}

onLoad((options) => {
  categoryKey.value = options?.categoryKey ? decodeURIComponent(options.categoryKey) : ''
  categoryName.value = options?.categoryName ? decodeURIComponent(options.categoryName) : ''
  keyword.value = options?.keyword ? decodeURIComponent(options.keyword) : ''
  void fetchPage(1, false)
})

onPullDownRefresh(() => {
  void fetchPage(1, false)
})

onReachBottom(() => {
  if (loading.value || loadingMore.value || error.value) return
  if (merchants.value.length >= total.value) return
  void fetchPage(page.value + 1, true)
})
</script>

<template>
  <view class="shop-page">
    <view class="header">
      <view class="header__row">
        <view>
          <text class="header__title">{{ categoryName || '校园商家' }}</text>
          <text class="header__sub">重庆外语外事学院 · 校园专送</text>
        </view>
        <text class="header__count">共 {{ total }} 家</text>
      </view>

      <view class="filter-row">
        <text class="filter-item" :class="{ 'is-active': filter === 'all' }" @tap="switchFilter('all')">
          全部
        </text>
        <text class="filter-item" :class="{ 'is-active': filter === 'open' }" @tap="switchFilter('open')">
          营业中
        </text>
      </view>
      <text v-if="keyword" class="keyword-tip">关键词：{{ keyword }}</text>
    </view>

    <view v-if="loading" class="list-wrap">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="skeleton-cover" />
        <view class="skeleton-lines">
          <view class="skeleton-line" style="width: 50%" />
          <view class="skeleton-line" style="width: 78%" />
          <view class="skeleton-line" style="width: 32%" />
        </view>
      </view>
    </view>

    <view v-else-if="error" class="state-box">
      <text class="state-title">加载失败</text>
      <text class="state-desc">{{ error }}</text>
      <view class="state-btn" @tap="retry">重新加载</view>
    </view>

    <view v-else-if="merchants.length" class="list-wrap">
      <MerchantCard
        v-for="merchant in merchants"
        :key="merchant.id"
        :merchant="merchant"
        @select="openMerchant"
      />

      <view class="list-footer">
        <text v-if="loadingMore" class="cw-muted">正在加载...</text>
        <text v-else-if="merchants.length >= total" class="cw-muted">已经到底了</text>
        <text v-else class="cw-muted">上拉加载更多</text>
      </view>
    </view>

    <view v-else class="state-box">
      <text class="state-desc">{{ filter === 'open' ? '当前没有营业中的商家' : '暂无商家数据' }}</text>
      <view class="state-btn" @tap="retry">刷新试试</view>
    </view>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.shop-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background-color: #f5f8fc;
}

.header {
  padding: 32rpx 28rpx 28rpx;
  background: linear-gradient(135deg, #1769aa 0%, #4e9fdf 100%);
}

.header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.header__title {
  display: block;
  color: #ffffff;
  font-size: 38rpx;
  font-weight: 700;
  max-width: 460rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header__sub {
  display: block;
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
}

.header__count {
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
}

.filter-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}

.filter-item {
  margin-right: 16rpx;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 24rpx;

  &.is-active {
    background-color: #ffffff;
    color: #1769aa;
    font-weight: 600;
  }
}

.keyword-tip {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.8);
  font-size: 20rpx;
}

.list-wrap {
  padding: 0 24rpx;
}

.skeleton-card {
  display: flex;
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
}

.skeleton-cover {
  flex-shrink: 0;
  width: 168rpx;
  height: 168rpx;
  margin-right: 24rpx;
  border-radius: 20rpx;
  background-color: #eef2f6;
}

.skeleton-lines {
  flex: 1;
  padding-top: 8rpx;
}

.skeleton-line {
  height: 24rpx;
  margin-bottom: 20rpx;
  border-radius: 12rpx;
  background-color: #eef2f6;
}

.list-footer {
  padding: 32rpx 0 8rpx;
  text-align: center;
}

.state-box {
  margin: 24rpx;
  padding: 72rpx 32rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.state-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}

.state-desc {
  margin-top: 12rpx;
  color: #7a8b9a;
  font-size: 24rpx;
  text-align: center;
  word-break: break-all;
}

.state-btn {
  margin-top: 28rpx;
  padding: 0 48rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  background-color: #1769aa;
  color: #ffffff;
  font-size: 26rpx;
}

.safe-bottom {
  height: calc(24rpx + env(safe-area-inset-bottom));
}
</style>
