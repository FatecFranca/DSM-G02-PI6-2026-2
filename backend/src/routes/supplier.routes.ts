import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { createSupplierSchema, updateSupplierSchema } from '../schemas/supplier.schema'
import { paginationSchema } from '../schemas/user.schema'
import * as ctrl from '../controllers/supplier.controller'

const router = Router()

router.use(authenticate)

router.get('/', validateQuery(paginationSchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createSupplierSchema), audit('Supplier', 'CREATE'), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateSupplierSchema), audit('Supplier', 'UPDATE'), ctrl.update)
router.delete('/:id', authorize('admin'), audit('Supplier', 'DELETE'), ctrl.remove)

export default router
