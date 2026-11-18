import app from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { logger } from './utils/logger.js'
import { ensureAdminUser } from './bootstrap/admin.js'

// 开发态确保管理员账号存在（生产环境无操作）
await ensureAdminUser()

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, paymentMode: env.PAYMENT_MODE },
    'chongwai-server 已启动',
  )
})

async function shutdown(signal) {
  logger.info({ signal }, '正在关闭服务...')
  server.close(async () => {
    try {
      await prisma.$disconnect()
    } finally {
      process.exit(0)
    }
  })

  // 兜底：10 秒内未关闭则强制退出
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, '未处理的 Promise 拒绝')
})
