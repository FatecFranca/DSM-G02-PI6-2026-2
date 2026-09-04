import { Request, Response, NextFunction } from 'express'
import * as lotService from '../services/lot.service'

/**
 * @swagger
 * tags:
 *   name: Lots
 *   description: Lot and batch management
 */

/**
 * @swagger
 * /api/lots:
 *   get:
 *     summary: List lots
 *     tags: [Lots]
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [valid, expiring, expired, quarantine] }
 *       - in: query
 *         name: expiringSoonDays
 *         schema: { type: integer, example: 30 }
 *         description: Return lots expiring within this many days
 *     responses:
 *       200:
 *         description: List of lots
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId, status, expiringSoonDays } = req.query
    res.json(
      await lotService.findAll({
        productId: productId as string | undefined,
        status: status as string | undefined,
        expiringSoonDays: expiringSoonDays ? Number(expiringSoonDays) : undefined,
      }),
    )
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/lots/alerts:
 *   get:
 *     summary: Get lots expiring soon (default 30 days)
 *     tags: [Lots]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Lots expiring soon
 */
export async function alerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const days = req.query.days ? Number(req.query.days) : 30
    res.json(await lotService.getExpiringAlerts(days))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/lots/{id}:
 *   get:
 *     summary: Get lot by ID
 *     tags: [Lots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lot found
 *       404:
 *         description: Lot not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await lotService.findById(req.params.id as string))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/lots:
 *   post:
 *     summary: Register a new lot
 *     tags: [Lots]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lotNumber, productId, supplierId, quantity, manufacturingDate, expirationDate, address]
 *             properties:
 *               lotNumber: { type: string }
 *               productId: { type: string }
 *               supplierId: { type: string }
 *               quantity: { type: integer }
 *               manufacturingDate: { type: string, format: date-time }
 *               expirationDate: { type: string, format: date-time }
 *               address: { type: string }
 *               status: { type: string, enum: [valid, expiring, expired, quarantine] }
 *     responses:
 *       201:
 *         description: Lot created
 *       409:
 *         description: Lot number already exists
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await lotService.create(req.body))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/lots/{id}:
 *   patch:
 *     summary: Update lot
 *     tags: [Lots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [valid, expiring, expired, quarantine] }
 *               quantity: { type: integer }
 *     responses:
 *       200:
 *         description: Lot updated
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await lotService.update(req.params.id as string, req.body))
  } catch (err) {
    next(err)
  }
}
