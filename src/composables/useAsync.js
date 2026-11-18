import { ref } from 'vue'

/**
 * 统一的异步请求状态管理：loading / error / data + 重试(rerun)。
 * 用法：const { data, loading, error, run } = useAsync(() => api.xxx())
 * 在 onMounted 里调用 run()，错误时页面可展示 error.message 并提供“重试”按钮再次 run()。
 */
export function useAsync(fn, options = {}) {
  const { defaultData = null, immediate = false } = options
  const data = ref(defaultData)
  const loading = ref(false)
  const error = ref(null)

  async function run(...args) {
    loading.value = true
    error.value = null
    try {
      const result = await fn(...args)
      data.value = result
      return result
    } catch (e) {
      error.value = e
      throw e
    } finally {
      loading.value = false
    }
  }

  if (immediate) run()

  return { data, loading, error, run }
}
