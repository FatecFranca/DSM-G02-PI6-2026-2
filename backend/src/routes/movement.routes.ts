import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
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
  audit('Movement', 'CREATE'),
  ctrl.create,
)

export default router
