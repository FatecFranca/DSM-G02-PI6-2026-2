import { z } from 'zod'

export const createAddressSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  aisle: z.string().min(1),
  street: z.string().min(1),
  shelf: z.string().min(1),
  level: z.string().min(1),
  position: z.string().min(1),
  capacity: z.number().positive('Capacity must be positive'),
  status: z.enum(['free', 'occupied', 'blocked', 'reserved']).default('free'),
})

export const updateAddressSchema = createAddressSchema.partial()

export const addressQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['free', 'occupied', 'blocked', 'reserved']).optional(),
  aisle: z.string().optional(),
})

export type CreateAddressInput = z.infer<typeof createAddressSchema>
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
export type AddressQuery = z.infer<typeof addressQuerySchema>
