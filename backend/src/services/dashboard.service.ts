import { prisma } from '../prisma/client'

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
    stockValue,
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
    prisma.product.findMany({
      where: { status: 'active' },
      select: { currentStock: true, purchasePrice: true, salePrice: true },
    }),
    prisma.product.count({
      where: {
        status: 'active',
        currentStock: { gt: 0 },
        minStock: { gt: 0 },
      },
    }),
  ])

  const warehouseMap = Object.fromEntries(
    warehouseStats.map((s) => [s.status, s._count.status]),
  )
  const totalPositions = Object.values(warehouseMap).reduce((a, b) => a + b, 0)

  const totalStockValue = stockValue.reduce(
    (acc, p) => acc + p.currentStock * p.purchasePrice,
    0,
  )
  const totalSaleValue = stockValue.reduce(
    (acc, p) => acc + p.currentStock * p.salePrice,
    0,
  )

  return {
    products: {
      total: totalProducts,
      active: activeProducts,
      lowStock: criticalProducts,
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
      totalPurchaseValue: Math.round(totalStockValue * 100) / 100,
      totalSaleValue: Math.round(totalSaleValue * 100) / 100,
    },
    recentMovements,
  }
}

export async function getMovementTrend(months = 12) {
  const results: { month: string; entries: number; exits: number; balance: number }[] = []

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setMonth(nextDate.getMonth() + 1)

    const [entries, exits] = await Promise.all([
      prisma.movement.aggregate({
        where: {
          type: { in: ['entry', 'adjustment'] },
          createdAt: { gte: date, lt: nextDate },
        },
        _sum: { quantity: true },
      }),
      prisma.movement.aggregate({
        where: {
          type: { in: ['exit', 'loss', 'transfer'] },
          createdAt: { gte: date, lt: nextDate },
        },
        _sum: { quantity: true },
      }),
    ])

    const entryQty = entries._sum.quantity ?? 0
    const exitQty = exits._sum.quantity ?? 0

    results.push({
      month: date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      entries: entryQty,
      exits: exitQty,
      balance: entryQty - exitQty,
    })
  }

  return results
}

export async function getCategoryDistribution() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      products: {
        where: { status: 'active' },
        select: { currentStock: true, salePrice: true },
      },
    },
  })

  const total = categories.reduce((acc, c) => acc + c._count.products, 0)

  return categories
    .filter((c) => c._count.products > 0)
    .map((c) => {
      const stockValue = c.products.reduce(
        (acc, p) => acc + p.currentStock * p.salePrice,
        0,
      )
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        productCount: c._count.products,
        percentage: total > 0 ? Math.round((c._count.products / total) * 100) : 0,
        stockValue: Math.round(stockValue * 100) / 100,
      }
    })
    .sort((a, b) => b.productCount - a.productCount)
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
    totalValue: Math.round((m._sum.totalValue ?? 0) * 100) / 100,
  }))
}

export async function getAbcCurve() {
  const products = await prisma.movement.groupBy({
    by: ['productId'],
    _sum: { totalValue: true },
    orderBy: { _sum: { totalValue: 'desc' } },
  })

  if (products.length === 0) return { A: [], B: [], C: [] }

  const totalValue = products.reduce((acc, p) => acc + (p._sum.totalValue ?? 0), 0)
  const productIds = products.map((p) => p.productId)

  const productDetails = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, internalCode: true, currentStock: true },
  })
  const productMap = Object.fromEntries(productDetails.map((p) => [p.id, p]))

  let accumulated = 0
  const classified = products.map((p) => {
    accumulated += p._sum.totalValue ?? 0
    const percentage = totalValue > 0 ? (accumulated / totalValue) * 100 : 0
    const classLabel = percentage <= 80 ? 'A' : percentage <= 95 ? 'B' : 'C'
    return {
      product: productMap[p.productId],
      totalValue: Math.round((p._sum.totalValue ?? 0) * 100) / 100,
      accumulatedPercentage: Math.round(percentage * 10) / 10,
      class: classLabel,
    }
  })

  return {
    A: classified.filter((p) => p.class === 'A'),
    B: classified.filter((p) => p.class === 'B'),
    C: classified.filter((p) => p.class === 'C'),
    summary: {
      totalValue: Math.round(totalValue * 100) / 100,
      classA: { count: 0, percentage: 0 },
      classB: { count: 0, percentage: 0 },
      classC: { count: 0, percentage: 0 },
    },
  }
}
