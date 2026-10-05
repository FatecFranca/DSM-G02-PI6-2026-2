'use client'
import { useEffect, useState } from 'react'
import { Search, MapPin, Grid3X3, List } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'

type PositionStatus = 'free' | 'occupied' | 'blocked' | 'reserved'
interface Address {
  id: string
  code: string
  aisle: string
  street: string
  shelf: string
  level: string
  position: string
  status: PositionStatus
  capacity: number
  occupied: number
  quantity: number | null
  product?: { id: string; name: string; internalCode: string } | null
}
interface AddressPage {
  data: Address[]
  total: number
  page: number
  limit: number
  totalPages: number
}
interface WarehouseStats {
  totalPositions: number
  freePositions: number
  occupiedPositions: number
  blockedPositions: number
  reservedPositions: number
  occupancyRate: number
}

const STATUS_CONFIG: Record<PositionStatus, { label: string; color: string; bg: string; border: string }> = {
  free: { label: 'Livre', color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]', border: 'border-[color:var(--success-muted)]' },
  occupied: { label: 'Ocupado', color: 'text-[color:var(--brand)]', bg: 'bg-[color:var(--brand-subtle)]', border: 'border-[color:var(--brand-muted)]' },
  blocked: { label: 'Bloqueado', color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]', border: 'border-[color:var(--danger-muted)]' },
  reserved: { label: 'Reservado', color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]', border: 'border-[color:var(--warning-muted)]' },
}

export default function EnderecosPage() {
  const [search, setSearch] = useState('')
  const [selectedAisle, setSelectedAisle] = useState('')
  const [statusFilter, setStatusFilter] = useState<PositionStatus | ''>('')
  const [selected, setSelected] = useState<Address | null>(null)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [stats, setStats] = useState<WarehouseStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get<AddressPage>('/warehouse', { page: 1, limit: 100 }),
      api.get<WarehouseStats>('/warehouse/stats'),
    ]).then(([addressResult, warehouseStats]) => {
      if (!active) return
      setAddresses(addressResult.data)
      setStats(warehouseStats)
      setSelectedAisle((current) => current || addressResult.data[0]?.aisle || '')
    }).catch((err: unknown) => {
      if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar endereços')
    })
    return () => { active = false }
  }, [])

  const filtered = addresses.filter((address) => {
    if (selectedAisle && address.aisle !== selectedAisle) return false
    if (statusFilter && address.status !== statusFilter) return false
    const query = search.toLowerCase()
    return !query || address.code.toLowerCase().includes(query) ||
      (address.product?.name.toLowerCase().includes(query) ?? false)
  })
  const grouped = filtered.reduce<Record<string, Address[]>>((groups, address) => {
    const key = `${address.street}-${address.shelf}`
    groups[key] = [...(groups[key] ?? []), address]
    return groups
  }, {})
  const aisles = [...new Set(addresses.map((address) => address.aisle))].sort()
  const streets = [...new Set(filtered.map((address) => address.street))].sort()
  const shelves = [...new Set(filtered.map((address) => address.shelf))].sort()

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'WMS' }, { label: 'Endereços' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Mapa de Endereços</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Posições reais cadastradas no armazém</p>
        </div>
        <div className="flex gap-1 border border-[color:var(--border)] rounded-[var(--radius-md)] p-0.5">
          <button onClick={() => setView('map')} className={cn('px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors flex items-center gap-1.5', view === 'map' ? 'bg-[color:var(--bg-muted)] text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)]')}>
            <Grid3X3 className="w-3.5 h-3.5" /> Mapa
          </button>
          <button onClick={() => setView('list')} className={cn('px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors flex items-center gap-1.5', view === 'list' ? 'bg-[color:var(--bg-muted)] text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)]')}>
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total de Posições" value={stats?.totalPositions ?? 0} icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Posições Livres" value={stats?.freePositions ?? 0} variant="success" icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Ocupadas" value={stats?.occupiedPositions ?? 0} variant="info" icon={<MapPin className="w-4 h-4" />} />
        <StatCard label="Taxa de Ocupação" value={`${stats?.occupancyRate ?? 0}%`} variant={(stats?.occupancyRate ?? 0) > 85 ? 'danger' : (stats?.occupancyRate ?? 0) > 60 ? 'warning' : 'success'} icon={<MapPin className="w-4 h-4" />} />
      </div>
      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs font-medium text-[color:var(--text-tertiary)]">Legenda:</span>
        {(Object.entries(STATUS_CONFIG) as [PositionStatus, typeof STATUS_CONFIG['free']][]).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatusFilter(statusFilter === k ? '' : k)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border', v.bg, v.color, v.border, statusFilter === k && 'ring-2 ring-[color:var(--brand)] ring-offset-1')}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Aisle selector */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-[color:var(--text-tertiary)] uppercase tracking-wide">Corredor</p>
          {aisles.map(a => (
            <button
              key={a}
              onClick={() => setSelectedAisle(a)}
              className={cn(
                'w-10 h-10 rounded-[var(--radius-md)] font-bold text-sm transition-all',
                selectedAisle === a
                  ? 'bg-[color:var(--brand)] text-white shadow-md'
                  : 'bg-[color:var(--bg-base)] border border-[color:var(--border)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-muted)]'
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Map grid */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-center gap-3">
            <Input
              placeholder={`Buscar endereço em ${selectedAisle}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="max-w-xs"
            />
            <p className="text-sm text-[color:var(--text-tertiary)]">Corredor <strong className="text-[color:var(--text-primary)]">{selectedAisle}</strong> · {filtered.length} posições</p>
          </div>

          {view === 'map' ? (
            <div className="space-y-6 overflow-x-auto pb-2">
              {streets.map((street) => (
                <div key={street}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">Rua {street}</p>
                  <div className="space-y-2">
                    {shelves.map((shelf) => {
                      const key = `${street}-${shelf}`
                      const positions = grouped[key] ?? []
                      if (positions.length === 0) return null
                      return (
                        <div key={shelf} className="flex items-center gap-2">
                          <span className="w-8 flex-shrink-0 text-[10px] font-bold text-[color:var(--text-tertiary)]">P {shelf}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {positions.map((pos) => {
                              const cfg = STATUS_CONFIG[pos.status]
                              return (
                                <button
                                  key={pos.id}
                                  onClick={() => setSelected(selected?.id === pos.id ? null : pos)}
                                  title={`${pos.code}${pos.product?.name ? ` · ${pos.product.name}` : ''}`}
                                  className={cn(
                                    'h-9 w-9 rounded-[var(--radius-sm)] border text-[9px] font-bold transition-all hover:scale-110',
                                    cfg.bg, cfg.border,
                                    selected?.id === pos.id && 'scale-110 ring-2 ring-[color:var(--brand)] ring-offset-1'
                                  )}
                                >
                                  {pos.level}{pos.position}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--border)]">
                    {['Endereço', 'Status', 'Produto', 'Qtd', 'Ocupação'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(pos => {
                    const cfg = STATUS_CONFIG[pos.status]
                    return (
                      <tr key={pos.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                        <td className="px-4 py-2.5"><span className="font-mono text-sm font-semibold text-[color:var(--text-primary)]">{pos.code}</span></td>
                        <td className="px-4 py-2.5"><Badge variant={pos.status === 'free' ? 'success' : pos.status === 'blocked' ? 'danger' : pos.status === 'reserved' ? 'warning' : 'brand'} size="sm" dot>{cfg.label}</Badge></td>
                        <td className="px-4 py-2.5"><span className="text-xs text-[color:var(--text-secondary)] truncate max-w-[150px] block">{pos.product?.name ?? '—'}</span></td>
                        <td className="px-4 py-2.5"><span className="text-sm font-medium text-[color:var(--text-primary)]">{pos.quantity ?? '—'}</span></td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                              <div className="h-full bg-[color:var(--brand)] rounded-full" style={{ width: `${Math.min(100, pos.capacity ? (pos.occupied / pos.capacity) * 100 : 0)}%` }} />
                            </div>
                            <span className="text-xs text-[color:var(--text-tertiary)]">{pos.capacity ? Math.round((pos.occupied / pos.capacity) * 100) : 0}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-64 flex-shrink-0 bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 space-y-4 animate-fade-in self-start">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[color:var(--text-primary)]">{selected.code}</p>
              <button onClick={() => setSelected(null)} className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] text-xs">✕</button>
            </div>
            <Badge variant={selected.status === 'free' ? 'success' : selected.status === 'blocked' ? 'danger' : selected.status === 'reserved' ? 'warning' : 'brand'} dot>
              {STATUS_CONFIG[selected.status as PositionStatus].label}
            </Badge>
            {selected.product && (
              <div className="space-y-1.5">
                <p className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide">Produto</p>
                <p className="text-sm font-medium text-[color:var(--text-primary)]">{selected.product.name}</p>
                <p className="text-xs font-mono text-[color:var(--text-tertiary)]">{selected.product.internalCode}</p>
              </div>
            )}
            {selected.quantity && (
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">Quantidade</p>
                <p className="text-lg font-bold text-[color:var(--text-primary)]">{selected.quantity} un</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[color:var(--text-tertiary)] mb-1.5">Ocupação</p>
              <div className="h-2 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                <div className="h-full bg-[color:var(--brand)] rounded-full" style={{ width: `${Math.min(100, selected.capacity ? (selected.occupied / selected.capacity) * 100 : 0)}%` }} />
              </div>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-1">{selected.occupied} de {selected.capacity} cap.</p>
            </div>
            <div className="space-y-1 text-xs text-[color:var(--text-tertiary)]">
              <p>Corredor: <strong className="text-[color:var(--text-primary)]">{selected.aisle}</strong></p>
              <p>Rua: <strong className="text-[color:var(--text-primary)]">{selected.street}</strong></p>
              <p>Prateleira: <strong className="text-[color:var(--text-primary)]">{selected.shelf}</strong></p>
              <p>Nível: <strong className="text-[color:var(--text-primary)]">{selected.level}</strong></p>
              <p>Posição: <strong className="text-[color:var(--text-primary)]">{selected.position}</strong></p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
