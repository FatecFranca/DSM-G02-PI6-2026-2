import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as analyticsService from '../services/analytics.service'
import { getModelInfo } from '../services/ml.service'

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
 *       Computed on demand from the movement history. The daily demand forecast (28 days) comes from
 *       the ML service in /machine-learning (gradient boosting trained on Store Sales) and falls back
 *       to a 28-day moving average when the service is unavailable — `model.source` tells which one was used.
 *       XYZ uses the coefficient of variation of monthly demand.
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: historyMonths
 *         schema: { type: integer, minimum: 3, maximum: 24, default: 6 }
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
/**
 * @swagger
 * /api/analytics/model:
 *   get:
 *     summary: Status and backtest metrics of the forecasting model
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Model metadata (source = ml when the ML service is reachable, baseline otherwise)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForecastModel'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/model', async (_req, res, next) => {
  try {
    res.json(await getModelInfo())
  } catch (err) {
    next(err)
  }
})

router.get('/', async (req, res, next) => {
  try {
    const clamp = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Number(v)
      return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.round(n))) : fallback
    }
    res.json(
      await analyticsService.getAnalytics(
        clamp(req.query.historyMonths, 3, 24, 6),
      ),
    )
  } catch (err) {
    next(err)
  }
})

export default router
