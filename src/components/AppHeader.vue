<script setup>
import { Bell } from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import logoUrl from '@/assets/logo.svg'
import { primaryNav } from '@/data/navigation'

const route = useRoute()

function isActive(path) {
  if (path === '/shops' && route.path.startsWith('/shop/')) return true
  if (path === '/orders' && route.path.startsWith('/order/')) return true
  if (path === '/profile' && ['/address', '/about'].includes(route.path)) {
    return true
  }
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}
</script>

<template>
  <header class="app-header">
    <div class="container app-header__inner">
      <RouterLink to="/" class="brand" aria-label="重外校园外卖平台首页">
        <img class="brand__logo" :src="logoUrl" alt="" />
        <span class="brand__text">
          <strong>重外校园外卖</strong>
          <small>CHONGWAI CAMPUS FOOD</small>
        </span>
      </RouterLink>

      <nav class="app-nav" aria-label="主导航">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="app-nav__link"
          :class="{ 'is-active': isActive(item.to) }"
        >
          <component :is="item.icon" :size="17" :stroke-width="1.9" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="app-header__actions">
        <button
          class="notice-button"
          type="button"
          aria-label="消息通知（即将上线）"
          title="消息通知即将上线"
        >
          <Bell :size="19" :stroke-width="1.9" />
          <span class="notice-button__dot" aria-hidden="true"></span>
        </button>
        <span class="avatar" aria-hidden="true">重</span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(230, 239, 248, 0.9);
  backdrop-filter: blur(16px);
}

.app-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: var(--header-height);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  border-radius: 12px;
}

.brand__logo {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.22);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.brand__text strong {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.brand__text small {
  font-size: 8.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text-secondary);
  white-space: nowrap;
}

.app-nav {
  display: none;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-soft);
}

.app-nav__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 13px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  color: #5b6e83;
  transition: color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.app-nav__link:hover {
  color: var(--brand-primary);
}

.app-nav__link.is-active {
  background-color: #ffffff;
  color: var(--brand-primary);
  box-shadow: 0 4px 12px rgba(23, 105, 170, 0.12);
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notice-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
  transition: transform 0.2s ease;
}

.notice-button:hover {
  transform: translateY(-1px);
}

.notice-button__dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #f2a23c;
  box-shadow: 0 0 0 2px #ffffff;
}

.avatar {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-secondary), var(--brand-primary));
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 6px 14px rgba(23, 105, 170, 0.22);
}

@media (min-width: 900px) {
  .app-nav {
    display: flex;
  }
}

@media (max-width: 420px) {
  .brand__text small {
    display: none;
  }
}
</style>
