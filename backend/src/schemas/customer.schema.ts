import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Razão social deve ter ao menos 2 caracteres'),
  tradeName: z.string().min(2, 'Nome fantasia deve ter ao menos 2 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional(),
  contactName: z.string().optional(),
  city: z.string().min(2),
  state: z.string().length(2, 'Estado deve ter 2 caracteres (UF)'),
  status: z.enum(['active', 'inactive']).optional(),
})

export const updateCustomerSchema = createCustomerSchema.partial()

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})
