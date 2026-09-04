import { prisma } from '../prisma/client'

export interface ReportPeriod {
  from?: string
  to?: string
}

export async function getMovementReport(period: ReportPeriod) {
  const where: Record<string, unknown> = {}

  if (period.from || period.to) {
    where.createdAt = {
      ...(period.from ? { gte: new Date(period.from) } : {}),
      ...(period.to ? { lte: new Date(period.to) } : {}),
    }
  }

  const [byType, byProduct, totals] = await Promise.all([
    prisma.movement.groupBy({
      by: ['type'],
      where,
      _sum: { quantity: true, totalValue: true },
      _count: { id: true },
    }),
    prisma.movement.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true, totalValue: true },
      _count: { id: true },
      orderBy: { _sum: { totalValue: 'desc' } },
      take: 20,
    }),
    prisma.movement.aggregate({
      where,
      _sum: { quantity: true, totalValue: true },
      _count: { id: true },
    }),
  ])

  const productIds = byProduct.map((p) => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, internalCode: true, unit: true },
  })
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  return {
    period: {
      from: period.from ?? null,
      to: period.to ?? null,
    },
    totals: {
      count: totals._count.id,
      quantity: totals._sum.quantity ?? 0,
      value: Math.round((totals._sum.totalValue ?? 0) * 100) / 100,
    },
    byType: byType.map((t) => ({
      type: t.type,
      count: t._count.id,
      quantity: t._sum.quantity ?? 0,
      value: Math.round((t._sum.totalValue ?? 0) * 100) / 100,
    })),
    topProducts: byProduct.map((p) => ({
      product: productMap[p.productId],
      count: p._count.id,
      quantity: p._sum.quantity ?? 0,
      value: Math.round((p._sum.totalValue ?? 0) * 100) / 100,
    })),
  }
}

export async function getStockReport() {
  const products = await prisma.product.findMany({
    where: { status: 'active' },
    include: {
      category: { select: { id: true, name: true, color: true } },
      brand: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { currentStock: 'asc' },
  })

  const withStatus = products.map((p) => {
    let stockStatus: string
    if (p.currentStock === 0) stockStatus = 'out'
    else if (p.minStock > 0 && p.currentStock <= p.minStock * 0.5) stockStatus = 'critical'
    else if (p.minStock > 0 && p.currentStock <= p.minStock) stockStatus = 'low'
    else stockStatus = 'ok'

    return {
      ...p,
      stockStatus,
      stockValue: Math.round(p.currentStock * p.purchasePrice * 100) / 100,
      saleValue: Math.round(p.currentStock * p.salePrice * 100) / 100,
    }
  })

  const summary = {
    total: withStatus.length,
    out: withStatus.filter((p) => p.stockStatus === 'out').length,
    critical: withStatus.filter((p) => p.stockStatus === 'critical').length,
    low: withStatus.filter((p) => p.stockStatus === 'low').length,
    ok: withStatus.filter((p) => p.stockStatus === 'ok').length,
    totalStockValue: Math.round(
      withStatus.reduce((acc, p) => acc + p.stockValue, 0) * 100,
    ) / 100,
    totalSaleValue: Math.round(
      withStatus.reduce((acc, p) => acc + p.saleValue, 0) * 100,
    ) / 100,
  }

  return { summary, products: withStatus }
}

export async function getLotExpirationReport(days = 90) {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  const [expired, expiringSoon, valid, quarantine] = await Promise.all([
    prisma.lot.findMany({
      where: { expirationDate: { lt: now }, status: { not: 'quarantine' } },
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.lot.findMany({
      where: {
        expirationDate: { gte: now, lte: cutoff },
        status: { in: ['valid', 'expiring'] },
      },
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { expirationDate: 'asc' },
    }),
    prisma.lot.count({ where: { status: 'valid', expirationDate: { gt: cutoff } } }),
    prisma.lot.findMany({
      where: { status: 'quarantine' },
      include: { product: { select: { id: true, name: true, internalCode: true } } },
    }),
  ])

  return {
    windowDays: days,
    summary: {
      expired: expired.length,
      expiringSoon: expiringSoon.length,
      valid,
      quarantine: quarantine.length,
    },
    expired,
    expiringSoon,
    quarantine,
  }
}

export async function getAbcReport() {
  const movements = await prisma.movement.groupBy({
    by: ['productId'],
    _sum: { totalValue: true },
    orderBy: { _sum: { totalValue: 'desc' } },
  })

  if (movements.length === 0) {
    return { summary: { A: { count: 0, percentage: 0 }, B: { count: 0, percentage: 0 }, C: { count: 0, percentage: 0 } }, items: [] }
  }

  const totalValue = movements.reduce((acc, m) => acc + (m._sum.totalValue ?? 0), 0)
  const productIds = movements.map((m) => m.productId)

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, internalCode: true, currentStock: true, salePrice: true },
  })
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  let accumulated = 0
  const items = movements.map((m) => {
    accumulated += m._sum.totalValue ?? 0
    const accPct = totalValue > 0 ? (accumulated / totalValue) * 100 : 0
    const cls = accPct <= 80 ? 'A' : accPct <= 95 ? 'B' : 'C'
    return {
      class: cls,
      product: productMap[m.productId],
      totalValue: Math.round((m._sum.totalValue ?? 0) * 100) / 100,
      accumulatedPercentage: Math.round(accPct * 10) / 10,
      individualPercentage:
        totalValue > 0
          ? Math.round(((m._sum.totalValue ?? 0) / totalValue) * 1000) / 10
          : 0,
    }
  })

  const groupA = items.filter((i) => i.class === 'A')
  const groupB = items.filter((i) => i.class === 'B')
  const groupC = items.filter((i) => i.class === 'C')

  return {
    summary: {
      totalValue: Math.round(totalValue * 100) / 100,
      A: { count: groupA.length, percentage: Math.round((groupA.length / items.length) * 100) },
      B: { count: groupB.length, percentage: Math.round((groupB.length / items.length) * 100) },
      C: { count: groupC.length, percentage: Math.round((groupC.length / items.length) * 100) },
    },
    A: groupA,
    B: groupB,
    C: groupC,
  }
}

export async function getInventoryReport() {
  const counts = await prisma.inventoryCount.findMany({
    include: { responsible: { select: { id: true, name: true } } },
    orderBy: { startDate: 'desc' },
  })

  const summary = {
    total: counts.length,
    completed: counts.filter((c) => c.status === 'completed').length,
    in_progress: counts.filter((c) => c.status === 'in_progress').length,
    planned: counts.filter((c) => c.status === 'planned').length,
    totalDivergences: counts.reduce((acc, c) => acc + c.divergences, 0),
    avgAccuracy:
      counts.filter((c) => c.status === 'completed' && c.totalItems > 0).length > 0
        ? Math.round(
            (counts
              .filter((c) => c.status === 'completed' && c.totalItems > 0)
              .reduce(
                (acc, c) => acc + ((c.totalItems - c.divergences) / c.totalItems) * 100,
                0,
              ) /
              counts.filter((c) => c.status === 'completed' && c.totalItems > 0).length) *
              10,
          ) / 10
        : null,
  }

  return { summary, counts }
}

export async function getSupplierReport(period: ReportPeriod) {
  const where: Record<string, unknown> = {}
  if (period.from || period.to) {
    where.createdAt = {
      ...(period.from ? { gte: new Date(period.from) } : {}),
      ...(period.to ? { lte: new Date(period.to) } : {}),
    }
  }

  const [bySupplier, suppliers] = await Promise.all([
    prisma.movement.groupBy({
      by: ['supplierId'],
      where: { ...where, supplierId: { not: null }, type: 'entry' },
      _sum: { quantity: true, totalValue: true },
      _count: { id: true },
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true, tradeName: true, cnpj: true, status: true },
    }),
  ])

  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s]))

  const items = bySupplier
    .filter((s) => s.supplierId)
    .map((s) => ({
      supplier: supplierMap[s.supplierId!] ?? { id: s.supplierId, name: 'Desconhecido' },
      entryCount: s._count.id,
      totalQuantity: s._sum.quantity ?? 0,
      totalValue: Math.round((s._sum.totalValue ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.totalValue - a.totalValue)

  const totalValue = items.reduce((acc, i) => acc + i.totalValue, 0)

  return {
    period: { from: period.from ?? null, to: period.to ?? null },
    summary: {
      totalSuppliers: items.length,
      totalEntries: items.reduce((acc, i) => acc + i.entryCount, 0),
      totalValue: Math.round(totalValue * 100) / 100,
    },
    suppliers: items,
  }
}

export async function getWarehouseReport() {
  const [addresses, byStatus] = await Promise.all([
    prisma.warehouseAddress.findMany({
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
      },
      orderBy: { code: 'asc' },
    }),
    prisma.warehouseAddress.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { capacity: true, occupied: true },
    }),
  ])

  const totalCapacity = addresses.reduce((acc, a) => acc + a.capacity, 0)
  const totalOccupied = addresses.reduce((acc, a) => acc + a.occupied, 0)

  return {
    summary: {
      total: addresses.length,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
      totalCapacity,
      totalOccupied,
      occupancyRate:
        totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
    },
    addresses,
  }
}
