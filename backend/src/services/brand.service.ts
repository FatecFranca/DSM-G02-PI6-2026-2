import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'

export const createBrandSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and dashes'),
  logoUrl: z.string().url().optional(),
})

export const updateBrandSchema = createBrandSchema.partial()

export type CreateBrandInput = z.infer<typeof createBrandSchema>
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>

const INCLUDE = { _count: { select: { products: true } } }

export async function findAll() {
  return prisma.brand.findMany({ include: INCLUDE, orderBy: { name: 'asc' } })
}

export async function findById(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id }, include: INCLUDE })
  if (!brand) throw new AppError('Brand not found', 404)
  return brand
}

export async function create(data: CreateBrandInput) {
  const exists = await prisma.brand.findUnique({ where: { slug: data.slug } })
  if (exists) throw new AppError('Slug already in use', 409)
  return prisma.brand.create({ data, include: INCLUDE })
}

export async function update(id: string, data: UpdateBrandInput) {
  await findById(id)
  return prisma.brand.update({ where: { id }, data, include: INCLUDE })
}

export async function remove(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id }, include: INCLUDE })
  if (!brand) throw new AppError('Brand not found', 404)
  if (brand._count.products > 0) throw new AppError('Cannot delete brand with associated products', 400)
  await prisma.brand.delete({ where: { id } })
}
