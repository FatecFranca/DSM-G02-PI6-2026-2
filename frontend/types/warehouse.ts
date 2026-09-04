export type PositionStatus = 'free' | 'occupied' | 'blocked' | 'reserved'

export interface WarehouseAddress {
  id: string
  code: string          // e.g. A-01-03-B-05
  aisle: string
  street: string
  shelf: string
  level: string
  position: string
  status: PositionStatus
  capacity: number      // in kg or units
  occupied: number
  productId?: string
  productName?: string
  productCode?: string
  quantity?: number
  lotNumber?: string
}

export interface WarehouseStats {
  totalPositions: number
  freePositions: number
  occupiedPositions: number
  blockedPositions: number
  occupancyRate: number
}
