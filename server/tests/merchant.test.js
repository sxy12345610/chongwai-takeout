import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  api,
  authHeader,
  cleanupUsers,
  createUser,
  linkMerchant,
  seedMerchants,
} from './helpers.js'

let merchants
let buyer
let buyerH
const created = []

beforeAll(async () => {
  merchants = await seedMerchants()
  buyer = await createUser('buy')
  created.push(buyer.user.id)
  buyerH = authHeader(buyer.token)
  // 买家先建一个收货地址
  await api().post('/api/v1/addresses').set(buyerH).send({
    contactName: '买家',
    phone: '13700000000',
    campusArea: '主校区',
    building: '3号楼',
    room: '101',
  })
})

afterAll(async () => {
  await cleanupUsers(created)
})

async function makeMerchantAccount(tag, merchantIdx) {
  // 先签发 token 再关联商家会导致 token 里没有 MERCHANT 角色，
  // 因此关联后必须重新登录，拿到包含 MERCHANT 的新 token。
  const u = await createUser(tag)
  created.push(u.user.id)
  await linkMerchant(u.user.id, merchants[merchantIdx].id)
  const relogin = await api()
    .post('/api/v1/auth/test-login')
    .send({ phone: u.phone })
  return { ...u, token: relogin.body.data.accessToken }
}

async function placeOrderFor(merchantIdx) {
  const p = merchants[merchantIdx].products[0]
  await api().post('/api/v1/cart/items').set(buyerH).send({ productId: p.id })
  const res = await api().post('/api/v1/orders').set(buyerH).send({})
  return res
}

describe('商家订单管理', () => {
  it('商家越权访问其他商家订单被拒绝', async () => {
    const merchantA = await makeMerchantAccount('mA', 0)
    const merchantB = await makeMerchantAccount('mB', 1)

    // 买家在商家 B 处下单
    const orderRes = await placeOrderFor(1)
    expect(orderRes.status).toBe(200)
    const orderId = orderRes.body.data.orders[0].id

    // 商家 A 列表里看不到该订单
    const listA = await api()
      .get('/api/v1/merchant/orders')
      .set(authHeader(merchantA.token))
    expect(listA.status).toBe(200)
    expect(listA.body.data.list.find((o) => o.id === orderId)).toBeUndefined()

    // 商家 A 访问详情 → 404
    const detailA = await api()
      .get(`/api/v1/merchant/orders/${orderId}`)
      .set(authHeader(merchantA.token))
    expect(detailA.status).toBe(404)

    // 商家 B 能看到
    const detailB = await api()
      .get(`/api/v1/merchant/orders/${orderId}`)
      .set(authHeader(merchantB.token))
    expect(detailB.status).toBe(200)
    expect(detailB.body.data.id).toBe(orderId)

    // 普通用户不能调用商家接口
    const userCall = await api()
      .get('/api/v1/merchant/orders')
      .set(buyerH)
    expect(userCall.status).toBe(403)
  })

  it('重复接单与非法状态跳转被拒绝', async () => {
    const merchantA = await makeMerchantAccount('mA2', 0)
    const HA = authHeader(merchantA.token)

    const orderRes = await placeOrderFor(0)
    expect(orderRes.status).toBe(200)
    const orderId = orderRes.body.data.orders[0].id

    // 接单：PENDING → PREPARING
    const accept = await api()
      .post(`/api/v1/merchant/orders/${orderId}/accept`)
      .set(HA)
    expect(accept.status).toBe(200)
    expect(accept.body.data.status).toBe('PREPARING')

    // 重复接单 → 409
    const acceptAgain = await api()
      .post(`/api/v1/merchant/orders/${orderId}/accept`)
      .set(HA)
    expect(acceptAgain.status).toBe(409)

    // 完成：PREPARING → COMPLETED
    const complete = await api()
      .post(`/api/v1/merchant/orders/${orderId}/complete`)
      .set(HA)
    expect(complete.status).toBe(200)
    expect(complete.body.data.status).toBe('COMPLETED')

    // 已完成订单再拒单 → 409
    const rejectAfter = await api()
      .post(`/api/v1/merchant/orders/${orderId}/reject`)
      .set(HA)
      .send({ reason: '太晚了' })
    expect(rejectAfter.status).toBe(409)

    // 新订单：拒单必须填写原因
    const order2 = await placeOrderFor(0)
    const id2 = order2.body.data.orders[0].id
    const rejectNoReason = await api()
      .post(`/api/v1/merchant/orders/${id2}/reject`)
      .set(HA)
      .send({})
    expect(rejectNoReason.status).toBe(400)

    // 合法拒单 → CANCELLED
    const reject = await api()
      .post(`/api/v1/merchant/orders/${id2}/reject`)
      .set(HA)
      .send({ reason: '食材不足' })
    expect(reject.status).toBe(200)
    expect(reject.body.data.status).toBe('CANCELLED')
    expect(reject.body.data.cancelReason).toBe('食材不足')
  })
})
