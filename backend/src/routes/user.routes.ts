import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { createUserSchema, paginationSchema, updateUserSchema, updateUserStatusSchema } from '../schemas/user.schema'
import * as ctrl from '../controllers/user.controller'

const router = Router()

router.use(authenticate)

router.get('/', validateQuery(paginationSchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createUserSchema), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateUserSchema), ctrl.update)
router.patch('/:id/status', authorize('admin'), validate(updateUserStatusSchema), ctrl.updateStatus)
router.delete('/:id', authorize('admin'), ctrl.remove)

export default router
