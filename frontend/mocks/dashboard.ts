export const dashboardStats = {
  totalProducts: 1_847,
  activeProducts: 1_623,
  outOfStock: 34,
  criticalStock: 87,
  totalStockValue: 4_382_914.50,
  pendingOrders: 23,
  expiringProducts: 12,
  todayEntries: 156,
  todayExits: 98,
  todayEntriesValue: 87_320.00,
  todayExitsValue: 134_500.00,
}

export const stockEvolutionData = [
  { month: 'Jan', entries: 4200, exits: 3800, balance: 400 },
  { month: 'Fev', entries: 3800, exits: 3200, balance: 600 },
  { month: 'Mar', entries: 5100, exits: 4700, balance: 400 },
  { month: 'Abr', entries: 4600, exits: 4100, balance: 500 },
  { month: 'Mai', entries: 5800, exits: 5200, balance: 600 },
  { month: 'Jun', entries: 6200, exits: 5600, balance: 600 },
  { month: 'Jul', entries: 5900, exits: 5100, balance: 800 },
  { month: 'Ago', entries: 6800, exits: 6200, balance: 600 },
  { month: 'Set', entries: 7100, exits: 6400, balance: 700 },
  { month: 'Out', entries: 6500, exits: 5900, balance: 600 },
  { month: 'Nov', entries: 7800, exits: 7100, balance: 700 },
  { month: 'Dez', entries: 8200, exits: 7400, balance: 800 },
]

export const categoryDistribution = [
  { name: 'Eletrônicos', value: 32, color: '#2563eb' },
  { name: 'Ferramentas', value: 21, color: '#7c3aed' },
  { name: 'Químicos', value: 14, color: '#059669' },
  { name: 'Embalagens', value: 11, color: '#d97706' },
  { name: 'EPI', value: 9, color: '#dc2626' },
  { name: 'Outros', value: 13, color: '#6b7280' },
]

export const topProducts = [
  { name: 'Cabo HDMI 2.0 2m', movements: 847, trend: 12 },
  { name: 'Luva de Segurança CA', movements: 723, trend: -3 },
  { name: 'Álcool 70% 1L', movements: 698, trend: 8 },
  { name: 'Parafuso Sextavado M8', movements: 541, trend: 5 },
  { name: 'Fita Isolante 19mm', movements: 489, trend: -1 },
  { name: 'Bateria 18650 3.7V', movements: 412, trend: 21 },
]

export const recentMovements = [
  { id: '1', type: 'entry', product: 'Cabo HDMI 2.0 2m', code: 'EL-0042', qty: 50, value: 1_750, user: 'Carlos Silva', time: '14:32', date: '30/06/2026' },
  { id: '2', type: 'exit', product: 'Luva de Segurança CA', code: 'EP-0018', qty: 24, value: 360, user: 'Ana Lima', time: '14:15', date: '30/06/2026' },
  { id: '3', type: 'entry', product: 'Álcool 70% 1L', code: 'QM-0091', qty: 200, value: 3_800, user: 'Rafael Costa', time: '13:48', date: '30/06/2026' },
  { id: '4', type: 'transfer', product: 'Parafuso M8 × 50', code: 'FE-0203', qty: 500, value: 250, user: 'Juliana Martins', time: '12:30', date: '30/06/2026' },
  { id: '5', type: 'exit', product: 'Fita Isolante 19mm', code: 'EL-0077', qty: 36, value: 216, user: 'Carlos Silva', time: '11:55', date: '30/06/2026' },
  { id: '6', type: 'loss', product: 'Lâmpada LED 9W', code: 'EL-0112', qty: 3, value: 45, user: 'Rafael Costa', time: '11:20', date: '30/06/2026' },
  { id: '7', type: 'entry', product: 'Bateria 18650 3.7V', code: 'EL-0098', qty: 120, value: 5_040, user: 'Ana Lima', time: '10:45', date: '30/06/2026' },
  { id: '8', type: 'exit', product: 'Capacete Amarelo CA', code: 'EP-0031', qty: 10, value: 890, user: 'Juliana Martins', time: '09:30', date: '30/06/2026' },
]

export const heatmapData = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => ({
    day,
    hour,
    value: Math.random() > 0.3 ? Math.floor(Math.random() * 100) : 0,
  }))
).flat()

export const abcData = [
  { class: 'A', products: 184, revenue: 3_506_331.60, percent: 80 },
  { class: 'B', products: 554, revenue: 877_582.90,   percent: 20.02 },
  { class: 'C', products: 1109, revenue: 87_657.80, percent: 2.0 },
]

export const alerts = [
  { id: '1', type: 'critical', title: 'Estoque zerado: Cabo HDMI Premium', time: '10min', read: false },
  { id: '2', type: 'warning', title: 'Estoque crítico: Luva CA nível 3 (8un)', time: '34min', read: false },
  { id: '3', type: 'warning', title: '3 produtos vencendo em 7 dias', time: '1h', read: false },
  { id: '4', type: 'info', title: 'Inventário #INV-2026-06 concluído', time: '2h', read: true },
  { id: '5', type: 'critical', title: 'Divergência detectada: Álcool 70% (−15un)', time: '3h', read: false },
]
