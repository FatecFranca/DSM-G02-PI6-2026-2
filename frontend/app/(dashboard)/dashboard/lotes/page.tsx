'use client'
import { useState } from 'react'
import { Search, Layers, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { mockLots } from '@/mocks/movements'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const LOT_STATUS = {
  valid:      { label: 'Válido',      variant: 'success' as const, icon: CheckCircle2, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
  expiring:   { label: 'Vencendo',    variant: 'warning' as const, icon: Clock,        color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
  expired:    { label: 'Vencido',     variant: 'danger' as const,  icon: XCircle,      color: 'text-[color:var(--danger)]',  bg: 'bg-[color:var(--danger-subtle)]' },
  quarantine: { label: 'Quarentena',  variant: 'default' as const, icon: AlertTriangle,color: 'text-[color:var(--text-secondary)]', bg: 'bg-[color:var(--bg-muted)]' },
}

export default function LotesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = mockLots.filter(l => {
    const matchSearch = l.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
      l.productName.toLowerCase().includes(search.toLowerCase()) ||
      l.supplierName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || l.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Lotes' }]} />

      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Controle de Lotes</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Rastreabilidade completa por lote e validade</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(['valid', 'expiring', 'expired', 'quarantine'] as const).map(s => {
          const cfg = LOT_STATUS[s]
          const count = mockLots.filter(l => l.status === s).length
          const Icon = cfg.icon
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={cn(
                'flex items-center gap-3 p-4 bg-[color:var(--bg-base)] border rounded-[var(--radius-lg)] text-left transition-all hover:shadow-[var(--shadow-md)]',
                statusFilter === s ? 'border-[color:var(--brand)]' : 'border-[color:var(--border)]'
              )}
            >
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center', cfg.bg)}>
                <Icon className={cn('w-4 h-4', cfg.color)} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">{cfg.label}</p>
                <p className="text-xl font-bold text-[color:var(--text-primary)]">{count}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Buscar lote, produto, fornecedor…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
      </div>

      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Lote', 'Produto', 'Qtd', 'Fabricação', 'Validade', 'Fornecedor', 'Endereço', 'Status'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhum lote encontrado.</td></tr>
            )}
            {filtered.map(lot => {
              const cfg = LOT_STATUS[lot.status]
              const Icon = cfg.icon
              const expDate = new Date(lot.expirationDate)
              const daysLeft = Math.ceil((expDate.getTime() - Date.now()) / 86400000)
              return (
                <tr key={lot.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', cfg.bg)}>
                        <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      </div>
                      <span className="font-mono text-sm font-semibold text-[color:var(--text-primary)]">{lot.lotNumber}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">{lot.productName}</p>
                    <p className="text-xs font-mono text-[color:var(--text-tertiary)]">{lot.productCode}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-[color:var(--text-primary)]">{formatNumber(lot.quantity)}</span>
                    <span className="text-xs text-[color:var(--text-tertiary)] ml-1">un</span>
                  </td>
                  <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-secondary)]">{formatDate(lot.manufacturingDate)}</span></td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-[color:var(--text-primary)]">{formatDate(lot.expirationDate)}</p>
                    <p className={cn('text-[10px] font-medium mt-0.5', daysLeft < 0 ? 'text-[color:var(--danger)]' : daysLeft < 30 ? 'text-[color:var(--warning)]' : 'text-[color:var(--success)]')}>
                      {daysLeft < 0 ? `Venceu há ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
                    </p>
                  </td>
                  <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-secondary)]">{lot.supplierName}</span></td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs bg-[color:var(--bg-muted)] px-2 py-1 rounded text-[color:var(--text-primary)]">{lot.address}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
