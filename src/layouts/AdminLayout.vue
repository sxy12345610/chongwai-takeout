<script setup>
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Store,
  Tags,
  Users,
  UtensilsCrossed,
} from 'lucide-vue-next'
import '@/styles/admin.css'
import { getUser, logout } from '@/api/auth'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const router = useRouter()
const adminUser = ref(getUser())
const { toasts } = useToast()

const navItems = [
  { label: '后台首页', to: '/admin', icon: LayoutDashboard },
  { label: '订单管理', to: '/admin/orders', icon: ClipboardList },
  { label: '商品管理', to: '/admin/products', icon: UtensilsCrossed },
  { label: '店铺管理', to: '/admin/shops', icon: Store },
  { label: '用户管理', to: '/admin/users', icon: Users },
  { label: '分类管理', to: '/admin/categories', icon: Tags },
  { label: '数据统计', to: '/admin/statistics', icon: BarChart3 },
]

const pageTitle = computed(() => route.meta.title || '平台管理后台')

function isActive(item) {
  return item.to === '/admin'
    ? route.path === '/admin'
    : route.path.startsWith(item.to)
}

function onLogout() {
  logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <RouterLink to="/admin" class="admin-brand">
        <span class="admin-brand__logo">CW</span>
        <span class="admin-brand__text">
          <strong>重外商家后台</strong>
          <small>CHONGWAI MERCHANT</small>
        </span>
      </RouterLink>

      <nav class="admin-nav" aria-label="后台导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="admin-nav__item"
          :class="{ 'is-active': isActive(item) }"
        >
          <component :is="item.icon" :size="17" :stroke-width="1.9" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <RouterLink to="/" class="admin-back">
        <ArrowLeft :size="16" />
        返回学生端
      </RouterLink>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <div class="admin-topbar__title">
          <h1>{{ pageTitle }}</h1>
          <p>重外校园外卖平台 · 管理后台（数据来自 PostgreSQL）</p>
        </div>

        <div class="admin-user">
          <span class="admin-user__avatar">{{ (adminUser?.nickname || 'A').slice(0, 1) }}</span>
          <div class="admin-user__meta">
            <strong>{{ adminUser?.nickname || '管理员' }}</strong>
            <small>{{ adminUser?.phone || '' }}</small>
          </div>
          <button type="button" class="admin-user__logout" title="退出登录" @click="onLogout">
            <LogOut :size="14" />
          </button>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>

      <div class="admin-toasts">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="admin-toast"
          :class="`is-${t.type}`"
        >
          {{ t.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: #f7fafd;
}

/* 左侧导航 */
.admin-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  width: 224px;
  padding: 20px 14px;
  background: linear-gradient(180deg, #0f3c63 0%, #1769aa 100%);
  color: #ffffff;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.admin-brand__logo {
  display: grid;
  flex: none;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.16);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.admin-brand__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-brand__text strong {
  font-size: 13.5px;
  font-weight: 700;
}

.admin-brand__text small {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 8px;
  letter-spacing: 0.1em;
}

.admin-nav {
  display: grid;
  gap: 4px;
  margin-top: 16px;
}

.admin-nav__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 11px;
  color: rgba(255, 255, 255, 0.76);
  font-size: 12.5px;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.admin-nav__item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.admin-nav__item.is-active {
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  box-shadow: inset 3px 0 0 #ffffff;
}

.admin-back {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: auto;
  padding: 10px 12px;
  border-radius: 11px;
  background-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.admin-back:hover {
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

/* 主区域 */
.admin-main {
  flex: 1;
  min-width: 0;
  margin-left: 224px;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 15px 24px;
  border-bottom: 1px solid #e4eef7;
  background-color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
}

.admin-topbar__title h1 {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.admin-topbar__title p {
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 10.5px;
}

.admin-user {
  display: flex;
  flex: none;
  align-items: center;
  gap: 9px;
  padding: 6px 12px 6px 7px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-pill);
  background-color: #ffffff;
}

.admin-user__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1769aa, #4e9fdf);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.admin-user strong {
  display: block;
  font-size: 11px;
  font-weight: 700;
}

.admin-user small {
  color: var(--text-secondary);
  font-size: 9px;
}

.admin-content {
  padding: 22px 24px 32px;
}

@media (max-width: 900px) {
  .admin-layout {
    flex-direction: column;
  }

  .admin-sidebar {
    position: static;
    width: 100%;
    padding: 14px;
  }

  .admin-brand {
    padding-bottom: 12px;
  }

  .admin-nav {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin-top: 12px;
    padding-bottom: 2px;
    scrollbar-width: none;
  }

  .admin-nav::-webkit-scrollbar {
    display: none;
  }

  .admin-nav__item {
    flex: none;
    padding: 8px 12px;
    font-size: 11.5px;
    white-space: nowrap;
  }

  .admin-nav__item.is-active {
    box-shadow: inset 0 -3px 0 #ffffff;
  }

  .admin-back {
    margin-top: 10px;
  }

  .admin-main {
    margin-left: 0;
  }

  .admin-topbar {
    position: static;
    padding: 13px 16px;
  }

  .admin-topbar__title h1 {
    font-size: 15px;
  }

  .admin-topbar__title p {
    display: none;
  }

  .admin-content {
    padding: 16px 14px 24px;
  }
}
</style>
