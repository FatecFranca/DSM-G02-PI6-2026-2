import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { predictSchema } from '../schemas/simulation.schema'
import * as ctrl from '../controllers/simulation.controller'

const router = Router()

router.use(authenticate)

router.get('/status', ctrl.status)
router.get('/model', ctrl.model)
router.post('/predict', validate(predictSchema), ctrl.predict)

export default router
