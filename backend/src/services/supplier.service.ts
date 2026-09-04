import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateSupplierInput, UpdateSupplierInput } from '../schemas/supplier.schema'
import { PaginationInput } from '../schemas/user.schema'

const INCLUDE = { _count: { select: { products: true } } }

export async function findAll(query: PaginationInput) {
  const { page, limit, search } = query
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { tradeName: { contains: search, mode: 'insensitive' as const } },
          { cnpj: { contains: search } },
        ],
      }
    : {}

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take: limit, include: INCLUDE, orderBy: { name: 'asc' } }),
    prisma.supplier.count({ where }),
  ])

  return { data: suppliers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id }, include: INCLUDE })
  if (!supplier) throw new AppError('Supplier not found', 404)
  return supplier
}

export async function create(data: CreateSupplierInput) {
  const exists = await prisma.supplier.findUnique({ where: { cnpj: data.cnpj } })
  if (exists) throw new AppError('CNPJ already in use', 409)
  return prisma.supplier.create({ data, include: INCLUDE })
}

export async function update(id: string, data: UpdateSupplierInput) {
  await findById(id)
  return prisma.supplier.update({ where: { id }, data, include: INCLUDE })
}

export async function remove(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!supplier) throw new AppError('Supplier not found', 404)
  if (supplier._count.products > 0) throw new AppError('Cannot delete supplier with products', 400)
  await prisma.supplier.delete({ where: { id } })
}
