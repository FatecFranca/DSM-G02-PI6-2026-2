import { z } from 'zod'

export const companySchema = z.object({
  legalName: z.string().min(2),
  tradeName: z.string().min(1),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ must be in format XX.XXX.XXX/XXXX-XX').or(z.literal('')),
  email: z.string().email().or(z.literal('')),
  phone: z.string(),
  website: z.string(),
  address: z.string(),
  zip: z.string(),
  city: z.string(),
  state: z.string().max(2),
})

export const preferencesSchema = z.object({
  /** Lots expiring within this many days are flagged as "expiring" and generate alerts. */
  expiryAlertDays: z.number().int().min(1).max(365),
  /** Days between placing a purchase order and receiving it; drives reorder suggestions. */
  leadTimeDays: z.number().int().min(1).max(60),
})

export const updateSettingsSchema = z.object({
  company: companySchema.partial().optional(),
  preferences: preferencesSchema.partial().optional(),
})

export type Company = z.infer<typeof companySchema>
export type Preferences = z.infer<typeof preferencesSchema>
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>
