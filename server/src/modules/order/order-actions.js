import { prisma } from '../../lib/prisma.js'
import { logger } from '../../utils/logger.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { ORDER_STATUS } from './order-state.js'
import { assertTransition } from './order-state.js'

/** 订单详情查询字段（商家端与平台管理员端共用）。 */
export const orderSelect = {
  id: true,
  orderNo: true,
  checkoutGroupNo: true,
  status: true,
  userId: true,
  merchantId: true,
  subtotalCents: true,
  deliveryFeeCents: true,
  discountCents: true,
  totalCents: true,
  note: true,
  cancelReason: true,
  contactName: true,
  contactPhone: true,
  addressText: true,
  acceptedAt: true,
  deliveringAt: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      productImage: true,
      menuCategory: true,
      unitPriceCents: true,
      quantity: true,
      subtotalCents: true,
    },
  },
}

/**
 * 订单状态流转的核心实现：由调用方先按各自权限范围查出 order，
 * 再调用这些动作，确保状态机与库存恢复逻辑只有一份。
 * order 必须包含 id / orderNo / status / items（items 含 productId、quantity）。
 */
export async function performAccept(order, operatorId) {
  assertTransition('accept', order.status)
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: ORDER_STATUS.PREPARING, acceptedAt: new Date() },
    select: orderSelect,
  })
  logger.info(
    { orderId: order.id, orderNo: order.orderNo, operatorId },
    '订单接单',
  )
  return updated
}

/**
 * 拒单：状态更新、拒单原因、库存恢复在同一事务内完成。
 * 使用条件更新（仅当状态仍为 PENDING）并校验受影响行数，
 * 保证并发重复拒单只有一个成功，避免库存被重复回补。
 */
export async function performReject(order, { reason }, operatorId) {
  assertTransition('reject', order.status)

  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.order.updateMany({
      where: { id: order.id, status: ORDER_STATUS.PENDING },
      data: {
        status: ORDER_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason.trim(),
      },
    })
    if (changed.count !== 1) {
      // 另一个并发请求已经完成拒单，本次不得再恢复库存
      throw new HttpError(409, CODES.ORDER_STATUS, '订单状态已变更，拒单失败')
    }

    for (const it of order.items) {
      if (it.productId) {
        await tx.product.updateMany({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        })
      }
    }

    return tx.order.findUnique({ where: { id: order.id }, select: orderSelect })
  })

  logger.info(
    { orderId: order.id, orderNo: order.orderNo, operatorId, reason },
    '订单拒单',
  )
  return updated
}

export async function performComplete(order, operatorId) {
  assertTransition('complete', order.status)
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: ORDER_STATUS.COMPLETED, completedAt: new Date() },
    select: orderSelect,
  })
  logger.info(
    { orderId: order.id, orderNo: order.orderNo, operatorId },
    '订单完成',
  )
  return updated
}
