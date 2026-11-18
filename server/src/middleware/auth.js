import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { forbidden, unauthorized } from '../utils/httpError.js'

/**
 * 校验 Authorization: Bearer <token>，把用户信息挂到 req.auth。
 * req.auth = { userId, roles: ['USER', 'MERCHANT', 'RIDER', 'ADMIN'] }
 */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return next(unauthorized())
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    req.auth = {
      userId: payload.sub,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    }
    next()
  } catch {
    next(unauthorized('Token 无效或已过期'))
  }
}

/** 角色守卫：满足任一角色即可通过。必须放在 authenticate 之后。 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    const current = req.auth?.roles ?? []
    if (!roles.some((role) => current.includes(role))) {
      return next(forbidden())
    }
    next()
  }
}
