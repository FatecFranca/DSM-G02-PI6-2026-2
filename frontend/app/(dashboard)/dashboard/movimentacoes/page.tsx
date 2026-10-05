'use client'
import { useEffect, useState } from 'react'
import {
  Search, Download, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, AlertTriangle,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { MOVEMENT_TYPE_LABELS } from '@/constants/status'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import type { MovementRecord } from '@/types/movement'

type MType = 'entry' | 'exit' | 'transfer' | 'loss' | 'adjustment' | 'inventory'

const TYPE_CONFIG: Record<MType, { icon: React.ElementType; iconColor: string; iconBg: string; variant: 'success'|'info'|'warning'|'danger'|'default'|'brand' }> = {
  entry:      { icon: ArrowDownToLine, iconColor: 'text-[color:var(--success)]', iconBg: 'bg-[color:var(--success-subtle)]', variant: 'success' },
  exit:       { icon: ArrowUpFromLine, iconColor: 'text-[color:var(--info)]',    iconBg: 'bg-[color:var(--info-subtle)]',    variant: 'info' },
  transfer:   { icon: RefreshCw,       iconColor: 'text-[color:var(--warning)]', iconBg: 'bg-[color:var(--warning-subtle)]', variant: 'warning' },
  loss:       { icon: AlertTriangle,   iconColor: 'text-[color:var(--danger)]',  iconBg: 'bg-[color:var(--danger-subtle)]',  variant: 'danger' },
  adjustment: { icon: RefreshCw,       iconColor: 'text-[color:var(--text-secondary)]', iconBg: 'bg-[color:var(--bg-muted)]', variant: 'default' },
  inventory:  { icon: ArrowDownToLine, iconColor: 'text-[color:var(--brand)]',   iconBg: 'bg-[color:var(--brand-subtle)]',   variant: 'brand' },
}

const PER_PAGE = 20

interface MovementResult {
  data: MovementRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function MovimentacoesPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<MovementResult | null>(null)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    let active = true
    api.get<MovementResult>('/movements', {
      page,
      limit: PER_PAGE,
      search,
      type: typeFilter || undefined,
      from: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
      to: toDate ? `${toDate}T23:59:59.999Z` : undefined,
    }).then((data) => {
      if (active) {
        setResult(data)
        setError('')
      }
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar movimentações')
    })
    return () => { active = false }
  }, [page, search, typeFilter, fromDate, toDate])

  const movements = result?.data ?? []
  const total = result?.total ?? 0

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Histórico de Movimentações' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Movimentações</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Histórico completo de todas as movimentações de estoque</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>Exportar</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['entry', 'exit', 'transfer', 'loss'] as MType[]).map(t => {
          const cfg = TYPE_CONFIG[t]
          const count = movements.filter(m => m.type === t).length
          const amount = movements.filter(m => m.type === t).reduce((sum, m) => sum + m.totalValue, 0)
          const Icon = cfg.icon
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={cn(
                'flex items-center gap-3 p-4 bg-[color:var(--bg-base)] border rounded-[var(--radius-lg)] text-left transition-all hover:shadow-[var(--shadow-md)]',
                typeFilter === t ? 'border-[color:var(--brand)] shadow-[var(--shadow-md)]' : 'border-[color:var(--border)]'
              )}
            >
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', cfg.iconBg)}>
                <Icon className={cn('w-4 h-4', cfg.iconColor)} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide">{MOVEMENT_TYPE_LABELS[t]}</p>
                <p className="text-lg font-bold text-[color:var(--text-primary)]">{count}</p>
                <p className="text-[10px] text-[color:var(--text-tertiary)]">{formatCurrency(amount)} nesta página</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Buscar produto, código, operador…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
        >
          <option value="">Todos os tipos</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input aria-label="Data inicial" type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }} className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
        <input aria-label="Data final" type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }} className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
      </div>

      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}
      {/* Timeline / Table */}
      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Tipo', 'Produto', 'Código', 'Qtd', 'Valor', 'Operador', 'Notas / Destino', 'Data/Hora'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 && !error && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma movimentação encontrada.</td></tr>
            )}
            {movements.map(m => {
              const cfg = TYPE_CONFIG[m.type as MType] ?? TYPE_CONFIG.adjustment
              const Icon = cfg.icon
              return (
                <tr key={m.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center', cfg.iconBg)}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.iconColor)} />
                      </div>
                      <Badge variant={cfg.variant} size="sm">{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-[color:var(--text-primary)] truncate block max-w-[150px]">{m.product.name}</span>
                  </td>
                  <td className="px-5 py-3.5"><span className="font-mono text-xs text-[color:var(--text-tertiary)]">{m.product.internalCode}</span></td>
                  <td className="px-5 py-3.5">
                    <span className={cn('font-semibold', m.type === 'entry' ? 'text-[color:var(--success)]' : m.type === 'loss' ? 'text-[color:var(--danger)]' : 'text-[color:var(--text-primary)]')}>
                      {m.type === 'entry' ? '+' : m.type === 'exit' || m.type === 'loss' ? '−' : ''}{formatNumber(Math.abs(m.quantity))}
                    </span>
                  </td>
                  <td className="px-5 py-3.5"><span className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(m.totalValue)}</span></td>
                  <td className="px-5 py-3.5"><span className="text-[color:var(--text-secondary)]">{m.user.name}</span></td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs space-y-0.5">
                      {m.invoiceNumber && <p className="text-[color:var(--text-primary)]">{m.invoiceNumber}</p>}
                      {m.notes && <p className="text-[color:var(--text-tertiary)] truncate max-w-[120px]">{m.notes}</p>}
                      {m.customerName && <p className="text-[color:var(--text-tertiary)]">→ {m.customerName}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-tertiary)]">{formatDateTime(m.createdAt)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-[color:var(--border)]">
          <Pagination page={page} totalPages={result?.totalPages ?? 0} total={total} perPage={PER_PAGE} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
