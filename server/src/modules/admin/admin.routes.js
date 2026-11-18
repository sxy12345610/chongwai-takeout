import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireRole } from '../../middleware/auth.js'
import { CODES, HttpError } from '../../utils/httpError.js'
import { sendOk } from '../../utils/response.js'
import {
  acceptOrder,
  completeOrder,
  createCategory,
  createProduct,
  deleteProduct,
  getMerchant,
  getOrder,
  getStats,
  listCategories,
  listMerchants,
  listOrders,
  listProducts,
  listUsers,
  rejectOrder,
  updateCategory,
  updateMerchant,
  updateProduct,
} from './admin.service.js'

const router = Router()
router.use(authenticate, requireRole('ADMIN'))

/* ------------------------------ 统计 ------------------------------ */
router.get('/stats', async (_req, res) => {
  sendOk(res, await getStats())
})

/* ------------------------------ 订单 ------------------------------ */
router.get('/orders', async (req, res) => {
  sendOk(res, await listOrders(req.query))
})

router.get('/orders/:id', async (req, res) => {
  sendOk(res, await getOrder(req.params.id))
})

router.post('/orders/:id/accept', async (req, res) => {
  sendOk(res, await acceptOrder(req.params.id, req.auth.userId))
})

router.post('/orders/:id/reject', async (req, res) => {
  const parsed = z.object({ reason: z.string().min(1).max(100) }).safeParse(req.body)
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '拒单原因必填')
  sendOk(res, await rejectOrder(req.params.id, parsed.data, req.auth.userId))
})

router.post('/orders/:id/complete', async (req, res) => {
  sendOk(res, await completeOrder(req.params.id, req.auth.userId))
})

/* ------------------------------ 商家 ------------------------------ */
router.get('/merchants', async (req, res) => {
  sendOk(res, await listMerchants(req.query))
})

router.get('/merchants/:id', async (req, res) => {
  sendOk(res, await getMerchant(req.params.id))
})

router.patch('/merchants/:id', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().max(50).optional(),
      description: z.string().max(500).nullable().optional(),
      announcement: z.string().max(200).nullable().optional(),
      categoryLabel: z.string().max(20).nullable().optional(),
      minOrderCents: z.number().int().nonnegative().optional(),
      deliveryFeeCents: z.number().int().nonnegative().optional(),
      deliveryTimeMin: z.number().int().positive().optional(),
      isOpen: z.boolean().optional(),
      status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
      imageUrl: z.string().max(500).nullable().optional(),
      coverFrom: z.string().max(20).nullable().optional(),
      coverTo: z.string().max(20).nullable().optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '商家参数格式不正确')
  sendOk(res, await updateMerchant(req.params.id, parsed.data))
})

/* ------------------------------ 商品 ------------------------------ */
router.get('/products', async (req, res) => {
  sendOk(res, await listProducts(req.query))
})

router.post('/products', async (req, res) => {
  const parsed = z
    .object({
      merchantId: z.string(),
      name: z.string().max(50),
      description: z.string().max(200).nullable().optional(),
      imageUrl: z.string().max(500).nullable().optional(),
      priceCents: z.number().int().positive(),
      stock: z.number().int().nonnegative().optional(),
      menuCategory: z.string().max(20).nullable().optional(),
      isAvailable: z.boolean().optional(),
      isHot: z.boolean().optional(),
      categoryId: z.string().nullable().optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '商品参数格式不正确')
  sendOk(res, await createProduct(parsed.data))
})

router.patch('/products/:id', async (req, res) => {
  const parsed = z
    .object({
      merchantId: z.string().optional(),
      name: z.string().max(50).optional(),
      description: z.string().max(200).nullable().optional(),
      imageUrl: z.string().max(500).nullable().optional(),
      priceCents: z.number().int().positive().optional(),
      stock: z.number().int().nonnegative().optional(),
      menuCategory: z.string().max(20).nullable().optional(),
      isAvailable: z.boolean().optional(),
      isHot: z.boolean().optional(),
      categoryId: z.string().nullable().optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '商品参数格式不正确')
  sendOk(res, await updateProduct(req.params.id, parsed.data))
})

router.delete('/products/:id', async (req, res) => {
  sendOk(res, await deleteProduct(req.params.id))
})

/* ------------------------------ 用户 ------------------------------ */
router.get('/users', async (req, res) => {
  sendOk(res, await listUsers(req.query))
})

/* ------------------------------ 分类 ------------------------------ */
router.get('/categories', async (_req, res) => {
  sendOk(res, await listCategories())
})

router.post('/categories', async (req, res) => {
  const parsed = z
    .object({
      key: z.string().max(20),
      name: z.string().max(20),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '分类参数格式不正确')
  sendOk(res, await createCategory(parsed.data))
})

router.patch('/categories/:id', async (req, res) => {
  const parsed = z
    .object({
      name: z.string().max(20).optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(req.body || {})
  if (!parsed.success) throw new HttpError(400, CODES.PARAM, '分类参数格式不正确')
  sendOk(res, await updateCategory(req.params.id, parsed.data))
})

export default router
