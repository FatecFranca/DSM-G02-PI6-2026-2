import { Router } from 'express'
import { z } from 'zod'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { prisma } from '../prisma/client'

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit log (admin only)
 */

const router = Router()

router.use(authenticate, authorize('admin', 'supervisor'))

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  entity: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  search: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  ({ from, to }) => !from || !to || new Date(from) <= new Date(to),
  { message: '"from" must be earlier than or equal to "to"', path: ['to'] },
)

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: List audit logs
 *     tags: [Audit]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: entity
 *         schema: { type: string }
 *         description: Filter by entity type (e.g. Product, User)
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by user, action, entity or record name
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated audit logs
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, entity, userId, action, search, from, to } = auditQuerySchema.parse(req.query)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (entity) where.entity = entity
    if (userId) where.userId = userId
    if (action) where.action = action
    if (search) {
      where.OR = [
        { entity: { contains: search, mode: 'insensitive' } },
        { entityName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ data: logs, total, page, limit, totalPages: Math.ceil(total / limit) })
  } catch (err) {
    next(err)
  }
})

/**
 * @swagger
 * /api/audit/{id}:
 *   get:
 *     summary: Get audit log entry by ID
 *     tags: [Audit]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Audit log entry
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req, res, next) => {
  try {
    const log = await prisma.auditLog.findUnique({
      where: { id: req.params.id as string },
      include: { user: { select: { id: true, name: true, role: true } } },
    })
    if (!log) {
      res.status(404).json({ message: 'Audit log not found' })
      return
    }
    res.json(log)
  } catch (err) {
    next(err)
  }
})

export default router
