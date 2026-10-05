export type MovementType = 'entry' | 'exit' | 'transfer' | 'loss' | 'adjustment' | 'inventory'
export type ExitReason = 'sale' | 'transfer' | 'loss' | 'break' | 'internal'

export interface MovementRecord {
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
  customerName?: string | null
  createdAt: string
  product: { id: string; name: string; internalCode: string }
  supplier?: { id: string; name: string } | null
  user: { id: string; name: string }
  fromAddress?: { id: string; code: string } | null
  toAddress?: { id: string; code: string } | null
}

export interface Movement {
  id: string
  type: MovementType
  productId: string
  productName: string
  productCode: string
  quantity: number
  unitCost: number
  totalValue: number
  fromAddress?: string
  toAddress?: string
  supplierId?: string
  supplierName?: string
  customerId?: string
  customerName?: string
  invoiceNumber?: string
  lotNumber?: string
  expirationDate?: string
  exitReason?: ExitReason
  notes?: string
  userId: string
  userName: string
  createdAt: string
}

export interface Lot {
  id: string
  lotNumber: string
  productId: string
  productName: string
  productCode: string
  quantity: number
  manufacturingDate: string
  expirationDate: string
  supplierId: string
  supplierName: string
  address: string
  status: 'valid' | 'expiring' | 'expired' | 'quarantine'
  createdAt: string
}

export interface InventoryCount {
  id: string
  name: string
  type: 'full' | 'partial' | 'cyclic'
  status: 'planned' | 'in_progress' | 'review' | 'completed'
  startDate: string
  endDate?: string
  totalItems: number
  countedItems: number
  divergences: number
  responsibleId: string
  responsibleName: string
  createdAt: string
}
