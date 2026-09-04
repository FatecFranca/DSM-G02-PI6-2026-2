import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import {
  AddressQuery,
  CreateAddressInput,
  UpdateAddressInput,
} from '../schemas/warehouse.schema'

const INCLUDE = { product: { select: { id: true, name: true, internalCode: true } } }

export async function findAll(query: AddressQuery) {
  const { page, limit, status, aisle } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (aisle) where.aisle = { contains: aisle, mode: 'insensitive' }

  const [addresses, total] = await Promise.all([
    prisma.warehouseAddress.findMany({
      where,
      skip,
      take: limit,
      include: INCLUDE,
      orderBy: { code: 'asc' },
    }),
    prisma.warehouseAddress.count({ where }),
  ])

  return { data: addresses, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const address = await prisma.warehouseAddress.findUnique({ where: { id }, include: INCLUDE })
  if (!address) throw new AppError('Address not found', 404)
  return address
}

export async function getStats() {
  const [total, free, occupied, blocked, reserved] = await Promise.all([
    prisma.warehouseAddress.count(),
    prisma.warehouseAddress.count({ where: { status: 'free' } }),
    prisma.warehouseAddress.count({ where: { status: 'occupied' } }),
    prisma.warehouseAddress.count({ where: { status: 'blocked' } }),
    prisma.warehouseAddress.count({ where: { status: 'reserved' } }),
  ])

  return {
    totalPositions: total,
    freePositions: free,
    occupiedPositions: occupied,
    blockedPositions: blocked,
    reservedPositions: reserved,
    occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
  }
}

export async function create(data: CreateAddressInput) {
  const exists = await prisma.warehouseAddress.findUnique({ where: { code: data.code } })
  if (exists) throw new AppError('Address code already in use', 409)

  return prisma.warehouseAddress.create({ data, include: INCLUDE })
}

export async function update(id: string, data: UpdateAddressInput) {
  await findById(id)
  return prisma.warehouseAddress.update({ where: { id }, data, include: INCLUDE })
}

export async function remove(id: string) {
  const address = await findById(id)
  if (address.status === 'occupied') {
    throw new AppError('Cannot delete an occupied address', 400)
  }
  await prisma.warehouseAddress.delete({ where: { id } })
}
