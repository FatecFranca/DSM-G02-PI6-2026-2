import { Request, Response, NextFunction } from 'express'
import * as warehouseService from '../services/warehouse.service'

/**
 * @swagger
 * tags:
 *   name: Warehouse
 *   description: Warehouse address management
 */

/**
 * @swagger
 * /api/warehouse:
 *   get:
 *     summary: List warehouse addresses
 *     tags: [Warehouse]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [free, occupied, blocked, reserved] }
 *       - in: query
 *         name: aisle
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of addresses
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await warehouseService.findAll(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/warehouse/stats:
 *   get:
 *     summary: Get warehouse occupancy statistics
 *     tags: [Warehouse]
 *     responses:
 *       200:
 *         description: Warehouse stats
 */
export async function stats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await warehouseService.getStats()
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/warehouse/{id}:
 *   get:
 *     summary: Get address by ID
 *     tags: [Warehouse]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Address found
 *       404:
 *         description: Address not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await warehouseService.findById(req.params.id as string)
    res.json(address)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/warehouse:
 *   post:
 *     summary: Create a warehouse address
 *     tags: [Warehouse]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, aisle, street, shelf, level, position, capacity]
 *             properties:
 *               code: { type: string }
 *               aisle: { type: string }
 *               street: { type: string }
 *               shelf: { type: string }
 *               level: { type: string }
 *               position: { type: string }
 *               capacity: { type: number }
 *               status: { type: string, enum: [free, occupied, blocked, reserved] }
 *     responses:
 *       201:
 *         description: Address created
 *       409:
 *         description: Code already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await warehouseService.create(req.body)
    res.status(201).json(address)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/warehouse/{id}:
 *   patch:
 *     summary: Update a warehouse address
 *     tags: [Warehouse]
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
 *     responses:
 *       200:
 *         description: Address updated
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const address = await warehouseService.update(req.params.id as string, req.body)
    res.json(address)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/warehouse/{id}:
 *   delete:
 *     summary: Delete a warehouse address
 *     tags: [Warehouse]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Address deleted
 *       400:
 *         description: Cannot delete occupied address
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await warehouseService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
