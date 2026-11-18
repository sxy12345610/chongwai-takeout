import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  api,
  authHeader,
  cleanupUsers,
  createUser,
  linkMerchant,
  seedMerchants,
} from './helpers.js'
import { prisma } from '../src/lib/prisma.js'

let merchants
let buyer
let H
let addressId
let merchantA
let HA
let buyer2
let H2
let addressId2
const created = []
const INT_MAX = 2147483647

async function stockOf(productId) {
  return (await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } })).stock
}

async function clearCart(headers) {
  await api().delete('/api/v1/cart').set(headers)
}

async function addCart(headers, productId, quantity = 1) {
  return api().post('/api/v1/cart/items').set(headers).send({ productId, quantity })
}

function postOrder(headers, body, key) {
  const req = api().post('/api/v1/orders').set(headers)
  if (key) req.set('Idempotency-Key', key)
  return req.send(body)
}

async function placeOrder(productId, quantity = 1, body = {}) {
  await addCart(H, productId, quantity)
  return postOrder(H, { addressId, ...body })
}

beforeAll(async () => {
  merchants = await seedMerchants()

  buyer = await createUser('idem')
  created.push(buyer.user.id)
  H = authHeader(buyer.token)
  const a = await api().post('/api/v1/addresses').set(H).send({
    contactName: '幂等买家',
    phone: '13600000000',
    campusArea: '主校区',
    building: '5号楼',
    room: '301',
  })
  addressId = a.body.data.id

  buyer2 = await createUser('idem2')
  created.push(buyer2.user.id)
  H2 = authHeader(buyer2.token)
  const a2 = await api().post('/api/v1/addresses').set(H2).send({
    contactName: '幂等买家2',
    phone: '13600000001',
    campusArea: '主校区',
    building: '5号楼',
    room: '302',
  })
  addressId2 = a2.body.data.id

  // 商家账号（关联后重新登录以获得 MERCHANT 角色）
  const mu = await createUser('idemM')
  created.push(mu.user.id)
  await linkMerchant(mu.user.id, merchants[0].id)
  const relogin = await api().post('/api/v1/auth/test-login').send({ phone: mu.phone })
  merchantA = { ...mu, token: relogin.body.data.accessToken }
  HA = authHeader(merchantA.token)
})

afterAll(async () => {
  await cleanupUsers(created)
})

describe('订单幂等与并发安全', () => {
  it('A. 相同幂等键并发提交：只创建一组订单、只扣一次库存', async () => {
    await clearCart(H)
    const p = merchants[0].products[0]
    const before = await stockOf(p.id)
    const key = `A-${randomUUID()}`
    await addCart(H, p.id, 1)

    const [r1, r2] = await Promise.all([postOrder(H, { addressId }, key), postOrder(H, { addressId }, key)])

    expect([r1.status, r2.status]).toEqual([200, 200])
    expect(r1.body.data.count).toBe(1)
    expect(r2.body.data.count).toBe(1)
    // 两次返回同一笔订单、同一结算组；其中恰好一次为幂等重放
    expect(r1.body.data.orders[0].id).toBe(r2.body.data.orders[0].id)
    expect(r1.body.data.checkoutGroupNo).toBe(r2.body.data.checkoutGroupNo)
    const replayCount = [r1, r2].filter((r) => r.body.data.replayed === true).length
    expect(replayCount).toBe(1)

    const dbCount = await prisma.order.count({ where: { userId: buyer.user.id } })
    expect(dbCount).toBe(1)
    expect(await stockOf(p.id)).toBe(before - 1)
  })

  it('B. 相同幂等键重复（串行）提交：返回原订单，不再建单/扣库存', async () => {
    await clearCart(H)
    const p = merchants[0].products[1] || merchants[0].products[0]
    const before = await stockOf(p.id)
    const key = `B-${randomUUID()}`

    await addCart(H, p.id, 1)
    const first = await postOrder(H, { addressId }, key)
    expect(first.status).toBe(200)
    const orderId = first.body.data.orders[0].id
    const stockAfterFirst = await stockOf(p.id)

    // 此时购物车已被清空；重复提交仍应返回原订单而不是「购物车为空」
    const second = await postOrder(H, { addressId }, key)
    expect(second.status).toBe(200)
    expect(second.body.data.orders[0].id).toBe(orderId)
    expect(second.body.data.count).toBe(first.body.data.count)
    expect(second.body.data.replayed).toBe(true)

    expect(await stockOf(p.id)).toBe(stockAfterFirst)
    const groupOrders = await prisma.order.count({
      where: { userId: buyer.user.id, checkoutGroupNo: first.body.data.checkoutGroupNo },
    })
    expect(groupOrders).toBe(first.body.data.count)
    expect(before - stockAfterFirst).toBe(1)
  })

  it('C. 相同幂等键但请求内容不同：返回 409 冲突，不再建单/扣库存', async () => {
    await clearCart(H)
    const p = merchants[0].products[2] || merchants[0].products[0]
    const key = `C-${randomUUID()}`

    await addCart(H, p.id, 1)
    const first = await postOrder(H, { addressId }, key)
    expect(first.status).toBe(200)
    const stockAfterFirst = await stockOf(p.id)
    const orderCountAfterFirst = await prisma.order.count({ where: { userId: buyer.user.id } })

    const second = await postOrder(H, { addressId, note: '内容不同' }, key)
    expect(second.status).toBe(409)
    expect(second.body.code).toBe(5003)

    expect(await prisma.order.count({ where: { userId: buyer.user.id } })).toBe(orderCountAfterFirst)
    expect(await stockOf(p.id)).toBe(stockAfterFirst)
  })

  it('D. 同一订单并发拒单两次：只有一次成功，另一次 409，库存只恢复一次', async () => {
    await clearCart(H)
    const p = merchants[0].products[0]
    await addCart(H, p.id, 1)
    const orderRes = await postOrder(H, { addressId })
    expect(orderRes.status).toBe(200)
    const orderId = orderRes.body.data.orders[0].id
    const stockAfterOrder = await stockOf(p.id)

    const reject = (reason) =>
      api().post(`/api/v1/merchant/orders/${orderId}/reject`).set(HA).send({ reason })

    const [r1, r2] = await Promise.all([reject('并发拒单甲'), reject('并发拒单乙')])
    const statuses = [r1.status, r2.status].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 409])

    const stockAfter = await stockOf(p.id)
    expect(stockAfter).toBe(stockAfterOrder + 1)

    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, cancelReason: true },
    })
    expect(dbOrder.status).toBe('CANCELLED')
    // 拒单原因只能是成功那一次的，不能被第二次覆盖
    const okReason = r1.status === 200 ? '并发拒单甲' : '并发拒单乙'
    expect(dbOrder.cancelReason).toBe(okReason)
  })

  it('E. 拒单事务中途异常：订单状态与库存一起回滚', async () => {
    await clearCart(H)
    const p = merchants[0].products[0]
    const original = await stockOf(p.id)

    try {
      // 制造真实数据库错误：库存设为 int4 上限，拒单回补 +1 会整数溢出
      await prisma.product.update({ where: { id: p.id }, data: { stock: INT_MAX } })
      await addCart(H, p.id, 1)
      const orderRes = await postOrder(H, { addressId })
      expect(orderRes.status).toBe(200)
      const orderId = orderRes.body.data.orders[0].id

      await prisma.product.update({ where: { id: p.id }, data: { stock: INT_MAX } })

      const res = await api()
        .post(`/api/v1/merchant/orders/${orderId}/reject`)
        .set(HA)
        .send({ reason: '触发事务回滚' })
      expect(res.status).toBe(500)

      const dbOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, cancelReason: true, cancelledAt: true },
      })
      // 状态更新已回滚，订单仍为 PENDING，拒单原因未写入
      expect(dbOrder.status).toBe('PENDING')
      expect(dbOrder.cancelReason).toBeNull()
      expect(dbOrder.cancelledAt).toBeNull()
      // 库存回补也随事务回滚，保持原值
      expect(await stockOf(p.id)).toBe(INT_MAX)
    } finally {
      await prisma.product.update({ where: { id: p.id }, data: { stock: original } })
      await clearCart(H)
    }
  })

  it('F. 不同用户 / 不同幂等键下单：互不影响，库存与订单正确', async () => {
    await clearCart(H)
    await clearCart(H2)
    const p = merchants[0].products[0]
    const before = await stockOf(p.id)

    await addCart(H, p.id, 1)
    await addCart(H2, p.id, 1)
    const [r1, r2] = await Promise.all([
      postOrder(H, { addressId }, `F1-${randomUUID()}`),
      postOrder(H2, { addressId: addressId2 }, `F2-${randomUUID()}`),
    ])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(r1.body.data.orders[0].id).not.toBe(r2.body.data.orders[0].id)
    expect(await stockOf(p.id)).toBe(before - 2)

    const c1 = await prisma.order.count({ where: { userId: buyer.user.id } })
    const c2 = await prisma.order.count({ where: { userId: buyer2.user.id } })
    expect(c1).toBeGreaterThan(0)
    expect(c2).toBe(1)
  })

  it('G. 多商家购物车并发提交：只产生一组结算订单，不部分成功', async () => {
    await clearCart(H)
    const mA = merchants[0]
    const mB = merchants[1]
    const pA = mA.products[0]
    const pB = mB.products[0]
    const beforeA = await stockOf(pA.id)
    const beforeB = await stockOf(pB.id)

    await addCart(H, pA.id, 2)
    await addCart(H, pB.id, 1)
    const key = `G-${randomUUID()}`
    const [r1, r2] = await Promise.all([postOrder(H, { addressId }, key), postOrder(H, { addressId }, key)])

    expect([r1.status, r2.status]).toEqual([200, 200])
    expect(r1.body.data.count).toBe(2)
    expect(r2.body.data.count).toBe(2)
    const groupNos = new Set([r1.body.data.checkoutGroupNo, r2.body.data.checkoutGroupNo])
    expect(groupNos.size).toBe(1)
    expect(new Set(r1.body.data.orders.map((o) => o.merchantId)).size).toBe(2)

    const groupNo = r1.body.data.checkoutGroupNo
    const dbGroupOrders = await prisma.order.count({ where: { checkoutGroupNo: groupNo } })
    expect(dbGroupOrders).toBe(2)

    // 两个商家各自只扣一次
    expect(await stockOf(pA.id)).toBe(beforeA - 2)
    expect(await stockOf(pB.id)).toBe(beforeB - 1)
  })

  it('H. 下单事务失败回滚后，同一幂等键可正常重试', async () => {
    await clearCart(H)
    const p = merchants[0].products[0]
    const original = await stockOf(p.id)
    const key = `H-${randomUUID()}`

    try {
      await prisma.product.update({ where: { id: p.id }, data: { stock: 0 } })
      await addCart(H, p.id, 1)
      const fail = await postOrder(H, { addressId }, key)
      expect(fail.status).toBe(409)
      expect(fail.body.code).toBe(3004)

      // 失败的请求不得留下幂等记录
      const record = await prisma.checkoutRequest.findUnique({
        where: { userId_idempotencyKey: { userId: buyer.user.id, idempotencyKey: key } },
      })
      expect(record).toBeNull()

      // 恢复库存后，同一个 key 可以正常下单
      await prisma.product.update({ where: { id: p.id }, data: { stock: original } })
      const retry = await postOrder(H, { addressId }, key)
      expect(retry.status).toBe(200)
      expect(retry.body.data.count).toBe(1)
      expect(await stockOf(p.id)).toBe(original - 1)
    } finally {
      await prisma.product.update({ where: { id: p.id }, data: { stock: original } })
      await clearCart(H)
    }
  })

  it('I. 商家原状态机不受影响：接单 → 完成；已完成不可拒单', async () => {
    await clearCart(H)
    const p = merchants[0].products[0]
    const orderRes = await placeOrder(p.id, 1)
    expect(orderRes.status).toBe(200)
    const orderId = orderRes.body.data.orders[0].id

    const accept = await api().post(`/api/v1/merchant/orders/${orderId}/accept`).set(HA)
    expect(accept.status).toBe(200)
    expect(accept.body.data.status).toBe('PREPARING')

    const complete = await api().post(`/api/v1/merchant/orders/${orderId}/complete`).set(HA)
    expect(complete.status).toBe(200)
    expect(complete.body.data.status).toBe('COMPLETED')

    const rejectAfter = await api()
      .post(`/api/v1/merchant/orders/${orderId}/reject`)
      .set(HA)
      .send({ reason: '太晚了' })
    expect(rejectAfter.status).toBe(409)
  })
})
