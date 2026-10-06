import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { forecastDemand, SeriesForecast, SeriesInput, ModelInfo } from './ml.service'
import { getPreferences } from './settings.service'

const HISTORY_WEEKS = 12
const FORECAST_WEEKS = 4
const FORECAST_DAYS = FORECAST_WEEKS * 7
/** Purchase suggestions cover this many days of forecast demand after the order arrives. */
const COVERAGE_DAYS = 28

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const dayDiff = (a: string, b: string) =>
  Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86_400_000)

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1)
  if (mean === 0) return Infinity
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const round1 = (n: number) => Math.round(n * 10) / 10

interface DailyExit {
  productId: string
  day: string
  quantity: number
  value: number
}

/** Daily exit quantities and values per product over the last `days` full days. */
async function loadDailyExits(days: number, todayStart: Date): Promise<DailyExit[]> {
  const since = new Date(todayStart)
  since.setDate(since.getDate() - days)
  const rows = await prisma.$queryRaw<{ productId: string; day: string; quantity: number; value: number }[]>(Prisma.sql`
    SELECT "productId",
           to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
           SUM("quantity")::int AS quantity,
           COALESCE(SUM("totalValue"), 0)::float8 AS value
    FROM "movements"
    WHERE "type" = 'exit' AND "createdAt" >= ${since} AND "createdAt" < ${todayStart}
    GROUP BY "productId", date_trunc('day', "createdAt")
  `)
  return rows
}

/**
 * Analytics overview: weekly demand forecast, ABC×XYZ matrix, purchase suggestions and insights.
 * Forecasts come from the ML service (see ml.service.ts) or the moving-average fallback.
 */
export async function getAnalytics(historyMonths = 6) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const asOf = ymd(new Date(todayStart.getTime() - 86_400_000)) // last full day
  const historyDays = Math.max(historyMonths * 30, HISTORY_WEEKS * 7 + 56)

  const [products, exits, prefs] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'active' },
      select: {
        id: true, name: true, internalCode: true, currentStock: true, minStock: true, maxStock: true,
        purchasePrice: true, category: { select: { name: true } },
      },
    }),
    loadDailyExits(historyDays, todayStart),
    getPreferences(),
  ])

  const byProduct = new Map<string, DailyExit[]>()
  for (const e of exits) byProduct.set(e.productId, [...(byProduct.get(e.productId) ?? []), e])

  const series: SeriesInput[] = products
    .filter((p) => byProduct.has(p.id))
    .map((p) => ({ id: p.id, history: byProduct.get(p.id)!.map((e) => ({ date: e.day, quantity: e.quantity })) }))
  const { model, forecasts } = await forecastDemand(series, asOf, FORECAST_DAYS)

  // ── Weekly demand: last HISTORY_WEEKS real vs next FORECAST_WEEKS forecast ──
  const demand = buildWeeklyDemand(exits, forecasts, asOf)

  // ── ABC × XYZ over the history window (monthly variability) ──
  const monthKey = (day: string) => day.slice(0, 7)
  const months = [...new Set(exits.map((e) => monthKey(e.day)))].sort()
  const monthly = new Map<string, number[]>()
  const valueByProduct = new Map<string, number>()
  for (const e of exits) {
    const arr = monthly.get(e.productId) ?? Array(months.length).fill(0)
    arr[months.indexOf(monthKey(e.day))] += e.quantity
    monthly.set(e.productId, arr)
    valueByProduct.set(e.productId, (valueByProduct.get(e.productId) ?? 0) + e.value)
  }
  const totalValue = sum([...valueByProduct.values()])
  const ranked = products
    .map((p) => ({ p, value: valueByProduct.get(p.id) ?? 0, series: monthly.get(p.id) ?? Array(Math.max(months.length, 1)).fill(0) }))
    .sort((a, b) => b.value - a.value)

  let acc = 0
  const matrix = ranked.map(({ p, value, series: s }) => {
    acc += value
    const pct = totalValue > 0 ? (acc / totalValue) * 100 : 100
    const abc = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C'
    const cv = coefficientOfVariation(s)
    const xyz = cv <= 0.5 ? 'X' : cv <= 1 ? 'Y' : 'Z'
    const soldPerMonth = sum(s) / Math.max(s.length, 1)
    return {
      productId: p.id,
      product: p.name,
      code: p.internalCode,
      abc,
      xyz,
      // Turnover is undefined without stock on hand (it would divide by zero).
      turnover: p.currentStock > 0 ? Math.round(((soldPerMonth * 12) / p.currentStock) * 10) / 10 : null,
      valueShare: totalValue > 0 ? Math.round((value / totalValue) * 1000) / 10 : 0,
    }
  })

  // ── Purchase suggestions from the forecast ──
  const lead = prefs.leadTimeDays
  const suggestions = products
    .map((p) => {
      const f = forecasts.get(p.id)
      if (!f) return null
      return suggest(p, f, lead)
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => ['Urgente', 'Alta', 'Média'].indexOf(a.urgency) - ['Urgente', 'Alta', 'Média'].indexOf(b.urgency) || (a.daysOfCover ?? 99) - (b.daysOfCover ?? 99))

  const insights = buildInsights({ products, forecasts, exits, suggestions, matrix, model, asOf })

  return {
    window: { historyWeeks: HISTORY_WEEKS, forecastWeeks: FORECAST_WEEKS, asOf, leadTimeDays: lead, coverageDays: COVERAGE_DAYS },
    model,
    demand,
    matrix,
    suggestions,
    insights,
  }
}

function buildWeeklyDemand(exits: DailyExit[], forecasts: Map<string, SeriesForecast>, asOf: string) {
  const totalsByDay = new Map<string, number>()
  for (const e of exits) totalsByDay.set(e.day, (totalsByDay.get(e.day) ?? 0) + e.quantity)

  const out: { label: string; start: string; real: number | null; forecast: number | null; low: number | null; high: number | null }[] = []
  const firstStart = addDays(asOf, -(HISTORY_WEEKS * 7) + 1)
  const label = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

  for (let w = 0; w < HISTORY_WEEKS; w++) {
    const start = addDays(firstStart, w * 7)
    const real = sum(Array.from({ length: 7 }, (_, i) => totalsByDay.get(addDays(start, i)) ?? 0))
    out.push({ label: label(start), start, real, forecast: null, low: null, high: null })
  }
  // Join the forecast line to the last real point so the chart reads as one continuous series.
  const last = out[out.length - 1]
  last.forecast = last.real
  last.low = last.real
  last.high = last.real

  for (let w = 0; w < FORECAST_WEEKS; w++) {
    const start = addDays(asOf, 1 + w * 7)
    // Totals add the means; the band adds the deviations as independent errors (RSS).
    let mean = 0, downSq = 0, upSq = 0
    for (const f of forecasts.values()) {
      for (const d of f.daily.slice(w * 7, w * 7 + 7)) {
        mean += d.mean
        downSq += Math.max(0, d.mean - d.low) ** 2
        upSq += Math.max(0, d.high - d.mean) ** 2
      }
    }
    out.push({
      label: label(start), start, real: null, forecast: Math.round(mean),
      low: Math.round(Math.max(0, mean - Math.sqrt(downSq))), high: Math.round(mean + Math.sqrt(upSq)),
    })
  }
  return out
}

type ProductRow = {
  id: string; name: string; internalCode: string; currentStock: number; minStock: number; maxStock: number
  purchasePrice: Prisma.Decimal; category: { name: string }
}

/**
 * Reorder logic on top of the daily forecast:
 *  - days of cover: first day on which the cumulative forecast demand exceeds the stock;
 *  - safety stock: upper band minus mean demand over the lead time;
 *  - order quantity: forecast over COVERAGE_DAYS + safety stock − current stock.
 */
function suggest(p: ProductRow, f: SeriesForecast, lead: number) {
  const mean = f.daily.map((d) => d.mean)
  const high = f.daily.map((d) => d.high)
  const demandLead = sum(mean.slice(0, lead))
  // Daily upper-band deviations are combined as independent errors (root-sum-of-squares);
  // summing the daily bands would assume perfectly correlated errors and overstock.
  const safety = Math.sqrt(sum(high.slice(0, lead).map((h, i) => Math.max(0, h - mean[i]) ** 2)))
  const reorderPoint = demandLead + safety

  let cumulative = 0
  let daysOfCover: number | null = null
  for (let i = 0; i < mean.length; i++) {
    cumulative += mean[i]
    if (cumulative >= p.currentStock) {
      daysOfCover = p.currentStock === 0 ? 0 : i + (p.currentStock - (cumulative - mean[i])) / Math.max(mean[i], 1e-9)
      break
    }
  }

  const target = sum(mean.slice(0, Math.min(COVERAGE_DAYS, mean.length))) + safety
  const quantity = Math.max(0, Math.ceil(target - p.currentStock))

  let urgency: 'Urgente' | 'Alta' | 'Média' | null = null
  let reason = ''
  if (p.currentStock === 0) { urgency = 'Urgente'; reason = 'Estoque zerado' }
  else if (daysOfCover !== null && daysOfCover <= lead) { urgency = 'Urgente'; reason = `Ruptura prevista em ~${Math.max(1, Math.round(daysOfCover))} dia(s), antes da reposição (${lead}d)` }
  else if (p.currentStock <= reorderPoint && demandLead > 0) { urgency = 'Alta'; reason = 'Abaixo do ponto de pedido (demanda do prazo + segurança)' }
  else if (p.minStock > 0 && p.currentStock <= p.minStock) { urgency = 'Média'; reason = 'Abaixo do estoque mínimo' }

  if (!urgency || quantity <= 0) return null
  return {
    productId: p.id,
    product: p.name,
    code: p.internalCode,
    category: p.category.name,
    currentStock: p.currentStock,
    daysOfCover: daysOfCover === null ? null : Math.round(daysOfCover),
    forecast7: round1(sum(mean.slice(0, 7))),
    forecast28: round1(sum(mean.slice(0, COVERAGE_DAYS))),
    safetyStock: Math.ceil(safety),
    quantity,
    urgency,
    reason,
    method: f.method,
    estimatedCost: Math.round(quantity * Number(p.purchasePrice) * 100) / 100,
  }
}

function buildInsights(ctx: {
  products: ProductRow[]
  forecasts: Map<string, SeriesForecast>
  exits: DailyExit[]
  suggestions: ReturnType<typeof suggest>[]
  matrix: { abc: string; xyz: string }[]
  model: ModelInfo
  asOf: string
}) {
  const insights: { type: 'warning' | 'success' | 'info'; title: string; desc: string; action: string; href: string }[] = []
  const list = ctx.suggestions.filter((s): s is NonNullable<typeof s> => s !== null)

  const urgent = list.filter((s) => s.urgency === 'Urgente')
  if (urgent.length > 0) {
    insights.push({
      type: 'warning',
      title: `Risco de ruptura: ${urgent.length} produto(s)`,
      desc: `${urgent.slice(0, 3).map((s) => s.product).join(', ')}${urgent.length > 3 ? '…' : ''} — estoque zerado ou insuficiente até a reposição chegar.`,
      action: 'Ver sugestões',
      href: '#sugestoes',
    })
  }

  // Demand growth: forecast for the next 28 days vs. the real last 28 days.
  const from = addDays(ctx.asOf, -27)
  const last28 = new Map<string, number>()
  for (const e of ctx.exits) if (e.day >= from) last28.set(e.productId, (last28.get(e.productId) ?? 0) + e.quantity)
  const growth = ctx.products
    .map((p) => {
      const f = ctx.forecasts.get(p.id)
      const prev = last28.get(p.id) ?? 0
      const next = f ? sum(f.daily.slice(0, 28).map((d) => d.mean)) : 0
      return { name: p.name, prev, next, pct: prev > 0 ? ((next - prev) / prev) * 100 : 0 }
    })
    .filter((g) => g.prev >= 30 && ctx.model.source === 'ml')
    .sort((a, b) => b.pct - a.pct)[0]
  if (growth && growth.pct >= 15) {
    insights.push({
      type: 'success',
      title: `Demanda em alta: ${growth.name}`,
      desc: `O modelo prevê ${Math.round(growth.next)} un nos próximos 28 dias (+${Math.round(growth.pct)}% vs. ${Math.round(growth.prev)} un nos últimos 28). Avalie aumentar o estoque mínimo.`,
      action: 'Ver produtos',
      href: '/dashboard/produtos',
    })
  }

  if (list.length > 0) {
    const cost = sum(list.map((s) => s.estimatedCost))
    insights.push({
      type: 'info',
      title: `Sugestão de compra: ${list.length} produto(s)`,
      desc: `Reposição estimada em R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para cobrir ${COVERAGE_DAYS} dias de demanda prevista.`,
      action: 'Ver lista',
      href: '#sugestoes',
    })
  }

  const slow = ctx.matrix.filter((m) => m.abc === 'C' && m.xyz === 'Z').length
  if (slow > 0) {
    insights.push({
      type: 'warning',
      title: `${slow} produto(s) classe C/Z`,
      desc: 'Baixo valor e demanda irregular: avalie reduzir o estoque máximo ou descontinuar.',
      action: 'Ver relatórios',
      href: '/dashboard/relatorios',
    })
  }

  if (ctx.model.source === 'baseline') {
    insights.push({
      type: 'info',
      title: 'Previsão por média móvel',
      desc: ctx.model.reason ?? 'O modelo de ML não está ativo; as previsões usam a média dos últimos 28 dias.',
      action: 'Saiba mais',
      href: '/dashboard/configuracoes',
    })
  }
  return insights
}
