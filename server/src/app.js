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
app.use(
  cors({
    origin: env.NODE_ENV === 'production' ? false : true,
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
