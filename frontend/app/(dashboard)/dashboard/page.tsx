'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Package, AlertTriangle, TrendingUp, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, DollarSign, Clock,
  MoreHorizontal, ExternalLink, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { api } from '@/lib/api'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const movTypeConfig = {
  entry:    { label: 'Entrada',       color: 'success' as const, bg: 'bg-[color:var(--success-subtle)]', icon: ArrowDownToLine },
  exit:     { label: 'Saída',         color: 'info' as const,    bg: 'bg-[color:var(--info-subtle)]',    icon: ArrowUpFromLine },
  transfer: { label: 'Transferência', color: 'warning' as const, bg: 'bg-[color:var(--warning-subtle)]', icon: RefreshCw },
  loss:     { label: 'Perda',         color: 'danger' as const,  bg: 'bg-[color:var(--danger-subtle)]',  icon: AlertTriangle },
  adjustment:{ label: 'Ajuste',       color: 'default' as const, bg: 'bg-[color:var(--bg-muted)]',       icon: RefreshCw },
  inventory:{ label: 'Inventário',    color: 'brand' as const,   bg: 'bg-[color:var(--brand-subtle)]',   icon: Package },
}

const CHART_TABS = [
  { id: 'evolution', label: 'Evolução' },
  { id: 'abc', label: 'Curva ABC' },
  { id: 'categories', label: 'Categorias' },
]

export default function DashboardPage() {
  const [chartTab, setChartTab] = useState('evolution')
  const [data, setData] = useState<{
    summary: {
      products: { total: number; active: number; lowStock: number; outStock: number }
      movements: { today: number }
      users: { active: number }
      warehouse: { total: number; free: number; occupied: number; occupancyRate: number }
      stock: { totalPurchaseValue: number; totalSaleValue: number }
      recentMovements: Array<{
        id: string; type: keyof typeof movTypeConfig; quantity: number; totalValue: number; createdAt: string
        product: { id: string; name: string; internalCode: string }
        user: { id: string; name: string }
      }>
    }
    trend: Array<{ month: string; entries: number; exits: number; balance: number }>
    categories: Array<{ name: string; percentage: number; color: string; productCount: number; stockValue: number }>
    topProducts: Array<{ product: { id: string; name: string } | null; movementCount: number; totalValue: number }>
    abc: { A: Array<{ totalValue: number }>; B: Array<{ totalValue: number }>; C: Array<{ totalValue: number }> }
    inventoryAccuracy: number | null
    expiringLots: number
  } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    Promise.all([
      api.get<NonNullable<typeof data>['summary']>('/dashboard'),
      api.get<Array<{ month: string; entries: number; exits: number; balance: number }>>('/dashboard/movement-trend', { months: 12 }),
      api.get<Array<{ name: string; percentage: number; color: string; productCount: number; stockValue: number }>>('/dashboard/category-distribution'),
      api.get<Array<{ product: { id: string; name: string } | null; movementCount: number; totalValue: number }>>('/dashboard/top-products', { limit: 5 }),
      api.get<{ A: Array<{ totalValue: number }>; B: Array<{ totalValue: number }>; C: Array<{ totalValue: number }> }>('/dashboard/abc'),
      api.get<{ summary: { avgAccuracy: number | null } }>('/reports/inventory'),
      api.get<{ summary: { expiringSoon: number } }>('/reports/lots', { days: 30 }),
    ]).then(([summary, trend, categories, topProducts, abc, inventory, lots]) => {
      if (!active) return
      setData({ summary, trend, categories, topProducts, abc, inventoryAccuracy: inventory.summary.avgAccuracy, expiringLots: lots.summary.expiringSoon })
      setLoadError('')
    }).catch((err: unknown) => {
      if (active) setLoadError(err instanceof Error ? err.message : 'Falha ao carregar o dashboard')
    })
    return () => { active = false }
  }, [refresh])

  const stats = {
    totalProducts: data?.summary.products.total ?? 0,
    activeProducts: data?.summary.products.active ?? 0,
    outOfStock: data?.summary.products.outStock ?? 0,
    criticalStock: data?.summary.products.lowStock ?? 0,
    totalStockValue: data?.summary.stock.totalPurchaseValue ?? 0,
    movementsToday: data?.summary.movements.today ?? 0,
    activeUsers: data?.summary.users.active ?? 0,
    warehouseOccupancyRate: data?.summary.warehouse.occupancyRate ?? 0,
    freePositions: data?.summary.warehouse.free ?? 0,
    expiringLots: data?.expiringLots ?? 0,
  }
  const trendData = data?.trend ?? []
  const categoryData = data?.categories.map((item) => ({ name: item.name, value: item.percentage, color: item.color })) ?? []
  const abcData = (['A', 'B', 'C'] as const).map((label) => {
    const items = data?.abc[label] ?? []
    const value = items.reduce((total, item) => total + item.totalValue, 0)
    const total = (data?.abc.A ?? []).concat(data?.abc.B ?? [], data?.abc.C ?? []).reduce((sum, item) => sum + item.totalValue, 0)
    return { class: label, percent: total > 0 ? Math.round((value / total) * 100) : 0, revenue: value, products: items.length }
  })
  const topProducts = data?.topProducts.map((item) => ({ name: item.product?.name ?? 'Produto removido', movements: item.movementCount, trend: 0 })) ?? []
  const recentMovements = data?.summary.recentMovements ?? []
  const stockHealth = [
    { label: 'Ocupação do Galpão', value: stats.warehouseOccupancyRate, suffix: '%', color: '#2563eb', progress: true },
    { label: 'Produtos Ativos', value: stats.totalProducts ? Math.round((stats.activeProducts / stats.totalProducts) * 100) : 0, suffix: '%', color: '#059669', progress: true },
    { label: 'Lotes vencendo em 30 dias', value: stats.expiringLots, suffix: '', color: '#0891b2', progress: false },
    { label: 'Acuracidade de Inventário', value: data?.inventoryAccuracy, suffix: '%', color: '#7c3aed', progress: true },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Dados atuais</p>
        </div>
        {loadError && <p role="alert" className="text-sm text-[color:var(--danger)]">{loadError}</p>}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => setRefresh((current) => current + 1)}>
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total de Produtos"
          value={formatNumber(stats.totalProducts)}
          sub="cadastrados"
          icon={<Package className="w-4 h-4" />}
        />
        <StatCard
          label="Produtos Ativos"
          value={formatNumber(stats.activeProducts)}
          sub={`${stats.totalProducts ? Math.round(stats.activeProducts / stats.totalProducts * 100) : 0}% do total`}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
        <StatCard
          label="Sem Estoque"
          value={stats.outOfStock}
          sub="produtos zerados"
          icon={<AlertTriangle className="w-4 h-4" />}
          variant="danger"
        />
        <StatCard
          label="Estoque Crítico"
          value={stats.criticalStock}
          sub="abaixo do mínimo"
          icon={<TrendingDown className="w-4 h-4" />}
          variant="warning"
        />
        <StatCard
          label="Valor do Estoque"
          value={formatCurrency(stats.totalStockValue)}
          sub="estoque total"
          icon={<DollarSign className="w-4 h-4" />}
          variant="info"
          className="col-span-2 lg:col-span-1 xl:col-span-1"
        />
      </div>

      {/* Today's activity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Movimentações hoje', value: stats.movementsToday, sub: 'registros', icon: RefreshCw, color: 'text-[color:var(--brand)]', bg: 'bg-[color:var(--brand-subtle)]' },
          { label: 'Usuários ativos', value: stats.activeUsers, sub: 'contas habilitadas', icon: Clock, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
          { label: 'Ocupação do galpão', value: `${stats.warehouseOccupancyRate}%`, sub: 'posições ocupadas', icon: Package, color: 'text-[color:var(--info)]', bg: 'bg-[color:var(--info-subtle)]' },
          { label: 'Posições livres', value: stats.freePositions, sub: 'disponíveis', icon: AlertTriangle, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
        ].map(s => (
          <div key={s.label} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3 shadow-[var(--shadow-sm)]">
            <div className={cn('w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0', s.bg)}>
              <s.icon className={cn('w-5 h-5', s.color)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-[color:var(--text-tertiary)] uppercase tracking-wide truncate">{s.label}</p>
              <p className="text-xl font-bold text-[color:var(--text-primary)] leading-none mt-0.5">{s.value}</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Main chart */}
        <Card padding={false} className="xl:col-span-2">
          <CardHeader className="p-5 pb-0">
            <CardTitle description="Movimentações nos últimos 12 meses">Análise de Estoque</CardTitle>
            <Tabs tabs={CHART_TABS} active={chartTab} onChange={setChartTab} />
          </CardHeader>
          <div className="p-5 pt-4 h-[280px]">
            {chartTab === 'evolution' && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [formatNumber(Number(value ?? 0)), name === 'entries' ? 'Entradas' : 'Saídas']}
                    contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                  />
                  <Legend formatter={(v) => v === 'entries' ? 'Entradas' : 'Saídas'} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="entries" stroke="#2563eb" strokeWidth={2} fill="url(#colorEntries)" dot={false} activeDot={{ r: 4 }} />
                  <Area type="monotone" dataKey="exits" stroke="#0891b2" strokeWidth={2} fill="url(#colorExits)" dot={false} activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            {chartTab === 'abc' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={abcData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="class" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0)}%`, 'Participação']}
                    contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                  />
                  <Bar dataKey="percent" radius={[4, 4, 0, 0]}>
                    {abcData.map((_, i) => (
                      <Cell key={i} fill={['#2563eb', '#0891b2', '#94a3b8'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            {chartTab === 'categories' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0)}%`, 'Participação']}
                    contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle description="Por movimentação">Mais Movimentados</CardTitle>
            <Link href="/dashboard/movimentacoes">
              <Button variant="ghost" size="xs" rightIcon={<ExternalLink className="w-3 h-3" />}>Ver tudo</Button>
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[color:var(--text-tertiary)] w-4 flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">{p.name}</p>
                  <div className="mt-1 h-1.5 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--brand)] rounded-full"
                      style={{ width: `${topProducts[0]?.movements ? (p.movements / topProducts[0].movements) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatNumber(p.movements)}</p>
                  <p className="text-[10px] font-medium text-[color:var(--text-tertiary)]">movimentos</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent movements */}
      <Card padding={false}>
        <CardHeader className="p-5 pb-0">
          <CardTitle description="Últimas movimentações do dia">Atividade Recente</CardTitle>
          <Link href="/dashboard/movimentacoes">
            <Button variant="ghost" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>Ver histórico</Button>
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm mt-2">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Tipo', 'Produto', 'Código', 'Qtd', 'Valor', 'Usuário', 'Horário', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentMovements.map(mov => {
                const cfg = movTypeConfig[mov.type as keyof typeof movTypeConfig]
                const Icon = cfg.icon
                return (
                  <tr key={mov.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', cfg.bg)}>
                          <Icon className="w-3.5 h-3.5" style={{ color: `var(--${cfg.color === 'brand' ? 'brand' : cfg.color})` }} />
                        </div>
                        <Badge variant={cfg.color} size="sm">{cfg.label}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">{mov.product.name}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-[color:var(--text-tertiary)]">{mov.product.internalCode}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-[color:var(--text-primary)]">{mov.quantity}</span>
                      <span className="text-[color:var(--text-tertiary)] ml-1 text-xs">un</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-[color:var(--text-primary)]">{formatCurrency(mov.totalValue)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[color:var(--text-secondary)]">{mov.user.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs">
                        <p className="font-medium text-[color:var(--text-primary)]">{formatDateTime(mov.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ABC Table */}
        <Card>
          <CardHeader>
            <CardTitle description="Classificação de valor">Curva ABC</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {abcData.map(item => (
              <div key={item.class} className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)]">
                <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center font-bold text-sm text-white flex-shrink-0',
                  item.class === 'A' ? 'bg-[color:var(--brand)]'
                  : item.class === 'B' ? 'bg-[color:var(--info)]'
                  : 'bg-[color:var(--text-tertiary)]'
                )}>
                  {item.class}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatCurrency(item.revenue)}</p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">{item.products} produtos · {item.percent}% receita</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Nova Entrada', href: '/dashboard/entradas', icon: ArrowDownToLine },
              { label: 'Nova Saída', href: '/dashboard/saidas', icon: ArrowUpFromLine },
              { label: 'Cad. Produto', href: '/dashboard/produtos/novo', icon: Package },
              { label: 'Scanner', href: '/dashboard/scanner', icon: TrendingUp },
            ].map(a => (
              <Link key={a.label} href={a.href}>
                <div className="flex items-center gap-2.5 p-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] hover:bg-[color:var(--bg-subtle)] hover:border-[color:var(--border-strong)] transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[color:var(--brand-subtle)] flex items-center justify-center flex-shrink-0">
                    <a.icon strokeWidth={1.75} className="w-4 h-4 text-[color:var(--brand)]" />
                  </div>
                  <p className="text-xs font-semibold text-[color:var(--text-primary)]">{a.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader>
            <CardTitle description="Status do sistema">Saúde do Estoque</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {stockHealth.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-medium text-[color:var(--text-secondary)]">{m.label}</p>
                  <p className="text-xs font-bold text-[color:var(--text-primary)]">{m.value === null || m.value === undefined ? '—' : `${m.value}${m.suffix}`}</p>
                </div>
                {m.progress && <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--bg-muted)]">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, m.value ?? 0))}%`, background: m.color }} />
                </div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
