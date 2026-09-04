import { Request, Response, NextFunction } from 'express'
import * as dashboardService from '../services/dashboard.service'

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard and analytics data
 */

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get dashboard summary (KPIs)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Summary with products, movements, users, warehouse stats and stock value
 */
export async function summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await dashboardService.getSummary())
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/dashboard/movement-trend:
 *   get:
 *     summary: Monthly entries vs exits trend
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 12 }
 *         description: How many months to look back
 *     responses:
 *       200:
 *         description: Array of monthly { month, entries, exits, balance }
 */
export async function movementTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const months = req.query.months ? Number(req.query.months) : 12
    res.json(await dashboardService.getMovementTrend(months))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/dashboard/category-distribution:
 *   get:
 *     summary: Product count and stock value by category
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Categories with product count, percentage and stock value
 */
export async function categoryDistribution(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json(await dashboardService.getCategoryDistribution())
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/dashboard/top-products:
 *   get:
 *     summary: Top products by movement frequency
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Products ranked by number of movements
 */
export async function topProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10
    res.json(await dashboardService.getTopProducts(limit))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/dashboard/abc:
 *   get:
 *     summary: ABC curve analysis (A=80%, B=15%, C=5% of value)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Products classified into A, B and C by revenue contribution
 */
export async function abcCurve(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await dashboardService.getAbcCurve())
  } catch (err) {
    next(err)
  }
}
