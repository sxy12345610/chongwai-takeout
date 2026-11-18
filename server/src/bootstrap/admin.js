import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

/**
 * 仅非生产环境：若配置了 SEED_ADMIN_PHONE，确保该管理员账号存在且可密码登录。
 * 生产环境直接跳过，管理员角色只能通过 ADMIN_USER_IDS 白名单授予。
 * 注意：账号密码只来自环境变量，不写入代码、不输出日志。
 */
export async function ensureAdminUser() {
  if (env.NODE_ENV === 'production') return
  if (!env.SEED_ADMIN_PHONE) return

  const phone = env.SEED_ADMIN_PHONE
  const password = env.SEED_ADMIN_PASSWORD

  const exists = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, passwordHash: true },
  })

  if (exists) {
    if (password && !exists.passwordHash) {
      await prisma.user.update({
        where: { phone },
        data: { passwordHash: await bcrypt.hash(password, 10), status: 'ACTIVE' },
      })
    }
    logger.info({ phone }, '开发态管理员账号已就绪')
    return
  }

  await prisma.user.create({
    data: {
      phone,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
      nickname: '平台管理员',
      status: 'ACTIVE',
    },
  })
  logger.info({ phone }, '已创建开发态管理员账号')
}
