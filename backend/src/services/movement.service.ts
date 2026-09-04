import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateMovementInput, MovementQuery } from '../schemas/movement.schema'

const INCLUDE = {
  product: { select: { id: true, name: true, internalCode: true } },
  supplier: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  fromAddress: { select: { id: true, code: true } },
  toAddress: { select: { id: true, code: true } },
}

export async function findAll(query: MovementQuery) {
  const { page, limit, type, productId, from, to } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (type) where.type = type
  if (productId) where.productId = productId
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [movements, total] = await Promise.all([
    prisma.movement.findMany({
      where,
      skip,
      take: limit,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.movement.count({ where }),
  ])

  return { data: movements, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const movement = await prisma.movement.findUnique({ where: { id }, include: INCLUDE })
  if (!movement) throw new AppError('Movement not found', 404)
  return movement
}

export async function create(data: CreateMovementInput, userId: string) {
  const product = await prisma.product.findUnique({ where: { id: data.productId } })
  if (!product) throw new AppError('Product not found', 404)

  if (data.type === 'exit' || data.type === 'loss') {
    if (product.currentStock < data.quantity) {
      throw new AppError(
        `Insufficient stock. Available: ${product.currentStock}, Requested: ${data.quantity}`,
        400,
      )
    }
  }

  const totalValue = data.quantity * (data.unitCost ?? 0)

  const movement = await prisma.$transaction(async (tx) => {
    const m = await tx.movement.create({
      data: {
        type: data.type,
        productId: data.productId,
        quantity: data.quantity,
        unitCost: data.unitCost ?? 0,
        totalValue,
        invoiceNumber: data.invoiceNumber,
        lotNumber: data.lotNumber,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        exitReason: data.exitReason,
        notes: data.notes,
        supplierId: data.supplierId,
        customerId: data.customerId,
        customerName: data.customerName,
        fromAddressId: data.fromAddressId,
        toAddressId: data.toAddressId,
        userId,
      },
      include: INCLUDE,
    })

    const stockDelta =
      data.type === 'entry' || data.type === 'adjustment'
        ? data.quantity
        : -(data.quantity)

    await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: { increment: stockDelta } },
    })

    return m
  })

  return movement
}
