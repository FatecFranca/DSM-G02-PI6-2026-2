import { z } from 'zod'

export const createMovementSchema = z.object({
  type: z.enum(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory']),
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitCost: z.number().min(0).default(0),
  invoiceNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
  exitReason: z.enum(['sale', 'transfer', 'loss', 'break', 'internal']).optional(),
  notes: z.string().optional(),
  supplierId: z.string().cuid().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  fromAddressId: z.string().cuid().optional(),
  toAddressId: z.string().cuid().optional(),
})

export const movementQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory']).optional(),
  productId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type MovementQuery = z.infer<typeof movementQuerySchema>
