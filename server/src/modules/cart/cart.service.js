import { prisma } from '../../lib/prisma.js'
import {
  CODES,
  conflict,
  HttpError,
  isUuid,
  notFound,
} from '../../utils/httpError.js'

const MAX_QTY = 99

async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({ where: { userId } })
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } })
  }
  return cart
}

/** 校验商品可售：存在、上架、未软删、所属商家审核通过。返回 product+merchant。 */
async function assertSellable(productId) {
  if (!isUuid(productId)) {
    throw notFound('商品不存在', CODES.PRODUCT_INVALID)
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { merchant: true },
  })
  if (!product || product.deletedAt || !product.isAvailable) {
    throw notFound('商品已下架或不存在', CODES.PRODUCT_INVALID)
  }
  if (!product.merchant || product.merchant.status !== 'ACTIVE') {
    throw conflict('商家暂未营业', CODES.MERCHANT_INVALID)
  }
  return product
}

function normalizeQty(value) {
  const qty = Number(value)
  if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
    throw new HttpError(400, CODES.PARAM, `商品数量必须为 1-${MAX_QTY} 的整数`)
  }
  return qty
}

/** GET /cart：返回按商家分组、金额由后端实时计算的购物车。 */
export async function getCart(userId) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { merchant: true, category: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!cart || cart.items.length === 0) {
    return { items: [], groups: [], totalCents: 0, totalQuantity: 0 }
  }

  const groups = new Map()
  let totalCents = 0
  let totalQuantity = 0

  for (const item of cart.items) {
    const p = item.product
    // 商品若已下架/删除，购物车中标记不可结算但仍展示（前端可提示移除）
    const invalid = !!p.deletedAt || !p.isAvailable || p.merchant?.status !== 'ACTIVE'
    const line = {
      id: item.id,
      productId: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      menuCategory: p.menuCategory,
      // 始终返回数据库最新价格，价格变动时前端以此为准
      priceCents: p.priceCents,
      unitPriceCents: p.priceCents,
      quantity: item.quantity,
      subtotalCents: p.priceCents * item.quantity,
      stock: p.stock,
      invalid,
      merchant: p.merchant
        ? {
            id: p.merchant.id,
            name: p.merchant.name,
            minOrderCents: p.merchant.minOrderCents,
            deliveryFeeCents: p.merchant.deliveryFeeCents,
            deliveryTimeMin: p.merchant.deliveryTimeMin,
            isOpen: p.merchant.isOpen,
          }
        : null,
    }

    const mid = p.merchantId
    if (!groups.has(mid)) {
      groups.set(mid, {
        merchantId: mid,
        merchant: line.merchant,
        items: [],
        subtotalCents: 0,
        deliveryFeeCents: 0,
        totalCents: 0,
      })
    }
    const g = groups.get(mid)
    g.items.push(line)
    if (!line.invalid) g.subtotalCents += line.subtotalCents
    totalCents += line.subtotalCents
    totalQuantity += item.quantity
  }

  // 每组配送费：达到起送价才计入（与下单计价一致）
  for (const g of groups.values()) {
    const reachMin = g.merchant && g.subtotalCents >= g.merchant.minOrderCents
    g.deliveryFeeCents = reachMin ? g.merchant.deliveryFeeCents : 0
    g.totalCents = g.subtotalCents + g.deliveryFeeCents
  }

  const groupsArr = [...groups.values()]
  const grandDelivery = groupsArr.reduce((s, g) => s + g.deliveryFeeCents, 0)

  return {
    items: [...groups.values()].flatMap((g) => g.items),
    groups: groupsArr,
    totalCents: totalCents + grandDelivery,
    totalQuantity,
  }
}

/** POST /cart/items */
export async function addCartItem(userId, { productId, quantity = 1 }) {
  const product = await assertSellable(productId)
  const qty = normalizeQty(quantity)
  const cart = await getOrCreateCart(userId)

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  })

  if (existing) {
    const next = Math.min(MAX_QTY, existing.quantity + qty)
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: next },
    })
    return getCartItemView(updated.id)
  }

  const created = await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity: qty },
  })
  return getCartItemView(created.id)
}

async function getCartItemView(itemId) {
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: { select: { name: true, priceCents: true } } },
  })
  return {
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    priceCents: item.product.priceCents,
    quantity: item.quantity,
    subtotalCents: item.product.priceCents * item.quantity,
  }
}

/** PATCH /cart/items/:id：更新数量（绝对值，传 quantity）。 */
export async function updateCartItem(userId, itemId, { quantity }) {
  const qty = normalizeQty(quantity)
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true },
  })
  if (!item) throw notFound('购物车项不存在', CODES.ITEM_NOT_FOUND)

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: qty } })
  return getCartItemView(itemId)
}

/** DELETE /cart/items/:id */
export async function removeCartItem(userId, itemId) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    select: { id: true },
  })
  if (!item) throw notFound('购物车项不存在', CODES.ITEM_NOT_FOUND)
  await prisma.cartItem.delete({ where: { id: itemId } })
  return { id: itemId }
}

/** DELETE /cart：清空当前用户购物车。 */
export async function clearCart(userId) {
  const cart = await prisma.cart.findUnique({ where: { userId } })
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  }
  return { cleared: true }
}
