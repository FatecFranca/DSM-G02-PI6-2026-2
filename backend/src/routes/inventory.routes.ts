import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { z } from 'zod'
import * as ctrl from '../controllers/inventory.controller'

const createInventorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(['full', 'partial', 'cyclic']),
  startDate: z.string().datetime(),
  responsibleId: z.string().cuid(),
})

const updateInventorySchema = z.object({
  status: z.enum(['planned', 'in_progress', 'review', 'completed']).optional(),
  endDate: z.string().datetime().optional(),
  totalItems: z.number().int().min(0).optional(),
  countedItems: z.number().int().min(0).optional(),
  divergences: z.number().int().min(0).optional(),
})

const router = Router()

router.use(authenticate)

router.get('/', ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createInventorySchema), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor', 'operator'), validate(updateInventorySchema), ctrl.update)
router.delete('/:id', authorize('admin'), ctrl.remove)

export default router
