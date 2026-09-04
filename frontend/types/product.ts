export type ProductStatus = 'active' | 'inactive' | 'discontinued'
export type StockStatus = 'ok' | 'low' | 'critical' | 'out'

export interface Category {
  id: string
  name: string
  slug: string
  color: string
  productCount: number
  createdAt: string
}

export interface Brand {
  id: string
  name: string
  slug: string
  logoUrl?: string
  productCount: number
  createdAt: string
}

export interface Supplier {
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
  createdAt: string
}

export interface Product {
  id: string
  name: string
  internalCode: string
  sku: string
  barcode: string
  categoryId: string
  categoryName: string
  brandId: string
  brandName: string
  unit: string
  weight: number
  dimensions: { width: number; height: number; depth: number }
  description: string
  purchasePrice: number
  salePrice: number
  supplierId: string
  supplierName: string
  minStock: number
  maxStock: number
  currentStock: number
  status: ProductStatus
  stockStatus: StockStatus
  imageUrl?: string
  createdAt: string
  updatedAt: string
}
