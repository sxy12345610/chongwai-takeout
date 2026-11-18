/**
 * 业务错误码（与 docs/api-plan.md 1.6 对齐）。
 * 全部以 HttpError(status, code, message) 抛出，由统一错误中间件输出。
 */
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export const CODES = {
  PARAM: 1001, // 参数校验失败
  UNAUTH: 2001, // 未登录或 Token 过期
  FORBIDDEN: 2002, // 无权限访问该资源
  MERCHANT_INVALID: 3001, // 商家不存在或未营业
  PRODUCT_INVALID: 3002, // 商品不存在 / 已下架
  MIN_ORDER: 3003, // 未达到起送价
  STOCK: 3004, // 库存不足
  CART_EMPTY: 4001, // 购物车为空
  ITEM_NOT_FOUND: 4002, // 购物车项不存在
  ORDER_NOT_FOUND: 5001, // 订单不存在
  ORDER_STATUS: 5002, // 订单状态不允许该操作
  DUPLICATE: 5003, // 重复操作
  NOT_FOUND: 40400,
}

export const badRequest = (message, code = CODES.PARAM) =>
  new HttpError(400, code, message)
export const unauthorized = (message = '未登录或 Token 已过期') =>
  new HttpError(401, CODES.UNAUTH, message)
export const forbidden = (message = '无权限访问该资源') =>
  new HttpError(403, CODES.FORBIDDEN, message)
export const notFound = (message = '资源不存在', code = CODES.NOT_FOUND) =>
  new HttpError(404, code, message)
export const conflict = (message, code = CODES.DUPLICATE) =>
  new HttpError(409, code, message)

/** UUID 格式校验，避免把非法主键传给 Prisma。 */
export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value ?? ''),
  )
}
