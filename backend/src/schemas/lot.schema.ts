import { z } from 'zod'

const lotFieldsSchema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required'),
  productId: z.string().cuid('Invalid product ID'),
  supplierId: z.string().cuid('Invalid supplier ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  manufacturingDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  addressId: z.string().cuid('Invalid warehouse address ID').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  status: z.enum(['valid', 'expiring', 'expired', 'quarantine']).default('valid'),
})

export const createLotSchema = lotFieldsSchema.refine((data) => data.addressId || data.address, {
  message: 'Address ID or address code is required',
  path: ['addressId'],
})

export const updateLotSchema = lotFieldsSchema.partial()

export const lotQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().cuid().optional(),
  status: z.enum(['valid', 'expiring', 'expired', 'quarantine']).optional(),
  search: z.string().trim().optional(),
  expiringSoonDays: z.coerce.number().int().min(1).max(365).optional(),
})

export const lotAlertsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})

export type CreateLotInput = z.infer<typeof createLotSchema>
export type UpdateLotInput = z.infer<typeof updateLotSchema>
export type LotQueryInput = z.infer<typeof lotQuerySchema>
