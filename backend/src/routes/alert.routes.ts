import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as alertService from '../services/alert.service'

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Stock and expiration alerts
 */

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all active alerts (stock + expiry) with per-user read status
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: How many days ahead to look for expiring lots
 *     responses:
 *       200:
 *         description: Combined alert list with unread count
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    const days = req.query.days ? Number(req.query.days) : 30
    res.json(await alertService.getAllAlerts(userId, days))
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/alerts/stock:
 *   get:
 *     summary: Get stock level alerts grouped by severity (out, critical, low)
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Stock alerts grouped by severity
 */
router.get('/stock', async (_req, res, next) => {
  try {
    res.json(await alertService.getStockAlerts())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/alerts/expiring:
 *   get:
 *     summary: Get lots expiring soon
 *     tags: [Alerts]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *         description: How many days ahead to look
 *     responses:
 *       200:
 *         description: Lots expiring within the given window
 */
router.get('/expiring', async (req, res, next) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30
    res.json(await alertService.getExpiringLots(days))
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/alerts/read-all:
 *   patch:
 *     summary: Mark all provided alerts as read for the authenticated user
 *     tags: [Alerts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [alertKeys]
 *             properties:
 *               alertKeys:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Number of alerts marked as read
 */
router.patch('/read-all', async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    const { alertKeys } = req.body as { alertKeys: string[] }
    if (!Array.isArray(alertKeys)) {
      res.status(400).json({ message: 'alertKeys deve ser um array de strings' })
      return
    }
    res.json(await alertService.markAllAlertsAsRead(userId, alertKeys))
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/alerts/{id}/read:
 *   patch:
 *     summary: Mark a single alert as read for the authenticated user
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Alert key (e.g. stock-out-{productId})
 *     responses:
 *       200:
 *         description: Alert marked as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const userId = (req as any).user.id
    res.json(await alertService.markAlertAsRead(userId, req.params.id))
  } catch (err) {
    next(err)
  }
})

export default router
