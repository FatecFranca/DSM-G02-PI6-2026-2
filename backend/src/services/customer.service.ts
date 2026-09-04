import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { z } from 'zod'
import {
  createCustomerSchema,
  customerQuerySchema,
  updateCustomerSchema,
} from '../schemas/customer.schema'

export async function listCustomers(query: z.infer<typeof customerQuerySchema>) {
  const { page, limit, search, status } = query
  const skip = (page - 1) * limit

  const where: Prisma.CustomerWhereInput = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { tradeName: { contains: search, mode: 'insensitive' } },
      { cnpj: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) where.status = status

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { tradeName: 'asc' },
    }),
    prisma.customer.count({ where }),
  ])

  return { data: customers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({ where: { id } })
}

export async function createCustomer(data: z.infer<typeof createCustomerSchema>) {
  return prisma.customer.create({ data })
}

export async function updateCustomer(id: string, data: z.infer<typeof updateCustomerSchema>) {
  return prisma.customer.update({ where: { id }, data })
}

export async function removeCustomer(id: string) {
  return prisma.customer.delete({ where: { id } })
}
