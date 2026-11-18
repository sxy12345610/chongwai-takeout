import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  createAddress,
  deleteAddress,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from './address.service.js'

const router = Router()
router.use(authenticate)

const payloadSchema = z.object({
  contactName: z.string().min(1).max(20),
  phone: z.string().min(6).max(20),
  campusArea: z.string().max(30).optional(),
  building: z.string().max(30).optional(),
  room: z.string().max(30).optional(),
  detail: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
})

function parse(body) {
  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    throw new HttpError(400, CODES.PARAM, '地址参数格式不正确')
  }
  return parsed.data
}

/** GET /api/v1/addresses */
router.get('/', async (req, res) => {
  sendOk(res, await listAddresses(req.auth.userId))
})

/** POST /api/v1/addresses */
router.post('/', async (req, res) => {
  sendOk(res, await createAddress(req.auth.userId, parse(req.body)))
})

/** PUT /api/v1/addresses/:id */
router.put('/:id', async (req, res) => {
  sendOk(res, await updateAddress(req.auth.userId, req.params.id, parse(req.body)))
})

/** DELETE /api/v1/addresses/:id */
router.delete('/:id', async (req, res) => {
  sendOk(res, await deleteAddress(req.auth.userId, req.params.id))
})

/** PATCH /api/v1/addresses/:id/default */
router.patch('/:id/default', async (req, res) => {
  sendOk(res, await setDefaultAddress(req.auth.userId, req.params.id))
})

export default router
