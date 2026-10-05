import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as analyticsService from '../services/analytics.service'

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Demand forecast, ABC×XYZ classification and purchase suggestions
 */

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /api/analytics:
 *   get:
 *     summary: Analytics overview (forecast, ABC×XYZ matrix, purchase suggestions, insights)
 *     description: >
 *       Computed on demand from the movement history. Forecast uses a least-squares
 *       linear trend over monthly exits; XYZ uses the coefficient of variation of monthly demand.
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: historyMonths
 *         schema: { type: integer, minimum: 3, maximum: 24, default: 6 }
 *       - in: query
 *         name: forecastMonths
 *         schema: { type: integer, minimum: 1, maximum: 6, default: 3 }
 *     responses:
 *       200:
 *         description: Analytics overview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyticsOverview'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', async (req, res, next) => {
  try {
    const clamp = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.round(n))) : fallback
    }
    res.json(
      await analyticsService.getAnalytics(
        clamp(req.query.historyMonths, 3, 24, 6),
        clamp(req.query.forecastMonths, 1, 6, 3),
      ),
    )
  } catch (err) {
    next(err)
  }
})

export default router
