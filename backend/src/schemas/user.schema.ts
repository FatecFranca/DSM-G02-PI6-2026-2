import { z } from 'zod'

export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'supervisor', 'operator', 'viewer']).default('operator'),
  department: z.string().min(1),
  avatarUrl: z.string().url().optional(),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending']),
})

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
