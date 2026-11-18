import pino from 'pino'
import { env } from '../config/env.js'

/** 统一结构化日志；生产环境输出 JSON，开发环境保留可读格式。 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'sign',
      'privateKey',
    ],
    censor: '[REDACTED]',
  },
})
