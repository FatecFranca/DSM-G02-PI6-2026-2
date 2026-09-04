import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createCategorySchema, updateCategorySchema } from '../schemas/category.schema'
import * as ctrl from '../controllers/category.controller'

const router = Router()

router.use(authenticate)

router.get('/', ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createCategorySchema), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateCategorySchema), ctrl.update)
router.delete('/:id', authorize('admin'), ctrl.remove)

export default router
