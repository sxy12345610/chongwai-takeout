import { ref } from 'vue'

/** 轻量全局 Toast：供各页面做操作结果反馈（成功 / 失败 / 普通）。 */
const toasts = ref([])
let seq = 0

function push(message, type = 'info') {
  const id = ++seq
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2800)
}

export function useToast() {
  return {
    toasts,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }
}
