import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { aiLimiter } from '../middleware/rate-limit.middleware'
import { uploadImage } from '../middleware/upload.middleware'
import * as ctrl from '../controllers/ai.controller'

const router = Router()

router.use(authenticate)

// Cada chamada custa dinheiro no provedor: limite próprio, além do global.
router.post('/identify-product', authorize('admin', 'supervisor', 'operator'), aiLimiter, uploadImage, ctrl.identifyProduct)

export default router
