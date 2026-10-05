import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { createProductSchema, productQuerySchema, updateProductSchema } from '../schemas/product.schema'
import * as ctrl from '../controllers/product.controller'

const router = Router()

router.use(authenticate)

router.get('/scan/:code', ctrl.scan)
router.get('/', validateQuery(productQuerySchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createProductSchema), audit('Product', 'CREATE'), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateProductSchema), audit('Product', 'UPDATE'), ctrl.update)
router.delete('/:id', authorize('admin'), audit('Product', 'DELETE'), ctrl.remove)

export default router
