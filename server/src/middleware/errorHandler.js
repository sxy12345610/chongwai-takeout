import { Prisma } from '@prisma/client'
import { logger } from '../utils/logger.js'

/** 404 统一处理。 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    code: 40400,
    message: `接口不存在：${req.method} ${req.originalUrl}`,
    data: null,
  })
}

/** 统一错误响应；5xx 不向前端暴露内部细节。 */
export function errorHandler(err, req, res, _next) {
  // 数据库连接不可用：给出可操作的提示，而不是笼统 500。
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    logger.error({ err, path: req.originalUrl }, '数据库不可用')
    return res.status(503).json({
      code: 50300,
      message: '数据库连接不可用，请检查 server/.env 中的 DATABASE_URL',
      data: null,
    })
  }

  const status = Number(err.status) || 500
  const code = Number(err.code) || status * 100

  if (status >= 500) {
    logger.error(
      { err, path: req.originalUrl, method: req.method, requestId: req.id },
      '未处理的服务端错误',
    )
  }

  res.status(status).json({
    code,
    message: status >= 500 ? '服务器内部错误' : err.message,
    data: null,
    traceId: req.id,
  })
}
