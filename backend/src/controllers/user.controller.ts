import { Request, Response, NextFunction } from 'express'
import * as userService from '../services/user.service'

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List all users
 *     tags: [Users]
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
 *         description: Paginated list of users
 */
export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.findAll(req.query as never)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User found
 *       404:
 *         description: User not found
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.findById(req.params.id as string)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, department]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               role: { type: string, enum: [admin, supervisor, operator, viewer] }
 *               department: { type: string }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already in use
 */
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.create(req.body)
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
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
 *               department: { type: string }
 *               role: { type: string, enum: [admin, supervisor, operator, viewer] }
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.update(req.params.id as string, req.body)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/users/{id}/status:
 *   patch:
 *     summary: Update user status
 *     tags: [Users]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [active, inactive, pending] }
 *     responses:
 *       200:
 *         description: Status updated
 */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateStatus(req.params.id as string, req.body.status)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await userService.remove(req.params.id as string)
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
