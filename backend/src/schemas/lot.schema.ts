import { z } from 'zod'

export const createLotSchema = z.object({
  lotNumber: z.string().min(1, 'Lot number is required'),
  productId: z.string().cuid('Invalid product ID'),
  supplierId: z.string().cuid('Invalid supplier ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  manufacturingDate: z.string().datetime(),
  expirationDate: z.string().datetime(),
  address: z.string().min(1, 'Address is required'),
  status: z.enum(['valid', 'expiring', 'expired', 'quarantine']).default('valid'),
})

export const updateLotSchema = createLotSchema.partial()

export type CreateLotInput = z.infer<typeof createLotSchema>
export type UpdateLotInput = z.infer<typeof updateLotSchema>
