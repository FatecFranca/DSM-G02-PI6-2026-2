import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().min(2),
  tradeName: z.string().min(2),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ must be in format XX.XXX.XXX/XXXX-XX'),
  email: z.string().email(),
  phone: z.string().min(10),
  contactName: z.string().min(2),
  category: z.string().min(1),
  status: z.enum(['active', 'inactive']).default('active'),
  city: z.string().min(2),
  state: z.string().length(2, 'State must be 2 characters'),
})

export const updateSupplierSchema = createSupplierSchema.partial()

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
