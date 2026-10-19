import { z } from 'zod'

export const scenarioSchema = z.object({
  store: z.number().int().positive(),
  family: z.string().min(1).max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD'),
  onpromotion: z.number().int().min(0).max(10_000).default(0),
  oil: z.number().min(0).max(500).optional(),
})

export const predictSchema = z.object({
  scenarios: z.array(scenarioSchema).min(1).max(400),
  models: z.array(z.string().min(1).max(30)).max(10).optional(),
})

export type PredictInput = z.infer<typeof predictSchema>
