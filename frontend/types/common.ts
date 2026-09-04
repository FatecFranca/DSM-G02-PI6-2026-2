export type Status = 'active' | 'inactive' | 'pending' | 'blocked'
export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'table' | 'card'

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface SelectOption {
  label: string
  value: string
}

export interface Address {
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  zip: string
}
