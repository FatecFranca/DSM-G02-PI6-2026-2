import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { createLotSchema, updateLotSchema } from '../schemas/lot.schema'
import * as ctrl from '../controllers/lot.controller'

const router = Router()

router.use(authenticate)

router.get('/alerts', ctrl.alerts)
router.get('/', ctrl.list)
router.get('/:id', ctrl.getById)
router.post('/', authorize('admin', 'supervisor', 'operator'), validate(createLotSchema), ctrl.create)
router.patch('/:id', authorize('admin', 'supervisor'), validate(updateLotSchema), ctrl.update)

export default router
