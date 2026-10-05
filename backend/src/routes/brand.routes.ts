import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate } from '../middleware/validate.middleware'
import { createBrandSchema, updateBrandSchema } from '../services/brand.service'
import * as ctrl from '../controllers/brand.controller'

const router = Router()

router.use(authenticate)

router.get('/', ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createBrandSchema), audit('Brand', 'CREATE'), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateBrandSchema), audit('Brand', 'UPDATE'), ctrl.update)
router.delete('/:id', authorize('admin'), audit('Brand', 'DELETE'), ctrl.remove)

export default router
