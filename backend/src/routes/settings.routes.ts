import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { updateSettingsSchema } from '../schemas/settings.schema'
import * as settingsService from '../services/settings.service'
import { prisma } from '../prisma/client'

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Company data and system preferences
 */

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get company data and system preferences
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Current settings (defaults are returned for values never saved)
 */
router.get('/', async (_req, res, next) => {
  try {
    res.json(await settingsService.getSettings())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update company data and/or preferences
 *     description: Partial update, `company` and `preferences` are merged with the stored values.
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Updated settings
 */
router.put('/', authorize('admin'), validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const updated = await settingsService.updateSettings(req.body)
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE', entity: 'Settings', entityId: 'settings', entityName: 'Configurações do sistema',
        newValue: req.body, ip: req.ip ?? 'unknown', userId: req.user!.sub,
      },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

export default router
