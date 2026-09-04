import { Request, Response, NextFunction } from 'express'
import * as productService from '../services/product.service'

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     tags: [Products]
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
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: brandId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, discontinued] }
 *       - in: query
 *         name: stockStatus
 *         schema: { type: string, enum: [ok, low, critical, out] }
 *     responses:
 *       200:
 *         description: Paginated list of products
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await productService.findAll(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.findById(req.params.id as string)
    res.json(product)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, internalCode, sku, barcode, categoryId, brandId, supplierId, unit, purchasePrice, salePrice]
 *             properties:
 *               name: { type: string }
 *               internalCode: { type: string }
 *               sku: { type: string }
 *               barcode: { type: string }
 *               categoryId: { type: string }
 *               brandId: { type: string }
 *               supplierId: { type: string }
 *               unit: { type: string }
 *               purchasePrice: { type: number }
 *               salePrice: { type: number }
 *               minStock: { type: integer }
 *               maxStock: { type: integer }
 *               status: { type: string, enum: [active, inactive, discontinued] }
 *     responses:
 *       201:
 *         description: Product created
 *       409:
 *         description: SKU or barcode already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.create(req.body)
    res.status(201).json(product)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update a product
 *     tags: [Products]
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
 *         description: Product updated
 *       404:
 *         description: Product not found
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.update(req.params.id as string, req.body)
    res.json(product)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await productService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/products/scan/{code}:
 *   get:
 *     summary: Lookup product by barcode, SKU or internal code (scanner)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Barcode, SKU or internal code
 *     responses:
 *       200:
 *         description: Product found with warehouse addresses and active lots
 *       404:
 *         description: No product found for this code
 */
export async function scan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await productService.findByCode(req.params.code as string)
    res.json(product)
  } catch (err) {
    next(err)
  }
}
