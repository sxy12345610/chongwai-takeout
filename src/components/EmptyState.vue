<script setup>
import { SearchX } from 'lucide-vue-next'

defineProps({
  icon: {
    type: [Object, Function],
    default: SearchX,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="empty-state card">
    <span class="empty-state__icon">
      <component :is="icon" :size="26" :stroke-width="1.8" />
    </span>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 38px 20px;
  text-align: center;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 12px;
  border-radius: 18px;
  background-color: var(--brand-soft);
  color: var(--brand-primary);
}

.empty-state h3 {
  font-size: 15px;
  font-weight: 700;
}

.empty-state p {
  margin: 4px 0 16px;
  color: var(--text-secondary);
  font-size: 12.5px;
}
</style>
