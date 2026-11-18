import axios from 'axios'

/** API 基础地址，通过环境变量配置，不写死在代码里。 */
export const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

export const TOKEN_KEY = 'cw_admin_token'
export const USER_KEY = 'cw_admin_user'

const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

/** 请求拦截：自动注入 JWT。 */
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function normalizeError(error) {
  const resp = error?.response
  const status = resp?.status
  const data = resp?.data
  const err = new Error(data?.message || error?.message || '网络错误')
  err.status = status
  err.code = data?.code
  err.bizMessage = data?.message
  return err
}

/** 响应拦截：统一解包 {code,message,data}，非 0 视为失败；401 清理登录态。 */
http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) return body.data
      return Promise.reject(normalizeError({ response: resp }))
    }
    return body
  },
  (error) => {
    const err = normalizeError(error)
    if (err.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(new CustomEvent('api:unauthorized'))
    }
    return Promise.reject(err)
  },
)

export { http }
