import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateLotInput, UpdateLotInput } from '../schemas/lot.schema'

const INCLUDE = {
  product: { select: { id: true, name: true, internalCode: true } },
  supplier: { select: { id: true, name: true } },
}

export interface LotQuery {
  productId?: string
  status?: string
  expiringSoonDays?: number
}

export async function findAll(query: LotQuery = {}) {
  const { productId, status, expiringSoonDays } = query
  const where: Record<string, unknown> = {}

  if (productId) where.productId = productId
  if (status) where.status = status

  if (expiringSoonDays) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + expiringSoonDays)
    where.expirationDate = { lte: cutoff }
    where.status = 'valid'
  }

  return prisma.lot.findMany({ where, include: INCLUDE, orderBy: { expirationDate: 'asc' } })
}

export async function findById(id: string) {
  const lot = await prisma.lot.findUnique({ where: { id }, include: INCLUDE })
  if (!lot) throw new AppError('Lot not found', 404)
  return lot
}

export async function create(data: CreateLotInput) {
  const exists = await prisma.lot.findUnique({ where: { lotNumber: data.lotNumber } })
  if (exists) throw new AppError('Lot number already exists', 409)

  return prisma.lot.create({
    data: {
      ...data,
      manufacturingDate: new Date(data.manufacturingDate),
      expirationDate: new Date(data.expirationDate),
    },
    include: INCLUDE,
  })
}

export async function update(id: string, data: UpdateLotInput) {
  await findById(id)
  const updateData: Record<string, unknown> = { ...data }
  if (data.manufacturingDate) updateData.manufacturingDate = new Date(data.manufacturingDate)
  if (data.expirationDate) updateData.expirationDate = new Date(data.expirationDate)

  return prisma.lot.update({ where: { id }, data: updateData, include: INCLUDE })
}

export async function getExpiringAlerts(days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  return prisma.lot.findMany({
    where: {
      expirationDate: { lte: cutoff, gte: new Date() },
      status: { in: ['valid', 'expiring'] },
    },
    include: INCLUDE,
    orderBy: { expirationDate: 'asc' },
  })
}
