import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { InventoryCountStatus } from '@prisma/client'

export interface CreateInventoryInput {
  name: string
  type: 'full' | 'partial' | 'cyclic'
  startDate: string
  responsibleId: string
}

export interface UpdateInventoryInput {
  status?: InventoryCountStatus
  endDate?: string
  totalItems?: number
  countedItems?: number
  divergences?: number
}

const INCLUDE = { responsible: { select: { id: true, name: true } } }

export async function findAll(status?: InventoryCountStatus) {
  const where = status ? { status } : {}
  return prisma.inventoryCount.findMany({ where, include: INCLUDE, orderBy: { createdAt: 'desc' } })
}

export async function findById(id: string) {
  const count = await prisma.inventoryCount.findUnique({ where: { id }, include: INCLUDE })
  if (!count) throw new AppError('Inventory count not found', 404)
  return count
}

export async function create(data: CreateInventoryInput) {
  return prisma.inventoryCount.create({
    data: {
      name: data.name,
      type: data.type,
      startDate: new Date(data.startDate),
      responsibleId: data.responsibleId,
    },
    include: INCLUDE,
  })
}

export async function update(id: string, data: UpdateInventoryInput) {
  await findById(id)

  const updateData: Record<string, unknown> = { ...data }
  if (data.endDate) updateData.endDate = new Date(data.endDate)

  return prisma.inventoryCount.update({ where: { id }, data: updateData, include: INCLUDE })
}

export async function remove(id: string) {
  const count = await findById(id)
  if (count.status !== 'planned') {
    throw new AppError('Only planned inventory counts can be deleted', 400)
  }
  await prisma.inventoryCount.delete({ where: { id } })
}
