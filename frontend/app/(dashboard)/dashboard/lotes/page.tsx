'use client'

import { useEffect, useState } from 'react'
import { Search, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

type LotStatus = 'valid' | 'expiring' | 'expired' | 'quarantine'
interface LotRecord {
  id: string
  lotNumber: string
  quantity: number
  manufacturingDate: string
  expirationDate: string
  address: string
  status: LotStatus
  product: { id: string; name: string; internalCode: string }
  supplier: { id: string; name: string }
}

const TODAY = Date.now()
const LOT_STATUS: Record<LotStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: typeof CheckCircle2; color: string; bg: string }> = {
  valid: { label: 'Válido', variant: 'success', icon: CheckCircle2, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
  expiring: { label: 'Vencendo', variant: 'warning', icon: Clock, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
  expired: { label: 'Vencido', variant: 'danger', icon: XCircle, color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]' },
  quarantine: { label: 'Quarentena', variant: 'default', icon: AlertTriangle, color: 'text-[color:var(--text-secondary)]', bg: 'bg-[color:var(--bg-muted)]' },
}

export default function LotesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LotStatus | ''>('')
  const [lots, setLots] = useState<LotRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get<{ data: LotRecord[] }>('/lots', { limit: 100 })
      .then((result) => { if (active) setLots(result.data) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar lotes')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = lots.filter((lot) => {
    const query = search.toLowerCase()
    const matchesSearch = lot.lotNumber.toLowerCase().includes(query) ||
      lot.product.name.toLowerCase().includes(query) ||
      lot.supplier.name.toLowerCase().includes(query)
    return matchesSearch && (!statusFilter || lot.status === statusFilter)
  })

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Lotes' }]} />
      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Controle de Lotes</h1>
        <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">Lotes persistidos, rastreabilidade e validade</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(Object.entries(LOT_STATUS) as [LotStatus, (typeof LOT_STATUS)[LotStatus]][]).map(([status, config]) => {
          const Icon = config.icon
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-lg)] border bg-[color:var(--bg-base)] p-4 text-left transition-all',
                statusFilter === status ? 'border-[color:var(--brand)]' : 'border-[color:var(--border)]',
              )}
            >
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]', config.bg)}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">{config.label}</p>
                <p className="text-xl font-bold text-[color:var(--text-primary)]">{lots.filter((lot) => lot.status === status).length}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar lote, produto, fornecedor…" value={search} onChange={(event) => setSearch(event.target.value)} leftIcon={<Search className="h-4 w-4" />} />
      </div>
      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Lote', 'Produto', 'Qtd', 'Fabricação', 'Validade', 'Fornecedor', 'Endereço', 'Status'].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhum lote encontrado.</td></tr>}
            {filtered.map((lot) => {
              const config = LOT_STATUS[lot.status]
              const Icon = config.icon
              const daysLeft = Math.ceil((new Date(lot.expirationDate).getTime() - TODAY) / 86400000)
              return (
                <tr key={lot.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)]">
                  <td className="px-5 py-3.5 font-mono font-semibold">{lot.lotNumber}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[color:var(--text-primary)]">{lot.product.name}</p>
                    <p className="font-mono text-xs text-[color:var(--text-tertiary)]">{lot.product.internalCode}</p>
                  </td>
                  <td className="px-5 py-3.5 font-semibold">{formatNumber(lot.quantity)}</td>
                  <td className="px-5 py-3.5 text-xs">{formatDate(lot.manufacturingDate)}</td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium">{formatDate(lot.expirationDate)}</p>
                    <p className={cn('mt-0.5 text-[10px] font-medium', daysLeft < 0 ? 'text-[color:var(--danger)]' : daysLeft < 30 ? 'text-[color:var(--warning)]' : 'text-[color:var(--success)]')}>
                      {daysLeft < 0 ? `Venceu há ${Math.abs(daysLeft)} dias` : `${daysLeft} dias restantes`}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 text-xs">{lot.supplier.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs">{lot.address}</td>
                  <td className="px-5 py-3.5"><Badge variant={config.variant} dot size="sm"><Icon className="mr-1 h-3 w-3" />{config.label}</Badge></td>
                </tr>
              )
            })}
            {loading && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Carregando lotes…</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
