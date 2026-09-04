import bcrypt from 'bcryptjs'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateUserInput, PaginationInput, UpdateUserInput } from '../schemas/user.schema'

const SELECT_SAFE = {
  id: true,
  name: true,
  email: true,
  role: true,
  department: true,
  status: true,
  avatarUrl: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
}

export async function findAll(query: PaginationInput) {
  const { page, limit, search } = query
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { department: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take: limit, select: SELECT_SAFE, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ])

  return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: SELECT_SAFE })
  if (!user) throw new AppError('User not found', 404)
  return user
}

export async function create(data: CreateUserInput) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) throw new AppError('Email already in use', 409)

  const password = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: { ...data, password },
    select: SELECT_SAFE,
  })
}

export async function update(id: string, data: UpdateUserInput) {
  await findById(id)
  return prisma.user.update({ where: { id }, data, select: SELECT_SAFE })
}

export async function updateStatus(id: string, status: 'active' | 'inactive' | 'pending') {
  await findById(id)
  return prisma.user.update({ where: { id }, data: { status }, select: SELECT_SAFE })
}

export async function remove(id: string) {
  await findById(id)
  await prisma.user.delete({ where: { id } })
}
