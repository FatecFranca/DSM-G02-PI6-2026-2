import { Request, Response, NextFunction } from 'express'
import * as inventoryService from '../services/inventory.service'
import { InventoryCountStatus } from '@prisma/client'

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Inventory count management
 */

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: List inventory counts
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [planned, in_progress, review, completed] }
 *     responses:
 *       200:
 *         description: List of inventory counts
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as InventoryCountStatus | undefined
    res.json(await inventoryService.findAll(status))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get inventory count by ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Inventory count found
 *       404:
 *         description: Not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await inventoryService.findById(req.params.id as string))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create an inventory count
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, startDate, responsibleId]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [full, partial, cyclic] }
 *               startDate: { type: string, format: date-time }
 *               responsibleId: { type: string }
 *     responses:
 *       201:
 *         description: Inventory count created
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await inventoryService.create(req.body))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/inventory/{id}:
 *   patch:
 *     summary: Update inventory count progress
 *     tags: [Inventory]
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
 *               status: { type: string, enum: [planned, in_progress, review, completed] }
 *               countedItems: { type: integer }
 *               divergences: { type: integer }
 *               endDate: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Updated
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await inventoryService.update(req.params.id as string, req.body))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/inventory/{id}:
 *   delete:
 *     summary: Delete a planned inventory count
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Only planned counts can be deleted
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await inventoryService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
