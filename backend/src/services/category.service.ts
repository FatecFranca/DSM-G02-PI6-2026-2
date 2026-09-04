import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateCategoryInput, UpdateCategoryInput } from '../schemas/category.schema'

export async function findAll() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function findById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new AppError('Category not found', 404)
  return category
}

export async function create(data: CreateCategoryInput) {
  const exists = await prisma.category.findUnique({ where: { slug: data.slug } })
  if (exists) throw new AppError('Slug already in use', 409)
  return prisma.category.create({ data, include: { _count: { select: { products: true } } } })
}

export async function update(id: string, data: UpdateCategoryInput) {
  await findById(id)
  return prisma.category.update({
    where: { id },
    data,
    include: { _count: { select: { products: true } } },
  })
}

export async function remove(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) throw new AppError('Category not found', 404)
  if (category._count.products > 0) {
    throw new AppError('Cannot delete category with associated products', 400)
  }
  await prisma.category.delete({ where: { id } })
}
