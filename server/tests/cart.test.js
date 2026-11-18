import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  api,
  authHeader,
  cleanupUsers,
  createUser,
  seedMerchants,
} from './helpers.js'

let product
const created = []

beforeAll(async () => {
  const merchants = await seedMerchants()
  product = merchants[0].products[0]
})
afterAll(async () => {
  await cleanupUsers(created)
})

describe('购物车', () => {
  it('正常添加购物车，金额由后端按数据库价格计算', async () => {
    const u = await createUser('cart')
    created.push(u.user.id)
    const H = authHeader(u.token)

    const add = await api()
      .post('/api/v1/cart/items')
      .set(H)
      .send({ productId: product.id, quantity: 2 })
    expect(add.status).toBe(200)
    expect(add.body.data.quantity).toBe(2)
    expect(add.body.data.subtotalCents).toBe(product.priceCents * 2)

    const cart = await api().get('/api/v1/cart').set(H)
    expect(cart.status).toBe(200)
    expect(cart.body.data.groups).toHaveLength(1)
    const g = cart.body.data.groups[0]
    expect(g.subtotalCents).toBe(product.priceCents * 2)
    expect(g.totalCents).toBeGreaterThanOrEqual(g.subtotalCents)
    expect(cart.body.data.totalQuantity).toBe(2)

    // 重复加购同一商品应累加，不产生重复行
    await api().post('/api/v1/cart/items').set(H).send({ productId: product.id })
    const cart2 = await api().get('/api/v1/cart').set(H)
    expect(cart2.body.data.items).toHaveLength(1)
    expect(cart2.body.data.items[0].quantity).toBe(3)
  })

  it('不存在的商品不能添加到购物车', async () => {
    const u = await createUser('cartx')
    created.push(u.user.id)
    const res = await api()
      .post('/api/v1/cart/items')
      .set(authHeader(u.token))
      .send({ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe(3002)
  })
})
