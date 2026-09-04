import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import * as reportService from '../services/report.service'

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytical reports for inventory, movements, lots and warehouse
 */

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /api/reports/movements:
 *   get:
 *     summary: Movement report grouped by type and product
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Movement totals by type and top products
 */
router.get('/movements', async (req, res, next) => {
  try {
    const { from, to } = req.query
    res.json(
      await reportService.getMovementReport({
        from: from as string | undefined,
        to: to as string | undefined,
      }),
    )
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/stock:
 *   get:
 *     summary: Full stock position report with value per product
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: All active products with stock status, purchase and sale values
 */
router.get('/stock', async (_req, res, next) => {
  try {
    res.json(await reportService.getStockReport())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/lots:
 *   get:
 *     summary: Lot expiration report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 90 }
 *         description: Window in days to flag lots expiring soon
 *     responses:
 *       200:
 *         description: Expired, expiring soon, valid, and quarantine lots
 */
router.get('/lots', async (req, res, next) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 90
    res.json(await reportService.getLotExpirationReport(days))
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/warehouse:
 *   get:
 *     summary: Warehouse occupancy report
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Addresses grouped by status with capacity and occupancy rate
 */
router.get('/warehouse', async (_req, res, next) => {
  try {
    res.json(await reportService.getWarehouseReport())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/abc:
 *   get:
 *     summary: ABC curve report — classifies products by movement value (A=80%, B=15%, C=5%)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Products classified into A, B, C with summary
 */
router.get('/abc', async (_req, res, next) => {
  try {
    res.json(await reportService.getAbcReport())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/inventory:
 *   get:
 *     summary: Inventory count report with divergences and accuracy
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: All inventory counts with summary statistics
 */
router.get('/inventory', async (_req, res, next) => {
  try {
    res.json(await reportService.getInventoryReport())
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/reports/suppliers:
 *   get:
 *     summary: Supplier report — entries and purchase value per supplier
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Purchase totals grouped by supplier
 */
router.get('/suppliers', async (req, res, next) => {
  try {
    const { from, to } = req.query
    res.json(
      await reportService.getSupplierReport({
        from: from as string | undefined,
        to: to as string | undefined,
      }),
    )
  } catch (err) {
    next(err)
  }
})

export default router
