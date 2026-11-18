import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  acceptOrder,
  completeOrder,
  getMerchantOrder,
  listMerchantOrders,
  rejectOrder,
} from './merchant.service.js'
import { merchantAuth } from './merchant.middleware.js'

const router = Router()
router.use(authenticate, merchantAuth)

/** GET /api/v1/merchant/orders */
router.get('/orders', async (req, res) => {
  sendOk(res, await listMerchantOrders(req.merchantIds, req.query))
})

/** GET /api/v1/merchant/orders/:id */
router.get('/orders/:id', async (req, res) => {
  sendOk(res, await getMerchantOrder(req.merchantIds, req.params.id))
})

/** POST /api/v1/merchant/orders/:id/accept */
router.post('/orders/:id/accept', async (req, res) => {
  sendOk(
    res,
    await acceptOrder(req.merchantIds, req.params.id, req.auth.userId),
  )
})

/** POST /api/v1/merchant/orders/:id/reject */
router.post('/orders/:id/reject', async (req, res) => {
  const parsed = z.object({ reason: z.string().min(1).max(100) }).safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '拒单原因必填')
  }
  sendOk(
    res,
    await rejectOrder(req.merchantIds, req.params.id, parsed.data, req.auth.userId),
  )
})

/** POST /api/v1/merchant/orders/:id/complete */
router.post('/orders/:id/complete', async (req, res) => {
  sendOk(
    res,
    await completeOrder(req.merchantIds, req.params.id, req.auth.userId),
  )
})

export default router
