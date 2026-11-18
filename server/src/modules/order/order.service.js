import { createHash } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { resolveAddressForOrder } from '../address/address.service.js'
import {
  CODES,
  conflict,
  HttpError,
  isUuid,
  notFound,
} from '../../utils/httpError.js'
import { generateCheckoutGroupNo, generateOrderNo } from '../../utils/id.js'
import { assertTransition, ORDER_STATUS } from './order-state.js'

const orderSelect = {
  id: true,
  orderNo: true,
  checkoutGroupNo: true,
  status: true,
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
  merchant: { select: { id: true, name: true, imageUrl: true } },
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

function pageInfo(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

function buildAddressText(addr) {
  return [addr.campusArea, addr.building, addr.room, addr.detail]
    .filter(Boolean)
    .join(' ')
}

const IDEMPOTENCY_KEY_MIN = 8
const IDEMPOTENCY_KEY_MAX = 80

/** 读取并校验 Idempotency-Key；未携带时返回 null（兼容未接入幂等的旧客户端）。 */
function normalizeIdempotencyKey(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  const key = String(raw).trim()
  if (key.length < IDEMPOTENCY_KEY_MIN || key.length > IDEMPOTENCY_KEY_MAX) {
    throw new HttpError(
      400,
      CODES.PARAM,
      `Idempotency-Key 长度必须为 ${IDEMPOTENCY_KEY_MIN}-${IDEMPOTENCY_KEY_MAX} 个字符`,
    )
  }
  return key
}

/** 请求内容指纹：同一幂等键但内容不同时用于识别冲突。 */
function buildRequestHash({ addressId, note }) {
  return createHash('sha256')
    .update(JSON.stringify({ addressId: addressId ?? null, note: note?.trim() || null }))
    .digest('hex')
}

/**
 * 幂等重放：读取已提交的结算记录，返回首次创建的那组订单。
 * 请求内容指纹不一致时抛 409，绝不再次扣库存/建单。
 */
async function findReplay(userId, idempotencyKey, requestHash) {
  const record = await prisma.checkoutRequest.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
  })
  if (!record) return null
  if (record.requestHash !== requestHash) {
    throw conflict('相同 Idempotency-Key 的请求内容与首次提交不一致', CODES.DUPLICATE)
  }
  const orders = await prisma.order.findMany({
    where: { userId, checkoutGroupNo: record.checkoutGroupNo },
    select: orderSelect,
    orderBy: { merchantId: 'asc' },
  })
  return {
    checkoutGroupNo: record.checkoutGroupNo,
    orders,
    count: orders.length,
    replayed: true,
  }
}

/**
 * 在给定事务上下文中完成：库存条件扣减（防超卖）→ 写订单快照 → 清空购物车。
 * 多商家拆单共享同一 checkoutGroupNo，任一步失败整体回滚。
 */
async function createOrderSet(db, { userId, addressId, note, checkoutGroupNo }) {
  const cart = await db.cart.findUnique({
    where: { userId },
    include: {
      items: { include: { product: { include: { merchant: true } } } },
    },
  })

  if (!cart || cart.items.length === 0) {
    throw conflict('购物车为空，无法下单', CODES.CART_EMPTY)
  }

  // 1. 校验可售性 + 取最新价格 + 按商家分组
  const groups = new Map()
  for (const item of cart.items) {
    const p = item.product
    if (!p || p.deletedAt || !p.isAvailable) {
      throw conflict(`商品「${p?.name ?? '已删除'}」已下架`, CODES.PRODUCT_INVALID)
    }
    if (!p.merchant || p.merchant.status !== 'ACTIVE') {
      throw conflict(`商家「${p.merchant?.name ?? ''}」暂未营业`, CODES.MERCHANT_INVALID)
    }
    if (!groups.has(p.merchantId)) {
      groups.set(p.merchantId, { merchant: p.merchant, items: [] })
    }
    groups.get(p.merchantId).items.push({
      cartItemId: item.id,
      productId: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      menuCategory: p.menuCategory,
      unitPriceCents: p.priceCents, // 服务端权威价格
      quantity: item.quantity,
    })
  }

  // 2. 金额计算（服务端权威，忽略前端传入金额）
  const address = await resolveAddressForOrder(userId, addressId)
  const addressText = buildAddressText(address)

  const prepared = []
  for (const g of groups.values()) {
    const subtotalCents = g.items.reduce(
      (s, it) => s + it.unitPriceCents * it.quantity,
      0,
    )
    if (subtotalCents < g.merchant.minOrderCents) {
      throw conflict(
        `「${g.merchant.name}」未达到起送价`,
        CODES.MIN_ORDER,
      )
    }
    const deliveryFeeCents = g.merchant.deliveryFeeCents
    const discountCents = 0
    prepared.push({
      merchant: g.merchant,
      items: g.items,
      subtotalCents,
      deliveryFeeCents,
      discountCents,
      totalCents: subtotalCents + deliveryFeeCents - discountCents,
    })
  }

  // 3. 扣库存 → 写订单 → 清空购物车（同一事务）
  const created = []

  for (const group of prepared) {
    // 3.1 条件扣减库存，防止超卖；失败即抛错回滚整单
    for (const it of group.items) {
      const affected = await db.$executeRaw`
        UPDATE products
        SET stock = stock - ${it.quantity}, updated_at = now()
        WHERE id = ${it.productId}::uuid
          AND is_available = true
          AND deleted_at IS NULL
          AND stock >= ${it.quantity}`
      if (affected === 0) {
        throw conflict(`「${it.name}」库存不足`, CODES.STOCK)
      }
    }

    // 3.2 写订单 + 明细快照
    const order = await db.order.create({
      data: {
        orderNo: generateOrderNo(),
        checkoutGroupNo,
        userId,
        merchantId: group.merchant.id,
        addressId: address.id,
        contactName: address.contactName,
        contactPhone: address.phone,
        addressText,
        status: ORDER_STATUS.PENDING,
        subtotalCents: group.subtotalCents,
        deliveryFeeCents: group.deliveryFeeCents,
        discountCents: group.discountCents,
        totalCents: group.totalCents,
        note: note || null,
        items: {
          create: group.items.map((it) => ({
            productId: it.productId,
            productName: it.name,
            productImage: it.imageUrl,
            menuCategory: it.menuCategory,
            unitPriceCents: it.unitPriceCents,
            quantity: it.quantity,
            subtotalCents: it.unitPriceCents * it.quantity,
          })),
        },
      },
      select: orderSelect,
    })

    // 3.3 累计月售
    await db.product.updateMany({
      where: { id: { in: group.items.map((i) => i.productId) } },
      data: { monthlySales: { increment: 1 } },
    })

    created.push(order)
  }

  // 3.4 清空已结算的购物车项
  await db.cartItem.deleteMany({
    where: { id: { in: cart.items.map((i) => i.id) } },
  })

  return { checkoutGroupNo, orders: created, count: created.length }
}

/**
 * 创建订单：从当前用户购物车结算，按商家自动拆单。
 *
 * 幂等策略（携带 Idempotency-Key 时）：
 * - 幂等记录、库存扣减、订单写入在同一事务内，任一步失败整体回滚，不留半套数据；
 * - (user_id, idempotency_key) 唯一约束保证并发请求只有一个能插入成功，
 *   另一个会在唯一索引上等待首事务提交后得到 P2002，然后重放首次结果；
 * - 相同键但请求内容不同 → 409，不重复扣库存。
 */
export async function createOrders(userId, { addressId, note } = {}, { idempotencyKey } = {}) {
  const key = normalizeIdempotencyKey(idempotencyKey)
  const checkoutGroupNo = generateCheckoutGroupNo()
  const payload = { userId, addressId, note, checkoutGroupNo }

  if (!key) {
    return prisma.$transaction((tx) => createOrderSet(tx, payload))
  }

  const requestHash = buildRequestHash({ addressId, note })
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.checkoutRequest.create({
          data: { userId, idempotencyKey: key, requestHash, checkoutGroupNo },
        })
        return createOrderSet(tx, payload)
      },
      { maxWait: 10000, timeout: 20000 },
    )
  } catch (error) {
    if (error?.code === 'P2002') {
      const replayed = await findReplay(userId, key, requestHash)
      if (replayed) return replayed
    }
    throw error
  }
}

/** GET /orders */
export async function listOrders(userId, query = {}) {
  const { page, pageSize, skip } = pageInfo(query)
  const where = { userId }
  if (query.status) where.status = query.status

  const [total, list] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: orderSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])
  return { list, page, pageSize, total }
}

/** GET /orders/:id：仅能查自己的订单。 */
export async function getOrder(userId, orderId) {
  if (!isUuid(orderId)) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: orderSelect,
  })
  if (!order) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  return order
}

/** POST /orders/:id/cancel：仅 PENDING 可取消，事务内恢复库存。 */
export async function cancelOrder(userId, orderId, { reason } = {}) {
  if (!isUuid(orderId)) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, status: true, items: true },
  })
  if (!order) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)

  assertTransition('cancel', order.status)

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason || '用户取消',
      },
    })
    // 恢复库存：按明细数量回补（商品已软删也回补，避免库存错乱）
    for (const it of order.items) {
      if (it.productId) {
        await tx.product.updateMany({
          where: { id: it.productId },
          data: { stock: { increment: it.quantity } },
        })
      }
    }
  })

  return getOrder(userId, orderId)
}
