<script setup>
import { BadgeCheck, Clock3, Database, MapPin, Store } from 'lucide-vue-next'

const features = [
  {
    icon: MapPin,
    title: '校园配送',
    description: '面向重外校园场景，宿舍楼下取餐更省心。',
  },
  {
    icon: Store,
    title: '多商家点餐',
    description: '食堂、小吃、奶茶与水果轻食，一站下单。',
  },
  {
    icon: Database,
    title: '本地数据',
    description: '订单、购物车与地址保存在本地浏览器中。',
  },
]
</script>

<template>
  <div class="page container about-page">
    <section class="about-hero">
      <span class="about-hero__logo" aria-hidden="true">CW</span>
      <h1>重外校园外卖平台</h1>
      <p class="about-hero__en">CHONGWAI CAMPUS FOOD</p>
      <p class="about-hero__tagline">
        一部手机点遍校园美食，让校园生活更加便捷。
      </p>
    </section>

    <section class="card about-info">
      <div class="about-info__row">
        <span class="about-info__icon"><BadgeCheck :size="17" /></span>
        <div>
          <h2>平台定位</h2>
          <p>校园餐饮服务平台</p>
        </div>
      </div>
      <div class="about-info__row">
        <span class="about-info__icon"><Clock3 :size="17" /></span>
        <div>
          <h2>当前版本</h2>
          <p>V1.0.0</p>
        </div>
      </div>
      <div class="about-info__row">
        <span class="about-info__icon"><MapPin :size="17" /></span>
        <div>
          <h2>服务范围</h2>
          <p>重庆外语外事学院校内</p>
        </div>
      </div>
    </section>

    <section class="about-features">
      <article v-for="feature in features" :key="feature.title" class="card about-feature">
        <span class="about-feature__icon">
          <component :is="feature.icon" :size="20" :stroke-width="1.8" />
        </span>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </article>
    </section>

    <p class="about-note">
      本平台为课程演示版本，支付与订单状态均为前端模拟，不代表真实交易。
    </p>
  </div>
</template>

<style scoped>
.about-page {
  padding-bottom: 20px;
}

.about-hero {
  position: relative;
  overflow: hidden;
  padding: 30px 22px 26px;
  border-radius: 24px;
  background: linear-gradient(130deg, #1769aa 0%, #2878c8 60%, #4e9fdf 100%);
  color: #ffffff;
  text-align: center;
  box-shadow: 0 16px 34px rgba(23, 105, 170, 0.22);
}

.about-hero::after {
  content: "";
  position: absolute;
  top: -80px;
  right: -60px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.about-hero__logo {
  display: inline-grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-bottom: 12px;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 0.18);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.about-hero h1 {
  font-size: 21px;
  font-weight: 800;
}

.about-hero__en {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.about-hero__tagline {
  max-width: 300px;
  margin: 12px auto 0;
  color: rgba(255, 255, 255, 0.92);
  font-size: 12.5px;
  line-height: 1.75;
}

.about-info {
  display: grid;
  margin-top: 14px;
  padding: 4px 16px;
}

.about-info__row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px 0;
}

.about-info__row + .about-info__row {
  border-top: 1px solid var(--border-soft);
}

.about-info__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.about-info__row h2 {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
}

.about-info__row p {
  margin-top: 2px;
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 700;
}

.about-features {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.about-feature {
  padding: 15px 16px;
}

.about-feature__icon {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.about-feature h3 {
  margin-top: 9px;
  font-size: 13px;
  font-weight: 750;
}

.about-feature p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.7;
}

.about-note {
  margin-top: 16px;
  padding: 11px 13px;
  border-radius: 12px;
  background-color: var(--brand-soft);
  color: var(--brand-secondary);
  font-size: 10.5px;
  line-height: 1.7;
  text-align: center;
}

@media (min-width: 700px) {
  .about-features {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
