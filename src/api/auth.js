import { http, TOKEN_KEY, USER_KEY } from './request'

/** 读取本地缓存的 token。 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

/** 读取本地缓存的当前用户。 */
export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function isLoggedIn() {
  return !!getToken()
}

/** 判定是否平台管理员。 */
export function isAdmin(user = getUser()) {
  return Array.isArray(user?.roles) && user.roles.includes('ADMIN')
}

/** 登录：成功后缓存 token 与用户信息。 */
export async function login(phone, password) {
  const data = await http.post('/auth/login', { phone, password })
  localStorage.setItem(TOKEN_KEY, data.accessToken)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  return data.user
}

/** 退出登录：清理本地凭据。 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** 拉取最新的当前用户信息并刷新缓存（用于校验 token 有效性与角色）。 */
export async function fetchMe() {
  const user = await http.get('/auth/me')
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}
