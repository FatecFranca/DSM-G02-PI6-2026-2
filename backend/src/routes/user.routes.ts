import { Router } from 'express'
import { authenticate, authorize, authorizeUserRoleChange, protectAdminAccounts } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { createUserSchema, paginationSchema, resetPasswordSchema, updateUserSchema, updateUserStatusSchema } from '../schemas/user.schema'
import * as ctrl from '../controllers/user.controller'

const router = Router()

router.use(authenticate)

router.get('/', validateQuery(paginationSchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post(
  '/',
  authorize('admin', 'supervisor'),
  validate(createUserSchema),
  authorizeUserRoleChange('operator', 'viewer'),
  audit('User', 'CREATE'),
  ctrl.create,
)
router.patch(
  '/:id',
  authorize('admin', 'supervisor'),
  protectAdminAccounts,
  validate(updateUserSchema),
  authorizeUserRoleChange(),
  audit('User', 'UPDATE'),
  ctrl.update,
)
router.patch('/:id/status', authorize('admin'), validate(updateUserStatusSchema), audit('User', 'UPDATE'), ctrl.updateStatus)
router.patch('/:id/password', authorize('admin'), validate(resetPasswordSchema), ctrl.resetPassword)
router.delete('/:id', authorize('admin'), audit('User', 'DELETE'), ctrl.remove)

export default router
