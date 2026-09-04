'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Package, AlertTriangle, TrendingUp, TrendingDown,
  ArrowDownToLine, ArrowUpFromLine, DollarSign, Clock,
  MoreHorizontal, ExternalLink, RefreshCw, Calendar,
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
import {
  dashboardStats, stockEvolutionData, categoryDistribution,
  topProducts, recentMovements, abcData,
} from '@/mocks/dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils'
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

  const stats = dashboardStats

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Segunda, 30 de junho de 2026 · Atualizado agora</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Calendar className="w-3.5 h-3.5" />}>
            Junho 2026
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
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
          trend={3.2}
        />
        <StatCard
          label="Produtos Ativos"
          value={formatNumber(stats.activeProducts)}
          sub={`${Math.round(stats.activeProducts / stats.totalProducts * 100)}% do total`}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
          trend={1.8}
        />
        <StatCard
          label="Sem Estoque"
          value={stats.outOfStock}
          sub="produtos zerados"
          icon={<AlertTriangle className="w-4 h-4" />}
          variant="danger"
          trend={-12}
        />
        <StatCard
          label="Estoque Crítico"
          value={stats.criticalStock}
          sub="abaixo do mínimo"
          icon={<TrendingDown className="w-4 h-4" />}
          variant="warning"
          trend={5.1}
        />
        <StatCard
          label="Valor do Estoque"
          value={formatCurrency(stats.totalStockValue)}
          sub="estoque total"
          icon={<DollarSign className="w-4 h-4" />}
          variant="info"
          trend={8.4}
          className="col-span-2 lg:col-span-1 xl:col-span-1"
        />
      </div>

      {/* Today's activity */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Entradas hoje', value: stats.todayEntries, sub: formatCurrency(stats.todayEntriesValue), icon: ArrowDownToLine, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
          { label: 'Saídas hoje', value: stats.todayExits, sub: formatCurrency(stats.todayExitsValue), icon: ArrowUpFromLine, color: 'text-[color:var(--info)]', bg: 'bg-[color:var(--info-subtle)]' },
          { label: 'Pedidos Pendentes', value: stats.pendingOrders, sub: 'aguardando', icon: Clock, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
          { label: 'Produtos Vencendo', value: stats.expiringProducts, sub: 'nos próx. 30 dias', icon: AlertTriangle, color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]' },
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
                <AreaChart data={stockEvolutionData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                    formatter={(v: number, n: string) => [formatNumber(v), n === 'entries' ? 'Entradas' : 'Saídas']}
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
                    formatter={(v: number) => [`${v}%`, 'Participação']}
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
                  <Pie data={categoryDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={3} dataKey="value">
                    {categoryDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, 'Participação']}
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
                      style={{ width: `${(p.movements / topProducts[0].movements) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatNumber(p.movements)}</p>
                  <p className={cn('text-[10px] font-medium', p.trend >= 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]')}>
                    {p.trend >= 0 ? '+' : ''}{p.trend}%
                  </p>
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
                      <p className="font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">{mov.product}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-[color:var(--text-tertiary)]">{mov.code}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-[color:var(--text-primary)]">{mov.qty}</span>
                      <span className="text-[color:var(--text-tertiary)] ml-1 text-xs">un</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-[color:var(--text-primary)]">{formatCurrency(mov.value)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[color:var(--text-secondary)]">{mov.user}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs">
                        <p className="font-medium text-[color:var(--text-primary)]">{mov.time}</p>
                        <p className="text-[color:var(--text-tertiary)]">{mov.date}</p>
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
            {[
              { label: 'Ocupação do Galpão', value: 73, color: '#2563eb' },
              { label: 'Produtos Cadastrados', value: 88, color: '#059669' },
              { label: 'Lotes em Dia', value: 91, color: '#0891b2' },
              { label: 'Acuracidade Inventário', value: 99.3, color: '#7c3aed' },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between mb-1.5">
                  <p className="text-xs font-medium text-[color:var(--text-secondary)]">{m.label}</p>
                  <p className="text-xs font-bold text-[color:var(--text-primary)]">{m.value}%</p>
                </div>
                <div className="h-1.5 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${m.value}%`, background: m.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
