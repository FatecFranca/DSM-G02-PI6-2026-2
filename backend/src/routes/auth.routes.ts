import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.middleware'
import { authenticate } from '../middleware/auth.middleware'
import { loginSchema, registerSchema } from '../schemas/auth.schema'
import { authLimiter } from '../middleware/rate-limit.middleware'
import * as ctrl from '../controllers/auth.controller'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
})

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  department: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
})

const router = Router()

router.post('/register', authLimiter, validate(registerSchema), ctrl.register)
router.post('/login', authLimiter, validate(loginSchema), ctrl.login)
router.get('/me', authenticate, ctrl.me)
router.get('/profile', authenticate, ctrl.profile)
router.patch('/profile', authenticate, validate(updateProfileSchema), ctrl.updateProfile)
router.patch('/password', authenticate, validate(changePasswordSchema), ctrl.changePassword)

export default router
