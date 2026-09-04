import { prisma } from '../prisma/client'

export async function getStockAlerts() {
  const [outOfStock, critical, low] = await Promise.all([
    prisma.product.findMany({
      where: { currentStock: 0, status: 'active' },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: {
        status: 'active',
        currentStock: { gt: 0 },
        AND: [{ minStock: { gt: 0 } }],
      },
      include: {
        category: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { currentStock: 'asc' },
    }),
    prisma.product.findMany({
      where: { status: 'active', currentStock: { gt: 0 }, minStock: { gt: 0 } },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { currentStock: 'asc' },
    }),
  ])

  const criticalFiltered = critical.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStock * 0.5,
  )
  const lowFiltered = low.filter(
    (p) => p.currentStock > p.minStock * 0.5 && p.currentStock <= p.minStock,
  )

  return {
    outOfStock: { count: outOfStock.length, items: outOfStock },
    critical: { count: criticalFiltered.length, items: criticalFiltered },
    low: { count: lowFiltered.length, items: lowFiltered },
    totalAlerts: outOfStock.length + criticalFiltered.length + lowFiltered.length,
  }
}

export async function getExpiringLots(days = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  return prisma.lot.findMany({
    where: {
      expirationDate: { lte: cutoff, gte: new Date() },
      status: { in: ['valid', 'expiring'] },
    },
    include: {
      product: { select: { id: true, name: true, internalCode: true } },
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { expirationDate: 'asc' },
  })
}

export async function getAllAlerts(userId: string, days = 30) {
  const now = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + days)

  const [outOfStock, criticalStock, lowStock, expiringLots, expiredLots, readKeys] =
    await Promise.all([
      prisma.product.findMany({
        where: { currentStock: 0, status: 'active' },
        select: { id: true, name: true, internalCode: true, minStock: true, currentStock: true },
      }),
      prisma.product.findMany({
        where: { status: 'active', currentStock: { gt: 0 }, minStock: { gt: 0 } },
        select: { id: true, name: true, internalCode: true, minStock: true, currentStock: true },
      }),
      prisma.product.findMany({
        where: { status: 'active', currentStock: { gt: 0 }, minStock: { gt: 0 } },
        select: { id: true, name: true, internalCode: true, minStock: true, currentStock: true },
      }),
      prisma.lot.findMany({
        where: {
          expirationDate: { gte: now, lte: cutoff },
          status: { in: ['valid', 'expiring'] },
        },
        select: {
          id: true,
          lotNumber: true,
          expirationDate: true,
          quantity: true,
          product: { select: { id: true, name: true, internalCode: true } },
        },
      }),
      prisma.lot.findMany({
        where: { expirationDate: { lt: now }, status: { not: 'quarantine' } },
        select: {
          id: true,
          lotNumber: true,
          expirationDate: true,
          quantity: true,
          product: { select: { id: true, name: true, internalCode: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        select: { alertKey: true },
      }),
    ])

  const readSet = new Set(readKeys.map((n) => n.alertKey))

  const criticalFiltered = criticalStock.filter(
    (p) => p.currentStock > 0 && p.currentStock <= p.minStock * 0.5,
  )
  const lowFiltered = lowStock.filter(
    (p) => p.currentStock > p.minStock * 0.5 && p.currentStock <= p.minStock,
  )

  const alerts: {
    id: string
    type: 'critical' | 'warning' | 'info'
    category: 'stock' | 'expiry'
    title: string
    desc: string
    read: boolean
    createdAt: string
  }[] = []

  outOfStock.forEach((p) => {
    const key = `stock-out-${p.id}`
    alerts.push({
      id: key,
      type: 'critical',
      category: 'stock',
      title: `Estoque zerado: ${p.name}`,
      desc: `O produto ${p.internalCode} atingiu zero unidades em estoque.`,
      read: readSet.has(key),
      createdAt: now.toISOString(),
    })
  })

  criticalFiltered.forEach((p) => {
    const key = `stock-critical-${p.id}`
    alerts.push({
      id: key,
      type: 'critical',
      category: 'stock',
      title: `Estoque crítico: ${p.name} (${p.currentStock} un)`,
      desc: `${p.internalCode} está abaixo de 50% do estoque mínimo de ${p.minStock} unidades.`,
      read: readSet.has(key),
      createdAt: now.toISOString(),
    })
  })

  lowFiltered.forEach((p) => {
    const key = `stock-low-${p.id}`
    alerts.push({
      id: key,
      type: 'warning',
      category: 'stock',
      title: `Estoque baixo: ${p.name} (${p.currentStock} un)`,
      desc: `${p.internalCode} está abaixo do estoque mínimo de ${p.minStock} unidades.`,
      read: readSet.has(key),
      createdAt: now.toISOString(),
    })
  })

  expiredLots.forEach((l) => {
    const key = `lot-expired-${l.id}`
    alerts.push({
      id: key,
      type: 'critical',
      category: 'expiry',
      title: `Lote VENCIDO: ${l.lotNumber}`,
      desc: `${l.product.name} — lote venceu em ${l.expirationDate.toLocaleDateString('pt-BR')}. Aguarda descarte.`,
      read: readSet.has(key),
      createdAt: now.toISOString(),
    })
  })

  expiringLots.forEach((l) => {
    const daysLeft = Math.ceil(
      (l.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const key = `lot-expiring-${l.id}`
    alerts.push({
      id: key,
      type: 'warning',
      category: 'expiry',
      title: `Lote vencendo: ${l.lotNumber} em ${daysLeft} dias`,
      desc: `${l.quantity} unidades do ${l.product.name} vencem em ${l.expirationDate.toLocaleDateString('pt-BR')}.`,
      read: readSet.has(key),
      createdAt: now.toISOString(),
    })
  })

  return {
    alerts,
    total: alerts.length,
    unread: alerts.filter((a) => !a.read).length,
  }
}

export async function markAlertAsRead(userId: string, alertKey: string) {
  return prisma.notification.upsert({
    where: { alertKey_userId: { alertKey, userId } },
    create: { alertKey, userId },
    update: { readAt: new Date() },
  })
}

export async function markAllAlertsAsRead(userId: string, alertKeys: string[]) {
  const ops = alertKeys.map((alertKey) =>
    prisma.notification.upsert({
      where: { alertKey_userId: { alertKey, userId } },
      create: { alertKey, userId },
      update: { readAt: new Date() },
    }),
  )
  await Promise.all(ops)
  return { marked: alertKeys.length }
}
