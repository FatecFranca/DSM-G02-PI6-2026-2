import { Request, Response, NextFunction } from 'express'
import * as categoryService from '../services/category.service'

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Product category management
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories with product count
 */
export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await categoryService.findAll()
    res.json(categories)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category found
 *       404:
 *         description: Category not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryService.findById(req.params.id as string)
    res.json(category)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
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
 *               color: { type: string, example: '#6366f1' }
 *     responses:
 *       201:
 *         description: Category created
 *       409:
 *         description: Slug already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryService.create(req.body)
    res.status(201).json(category)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
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
 *               name: { type: string }
 *               slug: { type: string }
 *               color: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const category = await categoryService.update(req.params.id as string, req.body)
    res.json(category)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Category deleted
 *       400:
 *         description: Cannot delete category with products
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await categoryService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
