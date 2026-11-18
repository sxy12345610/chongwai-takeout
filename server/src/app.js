import { randomUUID } from 'node:crypto'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import apiRouter from './routes/index.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())

/**
 * 跨域策略：
 * - 生产环境：仅允许 CORS_ORIGINS 白名单中的 Origin（未配置则拒绝所有跨域）；
 * - 非生产环境：未配置白名单时放行，便于本地联调。
 */
const allowedOrigins = (env.CORS_ORIGINS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const isProduction = env.NODE_ENV === 'production'

app.use(
  cors({
    origin(origin, callback) {
      // 无 Origin：curl、服务端调用、微信小程序等非浏览器请求
      if (!origin) return callback(null, true)
      if (!isProduction && allowedOrigins.length === 0) return callback(null, true)
      return callback(null, allowedOrigins.includes(origin))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

/** 请求 ID：便于日志与前端排障（响应头 X-Request-Id）。 */
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID()
  req.id = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
})

/** 存活检查：进程是否启动。 */
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'chongwai-server',
    env: env.NODE_ENV,
    paymentMode: env.PAYMENT_MODE,
    uptime: Math.round(process.uptime()),
  })
})

/** 就绪检查：数据库是否可用。 */
app.get('/readyz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ready', database: 'ok' })
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'error' })
  }
})

app.use('/api/v1', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
