<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { primaryNav } from '@/data/navigation'
import { cartCount } from '@/utils/cart'

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
  <nav class="tabbar" aria-label="底部快捷导航">
    <RouterLink
      v-for="item in primaryNav"
      :key="item.to"
      :to="item.to"
      class="tabbar__item"
      :class="{ 'is-active': isActive(item.to) }"
    >
      <span class="tabbar__icon">
        <component :is="item.icon" :size="22" :stroke-width="1.8" />
        <span
          v-if="item.to === '/cart' && cartCount > 0"
          class="tabbar__badge"
          aria-label="购物车商品数量"
        >
          {{ cartCount > 99 ? '99+' : cartCount }}
        </span>
      </span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 2px;
  padding: 7px 8px calc(7px + env(safe-area-inset-bottom));
  background-color: rgba(255, 255, 255, 0.95);
  border-top: 1px solid var(--border-soft);
  box-shadow: 0 -10px 30px rgba(23, 105, 170, 0.06);
  backdrop-filter: blur(18px);
}

.tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 5px 2px 3px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.tabbar__item:hover {
  color: var(--brand-primary);
}

.tabbar__item.is-active {
  color: var(--brand-primary);
  background-color: var(--brand-soft);
}

.tabbar__icon {
  position: relative;
  display: grid;
  place-items: center;
}

.tabbar__badge {
  position: absolute;
  top: -5px;
  right: -11px;
  display: grid;
  place-items: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-pill);
  background-color: var(--brand-primary);
  color: #ffffff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 2px solid #ffffff;
}

@media (min-width: 900px) {
  .tabbar {
    display: none;
  }
}
</style>
