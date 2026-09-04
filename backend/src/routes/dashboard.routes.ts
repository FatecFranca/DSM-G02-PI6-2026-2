import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as ctrl from '../controllers/dashboard.controller'

const router = Router()

router.use(authenticate)

router.get('/', ctrl.summary)
router.get('/movement-trend', ctrl.movementTrend)
router.get('/category-distribution', ctrl.categoryDistribution)
router.get('/top-products', ctrl.topProducts)
router.get('/abc', ctrl.abcCurve)

export default router
