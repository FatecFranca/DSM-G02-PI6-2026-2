export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number | string
  /** Roles allowed to see this entry; omitted = everyone. */
  roles?: ('admin' | 'supervisor' | 'operator' | 'viewer')[]
  /** Marks the entry whose badge shows the unread alerts count. */
  alertsBadge?: boolean
  children?: NavItem[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
      { label: 'Alertas', href: '/dashboard/alertas', icon: 'Bell', alertsBadge: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { label: 'Produtos', href: '/dashboard/produtos', icon: 'Package' },
      { label: 'Categorias', href: '/dashboard/categorias', icon: 'Tag' },
      { label: 'Marcas', href: '/dashboard/marcas', icon: 'Award' },
      { label: 'Fornecedores', href: '/dashboard/fornecedores', icon: 'Truck' },
      { label: 'Clientes', href: '/dashboard/clientes', icon: 'Users' },
    ],
  },
  {
    label: 'Movimentações',
    items: [
      { label: 'Entradas', href: '/dashboard/entradas', icon: 'ArrowDownToLine' },
      { label: 'Saídas', href: '/dashboard/saidas', icon: 'ArrowUpFromLine' },
      { label: 'Histórico', href: '/dashboard/movimentacoes', icon: 'History' },
      { label: 'Lotes', href: '/dashboard/lotes', icon: 'Layers' },
    ],
  },
  {
    label: 'WMS',
    items: [
      { label: 'Endereços', href: '/dashboard/enderecos', icon: 'MapPin' },
      { label: 'Inventário', href: '/dashboard/inventario', icon: 'ClipboardList' },
      { label: 'Scanner', href: '/dashboard/scanner', icon: 'ScanLine' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { label: 'IA — Produtos', href: '/dashboard/ia', icon: 'Sparkles' },
      { label: 'IA Analítica', href: '/dashboard/ia-analitica', icon: 'BrainCircuit' },
      { label: 'Relatórios', href: '/dashboard/relatorios', icon: 'FileBarChart' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Usuários', href: '/dashboard/usuarios', icon: 'UserCog', roles: ['admin', 'supervisor'] },
      { label: 'Auditoria', href: '/dashboard/auditoria', icon: 'ShieldCheck', roles: ['admin', 'supervisor'] },
      { label: 'Configurações', href: '/dashboard/configuracoes', icon: 'Settings' },
    ],
  },
]
