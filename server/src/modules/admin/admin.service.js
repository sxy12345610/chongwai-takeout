import { prisma } from '../../lib/prisma.js'
import { CODES, HttpError, isUuid, notFound } from '../../utils/httpError.js'
import { orderSelect, performAccept, performComplete, performReject } from '../order/order-actions.js'

const MAX_PAGE_SIZE = 100

function parsePagination({ page, pageSize }) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || 20))
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayLabel(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const normMerchant = (m) => ({ ...m, rating: Number(m.rating) })

const MERCHANT_STATUS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']

/* ------------------------------ 统计概览 ------------------------------ */

/** GET /admin/stats：后台首页与数据统计页共用的聚合数据。 */
export async function getStats() {
  const [userCount, merchantCount, productCount, orderCount] = await Promise.all([
    prisma.user.count(),
    prisma.merchant.count(),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.order.count(),
  ])

  const todayStart = startOfDay(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const todayOrders = await prisma.order.findMany({
    where: { createdAt: { gte: todayStart, lt: todayEnd } },
    select: { totalCents: true, status: true },
  })
  const todayOrderCount = todayOrders.length
  const todayRevenueCents = todayOrders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalCents, 0)

  const pendingCount = await prisma.order.count({ where: { status: 'PENDING' } })

  // 近 7 天趋势
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 6)
  const weekOrders = await prisma.order.findMany({
    where: { createdAt: { gte: weekStart } },
    select: { createdAt: true, totalCents: true, status: true },
  })
  const last7Days = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const start = new Date(todayStart)
    start.setDate(start.getDate() - offset)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    const dayOrders = weekOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime()
      return t >= start.getTime() && t < end.getTime()
    })
    last7Days.push({
      label: dayLabel(start),
      orders: dayOrders.length,
      revenueCents: dayOrders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalCents, 0),
    })
  }

  // 商家销售排行 + 热销菜品：基于非取消订单明细聚合
  const validOrders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: {
      merchantId: true,
      totalCents: true,
      items: { select: { productId: true, productName: true, unitPriceCents: true, quantity: true } },
    },
  })

  const merchantMap = new Map()
  const dishMap = new Map()
  for (const o of validOrders) {
    const m = merchantMap.get(o.merchantId) || { id: o.merchantId, orders: 0, revenueCents: 0 }
    m.orders += 1
    m.revenueCents += o.totalCents
    merchantMap.set(o.merchantId, m)
    for (const it of o.items) {
      const key = it.productId || `snapshot:${it.productName}`
      const d = dishMap.get(key) || {
        productId: it.productId,
        name: it.productName,
        quantity: 0,
        revenueCents: 0,
      }
      d.quantity += it.quantity
      d.revenueCents += it.unitPriceCents * it.quantity
      dishMap.set(key, d)
    }
  }

  const merchantIds = [...merchantMap.keys()]
  const merchantRows = merchantIds.length
    ? await prisma.merchant.findMany({ where: { id: { in: merchantIds } }, select: { id: true, name: true } })
    : []
  const merchantName = new Map(merchantRows.map((m) => [m.id, m.name]))

  const merchantRanking = [...merchantMap.values()]
    .map((m) => ({ ...m, name: merchantName.get(m.id) || '未知商家' }))
    .sort((a, b) => b.revenueCents - a.revenueCents)

  // 热销菜品补齐商家名（取任意一个含该商品的订单所属商家）
  const hotDishRanking = [...dishMap.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
  if (hotDishRanking.length) {
    const pids = hotDishRanking.map((d) => d.productId).filter(Boolean)
    const products = pids.length
      ? await prisma.product.findMany({
          where: { id: { in: pids } },
          select: { id: true, merchant: { select: { name: true } } },
        })
      : []
    const pname = new Map(products.map((p) => [p.id, p.merchant?.name || '']))
    hotDishRanking.forEach((d) => {
      d.merchantName = d.productId ? pname.get(d.productId) || '未知商家' : '未知商家'
    })
  }

  // 最新 5 笔订单
  const latestOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      ...orderSelect,
      merchant: { select: { name: true } },
      user: { select: { nickname: true } },
    },
  })

  return {
    counts: {
      users: userCount,
      merchants: merchantCount,
      products: productCount,
      orders: orderCount,
    },
    today: {
      orders: todayOrderCount,
      revenueCents: todayRevenueCents,
      pending: pendingCount,
    },
    last7Days,
    merchantRanking,
    hotDishRanking,
    latestOrders: latestOrders.map((o) => ({
      ...o,
      merchantName: o.merchant?.name,
      userName: o.user?.nickname,
      merchant: undefined,
      user: undefined,
    })),
  }
}

/* ------------------------------ 订单 ------------------------------ */

const adminOrderSelect = {
  ...orderSelect,
  merchant: { select: { id: true, name: true } },
  user: { select: { id: true, nickname: true, phone: true } },
}

function shapeOrder(o) {
  return { ...o, merchantName: o.merchant?.name, userName: o.user?.nickname, userPhone: o.user?.phone }
}

/** GET /admin/orders：全平台订单，可按状态 / 商家 / 订单号筛选。 */
export async function listOrders(query = {}) {
  const { page, pageSize, skip } = parsePagination(query)
  const where = {}
  if (query.status) where.status = query.status
  if (query.merchantId && isUuid(query.merchantId)) where.merchantId = query.merchantId
  if (query.keyword) where.orderNo = { contains: String(query.keyword), mode: 'insensitive' }

  const [total, list] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: adminOrderSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])
  return { list: list.map(shapeOrder), page, pageSize, total }
}

/** GET /admin/orders/:id */
export async function getOrder(orderId) {
  if (!isUuid(orderId)) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: adminOrderSelect })
  if (!order) throw notFound('订单不存在', CODES.ORDER_NOT_FOUND)
  return shapeOrder(order)
}

export async function acceptOrder(orderId, operatorId) {
  const order = await getOrder(orderId)
  return performAccept(order, operatorId)
}
export async function rejectOrder(orderId, { reason }, operatorId) {
  const order = await getOrder(orderId)
  return performReject(order, { reason }, operatorId)
}
export async function completeOrder(orderId, operatorId) {
  const order = await getOrder(orderId)
  return performComplete(order, operatorId)
}

/* ------------------------------ 商家 ------------------------------ */

const adminMerchantSelect = {
  id: true,
  name: true,
  description: true,
  announcement: true,
  categoryLabel: true,
  tags: true,
  minOrderCents: true,
  deliveryFeeCents: true,
  deliveryTimeMin: true,
  isOpen: true,
  rating: true,
  monthlySales: true,
  imageUrl: true,
  coverFrom: true,
  coverTo: true,
  status: true,
  createdAt: true,
  updatedAt: true,
}

/** GET /admin/merchants：全部商家（含未审核 / 停用 / 关闭）。 */
export async function listMerchants(query = {}) {
  const { page, pageSize, skip } = parsePagination(query)
  const where = {}
  if (query.status) where.status = query.status
  if (query.keyword) where.name = { contains: String(query.keyword), mode: 'insensitive' }

  const [total, list] = await prisma.$transaction([
    prisma.merchant.count({ where }),
    prisma.merchant.findMany({
      where,
      select: adminMerchantSelect,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
  ])
  return { list: list.map(normMerchant), page, pageSize, total }
}

export async function getMerchant(merchantId) {
  if (!isUuid(merchantId)) throw notFound('商家不存在', CODES.MERCHANT_INVALID)
  const m = await prisma.merchant.findUnique({ where: { id: merchantId }, select: adminMerchantSelect })
  if (!m) throw notFound('商家不存在', CODES.MERCHANT_INVALID)
  return normMerchant(m)
}

/** PATCH /admin/merchants/:id */
export async function updateMerchant(merchantId, data) {
  await getMerchant(merchantId)
  const payload = {}
  const fields = [
    'name', 'description', 'announcement', 'categoryLabel',
    'minOrderCents', 'deliveryFeeCents', 'deliveryTimeMin',
    'isOpen', 'status', 'imageUrl', 'coverFrom', 'coverTo',
  ]
  for (const f of fields) {
    if (data[f] !== undefined) payload[f] = data[f]
  }
  if (data.tags !== undefined) payload.tags = data.tags
  if (payload.status && !MERCHANT_STATUS.includes(payload.status)) {
    throw new HttpError(400, CODES.PARAM, '非法的商家状态')
  }
  if (typeof payload.minOrderCents === 'number' && payload.minOrderCents < 0) {
    throw new HttpError(400, CODES.PARAM, '起送价不能小于 0')
  }
  if (typeof payload.deliveryFeeCents === 'number' && payload.deliveryFeeCents < 0) {
    throw new HttpError(400, CODES.PARAM, '配送费不能小于 0')
  }
  const updated = await prisma.merchant.update({ where: { id: merchantId }, data: payload, select: adminMerchantSelect })
  return normMerchant(updated)
}

/* ------------------------------ 商品 ------------------------------ */

const adminProductSelect = {
  id: true,
  merchantId: true,
  categoryId: true,
  name: true,
  description: true,
  imageUrl: true,
  priceCents: true,
  stock: true,
  monthlySales: true,
  menuCategory: true,
  isAvailable: true,
  isHot: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  merchant: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
}

function shapeProduct(p) {
  return { ...p, merchantName: p.merchant?.name, categoryName: p.category?.name }
}

/** GET /admin/products：全部商品（默认不含已软删，includeDeleted=1 时包含）。 */
export async function listProducts(query = {}) {
  const { page, pageSize, skip } = parsePagination(query)
  const where = {}
  if (query.includeDeleted !== '1' && query.includeDeleted !== 'true') where.deletedAt = null
  if (query.merchantId && isUuid(query.merchantId)) where.merchantId = query.merchantId
  if (query.isAvailable === 'true') where.isAvailable = true
  if (query.isAvailable === 'false') where.isAvailable = false
  if (query.keyword) where.name = { contains: String(query.keyword), mode: 'insensitive' }

  const [total, list] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: adminProductSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])
  return { list: list.map(shapeProduct), page, pageSize, total }
}

export async function getProduct(productId) {
  if (!isUuid(productId)) throw notFound('商品不存在', CODES.PRODUCT_INVALID)
  const p = await prisma.product.findFirst({ where: { id: productId }, select: adminProductSelect })
  if (!p) throw notFound('商品不存在', CODES.PRODUCT_INVALID)
  return shapeProduct(p)
}

async function assertMerchantExists(merchantId) {
  if (!isUuid(merchantId)) throw notFound('商家不存在', CODES.MERCHANT_INVALID)
  const exists = await prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true } })
  if (!exists) throw notFound('商家不存在', CODES.MERCHANT_INVALID)
}

/** POST /admin/products */
export async function createProduct(data) {
  if (!data.name?.trim()) throw new HttpError(400, CODES.PARAM, '商品名称不能为空')
  if (!Number.isInteger(data.priceCents) || data.priceCents <= 0) {
    throw new HttpError(400, CODES.PARAM, '商品价格必须为正整数分')
  }
  await assertMerchantExists(data.merchantId)
  const payload = {
    merchantId: data.merchantId,
    name: data.name.trim(),
    priceCents: data.priceCents,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    stock: Number.isInteger(data.stock) && data.stock >= 0 ? data.stock : 0,
    menuCategory: data.menuCategory ?? null,
    isAvailable: data.isAvailable !== false,
    isHot: data.isHot === true,
    categoryId: data.categoryId ?? null,
  }
  const created = await prisma.product.create({ data: payload, select: adminProductSelect })
  return shapeProduct(created)
}

/** PATCH /admin/products/:id */
export async function updateProduct(productId, data) {
  const existing = await prisma.product.findFirst({ where: { id: productId }, select: { id: true } })
  if (!existing) throw notFound('商品不存在', CODES.PRODUCT_INVALID)

  const payload = {}
  const fields = ['name', 'description', 'imageUrl', 'priceCents', 'stock', 'menuCategory', 'isAvailable', 'isHot', 'categoryId', 'merchantId']
  for (const f of fields) {
    if (data[f] !== undefined) payload[f] = data[f]
  }
  if (payload.name !== undefined) {
    if (!String(payload.name).trim()) throw new HttpError(400, CODES.PARAM, '商品名称不能为空')
    payload.name = String(payload.name).trim()
  }
  if (payload.priceCents !== undefined && (!Number.isInteger(payload.priceCents) || payload.priceCents <= 0)) {
    throw new HttpError(400, CODES.PARAM, '商品价格必须为正整数分')
  }
  if (payload.stock !== undefined && (!Number.isInteger(payload.stock) || payload.stock < 0)) {
    throw new HttpError(400, CODES.PARAM, '库存不能为负')
  }
  if (payload.merchantId !== undefined) await assertMerchantExists(payload.merchantId)

  const updated = await prisma.product.update({ where: { id: productId }, data: payload, select: adminProductSelect })
  return shapeProduct(updated)
}

/** DELETE /admin/products/:id：软删除，保留历史订单引用。 */
export async function deleteProduct(productId) {
  const existing = await prisma.product.findFirst({ where: { id: productId }, select: { id: true, deletedAt: true } })
  if (!existing) throw notFound('商品不存在', CODES.PRODUCT_INVALID)
  if (existing.deletedAt) return { id: productId, deleted: true }
  await prisma.product.update({ where: { id: productId }, data: { deletedAt: new Date() } })
  return { id: productId, deleted: true }
}

/* ------------------------------ 用户 ------------------------------ */

const userSelect = {
  id: true, phone: true, nickname: true, avatarUrl: true, status: true, createdAt: true, updatedAt: true,
}

/** GET /admin/users */
export async function listUsers(query = {}) {
  const { page, pageSize, skip } = parsePagination(query)
  const where = {}
  if (query.keyword) {
    where.OR = [
      { phone: { contains: String(query.keyword), mode: 'insensitive' } },
      { nickname: { contains: String(query.keyword), mode: 'insensitive' } },
    ]
  }
  if (query.status) where.status = query.status

  const [total, list] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
  ])
  return { list, page, pageSize, total }
}

/* ------------------------------ 分类 ------------------------------ */

/** GET /admin/categories：全部分类（含未启用）。 */
export async function listCategories() {
  return prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

/** POST /admin/categories */
export async function createCategory({ key, name, sortOrder, isActive }) {
  if (!key?.trim() || !name?.trim()) throw new HttpError(400, CODES.PARAM, '分类 key 与名称必填')
  const exists = await prisma.category.findUnique({ where: { key: key.trim() } })
  if (exists) throw new HttpError(409, CODES.DUPLICATE, '分类 key 已存在')
  return prisma.category.create({
    data: { key: key.trim(), name: name.trim(), sortOrder: Number(sortOrder) || 0, isActive: isActive !== false },
  })
}

/** PATCH /admin/categories/:id */
export async function updateCategory(categoryId, data) {
  if (!isUuid(categoryId)) throw notFound('分类不存在')
  const existing = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!existing) throw notFound('分类不存在')
  const payload = {}
  if (data.name !== undefined) {
    if (!String(data.name).trim()) throw new HttpError(400, CODES.PARAM, '分类名称不能为空')
    payload.name = String(data.name).trim()
  }
  if (data.sortOrder !== undefined) payload.sortOrder = Number(data.sortOrder) || 0
  if (data.isActive !== undefined) payload.isActive = Boolean(data.isActive)
  return prisma.category.update({ where: { id: categoryId }, data: payload })
}

export { round2 }
