import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { CODES, forbidden, HttpError, unauthorized } from '../../utils/httpError.js'

function issueToken(user, roles) {
  return jwt.sign({ sub: user.id, roles }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  })
}

/**
 * 解析用户角色与归属：
 * - USER：所有用户默认
 * - MERCHANT：在 merchant_users 中有记录
 * - RIDER：delivery_persons 中状态为 ACTIVE
 * - ADMIN：user id 命中环境变量 ADMIN_USER_IDS 白名单
 * 同时返回 merchantIds，供商家接口做数据隔离。
 */
export async function resolveIdentity(userId) {
  const [merchantUsers, deliveryPerson, user] = await Promise.all([
    prisma.merchantUser.findMany({
      where: { userId },
      select: { merchantId: true, role: true },
    }),
    prisma.deliveryPerson.findUnique({
      where: { userId },
      select: { id: true, status: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }),
  ])

  const roles = ['USER']
  if (merchantUsers.length > 0) roles.push('MERCHANT')
  if (deliveryPerson?.status === 'ACTIVE') roles.push('RIDER')

  const adminIds = (env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (adminIds.includes(userId)) roles.push('ADMIN')

  // 开发态便捷入口：配置 SEED_ADMIN_PHONE 后，该手机号账号直接获得 ADMIN 角色。
  // 生产环境此分支不生效，必须走 ADMIN_USER_IDS 白名单。
  if (
    env.NODE_ENV !== 'production' &&
    env.SEED_ADMIN_PHONE &&
    user?.phone === env.SEED_ADMIN_PHONE
  ) {
    if (!roles.includes('ADMIN')) roles.push('ADMIN')
  }

  return {
    roles,
    merchantIds: merchantUsers.map((m) => m.merchantId),
    deliveryPersonId: deliveryPerson?.id ?? null,
  }
}

// 兼容旧调用
export const resolveRoles = resolveIdentity

function toPublicUser(user, identity) {
  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    status: user.status,
    roles: identity.roles,
    merchantIds: identity.merchantIds,
    deliveryPersonId: identity.deliveryPersonId,
  }
}

/** 用户注册：手机号唯一，密码 bcrypt 哈希。 */
export async function register({ phone, password, nickname }) {
  const exists = await prisma.user.findUnique({ where: { phone } })
  if (exists) {
    throw new HttpError(409, CODES.DUPLICATE, '该手机号已注册')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { phone, passwordHash, nickname: nickname || `用户${phone.slice(-4)}` },
  })

  const identity = await resolveIdentity(user.id)
  return {
    accessToken: issueToken(user, identity.roles),
    expiresIn: env.JWT_ACCESS_TTL,
    user: toPublicUser(user, identity),
  }
}

/** 手机号 + 密码登录。 */
export async function loginWithPassword({ phone, password }) {
  const user = await prisma.user.findUnique({ where: { phone } })

  if (!user || !user.passwordHash) {
    throw unauthorized('手机号或密码错误')
  }
  if (user.status !== 'ACTIVE') {
    throw forbidden('账号已被停用')
  }

  const matched = await bcrypt.compare(password, user.passwordHash)
  if (!matched) {
    throw unauthorized('手机号或密码错误')
  }

  const identity = await resolveIdentity(user.id)
  return {
    accessToken: issueToken(user, identity.roles),
    expiresIn: env.JWT_ACCESS_TTL,
    user: toPublicUser(user, identity),
  }
}

/**
 * 仅限非生产环境的测试登录：按手机号查找用户，不存在则自动创建。
 * 生产环境（NODE_ENV=production）一律拒绝，避免绕过认证。
 */
export async function devLogin({ phone, nickname }) {
  if (env.NODE_ENV === 'production') {
    throw new HttpError(403, CODES.FORBIDDEN, '测试登录在生产环境不可用')
  }

  let user = await prisma.user.findUnique({ where: { phone } })
  if (!user) {
    user = await prisma.user.create({
      data: { phone, nickname: nickname || `测试用户${phone.slice(-4)}` },
    })
  }
  if (user.status !== 'ACTIVE') {
    throw forbidden('账号已被停用')
  }

  const identity = await resolveIdentity(user.id)
  return {
    accessToken: issueToken(user, identity.roles),
    expiresIn: env.JWT_ACCESS_TTL,
    user: toPublicUser(user, identity),
  }
}

/**
 * 微信小程序登录：预留正式 code2Session 接入能力。
 * 未配置 WECHAT_APPID / WECHAT_SECRET 时直接报错，绝不伪造登录成功。
 * 真实回调实现待接入微信支付资质后补充（见 docs/payment.md）。
 */
export async function wxLogin({ code }) {
  if (!code) {
    throw new HttpError(400, CODES.PARAM, '缺少微信登录 code')
  }
  if (!env.WECHAT_APPID || !env.WECHAT_SECRET) {
    throw new HttpError(
      501,
      CODES.NOT_FOUND,
      '微信登录未配置（缺少 WECHAT_APPID / WECHAT_SECRET），暂不可用',
    )
  }
  // TODO：调用 https://api.weixin.qq.com/sns/jscode2session 换取 openid，
  //  upsert 用户并签发 JWT。未接入前不伪造成功。
  throw new HttpError(501, CODES.NOT_FOUND, '微信登录尚未接入')
}

/** 当前登录用户信息。 */
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw unauthorized('用户不存在或已注销')
  }
  const identity = await resolveIdentity(user.id)
  return toPublicUser(user, identity)
}

/** 修改当前用户资料（昵称 / 头像）。 */
export async function updateProfile(userId, { nickname, avatarUrl }) {
  const data = {}
  if (typeof nickname === 'string' && nickname.trim()) data.nickname = nickname.trim()
  if (typeof avatarUrl === 'string') data.avatarUrl = avatarUrl || null

  if (Object.keys(data).length === 0) {
    throw new HttpError(400, CODES.PARAM, '没有需要更新的字段')
  }

  const user = await prisma.user.update({ where: { id: userId }, data })
  const identity = await resolveIdentity(user.id)
  return toPublicUser(user, identity)
}
