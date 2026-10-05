'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  BrainCircuit, TrendingUp, AlertTriangle,
  ShoppingCart, Zap, CheckCircle2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { PageLoading } from '@/components/ui/Loading'
import { useFetch } from '@/hooks/useFetch'
import { downloadCsv } from '@/lib/csv'
import { cn } from '@/lib/cn'
import type { ApiAnalytics } from '@/types/api'

const INSIGHT_ICONS = { warning: AlertTriangle, success: TrendingUp, info: ShoppingCart }

const INSIGHT_STYLES = {
  warning: { border: 'border-l-[color:var(--warning)]', iconBg: 'bg-[color:var(--warning-subtle)]', iconColor: 'text-[color:var(--warning)]' },
  success: { border: 'border-l-[color:var(--success)]', iconBg: 'bg-[color:var(--success-subtle)]', iconColor: 'text-[color:var(--success)]' },
  info:    { border: 'border-l-[color:var(--info)]',    iconBg: 'bg-[color:var(--info-subtle)]',    iconColor: 'text-[color:var(--info)]' },
}

const URGENCY_VARIANTS: Record<string, 'danger'|'warning'|'default'> = {
  'Urgente': 'danger', 'Alta': 'warning', 'Média': 'default',
}

export default function IAAnaliticaPage() {
  const { data, loading, error, reload } = useFetch<ApiAnalytics>('/analytics', { historyMonths: 6, forecastMonths: 3 })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (loading && !data) return <PageLoading rows={5} />
  if (!data) return <Alert>{error || 'Sem dados'}</Alert>

  const demandData = data.demand
  const abcXyzData = data.matrix.slice(0, 10)
  const suggestions = data.suggestions
  const forecastLabel = (() => {
    const future = data.demand.filter(d => d.real === null)
    return future.length ? `${future[0].month}–${future[future.length - 1].month} previsto` : 'Previsão'
  })()

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  function exportOrder() {
    const rows = suggestions.filter(s => selected.size === 0 || selected.has(s.productId))
    downloadCsv('pedido-sugerido.csv', ['Código', 'Produto', 'Categoria', 'Estoque atual', 'Quantidade sugerida', 'Custo estimado', 'Urgência', 'Motivo'],
      rows.map(s => [s.code, s.product, s.category, s.currentStock, s.quantity, s.estimatedCost, s.urgency, s.reason]))
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'IA Analítica' }]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">IA Analítica</h1>
            <Badge variant="brand" size="sm"><BrainCircuit className="w-3 h-3 mr-1" />Análise preditiva</Badge>
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)]">Previsões, insights e recomendações calculados a partir do histórico real de movimentações</p>
        </div>
        <Button size="sm" variant="outline" leftIcon={<Zap className="w-3.5 h-3.5" />} onClick={reload} loading={loading}>Atualizar análise</Button>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.insights.length === 0 && (
          <div className="sm:col-span-2 flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)]">
            <CheckCircle2 className="w-5 h-5 text-[color:var(--success)]" />
            <p className="text-sm text-[color:var(--text-secondary)]">Nenhum ponto de atenção identificado no momento.</p>
          </div>
        )}
        {data.insights.map((ins, i) => {
          const style = INSIGHT_STYLES[ins.type]
          const Icon = INSIGHT_ICONS[ins.type]
          return (
            <div key={i} className={cn('bg-[color:var(--bg-base)] border border-[color:var(--border)] border-l-4 rounded-[var(--radius-lg)] p-4 flex items-start gap-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow', style.border)}>
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', style.iconBg)}>
                <Icon className={cn('w-4 h-4', style.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{ins.title}</p>
                <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">{ins.desc}</p>
              </div>
              {ins.href.startsWith('#')
                ? <a href={ins.href}><Button size="xs" variant="ghost" className="flex-shrink-0">{ins.action} →</Button></a>
                : <Link href={ins.href}><Button size="xs" variant="ghost" className="flex-shrink-0">{ins.action} →</Button></Link>}
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Demand forecast */}
        <Card padding={false}>
          <CardHeader className="p-5 pb-3">
            <CardTitle description="Unidades vendidas: real vs. tendência linear">Previsão de Demanda</CardTitle>
            <Badge variant="brand" size="sm">{forecastLabel}</Badge>
          </CardHeader>
          <div className="h-[220px] px-5 pb-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'real' ? 'Real' : 'Previsto'} />
                <Line type="monotone" dataKey="real" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ABC/XYZ matrix */}
        <Card>
          <CardHeader>
            <CardTitle description="ABC = valor movimentado · XYZ = variabilidade da demanda (CV)">Matriz ABC × XYZ</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Produto', 'ABC', 'XYZ', 'Giro/ano', '% do valor'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abcXyzData.map(row => (
                  <tr key={row.productId} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                    <td className="px-3 py-2.5 text-xs font-medium text-[color:var(--text-primary)] max-w-[160px] truncate">{row.product}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs text-white', row.abc === 'A' ? 'bg-[color:var(--brand)]' : row.abc === 'B' ? 'bg-[color:var(--info)]' : 'bg-[color:var(--text-tertiary)]')}>
                        {row.abc}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs text-white', row.xyz === 'X' ? 'bg-[color:var(--success)]' : row.xyz === 'Y' ? 'bg-[color:var(--warning)]' : 'bg-[color:var(--danger)]')}>
                        {row.xyz}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[color:var(--brand)] rounded-full" style={{ width: `${Math.min(100, row.turnover * 10)}%` }} />
                        </div>
                        <span className="text-xs text-[color:var(--text-tertiary)]">{row.turnover}×</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[color:var(--success)] rounded-full" style={{ width: `${Math.min(100, row.valueShare * 4)}%` }} />
                        </div>
                        <span className="text-xs text-[color:var(--text-tertiary)]">{row.valueShare}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Purchase suggestions */}
      <Card id="sugestoes">
        <CardHeader>
          <CardTitle description="Reposição para cobrir ~45 dias de demanda prevista">Sugestões de Compra</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">{suggestions.length} produtos</Badge>
            <Button size="sm" variant="outline" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />} onClick={exportOrder} disabled={suggestions.length === 0}>{selected.size ? `Exportar pedido (${selected.size})` : 'Exportar pedido'}</Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Produto', 'Estoque', 'Qtd Sugerida', 'Custo est.', 'Urgência', 'Motivo', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suggestions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma reposição necessária.</td></tr>
              )}
              {suggestions.map(s => (
                <tr key={s.productId} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                        <ShoppingCart className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                      </div>
                      <span className="font-medium text-[color:var(--text-primary)]">{s.product}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--text-secondary)]">{s.currentStock} un{s.daysOfCover !== null && <span className="text-[color:var(--text-tertiary)]"> · {s.daysOfCover}d</span>}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[color:var(--text-primary)]">{s.quantity} un</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[color:var(--text-secondary)]">{s.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-3">
                    <Badge variant={URGENCY_VARIANTS[s.urgency]} size="sm" dot>{s.urgency}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[color:var(--text-secondary)]">{s.reason}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="xs" variant={selected.has(s.productId) ? 'primary' : 'outline'} onClick={() => toggle(s.productId)}>{selected.has(s.productId) ? 'Incluído' : 'Incluir'}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
