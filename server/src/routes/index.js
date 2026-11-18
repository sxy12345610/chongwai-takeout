import { Router } from 'express'
import adminRoutes from '../modules/admin/admin.routes.js'
import authRoutes from '../modules/auth/auth.routes.js'
import addressRoutes from '../modules/address/address.routes.js'
import cartRoutes from '../modules/cart/cart.routes.js'
import catalogRoutes from '../modules/catalog/catalog.routes.js'
import orderRoutes from '../modules/order/order.routes.js'
import merchantRoutes from '../modules/merchant/merchant.routes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/addresses', addressRoutes)
router.use('/cart', cartRoutes)
router.use('/orders', orderRoutes)
router.use('/merchant', merchantRoutes)
router.use('/admin', adminRoutes)
router.use(catalogRoutes)

/** GET /api/v1：接口版本探测。 */
router.get('/', (_req, res) => {
  res.json({
    code: 0,
    message: 'ok',
    data: { name: '重外校园外卖平台 API', version: 'v1', stage: 3 },
  })
})

export default router
