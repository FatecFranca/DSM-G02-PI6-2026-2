import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { addressQuerySchema, createAddressSchema, updateAddressSchema } from '../schemas/warehouse.schema'
import * as ctrl from '../controllers/warehouse.controller'

const router = Router()

router.use(authenticate)

router.get('/stats', ctrl.stats)
router.get('/', validateQuery(addressQuerySchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createAddressSchema), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateAddressSchema), ctrl.update)
router.delete('/:id', authorize('admin'), ctrl.remove)

export default router
