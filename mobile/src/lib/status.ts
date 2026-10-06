export const STOCK_STATUS_LABELS: Record<string, string> = {
  ok: 'Em Estoque',
  low: 'Estoque Baixo',
  critical: 'Crítico',
  out: 'Sem Estoque',
}

export const STOCK_STATUS_COLORS: Record<string, string> = {
  ok: 'success',
  low: 'warning',
  critical: 'danger',
  out: 'danger',
}

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  discontinued: 'Descontinuado',
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  transfer: 'Transferência',
  loss: 'Perda',
  adjustment: 'Ajuste',
  inventory: 'Inventário',
}

export const MOVEMENT_TYPE_COLORS: Record<string, string> = {
  entry: 'success',
  exit: 'info',
  transfer: 'warning',
  loss: 'danger',
  adjustment: 'secondary',
  inventory: 'brand',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operator: 'Operador',
  viewer: 'Visualizador',
}

export const POSITION_STATUS_LABELS: Record<string, string> = {
  free: 'Livre',
  occupied: 'Ocupado',
  blocked: 'Bloqueado',
  reserved: 'Reservado',
}

export const LOT_STATUS_LABELS: Record<string, string> = {
  valid: 'Válido',
  expiring: 'Vencendo',
  expired: 'Vencido',
  quarantine: 'Quarentena',
}

export const EXIT_REASON_LABELS: Record<string, string> = {
  sale: 'Venda',
  transfer: 'Transferência',
  loss: 'Perda',
  break: 'Quebra',
  internal: 'Consumo Interno',
}
