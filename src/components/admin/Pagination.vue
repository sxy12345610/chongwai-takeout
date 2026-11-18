<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 20 },
  total: { type: Number, default: 0 },
})
const emit = defineEmits(['update:page'])

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

function go(page) {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('update:page', page)
}
</script>

<template>
  <div v-if="total > 0" class="admin-pager">
    <span class="admin-pager__info">
      第 {{ from }}–{{ to }} 条 / 共 {{ total }} 条
    </span>
    <div class="admin-pager__nav">
      <button
        type="button"
        class="admin-btn admin-btn--soft"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        <ChevronLeft :size="13" />
        上一页
      </button>
      <span class="admin-pager__current">{{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="admin-btn admin-btn--soft"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        下一页
        <ChevronRight :size="13" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.admin-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.admin-pager__info {
  color: var(--text-secondary);
  font-size: 11px;
}
.admin-pager__nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.admin-pager__current {
  color: var(--text-secondary);
  font-size: 11px;
}
.admin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
