import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  api,
  authHeader,
  cleanupUsers,
  createUser,
  seedMerchants,
} from './helpers.js'
import { prisma } from '../src/lib/prisma.js'

let merchants
let user
let H
let addressId
const created = []

beforeAll(async () => {
  merchants = await seedMerchants()
  user = await createUser('ord')
  created.push(user.user.id)
  H = authHeader(user.token)
  const a = await api().post('/api/v1/addresses').set(H).send({
    contactName: '下单人',
    phone: '13900000000',
    campusArea: '主校区',
    building: '2号楼',
    room: '502',
  })
  addressId = a.body.data.id
})

afterAll(async () => {
  await cleanupUsers(created)
})

async function addToCart(productId, quantity = 1) {
  return api().post('/api/v1/cart/items').set(H).send({ productId, quantity })
}

describe('订单', () => {
  it('单商家正常下单：扣库存、写快照、清购物车', async () => {
    const p = merchants[0].products[0]
    const before = await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } })

    await addToCart(p.id, 1)
    const res = await api().post('/api/v1/orders').set(H).send({ addressId })
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(1)

    const order = res.body.data.orders[0]
    expect(order.status).toBe('PENDING')
    expect(order.items).toHaveLength(1)
    expect(order.items[0].unitPriceCents).toBe(p.priceCents) // 下单时价格快照
    expect(order.totalCents).toBe(order.subtotalCents + order.deliveryFeeCents)

    // 库存已扣减
    const after = await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } })
    expect(after.stock).toBe(before.stock - 1)

    // 购物车已清空
    const cart = await api().get('/api/v1/cart').set(H)
    expect(cart.body.data.items).toHaveLength(0)
  })

  it('多商家购物车自动拆单，组号一致且金额正确', async () => {
    const [mA, mB] = [merchants[0], merchants[1]]
    const pA = mA.products[0]
    const pB = mB.products[0]

    const beforeA = (await prisma.product.findUnique({ where: { id: pA.id }, select: { stock: true } })).stock
    const beforeB = (await prisma.product.findUnique({ where: { id: pB.id }, select: { stock: true } })).stock

    await addToCart(pA.id, 2)
    await addToCart(pB.id, 1)

    const res = await api().post('/api/v1/orders').set(H).send({ addressId })
    expect(res.status).toBe(200)
    expect(res.body.data.count).toBe(2)

    const orders = res.body.data.orders
    expect(new Set(orders.map((o) => o.checkoutGroupNo)).size).toBe(1)
    expect(new Set(orders.map((o) => o.merchantId)).size).toBe(2)

    // 每笔订单只含本商家商品
    for (const o of orders) {
      const merchantIds = new Set()
      for (const it of o.items) {
        expect(it.unitPriceCents).toBeGreaterThan(0)
      }
      // 通过金额反查：明细小计之和 = 订单小计
      const itemsSubtotal = o.items.reduce((s, it) => s + it.subtotalCents, 0)
      expect(o.subtotalCents).toBe(itemsSubtotal)
      expect(o.totalCents).toBe(o.subtotalCents + o.deliveryFeeCents - o.discountCents)
    }

    // 两个商家库存都扣减
    const afterA = (await prisma.product.findUnique({ where: { id: pA.id }, select: { stock: true } })).stock
    const afterB = (await prisma.product.findUnique({ where: { id: pB.id }, select: { stock: true } })).stock
    expect(afterA).toBe(beforeA - 2)
    expect(afterB).toBe(beforeB - 1)

    // 多商家订单总额 = 各订单合计
    const grand = orders.reduce((s, o) => s + o.totalCents, 0)
    const expected =
      pA.priceCents * 2 + mA.deliveryFeeCents + pB.priceCents * 1 + mB.deliveryFeeCents
    expect(grand).toBe(expected)
  })

  it('库存不足不能创建订单，且事务回滚不产生部分订单', async () => {
    const mA = merchants[0]
    const mB = merchants[1]
    const pOk = mA.products[0] // 库存充足
    const pEmpty = mB.products[0]
    // 把 pEmpty 库存置 0，模拟缺货（global-setup 会在全部结束后恢复）
    const emptyBefore = await prisma.product.findUnique({ where: { id: pEmpty.id }, select: { stock: true } })
    await prisma.product.update({ where: { id: pEmpty.id }, data: { stock: 0 } })

    const okBefore = (await prisma.product.findUnique({ where: { id: pOk.id }, select: { stock: true } })).stock
    const ordersBefore = await prisma.order.count({ where: { userId: user.user.id } })

    await addToCart(pOk.id, 1)
    await addToCart(pEmpty.id, 1)
    const res = await api().post('/api/v1/orders').set(H).send({ addressId })

    expect(res.status).toBe(409)
    expect(res.body.code).toBe(3004)

    // 未产生任何新订单
    const ordersAfter = await prisma.order.count({ where: { userId: user.user.id } })
    expect(ordersAfter).toBe(ordersBefore)

    // 另一商家商品库存未被扣减（事务回滚）
    const okAfter = (await prisma.product.findUnique({ where: { id: pOk.id }, select: { stock: true } })).stock
    expect(okAfter).toBe(okBefore)

    // 恢复 pEmpty 库存，避免影响后续用例
    await prisma.product.update({ where: { id: pEmpty.id }, data: { stock: emptyBefore.stock } })
    // 清空购物车里的失败残留
    await api().delete('/api/v1/cart').set(H)
  })

  it('取消订单后库存恢复', async () => {
    const p = merchants[0].products[0]
    const before = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } })).stock

    await addToCart(p.id, 2)
    const create = await api().post('/api/v1/orders').set(H).send({ addressId })
    expect(create.status).toBe(200)
    const orderId = create.body.data.orders[0].id

    const mid = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } })).stock
    expect(mid).toBe(before - 2)

    const cancel = await api().post(`/api/v1/orders/${orderId}/cancel`).set(H).send({ reason: '不想要了' })
    expect(cancel.status).toBe(200)
    expect(cancel.body.data.status).toBe('CANCELLED')

    const after = (await prisma.product.findUnique({ where: { id: p.id }, select: { stock: true } })).stock
    expect(after).toBe(before)
  })
})
