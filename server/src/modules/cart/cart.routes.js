import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from './cart.service.js'

const router = Router()
router.use(authenticate)

/** GET /api/v1/cart */
router.get('/', async (req, res) => {
  sendOk(res, await getCart(req.auth.userId))
})

/** POST /api/v1/cart/items */
router.post('/items', async (req, res) => {
  const parsed = z
    .object({
      productId: z.string(),
      quantity: z.number().int().positive().max(99).optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '参数格式不正确')
  }
  sendOk(res, await addCartItem(req.auth.userId, parsed.data))
})

/** PATCH /api/v1/cart/items/:id */
router.patch('/items/:id', async (req, res) => {
  const parsed = z
    .object({ quantity: z.number().int().positive().max(99) })
    .safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '数量参数不正确')
  }
  sendOk(res, await updateCartItem(req.auth.userId, req.params.id, parsed.data))
})

/** DELETE /api/v1/cart/items/:id */
router.delete('/items/:id', async (req, res) => {
  sendOk(res, await removeCartItem(req.auth.userId, req.params.id))
})

/** DELETE /api/v1/cart */
router.delete('/', async (req, res) => {
  sendOk(res, await clearCart(req.auth.userId))
})

export default router
