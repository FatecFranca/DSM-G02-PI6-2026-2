import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateLotInput, LotQueryInput, UpdateLotInput } from '../schemas/lot.schema'

const INCLUDE = {
  product: { select: { id: true, name: true, internalCode: true } },
  supplier: { select: { id: true, name: true } },
}

export type LotQuery = Partial<LotQueryInput>

export async function findAll(query: LotQuery = {}) {
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const { productId, status, expiringSoonDays, search } = query
  const where: Record<string, unknown> = {}

  if (productId) where.productId = productId
  if (status) where.status = status
  if (search) {
    where.OR = [
      { lotNumber: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { internalCode: { contains: search, mode: 'insensitive' } } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  if (expiringSoonDays) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + expiringSoonDays)
    where.expirationDate = { lte: cutoff }
    where.status = 'valid'
  }

  const [data, total] = await Promise.all([
    prisma.lot.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: INCLUDE,
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.lot.count({ where }),
  ])
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const lot = await prisma.lot.findUnique({ where: { id }, include: INCLUDE })
  if (!lot) throw new AppError('Lot not found', 404)
  return lot
}

export async function create(data: CreateLotInput) {
  const exists = await prisma.lot.findUnique({ where: { lotNumber: data.lotNumber } })
  if (exists) throw new AppError('Lot number already exists', 409)

  const address = data.addressId
    ? await prisma.warehouseAddress.findUnique({ where: { id: data.addressId } })
    : await prisma.warehouseAddress.findUnique({ where: { code: data.address! } })
  if (!address) throw new AppError('Warehouse address not found', 404)

  return prisma.lot.create({
    data: {
      lotNumber: data.lotNumber,
      productId: data.productId,
      supplierId: data.supplierId,
      quantity: data.quantity,
      status: data.status,
      manufacturingDate: new Date(data.manufacturingDate),
      expirationDate: new Date(data.expirationDate),
      address: address.code,
      addressId: address.id,
    },
    include: INCLUDE,
  })
}

export async function update(id: string, data: UpdateLotInput) {
  await findById(id)
  const { addressId, address, ...fields } = data
  const updateData: Record<string, unknown> = { ...fields }
  if (data.manufacturingDate) updateData.manufacturingDate = new Date(data.manufacturingDate)
  if (data.expirationDate) updateData.expirationDate = new Date(data.expirationDate)
  if (addressId || address) {
    const warehouseAddress = addressId
      ? await prisma.warehouseAddress.findUnique({ where: { id: addressId } })
      : await prisma.warehouseAddress.findUnique({ where: { code: address! } })
    if (!warehouseAddress) throw new AppError('Warehouse address not found', 404)
    updateData.addressId = warehouseAddress.id
    updateData.address = warehouseAddress.code
  }

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
