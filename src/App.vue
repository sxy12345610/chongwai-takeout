<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppTabBar from '@/components/AppTabBar.vue'

const route = useRoute()

/** 管理后台使用独立布局，不显示学生端顶部栏与底部导航。 */
const isAdmin = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--admin': isAdmin }">
    <AppHeader v-if="!isAdmin" />

    <main class="app-main" :class="{ 'app-main--admin': isAdmin }">
      <RouterView />
    </main>

    <AppTabBar v-if="!isAdmin" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--page-bg);
}

.app-shell--admin {
  background-color: #f7fafd;
}

.app-main {
  flex: 1;
  padding-bottom: calc(var(--tabbar-height) + 24px + env(safe-area-inset-bottom));
}

.app-main--admin {
  padding-bottom: 0;
}

@media (min-width: 900px) {
  .app-main {
    padding-bottom: 56px;
  }

  .app-main--admin {
    padding-bottom: 0;
  }
}
</style>
