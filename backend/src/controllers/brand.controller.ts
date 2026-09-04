import { Request, Response, NextFunction } from 'express'
import * as brandService from '../services/brand.service'

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: Brand management
 */

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: List all brands
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: List of brands with product count
 */
export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await brandService.findAll())
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Get brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Brand found
 *       404:
 *         description: Brand not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await brandService.findById(req.params.id as string))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Create a brand
 *     tags: [Brands]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               logoUrl: { type: string, format: uri }
 *     responses:
 *       201:
 *         description: Brand created
 *       409:
 *         description: Slug already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(201).json(await brandService.create(req.body))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/brands/{id}:
 *   patch:
 *     summary: Update a brand
 *     tags: [Brands]
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
 *         description: Brand updated
 *       404:
 *         description: Brand not found
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await brandService.update(req.params.id as string, req.body))
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Brand deleted
 *       400:
 *         description: Cannot delete brand with products
 *       404:
 *         description: Brand not found
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await brandService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
