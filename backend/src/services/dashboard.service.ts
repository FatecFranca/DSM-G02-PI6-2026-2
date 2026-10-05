import { prisma } from '../prisma/client'
import * as reportService from './report.service'

export async function getSummary() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalProducts,
    activeProducts,
    totalMovementsToday,
    outStockProducts,
    totalUsers,
    recentMovements,
    warehouseStats,
    criticalProducts,
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
  ])

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
    movements: { today: totalMovementsToday },
    users: { active: totalUsers },
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
    recentMovements,
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
  const movements = await prisma.movement.groupBy({
    by: ['productId'],
    _sum: { quantity: true, totalValue: true },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  if (movements.length === 0) return []

  const productIds = movements.map((m) => m.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, internalCode: true, currentStock: true, salePrice: true },
  })

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  return movements.map((m) => ({
    product: productMap[m.productId],
    movementCount: m._count.id,
    totalQuantity: m._sum.quantity ?? 0,
    totalValue: Math.round(Number(m._sum.totalValue ?? 0) * 100) / 100,
  }))
}

export async function getAbcCurve() {
  const report = await reportService.getAbcReport()
  return { A: report.A, B: report.B, C: report.C, summary: report.summary }
}
