import type { UserRole } from '@/types/user'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operator: 'Operador',
  viewer: 'Visualizador',
}

export const STAFF: UserRole[] = ['admin', 'supervisor']
export const WRITERS: UserRole[] = ['admin', 'supervisor', 'operator']
export const ADMIN: UserRole[] = ['admin']

export function hasRole(role: UserRole | undefined, allowed: UserRole[]): boolean {
  return !!role && allowed.includes(role)
}
