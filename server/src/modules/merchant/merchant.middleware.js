import { prisma } from '../../lib/prisma.js'
import { forbidden } from '../../utils/httpError.js'
import { requireRole } from '../../middleware/auth.js'

/**
 * 商家上下文中间件：在 authenticate + requireRole('MERCHANT') 之后，
 * 把当前账号归属的 merchantId 列表挂到 req.merchantIds，
 * 后续所有商家接口都用它做数据隔离，禁止前端传 merchantId 越权。
 */
export async function loadMerchantContext(req, _res, next) {
  const rows = await prisma.merchantUser.findMany({
    where: { userId: req.auth.userId },
    select: { merchantId: true, role: true },
  })

  if (rows.length === 0) {
    return next(forbidden('当前账号未关联任何商家'))
  }
  req.merchantIds = rows.map((r) => r.merchantId)
  req.merchantRoles = rows.map((r) => r.role)
  next()
}

/** 商家接口统一鉴权链：登录 → 角色 MERCHANT → 加载归属商家 */
export const merchantAuth = [requireRole('MERCHANT'), loadMerchantContext]
