import { Request, Response, NextFunction } from 'express'
import * as supplierService from '../services/supplier.service'

/**
 * @swagger
 * tags:
 *   name: Suppliers
 *   description: Supplier management
 */

/**
 * @swagger
 * /api/suppliers:
 *   get:
 *     summary: List all suppliers
 *     tags: [Suppliers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of suppliers
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await supplierService.findAll(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/suppliers/{id}:
 *   get:
 *     summary: Get supplier by ID
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Supplier found
 *       404:
 *         description: Supplier not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.findById(req.params.id as string)
    res.json(supplier)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/suppliers:
 *   post:
 *     summary: Create a supplier
 *     tags: [Suppliers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tradeName, cnpj, email, phone, contactName, category, city, state]
 *             properties:
 *               name: { type: string }
 *               tradeName: { type: string }
 *               cnpj: { type: string, example: '12.345.678/0001-99' }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               contactName: { type: string }
 *               category: { type: string }
 *               city: { type: string }
 *               state: { type: string, maxLength: 2 }
 *     responses:
 *       201:
 *         description: Supplier created
 *       409:
 *         description: CNPJ already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.create(req.body)
    res.status(201).json(supplier)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/suppliers/{id}:
 *   patch:
 *     summary: Update a supplier
 *     tags: [Suppliers]
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
 *         description: Supplier updated
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const supplier = await supplierService.update(req.params.id as string, req.body)
    res.json(supplier)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/suppliers/{id}:
 *   delete:
 *     summary: Delete a supplier
 *     tags: [Suppliers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Supplier deleted
 *       400:
 *         description: Cannot delete supplier with products
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await supplierService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
