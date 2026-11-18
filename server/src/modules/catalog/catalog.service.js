import { prisma } from '../../lib/prisma.js'
import { isUuid, notFound } from '../../utils/httpError.js'

const MAX_PAGE_SIZE = 100

function parsePagination({ page, pageSize }) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(pageSize) || 20),
  )
  return { page: safePage, pageSize: safeSize, skip: (safePage - 1) * safeSize }
}

const merchantSelect = {
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
}

const productSelect = {
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
  category: { select: { key: true, name: true } },
}

/** Prisma Decimal 不能直接参与前端数值运算，统一转 Number。 */
const normalizeMerchant = (merchant) => ({ ...merchant, rating: Number(merchant.rating) })

/** GET /categories：平台展示分类。 */
export async function listCategories() {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, key: true, name: true, sortOrder: true },
  })
}

/** GET /merchants：仅返回审核通过（ACTIVE）的商家，支持分类、关键词、营业状态筛选。 */
export async function listMerchants(query = {}) {
  const { page, pageSize, skip } = parsePagination(query)
  const where = { status: 'ACTIVE' }

  if (query.keyword) {
    where.name = { contains: String(query.keyword), mode: 'insensitive' }
  }
  if (query.categoryKey) {
    where.products = {
      some: {
        deletedAt: null,
        category: { key: String(query.categoryKey) },
      },
    }
  }
  if (query.isOpen === 'true') where.isOpen = true
  if (query.isOpen === 'false') where.isOpen = false

  const [total, list] = await prisma.$transaction([
    prisma.merchant.count({ where }),
    prisma.merchant.findMany({
      where,
      select: merchantSelect,
      orderBy: [{ isOpen: 'desc' }, { monthlySales: 'desc' }],
      skip,
      take: pageSize,
    }),
  ])

  return { list: list.map(normalizeMerchant), page, pageSize, total }
}

/** GET /merchants/:merchantId：商家详情，停业商家仍可查看基础信息。 */
export async function getMerchant(merchantId) {
  if (!isUuid(merchantId)) {
    throw notFound('商家不存在', 3001)
  }

  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, status: { not: 'CLOSED' } },
    select: merchantSelect,
  })

  if (!merchant) {
    throw notFound('商家不存在', 3001)
  }
  return normalizeMerchant(merchant)
}

/** GET /merchants/:merchantId/products：只返回上架且未软删除的商品。 */
export async function listMerchantProducts(merchantId, query = {}) {
  if (!isUuid(merchantId)) {
    throw notFound('商家不存在', 3001)
  }

  const where = {
    merchantId,
    isAvailable: true,
    deletedAt: null,
  }
  if (query.menuCategory) where.menuCategory = String(query.menuCategory)
  if (query.keyword) {
    where.name = { contains: String(query.keyword), mode: 'insensitive' }
  }

  return prisma.product.findMany({
    where,
    select: productSelect,
    orderBy: [{ isHot: 'desc' }, { monthlySales: 'desc' }, { createdAt: 'asc' }],
  })
}

/** GET /merchants/:merchantId/reviews：评价分页，匿名评价不返回用户信息。 */
export async function listMerchantReviews(merchantId, query = {}) {
  if (!isUuid(merchantId)) {
    throw notFound('商家不存在', 3001)
  }

  const { page, pageSize, skip } = parsePagination(query)
  const where = { merchantId }

  const [total, list] = await prisma.$transaction([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        content: true,
        images: true,
        isAnonymous: true,
        createdAt: true,
        user: { select: { nickname: true, avatarUrl: true } },
      },
    }),
  ])

  return {
    list: list.map(({ user, ...review }) => ({
      ...review,
      user: review.isAnonymous ? null : user,
    })),
    page,
    pageSize,
    total,
  }
}
