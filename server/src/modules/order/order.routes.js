import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  cancelOrder,
  createOrders,
  getOrder,
  listOrders,
} from './order.service.js'

const router = Router()
router.use(authenticate)

/** POST /api/v1/orders */
router.post('/', async (req, res) => {
  const parsed = z
    .object({
      addressId: z.string().optional(),
      note: z.string().max(200).optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '参数格式不正确')
  }
  sendOk(res, await createOrders(req.auth.userId, parsed.data, {
    idempotencyKey: req.get('Idempotency-Key'),
  }))
})

/** GET /api/v1/orders */
router.get('/', async (req, res) => {
  sendOk(res, await listOrders(req.auth.userId, req.query))
})

/** GET /api/v1/orders/:id */
router.get('/:id', async (req, res) => {
  sendOk(res, await getOrder(req.auth.userId, req.params.id))
})

/** POST /api/v1/orders/:id/cancel */
router.post('/:id/cancel', async (req, res) => {
  const parsed = z
    .object({ reason: z.string().max(100).optional() })
    .safeParse(req.body || {})
  sendOk(res, await cancelOrder(req.auth.userId, req.params.id, parsed.data || {}))
})

export default router
