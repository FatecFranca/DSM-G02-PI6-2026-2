import { Request, Response, NextFunction } from 'express'
import * as movementService from '../services/movement.service'

/**
 * @swagger
 * tags:
 *   name: Movements
 *   description: Stock movement management
 */

/**
 * @swagger
 * /api/movements:
 *   get:
 *     summary: List movements
 *     tags: [Movements]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [entry, exit, transfer, loss, adjustment, inventory] }
 *       - in: query
 *         name: productId
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated list of movements
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await movementService.findAll(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/movements/{id}:
 *   get:
 *     summary: Get movement by ID
 *     tags: [Movements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Movement found
 *       404:
 *         description: Movement not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const movement = await movementService.findById(req.params.id as string)
    res.json(movement)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/movements:
 *   post:
 *     summary: Register a stock movement
 *     tags: [Movements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, productId, quantity]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [entry, exit, transfer, loss, adjustment, inventory]
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *               unitCost:
 *                 type: number
 *               exitReason:
 *                 type: string
 *                 enum: [sale, transfer, loss, break, internal]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Movement registered
 *       400:
 *         description: Insufficient stock
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const movement = await movementService.create(req.body, req.user!.sub)
    res.status(201).json(movement)
  } catch (err) {
    next(err)
  }
}
