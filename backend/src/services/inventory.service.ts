import { InventoryCountStatus, Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'

export interface CreateInventoryInput {
  name: string
  type: 'full' | 'partial' | 'cyclic'
  startDate: string
  responsibleId: string
  productIds?: string[]
}

export interface UpdateInventoryInput {
  status?: InventoryCountStatus
}

const INCLUDE = { responsible: { select: { id: true, name: true } } }
const DETAILS_INCLUDE = {
  ...INCLUDE,
  items: {
    include: {
      product: { select: { id: true, name: true, internalCode: true, unit: true } },
      countedBy: { select: { id: true, name: true } },
    },
    orderBy: { product: { name: 'asc' as const } },
  },
}

export async function findAll(status?: InventoryCountStatus, page = 1, limit = 20) {
  const where = status ? { status } : {}
  const [data, total, statusGroups] = await Promise.all([
    prisma.inventoryCount.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        ...INCLUDE,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryCount.count({ where }),
    prisma.inventoryCount.groupBy({ by: ['status'], _count: { id: true } }),
  ])
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    statusCounts: Object.fromEntries(statusGroups.map((group) => [group.status, group._count.id])),
  }
}

export async function findById(id: string) {
  const count = await prisma.inventoryCount.findUnique({ where: { id }, include: DETAILS_INCLUDE })
  if (!count) throw new AppError('Inventory count not found', 404)
  return count
}

export async function create(data: CreateInventoryInput) {
  if (data.type !== 'full' && (!data.productIds || data.productIds.length === 0)) {
    throw new AppError('Select at least one product for partial or cyclic inventories', 400)
  }

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: {
        status: 'active',
        ...(data.type === 'full' ? {} : { id: { in: [...new Set(data.productIds)] } }),
      },
      select: { id: true, currentStock: true },
    })
    if (data.type !== 'full' && products.length !== new Set(data.productIds).size) {
      throw new AppError('One or more selected products do not exist or are inactive', 400)
    }

    const count = await tx.inventoryCount.create({
      data: {
        name: data.name,
        type: data.type,
        startDate: new Date(data.startDate),
        totalItems: products.length,
        responsibleId: data.responsibleId,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            expectedQuantity: product.currentStock,
          })),
        },
      },
      include: INCLUDE,
    })
    return count
  })
}

export async function update(id: string, data: UpdateInventoryInput) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.inventoryCount.findUnique({ where: { id } })
    if (!count) throw new AppError('Inventory count not found', 404)
    if (!data.status || data.status === count.status) {
      return tx.inventoryCount.findUniqueOrThrow({ where: { id }, include: INCLUDE })
    }

    const allowedTransitions: Record<InventoryCountStatus, InventoryCountStatus[]> = {
      planned: ['in_progress'],
      in_progress: ['review'],
      review: ['in_progress', 'completed'],
      completed: [],
    }
    if (!allowedTransitions[count.status].includes(data.status)) {
      throw new AppError(`Cannot transition inventory from ${count.status} to ${data.status}`, 409)
    }

    const items = await tx.inventoryCountItem.findMany({
      where: { inventoryCountId: id },
      select: { countedQuantity: true },
    })
    if (data.status === 'review' && (items.length === 0 || items.some((item) => item.countedQuantity === null))) {
      throw new AppError('All inventory items must be counted before review', 409)
    }
    if (data.status === 'completed' && count.status !== 'review') {
      throw new AppError('Inventory must be reviewed before completion', 409)
    }

    const updated = await tx.inventoryCount.updateMany({
      where: { id, status: count.status },
      data: {
        status: data.status,
        ...(data.status === 'completed' ? { endDate: new Date() } : {}),
      },
    })
    if (updated.count !== 1) throw new AppError('Inventory status changed concurrently; reload and retry', 409)
    return tx.inventoryCount.findUniqueOrThrow({ where: { id }, include: INCLUDE })
  })
}

export async function recordItemCount(
  inventoryId: string,
  itemId: string,
  countedQuantity: number,
  userId: string,
) {
  return prisma.$transaction(async (tx) => {
    const inventory = await tx.inventoryCount.findUnique({ where: { id: inventoryId } })
    if (!inventory) throw new AppError('Inventory count not found', 404)
    if (inventory.status !== 'in_progress') {
      throw new AppError('Inventory items can only be counted while the inventory is in progress', 409)
    }
    const item = await tx.inventoryCountItem.findFirst({
      where: { id: itemId, inventoryCountId: inventoryId },
    })
    if (!item) throw new AppError('Inventory item not found', 404)

    const updated = await tx.inventoryCountItem.updateMany({
      where: { id: item.id, inventoryCountId: inventoryId },
      data: {
        countedQuantity,
        discrepancy: countedQuantity - item.expectedQuantity,
        countedAt: new Date(),
        countedById: userId,
      },
    })
    if (updated.count !== 1) throw new AppError('Inventory item changed concurrently; reload and retry', 409)

    const [countedItems, divergences] = await Promise.all([
      tx.inventoryCountItem.count({
        where: { inventoryCountId: inventoryId, countedQuantity: { not: null } },
      }),
      tx.inventoryCountItem.count({
        where: { inventoryCountId: inventoryId, discrepancy: { not: 0 } },
      }),
    ])
    await tx.inventoryCount.updateMany({
      where: { id: inventoryId, status: 'in_progress' },
      data: { countedItems, divergences },
    })
    return tx.inventoryCountItem.findUniqueOrThrow({
      where: { id: item.id },
      include: {
        product: { select: { id: true, name: true, internalCode: true, unit: true } },
        countedBy: { select: { id: true, name: true } },
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function remove(id: string) {
  const count = await prisma.inventoryCount.findUnique({ where: { id } })
  if (!count) throw new AppError('Inventory count not found', 404)
  if (count.status !== 'planned') {
    throw new AppError('Only planned inventory counts can be deleted', 400)
  }
  await prisma.inventoryCount.delete({ where: { id } })
}
