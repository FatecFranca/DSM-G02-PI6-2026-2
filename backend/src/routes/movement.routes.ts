import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { createMovementSchema, movementQuerySchema } from '../schemas/movement.schema'
import * as ctrl from '../controllers/movement.controller'

const router = Router()

router.use(authenticate)

router.get('/', validateQuery(movementQuerySchema), ctrl.list)
router.get('/:id', ctrl.getById)
router.post(
  '/',
  authorize('admin', 'supervisor', 'operator'),
  validate(createMovementSchema),
  ctrl.create,
)

export default router
