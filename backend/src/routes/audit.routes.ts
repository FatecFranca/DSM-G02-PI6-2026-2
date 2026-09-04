import { Router } from 'express'
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
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (req.query.entity) where.entity = req.query.entity
    if (req.query.userId) where.userId = req.query.userId
    if (req.query.from || req.query.to) {
      where.createdAt = {
        ...(req.query.from ? { gte: new Date(req.query.from as string) } : {}),
        ...(req.query.to ? { lte: new Date(req.query.to as string) } : {}),
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
