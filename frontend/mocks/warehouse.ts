import type { WarehouseAddress } from '@/types/warehouse'

const aisles = ['A', 'B', 'C', 'D']
const streets = ['01', '02', '03', '04', '05']
const shelves = ['A', 'B', 'C']
const levels = ['01', '02', '03', '04']
const positions = ['01', '02', '03', '04', '05']

const products = [
  { id: '1', name: 'Cabo HDMI 2.0 2m', code: 'EL-0042' },
  { id: '2', name: 'Luva de Segurança CA', code: 'EP-0018' },
  { id: '4', name: 'Parafuso M8×50', code: 'FE-0203' },
  { id: '5', name: 'Fita Isolante 19mm', code: 'EL-0077' },
  { id: '6', name: 'Bateria 18650 3.7V', code: 'EL-0098' },
  { id: '7', name: 'Capacete Amarelo CA', code: 'EP-0031' },
  { id: '9', name: 'Embalagem Papelão', code: 'EM-0055' },
  { id: '11', name: 'Cabo PP 2×2.5mm²', code: 'EL-0034' },
  { id: '12', name: 'Óculos de Proteção CA', code: 'EP-0052' },
]

let productIndex = 0

export const mockAddresses: WarehouseAddress[] = aisles.flatMap(aisle =>
  streets.flatMap(street =>
    shelves.flatMap(shelf =>
      levels.flatMap(level =>
        positions.map(position => {
          const code = `${aisle}-${street}-${shelf}-${level}-${position}`
          const rand = Math.random()
          let status: WarehouseAddress['status'] = 'free'
          let productInfo: Partial<WarehouseAddress> = {}

          if (rand < 0.55) {
            status = 'occupied'
            const p = products[productIndex % products.length]
            productIndex++
            productInfo = {
              productId: p.id,
              productName: p.name,
              productCode: p.code,
              quantity: Math.floor(Math.random() * 200) + 10,
              occupied: Math.floor(Math.random() * 80) + 20,
            }
          } else if (rand < 0.65) {
            status = 'blocked'
          } else if (rand < 0.70) {
            status = 'reserved'
          }

          return {
            id: `addr-${code}`,
            code,
            aisle,
            street,
            shelf,
            level,
            position,
            status,
            capacity: 500,
            occupied: productInfo.occupied ?? 0,
            ...productInfo,
          }
        })
      )
    )
  )
)

export const warehouseStats = {
  totalPositions: mockAddresses.length,
  freePositions: mockAddresses.filter(a => a.status === 'free').length,
  occupiedPositions: mockAddresses.filter(a => a.status === 'occupied').length,
  blockedPositions: mockAddresses.filter(a => a.status === 'blocked').length,
  occupancyRate: Math.round((mockAddresses.filter(a => a.status === 'occupied').length / mockAddresses.length) * 100),
}
