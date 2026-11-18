import 'dotenv/config'
import { randomInt } from 'node:crypto'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/lib/prisma.js'

export { app }

export const api = () => request(app)
export const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

/** 生成唯一测试手机号（不与真实用户冲突，最大 20 位）。 */
export function uniquePhone(tag = 'u') {
  return `t${tag}${Date.now().toString().slice(-7)}${randomInt(10, 99)}`
}

/** 通过开发态测试登录创建用户，返回 token / user。 */
export async function createUser(tag = 'u') {
  const phone = uniquePhone(tag)
  const res = await api().post('/api/v1/auth/test-login').send({ phone })
  if (res.status !== 200) {
    throw new Error(`createUser 失败: ${res.status} ${res.text}`)
  }
  return {
    token: res.body.data.accessToken,
    user: res.body.data.user,
    phone,
  }
}

/** 把用户关联为某商家的账号（商家越权测试用）。 */
export async function linkMerchant(userId, merchantId, role = 'OWNER') {
  return prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId, userId } },
    update: { role },
    create: { merchantId, userId, role },
  })
}

/** 取演示商家（带在售商品），按名称排序。 */
let merchantCache = null
export async function seedMerchants() {
  if (merchantCache) return merchantCache
  const list = await prisma.merchant.findMany({
    where: { status: 'ACTIVE' },
    include: {
      products: {
        where: { isAvailable: true, deletedAt: null },
        select: { id: true, name: true, priceCents: true, stock: true },
        orderBy: { name: 'asc' },
        take: 5,
      },
    },
    orderBy: { name: 'asc' },
  })
  merchantCache = list.filter((m) => m.products.length > 0)
  return merchantCache
}

/** 清理测试创建的用户及其级联数据（不触碰演示商家/商品）。 */
export async function cleanupUsers(userIds) {
  if (!userIds || userIds.length === 0) return
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } })
  await prisma.order.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.checkoutRequest.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.address.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: userIds } } } })
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.merchantUser.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.deliveryPerson.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}
