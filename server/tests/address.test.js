import { describe, it, expect, afterAll } from 'vitest'
import {
  api,
  authHeader,
  cleanupUsers,
  createUser,
} from './helpers.js'

const created = []
afterAll(async () => {
  await cleanupUsers(created)
})

function addr(overrides = {}) {
  return {
    contactName: '张三',
    phone: '13800000000',
    campusArea: '重外主校区',
    building: '1号楼',
    room: '301',
    detail: '门口右转',
    ...overrides,
  }
}

describe('收货地址', () => {
  it('首条地址自动成为默认，切换默认保持唯一', async () => {
    const u = await createUser('ad')
    created.push(u.user.id)
    const H = authHeader(u.token)

    const a1 = await api().post('/api/v1/addresses').set(H).send(addr())
    expect(a1.status).toBe(200)
    expect(a1.body.data.isDefault).toBe(true)

    const a2 = await api()
      .post('/api/v1/addresses')
      .set(H)
      .send(addr({ contactName: '李四', isDefault: true }))
    expect(a2.body.data.isDefault).toBe(true)

    const list = await api().get('/api/v1/addresses').set(H)
    const defaults = list.body.data.filter((a) => a.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0].id).toBe(a2.body.data.id)

    // 把 a1 重新设为默认
    const setDef = await api()
      .patch(`/api/v1/addresses/${a1.body.data.id}/default`)
      .set(H)
    expect(setDef.status).toBe(200)
    const list2 = await api().get('/api/v1/addresses').set(H)
    expect(list2.body.data.filter((a) => a.isDefault)).toHaveLength(1)
    expect(list2.body.data.find((a) => a.isDefault).id).toBe(a1.body.data.id)
  })

  it('用户越权修改其他用户地址返回 404', async () => {
    const owner = await createUser('ado')
    const other = await createUser('adx')
    created.push(owner.user.id, other.user.id)

    const a = await api()
      .post('/api/v1/addresses')
      .set(authHeader(owner.token))
      .send(addr())
    expect(a.status).toBe(200)

    const put = await api()
      .put(`/api/v1/addresses/${a.body.data.id}`)
      .set(authHeader(other.token))
      .send(addr({ contactName: '黑客' }))
    expect(put.status).toBe(404)

    const del = await api()
      .delete(`/api/v1/addresses/${a.body.data.id}`)
      .set(authHeader(other.token))
    expect(del.status).toBe(404)
  })
})
