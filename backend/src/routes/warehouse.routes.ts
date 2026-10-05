import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { addressQuerySchema, createAddressSchema, updateAddressSchema } from '../schemas/warehouse.schema'
import * as ctrl from '../controllers/warehouse.controller'

const router = Router()

router.use(authenticate)

router.get('/stats', ctrl.stats)
router.get('/', validateQuery(addressQuerySchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createAddressSchema), audit('WarehouseAddress', 'CREATE'), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateAddressSchema), audit('WarehouseAddress', 'UPDATE'), ctrl.update)
router.delete('/:id', authorize('admin'), audit('WarehouseAddress', 'DELETE'), ctrl.remove)

export default router
