import 'dotenv/config'
import { z } from 'zod'

/**
 * 启动前校验环境变量，缺少关键配置时直接失败，
 * 避免服务在缺少数据库或密钥的情况下带病运行。
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET 至少需要 32 位'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TTL: z.string().default('2h'),
  PAYMENT_MODE: z.enum(['disabled', 'sandbox', 'live']).default('disabled'),
  // 微信小程序登录（AppSecret 仅存后端环境变量，未配置时 wx-login 不伪造成功）
  WECHAT_APPID: z.string().optional(),
  WECHAT_SECRET: z.string().optional(),
  // 浏览器跨域白名单：逗号分隔的完整 Origin（协议+域名，不含路径）。
  // 生产环境未配置时拒绝所有跨域请求；非生产环境未配置时放行。
  CORS_ORIGINS: z.string().optional(),
  // 平台管理员白名单：逗号分隔的 user id（避免新增数据表，管理员角色由此判定）
  ADMIN_USER_IDS: z.string().optional(),
  // 开发态管理员账号（仅非生产环境生效）：设置后启动时自动确保该账号存在，
  // 并在 resolveIdentity 中按手机号授予 ADMIN 角色，方便管理后台联调。
  // 生产环境必须使用 ADMIN_USER_IDS 白名单，此处配置不会生效。
  SEED_ADMIN_PHONE: z.string().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(6).max(72).optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  console.error(`[env] 环境变量校验失败：\n${details}`)
  console.error('[env] 请参考 server/.env.example 创建 server/.env')
  process.exit(1)
}

export const env = parsed.data
