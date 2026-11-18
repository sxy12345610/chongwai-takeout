import { describe, it, expect, afterAll } from 'vitest'
import { api, authHeader, cleanupUsers, createUser } from './helpers.js'

const created = []
afterAll(async () => {
  await cleanupUsers(created)
})

describe('用户认证', () => {
  it('正常注册并登录', async () => {
    const phone = `reg${Date.now().toString().slice(-6)}`
    // 1. 注册
    const reg = await api().post('/api/v1/auth/register').send({
      phone,
      password: 'secret123',
      nickname: '测试同学',
    })
    expect(reg.status).toBe(200)
    expect(reg.body.code).toBe(0)
    expect(reg.body.data.accessToken).toBeTruthy()
    created.push(reg.body.data.user.id)

    // 2. 用相同凭证登录
    const login = await api().post('/api/v1/auth/login').send({
      phone,
      password: 'secret123',
    })
    expect(login.status).toBe(200)
    expect(login.body.data.user.roles).toContain('USER')

    // 3. 错误密码应被拒绝
    const bad = await api().post('/api/v1/auth/login').send({
      phone,
      password: 'wrongpwd',
    })
    expect(bad.status).toBe(401)
  })

  it('未登录访问受保护接口返回 401', async () => {
    const res = await api().get('/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.code).toBe(2001)
  })

  it('携带 Token 可查询并修改当前用户资料', async () => {
    const u = await createUser('me')
    created.push(u.user.id)

    const me = await api().get('/api/v1/auth/me').set(authHeader(u.token))
    expect(me.status).toBe(200)
    expect(me.body.data.id).toBe(u.user.id)

    const upd = await api()
      .patch('/api/v1/auth/me')
      .set(authHeader(u.token))
      .send({ nickname: '新昵称' })
    expect(upd.status).toBe(200)
    expect(upd.body.data.nickname).toBe('新昵称')
  })
})
