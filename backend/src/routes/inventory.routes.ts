import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { audit } from '../middleware/audit.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import { z } from 'zod'
import * as ctrl from '../controllers/inventory.controller'

const createInventorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(['full', 'partial', 'cyclic']),
  startDate: z.string().datetime(),
  responsibleId: z.string().cuid(),
  productIds: z.array(z.string().cuid()).optional(),
}).superRefine((value, context) => {
  if (value.type !== 'full' && (!value.productIds || value.productIds.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selecione ao menos um produto para inventários parciais ou cíclicos',
      path: ['productIds'],
    })
  }
})

const updateInventorySchema = z.object({
  status: z.enum(['planned', 'in_progress', 'review', 'completed']).optional(),
})
const countInventoryItemSchema = z.object({ countedQuantity: z.number().int().min(0) })
const inventoryQuerySchema = z.object({
  status: z.enum(['planned', 'in_progress', 'review', 'completed']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const router = Router()

router.use(authenticate)

router.get('/', validateQuery(inventoryQuerySchema), ctrl.list)
router.post('/:id/items/:itemId/count', authorize('admin', 'supervisor', 'operator'), validate(countInventoryItemSchema), audit('InventoryCountItem', 'UPDATE'), ctrl.recordItemCount)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor'), validate(createInventorySchema), audit('InventoryCount', 'CREATE'), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor', 'operator'), validate(updateInventorySchema), audit('InventoryCount', 'UPDATE'), ctrl.update)
router.delete('/:id', authorize('admin'), audit('InventoryCount', 'DELETE'), ctrl.remove)

export default router
