import { http } from './request'

/** 后端金额为整数分，前端展示与表单使用元，这里统一双向换算。 */
const yuan = (cents) => (Number(cents) || 0) / 100
const toCents = (yuanVal) => Math.round(Number(yuanVal) * 100)
const lower = (s) => String(s || '').toLowerCase()

function normalizeProduct(p) {
  return {
    id: p.id,
    merchantId: p.merchantId,
    merchantName: p.merchantName,
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    name: p.name,
    description: p.description,
    image: p.imageUrl,
    price: yuan(p.priceCents),
    stock: p.stock,
    monthlySales: p.monthlySales,
    menuCategory: p.menuCategory,
    isAvailable: p.isAvailable,
    isHot: p.isHot,
    deleted: !!p.deletedAt,
    createdAt: p.createdAt,
  }
}

function normalizeMerchant(m) {
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    announcement: m.announcement,
    categoryLabel: m.categoryLabel,
    tags: m.tags || [],
    minOrder: yuan(m.minOrderCents),
    deliveryFee: yuan(m.deliveryFeeCents),
    deliveryTime: m.deliveryTimeMin,
    isOpen: m.isOpen,
    rating: m.rating,
    monthlySales: m.monthlySales,
    image: m.imageUrl,
    cover: { from: m.coverFrom, to: m.coverTo },
    status: m.status,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }
}

function normalizeOrderItem(it) {
  return {
    id: it.id,
    productId: it.productId,
    name: it.productName,
    image: it.productImage,
    menuCategory: it.menuCategory,
    price: yuan(it.unitPriceCents),
    quantity: it.quantity,
    subtotal: yuan(it.subtotalCents),
  }
}

function normalizeOrder(o) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    checkoutGroupNo: o.checkoutGroupNo,
    status: lower(o.status),
    merchantId: o.merchantId,
    merchantName: o.merchantName,
    userName: o.userName,
    userPhone: o.userPhone,
    userId: o.userId,
    subtotal: yuan(o.subtotalCents),
    deliveryFee: yuan(o.deliveryFeeCents),
    discount: yuan(o.discountCents),
    total: yuan(o.totalCents),
    note: o.note,
    cancelReason: o.cancelReason,
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    address: o.addressText,
    acceptedAt: o.acceptedAt,
    deliveringAt: o.deliveringAt,
    completedAt: o.completedAt,
    cancelledAt: o.cancelledAt,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: (o.items || []).map(normalizeOrderItem),
  }
}

function normalizeStats(s) {
  return {
    counts: s.counts,
    today: {
      orders: s.today.orders,
      revenue: yuan(s.today.revenueCents),
      pending: s.today.pending,
    },
    last7Days: (s.last7Days || []).map((d) => ({
      label: d.label,
      orders: d.orders,
      revenue: yuan(d.revenueCents),
    })),
    merchantRanking: (s.merchantRanking || []).map((m) => ({
      ...m,
      revenue: yuan(m.revenueCents),
    })),
    hotDishRanking: (s.hotDishRanking || []).map((d) => ({
      ...d,
      revenue: yuan(d.revenueCents),
    })),
    latestOrders: (s.latestOrders || []).map(normalizeOrder),
  }
}

const mapPage = (r, normalizer) => ({
  list: (r?.list || []).map(normalizer),
  page: r?.page,
  pageSize: r?.pageSize,
  total: r?.total,
})

export const adminApi = {
  getStats: () => http.get('/admin/stats').then(normalizeStats),

  listOrders: (params) => http.get('/admin/orders', { params }).then((r) => mapPage(r, normalizeOrder)),
  getOrder: (id) => http.get(`/admin/orders/${id}`).then(normalizeOrder),
  acceptOrder: (id) => http.post(`/admin/orders/${id}/accept`),
  rejectOrder: (id, reason) => http.post(`/admin/orders/${id}/reject`, { reason }),
  completeOrder: (id) => http.post(`/admin/orders/${id}/complete`),

  listMerchants: (params) => http.get('/admin/merchants', { params }).then((r) => mapPage(r, normalizeMerchant)),
  getMerchant: (id) => http.get(`/admin/merchants/${id}`).then(normalizeMerchant),
  updateMerchant: (id, patch) => {
    const body = {}
    if (patch.name !== undefined) body.name = patch.name
    if (patch.announcement !== undefined) body.announcement = patch.announcement
    if (patch.categoryLabel !== undefined) body.categoryLabel = patch.categoryLabel
    if (patch.description !== undefined) body.description = patch.description
    if (patch.minOrder !== undefined) body.minOrderCents = toCents(patch.minOrder)
    if (patch.deliveryFee !== undefined) body.deliveryFeeCents = toCents(patch.deliveryFee)
    if (patch.deliveryTime !== undefined) body.deliveryTimeMin = patch.deliveryTime
    if (patch.isOpen !== undefined) body.isOpen = patch.isOpen
    if (patch.status !== undefined) body.status = patch.status
    if (patch.image !== undefined) body.imageUrl = patch.image
    return http.patch(`/admin/merchants/${id}`, body).then(normalizeMerchant)
  },

  listProducts: (params) => http.get('/admin/products', { params }).then((r) => mapPage(r, normalizeProduct)),
  createProduct: (p) =>
    http
      .post('/admin/products', {
        merchantId: p.merchantId,
        name: p.name,
        description: p.description ?? null,
        imageUrl: p.image ?? null,
        priceCents: toCents(p.price),
        stock: p.stock ?? 0,
        menuCategory: p.menuCategory ?? null,
        isAvailable: p.isAvailable !== false,
        isHot: p.isHot === true,
        categoryId: p.categoryId ?? null,
      })
      .then(normalizeProduct),
  updateProduct: (id, p) => {
    const body = {}
    if (p.merchantId !== undefined) body.merchantId = p.merchantId
    if (p.name !== undefined) body.name = p.name
    if (p.description !== undefined) body.description = p.description
    if (p.image !== undefined) body.imageUrl = p.image
    if (p.price !== undefined) body.priceCents = toCents(p.price)
    if (p.stock !== undefined) body.stock = p.stock
    if (p.menuCategory !== undefined) body.menuCategory = p.menuCategory
    if (p.isAvailable !== undefined) body.isAvailable = p.isAvailable
    if (p.isHot !== undefined) body.isHot = p.isHot
    if (p.categoryId !== undefined) body.categoryId = p.categoryId
    return http.patch(`/admin/products/${id}`, body).then(normalizeProduct)
  },
  deleteProduct: (id) => http.delete(`/admin/products/${id}`),

  listUsers: (params) => http.get('/admin/users', { params }),

  listCategories: () => http.get('/admin/categories'),
  createCategory: (c) => http.post('/admin/categories', c),
  updateCategory: (id, c) => http.patch(`/admin/categories/${id}`, c),
}
