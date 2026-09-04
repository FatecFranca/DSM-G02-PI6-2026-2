import type { User, AuditLog } from '@/types/user'

export const mockUsers: User[] = [
  { id: 'u1', name: 'Carlos Silva', email: 'carlos.silva@empresa.com.br', role: 'admin', department: 'TI', status: 'active', lastLogin: '2026-06-30T14:20:00', createdAt: '2024-01-10' },
  { id: 'u2', name: 'Ana Lima', email: 'ana.lima@empresa.com.br', role: 'supervisor', department: 'Logística', status: 'active', lastLogin: '2026-06-30T14:15:00', createdAt: '2024-02-15' },
  { id: 'u3', name: 'Rafael Costa', email: 'rafael.costa@empresa.com.br', role: 'operator', department: 'Almoxarifado', status: 'active', lastLogin: '2026-06-30T13:48:00', createdAt: '2024-03-01' },
  { id: 'u4', name: 'Juliana Martins', email: 'juliana.martins@empresa.com.br', role: 'operator', department: 'Expedição', status: 'active', lastLogin: '2026-06-30T12:30:00', createdAt: '2024-03-15' },
  { id: 'u5', name: 'Roberto Pereira', email: 'roberto.pereira@empresa.com.br', role: 'viewer', department: 'Financeiro', status: 'active', lastLogin: '2026-06-29T17:00:00', createdAt: '2024-04-01' },
  { id: 'u6', name: 'Fernanda Souza', email: 'fernanda.souza@empresa.com.br', role: 'operator', department: 'Compras', status: 'inactive', lastLogin: '2026-05-15T09:00:00', createdAt: '2024-05-20' },
]

export const mockAuditLogs: AuditLog[] = [
  { id: 'a1', action: 'UPDATE', entity: 'Product', entityId: '3', entityName: 'Álcool 70% 1L', oldValue: { currentStock: 200 }, newValue: { currentStock: 0 }, userId: 'u3', userName: 'Rafael Costa', userRole: 'operator', ip: '192.168.1.45', createdAt: '2026-06-30T13:48:00' },
  { id: 'a2', action: 'CREATE', entity: 'Movement', entityId: 'm7', entityName: 'Entrada — Bateria 18650 3.7V', oldValue: undefined, newValue: { qty: 120, value: 3360 }, userId: 'u2', userName: 'Ana Lima', userRole: 'supervisor', ip: '192.168.1.22', createdAt: '2026-06-30T10:45:00' },
  { id: 'a3', action: 'UPDATE', entity: 'Supplier', entityId: 's7', entityName: 'SafeStock Com.', oldValue: { status: 'active' }, newValue: { status: 'inactive' }, userId: 'u1', userName: 'Carlos Silva', userRole: 'admin', ip: '192.168.1.10', createdAt: '2026-06-29T16:30:00' },
  { id: 'a4', action: 'DELETE', entity: 'Category', entityId: 'c9', entityName: 'Importados', oldValue: { name: 'Importados' }, newValue: undefined, userId: 'u1', userName: 'Carlos Silva', userRole: 'admin', ip: '192.168.1.10', createdAt: '2026-06-28T11:00:00' },
  { id: 'a5', action: 'UPDATE', entity: 'Product', entityId: '8', entityName: 'Lâmpada LED 9W', oldValue: { salePrice: 19.90 }, newValue: { salePrice: 22.90 }, userId: 'u2', userName: 'Ana Lima', userRole: 'supervisor', ip: '192.168.1.22', createdAt: '2026-06-27T09:15:00' },
  { id: 'a6', action: 'CREATE', entity: 'User', entityId: 'u6', entityName: 'Fernanda Souza', oldValue: undefined, newValue: { role: 'operator', department: 'Compras' }, userId: 'u1', userName: 'Carlos Silva', userRole: 'admin', ip: '192.168.1.10', createdAt: '2026-05-20T14:00:00' },
]

export const currentUser = mockUsers[0]
