import type { Tone } from '@/theme/tokens'
import type { ApiProductForecasts } from '@/types/api'

export type ForecastItem = ApiProductForecasts['products'][number]

/** Janela de cobertura usada para sugerir reposição (a mesma da IA Analítica e do web). */
export const COVERAGE_DAYS = 28

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export interface Projection {
  /** Demanda diária prevista já com o cenário aplicado. */
  mean: number[]
  /** Demanda dentro do período escolhido. */
  window: number[]
  total: number
  /** Índice do dia em que o estoque acaba (null = não acaba no período). */
  runOutIndex: number | null
  coverDays: number | null
  safety: number
  reorder: number
  /** Estoque restante ao fim de cada dia, sem reposição (pode ficar negativo = falta). */
  remaining: number[]
}

/** Projeção do produto: quando o estoque acaba, quanto repor e até quando. Mesmas regras do web e do backend. */
export function project(p: ForecastItem, stock: number, factor: number, days: number, lead: number): Projection {
  const mean = p.daily.map(d => d.mean * factor)
  const spread = p.daily.map(d => Math.max(0, d.high - d.mean) * factor)
  const window = mean.slice(0, days)

  let cum = 0
  let runOutIndex: number | null = null
  let coverDays: number | null = null
  for (let i = 0; i < window.length; i++) {
    if (cum + window[i] >= stock) {
      runOutIndex = i
      coverDays = stock === 0 ? 0 : i + (stock - cum) / Math.max(window[i], 1e-9)
      break
    }
    cum += window[i]
  }
  const total = sum(window)
  const safety = Math.sqrt(sum(spread.slice(0, lead).map(s => s * s)))
  const target = sum(mean.slice(0, COVERAGE_DAYS)) + safety
  const reorder = Math.max(0, Math.ceil(target - stock))
  const remaining = window.map((_, i) => Math.round(stock - sum(window.slice(0, i + 1))))
  return { mean, window, total, runOutIndex, coverDays, safety, reorder, remaining }
}

export interface Situation { label: string; tone: Extract<Tone, 'danger' | 'warning' | 'success'> }

export function situation(stock: number, coverDays: number | null, lead: number): Situation {
  if (stock === 0) return { label: 'Sem estoque', tone: 'danger' }
  if (coverDays !== null && coverDays <= lead) return { label: 'Repor agora', tone: 'danger' }
  if (coverDays !== null && coverDays <= lead + 7) return { label: 'Atenção', tone: 'warning' }
  return { label: 'Coberto', tone: 'success' }
}

/** "2026-11-17" -> "17/11" (sem converter fuso: a data já é do dia do estoque). */
export const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

export const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })

export const weekday = (iso: string) => longDay(iso).split(',')[0]

export const fmt = (v: number, digits = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(v)

export const addDays = (iso: string, days: number) =>
  new Date(new Date(`${iso}T12:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10)

export { sum }
