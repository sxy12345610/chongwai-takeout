/**
 * 统一请求层骨架（后续业务页面统一使用）。
 * - baseURL 来自环境变量 VITE_API_BASE_URL
 * - 自动注入 JWT：Authorization: Bearer <token>
 * - 统一解包后端响应 { code, message, data, traceId }
 * - 401 时清理本地登录态
 * 当前未包含任何业务接口调用。
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api/v1'

/** 默认请求超时（毫秒）。不关闭超时机制，仅显式声明，便于定位问题。 */
const DEFAULT_TIMEOUT = 15000

const TOKEN_KEY = 'cw_student_token'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  url: string
  method?: HttpMethod
  data?: Record<string, unknown>
  header?: Record<string, string>
  timeout?: number
}

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  traceId?: string
}

export function getToken(): string {
  return (uni.getStorageSync(TOKEN_KEY) as string) || ''
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken(): void {
  uni.removeStorageSync(TOKEN_KEY)
}

export function request<T>(options: RequestOptions): Promise<T> {
  const token = getToken()
  const url = `${BASE_URL}${options.url}`
  const timeout = options.timeout ?? DEFAULT_TIMEOUT
  return new Promise<T>((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.header || {}),
      },
      success: (res) => {
        const body = res.data as ApiEnvelope<T>
        if (res.statusCode === 401) {
          clearToken()
          reject(new Error(body?.message || '登录已过期，请重新登录'))
          return
        }
        if (!body || body.code !== 0) {
          reject(new Error(body?.message || `请求失败（${res.statusCode}）：${url}`))
          return
        }
        resolve(body.data)
      },
      fail: (err) => {
        const raw = err?.errMsg || ''
        // 明确区分超时，便于排查；不吞掉异常、不关闭超时
        if (raw.indexOf('timeout') >= 0) {
          reject(new Error(`请求超时（${timeout}ms）：${url}`))
          return
        }
        reject(new Error(raw ? `网络请求失败：${raw}（${url}）` : `网络请求失败：${url}`))
      },
    })
  })
}
