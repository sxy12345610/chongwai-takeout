import { prisma } from '../../lib/prisma.js'
import { CODES, isUuid, notFound } from '../../utils/httpError.js'
import { orderSelect, performAccept, performComplete, performReject } from '../order/order-actions.js'

/** 商家只能看到自己店铺的订单；越权返回 404，避免泄露订单存在性。 */
async function findMerchantOrder(merchantIds, orderId) {
  if (!isUuid(orderId)) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  const order = await prisma.order.findFirst({
    where: { id: orderId, merchantId: { in: merchantIds } },
    select: orderSelect,
  })
  if (!order) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  return order
}

/** GET /merchant/orders */
export async function listMerchantOrders(merchantIds, query = {}) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const where = { merchantId: { in: merchantIds } }
  if (query.status) where.status = query.status

  const [total, list] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: orderSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return { list, page, pageSize, total }
}

/** GET /merchant/orders/:id */
export async function getMerchantOrder(merchantIds, orderId) {
  return findMerchantOrder(merchantIds, orderId)
}

/** POST /merchant/orders/:id/accept：PENDING → PREPARING */
export async function acceptOrder(merchantIds, orderId, operatorId) {
  const order = await findMerchantOrder(merchantIds, orderId)
  return performAccept(order, operatorId)
}

/** POST /merchant/orders/:id/reject：PENDING → CANCELLED，需原因，恢复库存 */
export async function rejectOrder(merchantIds, orderId, { reason }, operatorId) {
  const order = await findMerchantOrder(merchantIds, orderId)
  return performReject(order, { reason }, operatorId)
}

/** POST /merchant/orders/:id/complete：PREPARING → COMPLETED */
export async function completeOrder(merchantIds, orderId, operatorId) {
  const order = await findMerchantOrder(merchantIds, orderId)
  return performComplete(order, operatorId)
}
