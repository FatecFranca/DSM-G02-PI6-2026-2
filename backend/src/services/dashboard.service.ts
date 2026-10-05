import { prisma } from '../prisma/client'
import * as reportService from './report.service'
import { getExpiryAlertDays } from './settings.service'
import { syncLotStatuses } from './lot.service'

export async function getSummary() {
  await syncLotStatuses()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const expiringCutoff = new Date()
  expiringCutoff.setDate(expiringCutoff.getDate() + (await getExpiryAlertDays()))

  const [
    totalProducts,
    activeProducts,
    totalMovementsToday,
    outStockProducts,
    totalUsers,
    recentMovements,
    warehouseStats,
    criticalProducts,
    todayEntries,
    todayExits,
    expiringLots,
    totalLots,
    validLots,
    completedCounts,
    pendingCounts,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.movement.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.product.count({ where: { currentStock: 0, status: 'active' } }),
    prisma.user.count({ where: { status: 'active' } }),
    prisma.movement.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.warehouseAddress.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS "count"
      FROM "products"
      WHERE "status" = 'active'
        AND "currentStock" > 0
        AND "minStock" > 0
        AND "currentStock" <= "minStock"
    `,
    prisma.movement.aggregate({
      where: { type: 'entry', createdAt: { gte: todayStart } },
      _count: { id: true },
      _sum: { totalValue: true },
    }),
    prisma.movement.aggregate({
      where: { type: 'exit', createdAt: { gte: todayStart } },
      _count: { id: true },
      _sum: { totalValue: true },
    }),
    prisma.lot.count({
      where: { expirationDate: { gte: new Date(), lte: expiringCutoff }, status: { not: 'quarantine' } },
    }),
    prisma.lot.count(),
    prisma.lot.count({ where: { expirationDate: { gt: expiringCutoff }, status: { not: 'quarantine' } } }),
    prisma.inventoryCount.findMany({
      where: { status: 'completed', totalItems: { gt: 0 } },
      select: { totalItems: true, divergences: true },
    }),
    prisma.inventoryCount.count({ where: { status: { in: ['planned', 'in_progress', 'review'] } } }),
  ])

  const round2 = (n: number) => Math.round(n * 100) / 100
  const inventoryAccuracy =
    completedCounts.length > 0
      ? Math.round(
          (completedCounts.reduce((acc, c) => acc + ((c.totalItems - c.divergences) / c.totalItems) * 100, 0) /
            completedCounts.length) * 10,
        ) / 10
      : null

  const warehouseMap = Object.fromEntries(
    warehouseStats.map((s) => [s.status, s._count.status]),
  )
  const totalPositions = Object.values(warehouseMap).reduce((a, b) => a + b, 0)

  const [{ purchaseValue, saleValue }] = await prisma.$queryRaw<Array<{ purchaseValue: number; saleValue: number }>>`
    SELECT
      COALESCE(SUM("currentStock" * "purchasePrice"), 0)::float8 AS "purchaseValue",
      COALESCE(SUM("currentStock" * "salePrice"), 0)::float8 AS "saleValue"
    FROM "products"
    WHERE "status" = 'active'
  `

  return {
    products: {
      total: totalProducts,
      active: activeProducts,
      lowStock: criticalProducts[0]?.count ?? 0,
      outStock: outStockProducts,
    },
    movements: {
      today: totalMovementsToday,
      todayEntries: { count: todayEntries._count.id, value: round2(Number(todayEntries._sum.totalValue ?? 0)) },
      todayExits: { count: todayExits._count.id, value: round2(Number(todayExits._sum.totalValue ?? 0)) },
    },
    users: { active: totalUsers },
    lots: {
      total: totalLots,
      expiringSoon: expiringLots,
      validPercentage: totalLots > 0 ? Math.round((validLots / totalLots) * 100) : 100,
    },
    inventory: { pendingCounts, accuracy: inventoryAccuracy },
    warehouse: {
      total: totalPositions,
      free: warehouseMap['free'] ?? 0,
      occupied: warehouseMap['occupied'] ?? 0,
      blocked: warehouseMap['blocked'] ?? 0,
      occupancyRate:
        totalPositions > 0
          ? Math.round(((warehouseMap['occupied'] ?? 0) / totalPositions) * 100)
          : 0,
    },
    stock: {
      totalPurchaseValue: Math.round(purchaseValue * 100) / 100,
      totalSaleValue: Math.round(saleValue * 100) / 100,
    },
    recentMovements: recentMovements.map((m) => ({
      ...m,
      unitCost: Number(m.unitCost),
      totalValue: Number(m.totalValue),
    })),
  }
}

export async function getMovementTrend(months = 12) {
  const monthCount = Math.max(1, Math.min(24, months))
  const firstMonth = new Date()
  firstMonth.setDate(1)
  firstMonth.setMonth(firstMonth.getMonth() - monthCount + 1)
  firstMonth.setHours(0, 0, 0, 0)
  const monthlyTotals = await prisma.$queryRaw<Array<{ month: Date; entries: number; exits: number }>>`
    SELECT date_trunc('month', "createdAt") AS "month",
      COALESCE(SUM("quantity") FILTER (WHERE "type" = 'entry'), 0)::int AS "entries",
      COALESCE(SUM("quantity") FILTER (WHERE "type" IN ('exit', 'loss')), 0)::int AS "exits"
    FROM "movements"
    WHERE "createdAt" >= ${firstMonth}
      AND "type" IN ('entry', 'exit', 'loss')
    GROUP BY date_trunc('month', "createdAt")
    ORDER BY "month" ASC
  `
  const totalsByMonth = new Map(monthlyTotals.map((row) => [
    `${row.month.getFullYear()}-${row.month.getMonth()}`,
    row,
  ]))
  const results: { month: string; entries: number; exits: number; balance: number }[] = []

  for (let i = 0; i < monthCount; i++) {
    const date = new Date(firstMonth)
    date.setMonth(date.getMonth() + i)
    const monthTotals = totalsByMonth.get(`${date.getFullYear()}-${date.getMonth()}`)
    const entries = monthTotals?.entries ?? 0
    const exits = monthTotals?.exits ?? 0
    results.push({
      month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      entries,
      exits,
      balance: entries - exits,
    })
  }
  return results
}

export async function getCategoryDistribution() {
  const categories = await prisma.$queryRaw<Array<{
    id: string; name: string; color: string; productCount: number; stockValue: number
  }>>`
    SELECT c."id", c."name", c."color",
      COUNT(p."id")::int AS "productCount",
      COALESCE(SUM(p."currentStock" * p."salePrice"), 0)::float8 AS "stockValue"
    FROM "categories" c
    INNER JOIN "products" p ON p."categoryId" = c."id" AND p."status" = 'active'
    GROUP BY c."id", c."name", c."color"
    ORDER BY COUNT(p."id") DESC, c."name" ASC
  `
  const total = categories.reduce((acc, category) => acc + category.productCount, 0)
  return categories.map((category) => ({
    ...category,
    percentage: total > 0 ? Math.round((category.productCount / total) * 100) : 0,
    stockValue: Math.round(category.stockValue * 100) / 100,
  }))
}

export async function getTopProducts(limit = 10) {
  const now = new Date()
  const d30 = new Date(now)
  d30.setDate(d30.getDate() - 30)
  const d60 = new Date(now)
  d60.setDate(d60.getDate() - 60)

  const movements = await prisma.movement.groupBy({
    by: ['productId'],
    _sum: { quantity: true, totalValue: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  if (movements.length === 0) return []

  const productIds = movements.map((m) => m.productId)
  const [products, recent, previous] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, internalCode: true, currentStock: true, salePrice: true },
    }),
    prisma.movement.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, createdAt: { gte: d30 } },
      _count: { id: true },
    }),
    prisma.movement.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds }, createdAt: { gte: d60, lt: d30 } },
      _count: { id: true },
    }),
  ])

  const productMap = Object.fromEntries(
    products.map((p) => [p.id, { ...p, salePrice: Number(p.salePrice) }]),
  )
  const recentMap = Object.fromEntries(recent.map((r) => [r.productId, r._count.id]))
  const previousMap = Object.fromEntries(previous.map((r) => [r.productId, r._count.id]))

  return movements.map((m) => {
    const cur = recentMap[m.productId] ?? 0
    const prev = previousMap[m.productId] ?? 0
    const trend = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0
    return {
      product: productMap[m.productId],
      movementCount: m._count.id,
      totalQuantity: m._sum.quantity ?? 0,
      totalValue: Math.round(Number(m._sum.totalValue ?? 0) * 100) / 100,
      trend,
    }
  })
}

/** Movement volume per weekday (0 = Sunday) and hour, for the activity heatmap. */
export async function getHeatmap(days = 90) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const movements = await prisma.movement.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  })
  const grid = new Map<string, number>()
  for (const m of movements) {
    const key = `${m.createdAt.getDay()}-${m.createdAt.getHours()}`
    grid.set(key, (grid.get(key) ?? 0) + 1)
  }
  return Array.from({ length: 7 }, (_, day) =>
    Array.from({ length: 24 }, (_, hour) => ({ day, hour, value: grid.get(`${day}-${hour}`) ?? 0 })),
  ).flat()
}

export async function getAbcCurve() {
  const report = await reportService.getAbcReport()
  return { A: report.A, B: report.B, C: report.C, summary: report.summary }
}
