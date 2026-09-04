import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  internalCode: z.string().min(1, 'Internal code is required'),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  categoryId: z.string().cuid('Invalid category ID'),
  brandId: z.string().cuid('Invalid brand ID'),
  supplierId: z.string().cuid('Invalid supplier ID'),
  unit: z.string().min(1, 'Unit is required'),
  weight: z.number().min(0).default(0),
  width: z.number().min(0).default(0),
  height: z.number().min(0).default(0),
  depth: z.number().min(0).default(0),
  description: z.string().optional(),
  purchasePrice: z.number().min(0, 'Purchase price must be positive'),
  salePrice: z.number().min(0, 'Sale price must be positive'),
  minStock: z.number().int().min(0).default(0),
  maxStock: z.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  imageUrl: z.string().url().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const productQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  stockStatus: z.enum(['ok', 'low', 'critical', 'out']).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQuery = z.infer<typeof productQuerySchema>
