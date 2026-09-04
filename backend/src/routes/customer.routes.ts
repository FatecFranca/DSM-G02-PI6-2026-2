import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { validate, validateQuery } from '../middleware/validate.middleware'
import {
  createCustomerSchema,
  customerQuerySchema,
  updateCustomerSchema,
} from '../schemas/customer.schema'
import * as ctrl from '../controllers/customer.controller'

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer management
 */

const router = Router()

router.use(authenticate)

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: List customers with search and pagination
 *     tags: [Customers]
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
 *         description: Search by name, tradeName, cnpj or email
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive] }
 *     responses:
 *       200:
 *         description: Paginated list of customers
 */
router.get('/', validateQuery(customerQuerySchema), ctrl.list)

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer data
 *       404:
 *         description: Not found
 */
router.get('/:id', ctrl.getById)

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tradeName, cnpj, email, city, state]
 *             properties:
 *               name: { type: string }
 *               tradeName: { type: string }
 *               cnpj: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               contactName: { type: string }
 *               city: { type: string }
 *               state: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       201:
 *         description: Customer created
 */
router.post('/', authorize('admin', 'supervisor'), validate(createCustomerSchema), ctrl.create)

/**
 * @swagger
 * /api/customers/{id}:
 *   patch:
 *     summary: Update a customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer updated
 */
router.patch(
  '/:id',
  authorize('admin', 'supervisor'),
  validate(updateCustomerSchema),
  ctrl.update,
)

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Customer deleted
 */
router.delete('/:id', authorize('admin'), ctrl.remove)

export default router
