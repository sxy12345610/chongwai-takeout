import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  devLogin,
  getCurrentUser,
  loginWithPassword,
  register,
  updateProfile,
  wxLogin,
} from './auth.service.js'

const router = Router()

const phoneSchema = z.string().min(6).max(20)
const passwordSchema = z.string().min(6).max(72)

/** POST /api/v1/auth/register */
router.post('/register', async (req, res) => {
  const parsed = z
    .object({
      phone: phoneSchema,
      password: passwordSchema,
      nickname: z.string().max(30).optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '注册参数格式不正确')
  }
  sendOk(res, await register(parsed.data))
})

/** POST /api/v1/auth/login */
router.post('/login', async (req, res) => {
  const parsed = z
    .object({ phone: phoneSchema, password: passwordSchema })
    .safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '手机号或密码格式不正确')
  }
  sendOk(res, await loginWithPassword(parsed.data))
})

/** POST /api/v1/auth/test-login（仅非生产环境，自动化测试用） */
router.post('/test-login', async (req, res) => {
  const parsed = z
    .object({ phone: phoneSchema, nickname: z.string().max(30).optional() })
    .safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '参数格式不正确')
  }
  sendOk(res, await devLogin(parsed.data))
})

/** POST /api/v1/auth/wx-login（预留，未配置时不伪造成功） */
router.post('/wx-login', async (req, res) => {
  sendOk(res, await wxLogin(req.body || {}))
})

/** GET /api/v1/auth/me */
router.get('/me', authenticate, async (req, res) => {
  sendOk(res, await getCurrentUser(req.auth.userId))
})

/** PATCH /api/v1/auth/me */
router.patch('/me', authenticate, async (req, res) => {
  sendOk(res, await updateProfile(req.auth.userId, req.body || {}))
})

export default router
