import { prisma } from '../prisma/client'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function monthStart(offset: number): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() + offset)
  return d
}

/** Least-squares line y = a + b·x over equally spaced points; returns a predictor. */
function linearFit(values: number[]): (x: number) => number {
  const n = values.length
  if (n < 2) return () => values[0] ?? 0
  const xs = values.map((_, i) => i)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = values.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * (values[i] - meanY), 0)
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0)
  const slope = den === 0 ? 0 : num / den
  const intercept = meanY - slope * meanX
  return (x) => Math.max(0, Math.round(intercept + slope * x))
}

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1)
  if (mean === 0) return Infinity
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance) / mean
}

export async function getAnalytics(historyMonths = 6, forecastMonths = 3) {
  const since = monthStart(-(historyMonths - 1))
  const [products, exits] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'active' },
      select: {
        id: true, name: true, internalCode: true, currentStock: true, minStock: true, maxStock: true,
        purchasePrice: true, category: { select: { name: true } },
      },
    }),
    prisma.movement.findMany({
      where: { type: 'exit', createdAt: { gte: since } },
      select: { productId: true, quantity: true, createdAt: true, totalValue: true },
    }),
  ])

  // Monthly exit series per product (index 0 = oldest month in window).
  const bucket = (date: Date) =>
    (date.getFullYear() - since.getFullYear()) * 12 + date.getMonth() - since.getMonth()
  const perProduct = new Map<string, number[]>()
  const valueByProduct = new Map<string, number>()
  const totals = Array.from({ length: historyMonths }, () => 0)
  for (const e of exits) {
    const idx = bucket(e.createdAt)
    if (idx < 0 || idx >= historyMonths) continue
    const series = perProduct.get(e.productId) ?? Array.from({ length: historyMonths }, () => 0)
    series[idx] += e.quantity
    perProduct.set(e.productId, series)
    totals[idx] += e.quantity
    valueByProduct.set(e.productId, (valueByProduct.get(e.productId) ?? 0) + Number(e.totalValue))
  }

  // ── Demand forecast (total exits, real vs. linear-trend forecast) ──────
  const predict = linearFit(totals)
  const demand = [
    ...totals.map((real, i) => {
      const d = monthStart(-(historyMonths - 1) + i)
      return { month: MONTHS_PT[d.getMonth()], real, forecast: predict(i) }
    }),
    ...Array.from({ length: forecastMonths }, (_, k) => {
      const d = monthStart(k + 1)
      return { month: MONTHS_PT[d.getMonth()], real: null as number | null, forecast: predict(historyMonths + k) }
    }),
  ]

  // ── Per-product indicators ─────────────────────────────────────────────
  const totalValue = [...valueByProduct.values()].reduce((a, b) => a + b, 0)
  const ranked = products
    .map((p) => ({ p, value: valueByProduct.get(p.id) ?? 0, series: perProduct.get(p.id) ?? Array(historyMonths).fill(0) }))
    .sort((a, b) => b.value - a.value)

  let acc = 0
  const matrix = ranked.map(({ p, value, series }) => {
    acc += value
    const pct = totalValue > 0 ? (acc / totalValue) * 100 : 100
    const abc = pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C'
    const cv = coefficientOfVariation(series)
    const xyz = cv <= 0.5 ? 'X' : cv <= 1 ? 'Y' : 'Z'
    const soldUnits = series.reduce((a, b) => a + b, 0)
    const turnover = Math.round(((soldUnits / historyMonths) * 12 / Math.max(1, p.currentStock)) * 10) / 10
    return {
      productId: p.id,
      product: p.name,
      code: p.internalCode,
      abc,
      xyz,
      turnover,
      valueShare: totalValue > 0 ? Math.round((value / totalValue) * 1000) / 10 : 0,
    }
  })

  // ── Reorder suggestions & insights ─────────────────────────────────────
  const suggestions = ranked
    .map(({ p, series }) => {
      const monthly = series.reduce((a, b) => a + b, 0) / historyMonths
      const forecastNext = linearFit(series)(historyMonths)
      const dailyDemand = Math.max(monthly, forecastNext) / 30
      const daysOfCover = dailyDemand > 0 ? Math.round(p.currentStock / dailyDemand) : null
      const target = Math.max(p.maxStock, Math.ceil(dailyDemand * 45))
      const suggestedQty = Math.max(0, target - p.currentStock)

      let urgency: 'Urgente' | 'Alta' | 'Média' | null = null
      let reason = ''
      if (p.currentStock === 0) { urgency = 'Urgente'; reason = 'Estoque zerado' }
      else if (daysOfCover !== null && daysOfCover <= 7) { urgency = 'Urgente'; reason = `Ruptura prevista em ${daysOfCover} dia(s)` }
      else if (p.minStock > 0 && p.currentStock <= p.minStock * 0.5) { urgency = 'Alta'; reason = 'Estoque crítico (abaixo de 50% do mínimo)' }
      else if (p.minStock > 0 && p.currentStock <= p.minStock) { urgency = 'Média'; reason = 'Abaixo do estoque mínimo' }
      else if (daysOfCover !== null && daysOfCover <= 15) { urgency = 'Média'; reason = `Cobertura de apenas ${daysOfCover} dias` }

      return urgency && suggestedQty > 0
        ? { productId: p.id, product: p.name, code: p.internalCode, category: p.category.name, currentStock: p.currentStock, daysOfCover, quantity: suggestedQty, urgency, reason, estimatedCost: Math.round(suggestedQty * Number(p.purchasePrice) * 100) / 100 }
        : null
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => ['Urgente', 'Alta', 'Média'].indexOf(a.urgency) - ['Urgente', 'Alta', 'Média'].indexOf(b.urgency))

  const insights: { type: 'warning' | 'success' | 'info'; title: string; desc: string; action: string; href: string }[] = []

  const ruptureRisk = suggestions.filter((s) => s.urgency === 'Urgente')
  if (ruptureRisk.length > 0) {
    insights.push({
      type: 'warning',
      title: `Risco de ruptura: ${ruptureRisk.length} produto(s)`,
      desc: `${ruptureRisk.slice(0, 3).map((s) => s.product).join(', ')}${ruptureRisk.length > 3 ? '…' : ''} com estoque zerado ou cobertura menor que 7 dias.`,
      action: 'Comprar agora',
      href: '/dashboard/alertas',
    })
  }

  const growth = ranked
    .map(({ p, series }) => {
      const half = Math.floor(historyMonths / 2)
      const early = series.slice(0, half).reduce((a, b) => a + b, 0)
      const late = series.slice(half).reduce((a, b) => a + b, 0)
      return { name: p.name, growth: early > 0 ? ((late - early) / early) * 100 : 0, volume: early + late }
    })
    .filter((g) => g.volume >= 30)
    .sort((a, b) => b.growth - a.growth)[0]
  if (growth && growth.growth > 10) {
    insights.push({
      type: 'success',
      title: `Crescimento de demanda: ${growth.name}`,
      desc: `+${Math.round(growth.growth)}% de saídas no 2º semestre da janela analisada. Considere aumentar o estoque mínimo.`,
      action: 'Ver produto',
      href: '/dashboard/produtos',
    })
  }

  if (suggestions.length > 0) {
    const cost = suggestions.reduce((a, s) => a + s.estimatedCost, 0)
    insights.push({
      type: 'info',
      title: 'Sugestão de compra gerada',
      desc: `${suggestions.length} produto(s) precisam de reposição, com custo estimado de R$ ${cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      action: 'Ver lista',
      href: '#sugestoes',
    })
  }

  const slowMovers = matrix.filter((m) => m.abc === 'C' && m.xyz === 'Z')
  if (slowMovers.length > 0) {
    insights.push({
      type: 'warning',
      title: `${slowMovers.length} produto(s) classe C/Z (baixo giro e alta variabilidade)`,
      desc: 'Avalie reduzir estoque máximo ou descontinuar itens com demanda irregular.',
      action: 'Revisar',
      href: '/dashboard/relatorios',
    })
  }

  return {
    window: { historyMonths, forecastMonths },
    demand,
    matrix,
    suggestions,
    insights,
  }
}
