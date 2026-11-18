<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { getCategories, listMerchants } from '@/api/catalog'
import type { Category, Merchant } from '@/types/catalog'
import MerchantCard from '@/components/MerchantCard.vue'

const categories = ref<Category[]>([])
const merchants = ref<Merchant[]>([])
const total = ref(0)

const loading = ref(true)
const error = ref('')

const searchValue = ref('')
const activeKeyword = ref('')
const merchantLoading = ref(false)
const merchantError = ref('')

function toMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback
}

async function loadMerchants(): Promise<void> {
  merchantLoading.value = true
  merchantError.value = ''
  try {
    const page = await listMerchants({
      keyword: activeKeyword.value || undefined,
      page: 1,
      pageSize: 20,
    })
    merchants.value = page.list
    total.value = page.total
  } catch (e) {
    merchantError.value = toMessage(e, '商家加载失败，请重试')
  } finally {
    merchantLoading.value = false
  }
}

async function loadAll(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [categoryList, merchantPage] = await Promise.all([
      getCategories(),
      listMerchants({
        keyword: activeKeyword.value || undefined,
        page: 1,
        pageSize: 20,
      }),
    ])
    categories.value = categoryList
    merchants.value = merchantPage.list
    total.value = merchantPage.total
  } catch (e) {
    error.value = toMessage(e, '首页加载失败，请检查网络后重试')
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

function onSearch(): void {
  const keyword = searchValue.value.trim()
  if (keyword === activeKeyword.value) return
  activeKeyword.value = keyword
  void loadMerchants()
}

function clearSearch(): void {
  if (!searchValue.value && !activeKeyword.value) return
  searchValue.value = ''
  activeKeyword.value = ''
  void loadMerchants()
}

function openCategory(category: Category): void {
  uni.navigateTo({
    url: `/pages/merchant/list?categoryKey=${encodeURIComponent(category.key)}&categoryName=${encodeURIComponent(category.name)}`,
  })
}

function openMerchant(merchant: Merchant): void {
  uni.navigateTo({ url: `/pages/merchant/detail?id=${merchant.id}` })
}

onLoad(() => {
  void loadAll()
})

onPullDownRefresh(() => {
  void loadAll()
})
</script>

<template>
  <view class="home">
    <!-- 顶部校园区域 -->
    <view class="hero">
      <view class="hero__row">
        <view class="hero__logo">重外</view>
        <view class="hero__text">
          <text class="hero__title">重外校园外卖</text>
          <text class="hero__sub">重庆外语外事学院 · 校园专送</text>
        </view>
        <text class="hero__badge">学生端</text>
      </view>

      <!-- 搜索区域 -->
      <view class="search">
        <input
          v-model="searchValue"
          class="search__input"
          type="text"
          confirm-type="search"
          placeholder="搜索商家名称"
          placeholder-class="search__ph"
          @confirm="onSearch"
        />
        <text v-if="searchValue" class="search__clear" @tap="clearSearch">×</text>
        <text class="search__btn" @tap="onSearch">搜索</text>
      </view>
      <text class="search__hint">菜品搜索待后续接口支持</text>
    </view>

    <!-- 初次加载 -->
    <view v-if="loading" class="panel">
      <view class="skeleton-title" />
      <view class="skeleton-grid">
        <view v-for="i in 4" :key="i" class="skeleton-cat" />
      </view>
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="skeleton-cover" />
        <view class="skeleton-lines">
          <view class="skeleton-line" style="width: 50%" />
          <view class="skeleton-line" style="width: 80%" />
          <view class="skeleton-line" style="width: 34%" />
        </view>
      </view>
    </view>

    <!-- 首次加载失败 -->
    <view v-else-if="error" class="panel state-box">
      <text class="state-title">加载失败</text>
      <text class="state-desc">{{ error }}</text>
      <view class="state-btn" @tap="loadAll">重新加载</view>
    </view>

    <template v-else>
      <!-- 商品分类 -->
      <view class="panel">
        <view class="section-head">
          <text class="section-title">商品分类</text>
        </view>

        <view v-if="categories.length" class="category-grid">
          <view
            v-for="category in categories"
            :key="category.id"
            class="category-item"
            @tap="openCategory(category)"
          >
            <view class="category-icon">{{ category.name.slice(0, 1) }}</view>
            <text class="category-name">{{ category.name }}</text>
          </view>
        </view>
        <view v-else class="empty-box">暂无分类数据</view>
      </view>

      <!-- 推荐商家 / 搜索结果 -->
      <view class="panel">
        <view class="section-head">
          <text class="section-title">{{ activeKeyword ? '搜索结果' : '校园推荐' }}</text>
          <text class="section-count">共 {{ total }} 家</text>
        </view>
        <text v-if="activeKeyword" class="section-sub">关键词：{{ activeKeyword }}</text>

        <view v-if="merchantLoading" class="list-skeleton">
          <view v-for="i in 2" :key="i" class="skeleton-card">
            <view class="skeleton-cover" />
            <view class="skeleton-lines">
              <view class="skeleton-line" style="width: 46%" />
              <view class="skeleton-line" style="width: 70%" />
              <view class="skeleton-line" style="width: 30%" />
            </view>
          </view>
        </view>

        <view v-else-if="merchantError" class="state-box state-box--inner">
          <text class="state-desc">{{ merchantError }}</text>
          <view class="state-btn" @tap="loadMerchants">重新加载</view>
        </view>

        <view v-else-if="merchants.length">
          <MerchantCard
            v-for="merchant in merchants"
            :key="merchant.id"
            :merchant="merchant"
            @select="openMerchant"
          />
        </view>

        <view v-else class="empty-box">
          {{ activeKeyword ? '没有找到匹配的商家' : '暂无营业中的商家' }}
        </view>
      </view>
    </template>

    <view class="safe-bottom" />
  </view>
</template>

<style lang="scss" scoped>
.home {
  min-height: 100vh;
  padding-bottom: 40rpx;
  background-color: #f5f8fc;
}

.hero {
  padding: 28rpx 28rpx 56rpx;
  background: linear-gradient(135deg, #1769aa 0%, #4e9fdf 100%);
}

.hero__row {
  display: flex;
  align-items: center;
}

.hero__logo {
  width: 72rpx;
  height: 72rpx;
  margin-right: 20rpx;
  border-radius: 20rpx;
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-size: 26rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero__text {
  flex: 1;
  min-width: 0;
}

.hero__title {
  display: block;
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 700;
}

.hero__sub {
  display: block;
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.86);
  font-size: 22rpx;
}

.hero__badge {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background-color: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-size: 20rpx;
}

.search {
  display: flex;
  align-items: center;
  height: 76rpx;
  margin-top: 28rpx;
  padding: 0 12rpx 0 24rpx;
  border-radius: 38rpx;
  background-color: #ffffff;
}

.search__input {
  flex: 1;
  height: 76rpx;
  font-size: 26rpx;
  color: #1f2d3d;
}

.search__ph {
  color: #9aa9b6;
}

.search__clear {
  padding: 0 16rpx;
  color: #9aa9b6;
  font-size: 34rpx;
  line-height: 1;
}

.search__btn {
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 28rpx;
  background-color: #1769aa;
  color: #ffffff;
  font-size: 24rpx;
}

.search__hint {
  display: block;
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.7);
  font-size: 20rpx;
}

.panel {
  margin: 24rpx;
  padding: 28rpx;
  border-radius: 24rpx;
  background-color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(23, 105, 170, 0.06);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2d3d;
}

.section-count {
  font-size: 22rpx;
  color: #9aa9b6;
}

.section-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7a8b9a;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 20rpx;
}

.category-item {
  width: 25%;
  padding: 16rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.category-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #e8f2fb 0%, #d8e9f8 100%);
  color: #1769aa;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-name {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #1f2d3d;
}

.empty-box {
  padding: 56rpx 0 32rpx;
  text-align: center;
  color: #9aa9b6;
  font-size: 24rpx;
}

.state-box {
  padding: 64rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.state-box--inner {
  padding: 48rpx 24rpx;
}

.state-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2d3d;
}

.state-desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #7a8b9a;
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

/* 骨架屏，避免加载时大面积空白 */
.skeleton-title {
  width: 40%;
  height: 32rpx;
  border-radius: 8rpx;
  background-color: #eef2f6;
}

.skeleton-grid {
  display: flex;
  margin-top: 24rpx;
}

.skeleton-cat {
  width: 88rpx;
  height: 88rpx;
  margin-right: 48rpx;
  border-radius: 24rpx;
  background-color: #eef2f6;
}

.skeleton-card {
  display: flex;
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 24rpx;
  background-color: #f8fafc;
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

.safe-bottom {
  height: calc(24rpx + env(safe-area-inset-bottom));
}
</style>
