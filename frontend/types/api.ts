/** Shapes returned by the StockIQ backend (see /docs on the API for the full OpenAPI spec). */
import type { UserRole } from './user'

export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Ref { id: string; name: string }

export interface ApiCategory { id: string; name: string; slug: string; color: string; createdAt: string; _count: { products: number } }
export interface ApiBrand { id: string; name: string; slug: string; logoUrl?: string | null; createdAt: string; _count: { products: number } }

export type StockStatus = 'ok' | 'low' | 'critical' | 'out'

export interface ApiProduct {
  id: string
  name: string
  internalCode: string
  sku: string
  barcode: string
  unit: string
  weight: number
  width: number
  height: number
  depth: number
  description?: string | null
  purchasePrice: number
  salePrice: number
  minStock: number
  maxStock: number
  currentStock: number
  status: 'active' | 'inactive' | 'discontinued'
  stockStatus: StockStatus
  imageUrl?: string | null
  categoryId: string
  brandId: string
  supplierId: string
  category: Ref
  brand: Ref
  supplier: Ref
  createdAt: string
  updatedAt: string
}

export interface ApiScanProduct extends ApiProduct {
  warehouseAddresses: { id: string; code: string; quantity: number | null; lotNumber: string | null }[]
  lots: { id: string; lotNumber: string; quantity: number; expirationDate: string; status: string }[]
}

export type MovementType = 'entry' | 'exit' | 'transfer' | 'loss' | 'adjustment' | 'inventory'
export type ExitReason = 'sale' | 'transfer' | 'loss' | 'break' | 'internal'

export interface ApiMovement {
  id: string
  type: MovementType
  quantity: number
  unitCost: number
  totalValue: number
  invoiceNumber?: string | null
  lotNumber?: string | null
  expirationDate?: string | null
  exitReason?: ExitReason | null
  notes?: string | null
  customerId?: string | null
  customerName?: string | null
  createdAt: string
  product: { id: string; name: string; internalCode: string }
  supplier?: Ref | null
  user: Ref
  fromAddress?: { id: string; code: string } | null
  toAddress?: { id: string; code: string } | null
}

export type LotStatus = 'valid' | 'expiring' | 'expired' | 'quarantine'

export interface ApiLot {
  id: string
  lotNumber: string
  quantity: number
  manufacturingDate: string
  expirationDate: string
  address: string
  status: LotStatus
  productId: string
  supplierId: string
  product: { id: string; name: string; internalCode: string }
  supplier: Ref
}

export interface ApiInventoryCount {
  id: string
  name: string
  type: 'full' | 'partial' | 'cyclic'
  status: 'planned' | 'in_progress' | 'review' | 'completed'
  startDate: string
  endDate?: string | null
  totalItems: number
  countedItems: number
  divergences: number
  responsible: Ref
}

export type PositionStatus = 'free' | 'occupied' | 'blocked' | 'reserved'

export interface ApiAddress {
  id: string
  code: string
  aisle: string
  street: string
  shelf: string
  level: string
  position: string
  status: PositionStatus
  capacity: number
  occupied: number
  lotNumber?: string | null
  quantity?: number | null
  product?: { id: string; name: string; internalCode: string } | null
}

export interface ApiWarehouseStats {
  totalPositions: number
  freePositions: number
  occupiedPositions: number
  blockedPositions: number
  reservedPositions: number
  occupancyRate: number
}

export interface ApiAuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  entityName: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ip: string
  createdAt: string
  user: { id: string; name: string; role: UserRole }
}

export interface ApiAlert {
  id: string
  type: 'critical' | 'warning' | 'info'
  category: 'stock' | 'expiry'
  title: string
  desc: string
  read: boolean
  createdAt: string
}
export interface ApiAlerts { alerts: ApiAlert[]; total: number; unread: number }

export interface ApiDashboard {
  products: { total: number; active: number; lowStock: number; outStock: number }
  movements: {
    today: number
    todayEntries: { count: number; value: number }
    todayExits: { count: number; value: number }
  }
  users: { active: number }
  lots: { total: number; expiringSoon: number; validPercentage: number }
  inventory: { pendingCounts: number; accuracy: number | null }
  warehouse: { total: number; free: number; occupied: number; blocked: number; occupancyRate: number }
  stock: { totalPurchaseValue: number; totalSaleValue: number }
  recentMovements: ApiMovement[]
}

export interface ApiTrendPoint { month: string; entries: number; exits: number; balance: number }
export interface ApiCategoryDistribution { id: string; name: string; color: string; productCount: number; percentage: number; stockValue: number }
export interface ApiTopProduct {
  product: { id: string; name: string; internalCode: string; currentStock: number; salePrice: number }
  movementCount: number
  totalQuantity: number
  totalValue: number
  trend: number
}
export interface ApiHeatCell { day: number; hour: number; value: number }
export interface ApiAbcItem {
  class: 'A' | 'B' | 'C'
  product: { id: string; name: string; internalCode: string; currentStock: number }
  totalValue: number
  accumulatedPercentage: number
}
export interface ApiAbcStat { count: number; percentage: number; value: number }
export interface ApiAbcCurve {
  A: ApiAbcItem[]
  B: ApiAbcItem[]
  C: ApiAbcItem[]
  summary: { totalValue: number; classA: ApiAbcStat; classB: ApiAbcStat; classC: ApiAbcStat }
}

export interface ApiMovementReport {
  totals: { count: number; quantity: number; value: number }
  byType: { type: MovementType; count: number; quantity: number; value: number }[]
  topProducts: { product: { id: string; name: string; internalCode: string; unit: string }; count: number; quantity: number; value: number }[]
}
export interface ApiStockReport {
  summary: { total: number; out: number; critical: number; low: number; ok: number; totalStockValue: number; totalSaleValue: number }
  products: (ApiProduct & { stockValue: number; saleValue: number })[]
}
export interface ApiLotReport {
  windowDays: number
  summary: { expired: number; expiringSoon: number; valid: number; quarantine: number }
  expired: ApiLot[]
  expiringSoon: ApiLot[]
  quarantine: ApiLot[]
}
export interface ApiInventoryReport {
  summary: { total: number; completed: number; in_progress: number; planned: number; totalDivergences: number; avgAccuracy: number | null }
  counts: ApiInventoryCount[]
}
export interface ApiSupplierReport {
  summary: { totalSuppliers: number; totalEntries: number; totalValue: number }
  suppliers: { supplier: { id: string; name: string; tradeName: string }; entryCount: number; totalQuantity: number; totalValue: number }[]
}

export interface ApiAnalytics {
  window: { historyMonths: number; forecastMonths: number }
  demand: { month: string; real: number | null; forecast: number }[]
  matrix: { productId: string; product: string; code: string; abc: 'A' | 'B' | 'C'; xyz: 'X' | 'Y' | 'Z'; turnover: number; valueShare: number }[]
  suggestions: {
    productId: string
    product: string
    code: string
    category: string
    currentStock: number
    daysOfCover: number | null
    quantity: number
    urgency: 'Urgente' | 'Alta' | 'Média'
    reason: string
    estimatedCost: number
  }[]
  insights: { type: 'warning' | 'success' | 'info'; title: string; desc: string; action: string; href: string }[]
}

export interface ApiCustomer {
  id: string
  name: string
  tradeName: string
  cnpj: string
  email: string
  phone?: string | null
  contactName?: string | null
  city: string
  state: string
  status: 'active' | 'inactive'
}

export interface ApiSupplier {
  id: string
  name: string
  tradeName: string
  cnpj: string
  email: string
  phone: string
  contactName: string
  category: string
  status: 'active' | 'inactive'
  city: string
  state: string
  _count?: { products: number }
}
