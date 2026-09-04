import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { LoginInput, RegisterInput } from '../schemas/auth.schema'

export async function register(data: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } })
  if (exists) throw new AppError('Email already in use', 409)

  const password = await bcrypt.hash(data.password, 10)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password,
      role: data.role ?? 'operator',
      department: data.department,
      status: 'active',
    },
    select: { id: true, name: true, email: true, role: true, department: true, status: true, createdAt: true },
  })

  const token = signToken(user.id, user.email, user.role)
  return { user, token }
}

export async function login(data: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (!user) throw new AppError('Invalid credentials', 401)
  if (user.status !== 'active') throw new AppError('Account is not active', 403)

  const valid = await bcrypt.compare(data.password, user.password)
  if (!valid) throw new AppError('Invalid credentials', 401)

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  })

  const token = signToken(user.id, user.email, user.role)
  const { password: _, ...safeUser } = user
  return { user: safeUser, token }
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
  })
  if (!user) throw new AppError('User not found', 404)
  return user
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new AppError('User not found', 404)

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw new AppError('Current password is incorrect', 401)

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
}

function signToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { sub: userId, email, role },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as never },
  )
}
