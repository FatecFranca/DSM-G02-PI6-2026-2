'use client'
import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Clock, AlertTriangle, Play } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const STATUS_CONFIG = {
  planned:     { label: 'Planejado',     variant: 'default' as const,  icon: Clock,         color: 'text-[color:var(--text-tertiary)]', bg: 'bg-[color:var(--bg-muted)]' },
  in_progress: { label: 'Em Andamento',  variant: 'warning' as const,  icon: Play,          color: 'text-[color:var(--warning)]',       bg: 'bg-[color:var(--warning-subtle)]' },
  review:      { label: 'Em Revisão',    variant: 'info' as const,     icon: AlertTriangle, color: 'text-[color:var(--info)]',          bg: 'bg-[color:var(--info-subtle)]' },
  completed:   { label: 'Concluído',     variant: 'success' as const,  icon: CheckCircle2,  color: 'text-[color:var(--success)]',       bg: 'bg-[color:var(--success-subtle)]' },
}

const TYPE_LABELS = { full: 'Completo', partial: 'Parcial', cyclic: 'Cíclico' }

type InventoryStatus = keyof typeof STATUS_CONFIG
type InventoryType = keyof typeof TYPE_LABELS
interface InventoryRecord {
  id: string
  name: string
  type: InventoryType
  status: InventoryStatus
  startDate: string
  endDate: string | null
  totalItems: number
  countedItems: number
  divergences: number
  responsible: { id: string; name: string }
}

export default function InventarioPage() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [inventories, setInventories] = useState<InventoryRecord[]>([])
  const [name, setName] = useState('')
  const [type, setType] = useState<InventoryType>('full')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get<InventoryRecord[]>('/inventory')
      .then((data) => { if (active) setInventories(data) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar inventários')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const createInventory = async () => {
    if (!user || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      const inventory = await api.post<InventoryRecord>('/inventory', {
        name: name.trim(),
        type,
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        responsibleId: user.id,
      })
      setInventories((current) => [inventory, ...current])
      setName('')
      setShowModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar inventário')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (inventory: InventoryRecord, status: InventoryStatus) => {
    setError('')
    try {
      const updated = await api.patch<InventoryRecord>(`/inventory/${inventory.id}`, {
        status,
        ...(status === 'completed' ? { endDate: new Date().toISOString() } : {}),
      })
      setInventories((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar inventário')
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'WMS' }, { label: 'Inventário' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Inventário</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Contagem e controle de divergências de estoque</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowModal(true)}>Novo Inventário</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG['planned']][]).map(([k, v]) => {
          const count = inventories.filter(i => i.status === k).length
          const Icon = v.icon
          return (
            <div key={k} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center', v.bg)}>
                <Icon className={cn('w-4 h-4', v.color)} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">{v.label}</p>
                <p className="text-xl font-bold text-[color:var(--text-primary)]">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inventories list */}
      <div className="space-y-3">
        {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}
        {loading && <p className="py-8 text-center text-sm text-[color:var(--text-tertiary)]">Carregando inventários…</p>}
        {!loading && inventories.length === 0 && <p className="py-8 text-center text-sm text-[color:var(--text-tertiary)]">Nenhum inventário cadastrado.</p>}
        {inventories.map(inv => {
          const cfg = STATUS_CONFIG[inv.status]
          const Icon = cfg.icon
          const progress = inv.totalItems > 0 ? Math.round((inv.countedItems / inv.totalItems) * 100) : 0
          return (
            <div key={inv.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={cn('w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <Icon className={cn('w-5 h-5', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{inv.name}</h3>
                      <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      <Badge variant="default" size="sm">{TYPE_LABELS[inv.type]}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[color:var(--text-tertiary)] flex-wrap">
                      <span>Responsável: <strong className="text-[color:var(--text-primary)]">{inv.responsible.name}</strong></span>
                      <span>Início: {formatDate(inv.startDate)}</span>
                      {inv.endDate && <span>Fim: {formatDate(inv.endDate)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {inv.status === 'in_progress' && (
                    <Button size="xs" variant="outline" onClick={() => updateStatus(inv, 'review')}>Enviar para revisão</Button>
                  )}
                  {inv.status === 'planned' && (
                    <Button size="xs" onClick={() => updateStatus(inv, 'in_progress')}>Iniciar</Button>
                  )}
                  {inv.status === 'review' && <Button size="xs" onClick={() => updateStatus(inv, 'completed')}>Concluir</Button>}
                  {inv.status === 'completed' && (
                    <Button size="xs" variant="ghost">Ver relatório</Button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Total de itens</p>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{formatNumber(inv.totalItems)}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Contados</p>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{formatNumber(inv.countedItems)}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Divergências</p>
                  <p className={cn('text-sm font-bold', inv.divergences > 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--success)]')}>
                    {inv.divergences}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Acuracidade</p>
                  <p className={cn('text-sm font-bold', inv.status === 'completed' ? (inv.divergences === 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--warning)]') : 'text-[color:var(--text-tertiary)]')}>
                    {inv.status === 'completed' && inv.totalItems > 0 ? `${(((inv.totalItems - inv.divergences) / inv.totalItems) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Progresso: {progress}%</p>
                  <div className="h-2 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', inv.status === 'completed' ? 'bg-[color:var(--success)]' : 'bg-[color:var(--brand)]')}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Inventário"
        description="Configure as opções do inventário"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" loading={saving} disabled={!name.trim() || !user} onClick={createInventory}>Criar Inventário</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nome do inventário *" placeholder="Ex: Inventário Geral Julho 2026" value={name} onChange={(event) => setName(event.target.value)} />
          <Select label="Tipo" options={[
            { value: 'full', label: 'Completo — todos os produtos' },
            { value: 'partial', label: 'Parcial — categorias selecionadas' },
            { value: 'cyclic', label: 'Cíclico — rotativo por endereço' },
          ]} value={type} onChange={(event) => setType(event.target.value as InventoryType)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de início" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="Responsável" value={user?.name ?? ''} disabled />
          </div>
        </div>
      </Modal>
    </div>
  )
}
