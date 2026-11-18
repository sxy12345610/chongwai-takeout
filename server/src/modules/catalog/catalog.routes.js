import { Router } from 'express'
import { sendOk } from '../../utils/response.js'
import {
  getMerchant,
  listCategories,
  listMerchantProducts,
  listMerchantReviews,
  listMerchants,
} from './catalog.service.js'

const router = Router()

/** GET /api/v1/categories */
router.get('/categories', async (_req, res) => {
  sendOk(res, await listCategories())
})

/** GET /api/v1/merchants */
router.get('/merchants', async (req, res) => {
  sendOk(res, await listMerchants(req.query))
})

/** GET /api/v1/merchants/:merchantId */
router.get('/merchants/:merchantId', async (req, res) => {
  sendOk(res, await getMerchant(req.params.merchantId))
})

/** GET /api/v1/merchants/:merchantId/products */
router.get('/merchants/:merchantId/products', async (req, res) => {
  sendOk(res, await listMerchantProducts(req.params.merchantId, req.query))
})

/** GET /api/v1/merchants/:merchantId/reviews */
router.get('/merchants/:merchantId/reviews', async (req, res) => {
  sendOk(res, await listMerchantReviews(req.params.merchantId, req.query))
})

export default router
