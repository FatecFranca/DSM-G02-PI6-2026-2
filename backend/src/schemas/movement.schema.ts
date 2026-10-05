import { z } from 'zod'

export const createMovementSchema = z.object({
  type: z.enum(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory']),
  productId: z.string().cuid('Invalid product ID'),
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  adjustmentDirection: z.enum(['increase', 'decrease']).optional(),
  unitCost: z.number().min(0).default(0),
  invoiceNumber: z.string().optional(),
  lotNumber: z.string().optional(),
  expirationDate: z.string().datetime().optional(),
  exitReason: z.enum(['sale', 'transfer', 'loss', 'break', 'internal']).optional(),
  notes: z.string().optional(),
  supplierId: z.string().cuid().optional(),
  manufacturingDate: z.string().datetime().optional(),
  customerId: z.string().cuid().optional(),
  customerName: z.string().optional(),
  fromAddressId: z.string().cuid().optional(),
  toAddressId: z.string().cuid().optional(),
}).superRefine((data, ctx) => {
  if (data.type !== 'inventory' && data.quantity === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.too_small, minimum: 1, type: 'number', inclusive: true, message: 'Quantity must be positive', path: ['quantity'] })
  }
  if (data.type === 'adjustment' && !data.adjustmentDirection) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Adjustment direction is required', path: ['adjustmentDirection'] })
  }
  if (data.type !== 'adjustment' && data.adjustmentDirection) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Adjustment direction is only valid for adjustments', path: ['adjustmentDirection'] })
  }
  if (data.type === 'transfer') {
    if (!data.fromAddressId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Source address is required for transfers', path: ['fromAddressId'] })
    }
    if (!data.toAddressId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Destination address is required for transfers', path: ['toAddressId'] })
    }
    if (data.fromAddressId && data.fromAddressId === data.toAddressId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Source and destination must be different', path: ['toAddressId'] })
    }
  }
})

export const movementQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.preprocess(
    (value) => typeof value === 'string' ? value.split(',') : value,
    z.array(z.enum(['entry', 'exit', 'transfer', 'loss', 'adjustment', 'inventory'])).optional(),
  ),
  productId: z.string().optional(),
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})

export type CreateMovementInput = z.infer<typeof createMovementSchema>
export type MovementQuery = z.infer<typeof movementQuerySchema>
