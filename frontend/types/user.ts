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

export interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  entityName: string
  oldValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  userId: string
  userName: string
  userRole: UserRole
  ip: string
  createdAt: string
}
