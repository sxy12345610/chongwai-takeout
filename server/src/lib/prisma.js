import { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'

/**
 * Prisma 单例。开发环境挂到 globalThis，避免 --watch 重启时连接数膨胀。
 */
const globalForPrisma = globalThis

export const prisma =
  globalForPrisma.__chongwaiPrisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.__chongwaiPrisma = prisma
}
