export type UserRole = 'admin' | 'supervisor' | 'operator' | 'viewer'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  department: string
  status: 'active' | 'inactive' | 'pending'
  lastLogin?: string
  createdAt: string
}
