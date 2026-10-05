'use client'
import { useEffect, useState } from 'react'
import { Plus, CheckCircle2, Clock, AlertTriangle, Play, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { formatDate, formatNumber } from '@/lib/utils'
import { ApiError } from '@/lib/api'
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
  _count?: { items: number }
}
interface InventoryItem {
  id: string
  expectedQuantity: number
  countedQuantity: number | null
  discrepancy: number
  product: { id: string; name: string; internalCode: string; unit: string }
  countedBy: { id: string; name: string } | null
}
interface InventoryDetails extends InventoryRecord {
  items: InventoryItem[]
}
interface ProductOption {
  id: string
  name: string
  internalCode: string
}
interface ProductSearchResponse {
  data: ProductOption[]
}

export default function InventarioPage() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [inventoryResult, setInventoryResult] = useState<{
    data: InventoryRecord[]
    total: number
    totalPages: number
    statusCounts: Partial<Record<InventoryStatus, number>>
  } | null>(null)
  const [inventoryPage, setInventoryPage] = useState(1)
  const [selectedInventory, setSelectedInventory] = useState<InventoryDetails | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<InventoryType>('full')
  const [productSearch, setProductSearch] = useState('')
  const [productOptions, setProductOptions] = useState<ProductOption[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ProductOption[]>([])
  const [countInput, setCountInput] = useState<Record<string, string>>({})
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inventories = inventoryResult?.data ?? []

  useEffect(() => {
    let active = true
    api.get<{
      data: InventoryRecord[]
      total: number
      totalPages: number
      statusCounts: Partial<Record<InventoryStatus, number>>
    }>('/inventory', { page: inventoryPage, limit: 20 })
      .then((result) => { if (active) setInventoryResult(result) })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao carregar inventários')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [inventoryPage])

  useEffect(() => {
    if (!showModal || type === 'full') return
    let active = true
    api.get<ProductSearchResponse>('/products', { page: 1, limit: 100, search: productSearch })
      .then((result) => { if (active) setProductOptions(result.data) })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Falha ao procurar produtos') })
    return () => { active = false }
  }, [showModal, type, productSearch])

  const createInventory = async () => {
    if (!user || !name.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.post<InventoryRecord>('/inventory', {
        name: name.trim(),
        type,
        startDate: new Date(`${startDate}T00:00:00`).toISOString(),
        responsibleId: user.id,
        ...(type === 'full' ? {} : { productIds: selectedProducts.map((product) => product.id) }),
      })
      if (inventoryPage === 1) {
        const result = await api.get<NonNullable<typeof inventoryResult>>('/inventory', { page: 1, limit: 20 })
        setInventoryResult(result)
      } else {
        setInventoryPage(1)
        setInventoryResult(null)
        setLoading(true)
      }
      setName('')
      setSelectedProducts([])
      setType('full')
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
      })
      setInventoryResult((current) => current
        ? { ...current, data: current.data.map((item) => item.id === updated.id ? { ...item, ...updated } : item) }
        : current)
      setSelectedInventory((current) => current ? { ...current, ...updated } : current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar inventário')
    }
  }

  const openInventory = async (inventory: InventoryRecord) => {
    setError('')
    try {
      const details = await api.get<InventoryDetails>(`/inventory/${inventory.id}`)
      setSelectedInventory(details)
      setCountInput(Object.fromEntries(details.items.map((item) => [
        item.id,
        item.countedQuantity === null ? '' : String(item.countedQuantity),
      ])))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os itens do inventário')
    }
  }

  const saveItemCount = async (item: InventoryItem) => {
    const value = Number(countInput[item.id])
    if (!Number.isInteger(value) || value < 0 || !selectedInventory) {
      setError('Informe uma quantidade inteira igual ou maior que zero.')
      return
    }
    setError('')
    try {
      await api.post<InventoryItem>(`/inventory/${selectedInventory.id}/items/${item.id}/count`, { countedQuantity: value })
      const refreshed = await api.get<InventoryDetails>(`/inventory/${selectedInventory.id}`)
      setSelectedInventory(refreshed)
      setInventoryResult((current) => current
        ? {
            ...current,
            data: current.data.map((record) => record.id === refreshed.id ? refreshed : record),
          }
        : current)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Falha ao salvar contagem')
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
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setError(''); setShowModal(true) }}>Novo Inventário</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG['planned']][]).map(([k, v]) => {
          const count = inventoryResult?.statusCounts[k as InventoryStatus] ?? 0
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
                  <Button size="xs" variant="outline" onClick={() => openInventory(inv)}>Ver itens</Button>
                  {inv.status === 'in_progress' && (
                    <Button size="xs" variant="outline" disabled={inv.countedItems !== inv.totalItems || inv.totalItems === 0} onClick={() => updateStatus(inv, 'review')}>Enviar para revisão</Button>
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
        {inventoryResult && inventoryResult.totalPages > 1 && (
          <div className="flex items-center justify-between py-2 text-xs text-[color:var(--text-secondary)]">
            <span>{inventoryResult.total} inventários · Página {inventoryPage} de {inventoryResult.totalPages}</span>
            <div className="flex gap-1">
              <button aria-label="Página anterior" disabled={inventoryPage <= 1 || loading} onClick={() => setInventoryPage((current) => current - 1)} className="rounded p-1.5 hover:bg-[color:var(--bg-muted)] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button aria-label="Próxima página" disabled={inventoryPage >= inventoryResult.totalPages || loading} onClick={() => setInventoryPage((current) => current + 1)} className="rounded p-1.5 hover:bg-[color:var(--bg-muted)] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {selectedInventory && (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">{selectedInventory.name} · Itens</h2>
              <p className="text-xs text-[color:var(--text-tertiary)]">Esperado, quantidade contada e divergência por produto.</p>
            </div>
            <Button size="xs" variant="ghost" onClick={() => setSelectedInventory(null)}>Fechar</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-[color:var(--border)]">
                {['Produto', 'Esperado', 'Contado', 'Divergência', ''].map((heading) => <th key={heading} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[color:var(--text-tertiary)]">{heading}</th>)}
              </tr></thead>
              <tbody>
                {selectedInventory.items.map((item) => (
                  <tr key={item.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-2"><p className="font-medium">{item.product.name}</p><p className="font-mono text-[10px] text-[color:var(--text-tertiary)]">{item.product.internalCode}</p></td>
                    <td className="px-3 py-2">{formatNumber(item.expectedQuantity)} {item.product.unit}</td>
                    <td className="px-3 py-2">
                      {selectedInventory.status === 'in_progress'
                        ? <input type="number" min="0" step="1" aria-label={`Contagem de ${item.product.name}`} value={countInput[item.id] ?? ''} onChange={(event) => setCountInput((current) => ({ ...current, [item.id]: event.target.value }))} className="w-24 rounded border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2 py-1" />
                        : item.countedQuantity === null ? '—' : formatNumber(item.countedQuantity)}
                    </td>
                    <td className={cn('px-3 py-2 font-semibold', item.discrepancy === 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]')}>{item.countedQuantity === null ? '—' : item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}</td>
                    <td className="px-3 py-2">
                      {selectedInventory.status === 'in_progress' && <Button size="xs" onClick={() => saveItemCount(item)}>Salvar</Button>}
                    </td>
                  </tr>
                ))}
                {selectedInventory.items.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-[color:var(--text-tertiary)]">Inventário sem produtos ativos para contar.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Inventário"
        description="Configure as opções do inventário"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" loading={saving} disabled={!name.trim() || !user || (type !== 'full' && selectedProducts.length === 0)} onClick={createInventory}>Criar Inventário</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nome do inventário *" placeholder="Ex: Inventário Geral Julho 2026" value={name} onChange={(event) => setName(event.target.value)} />
          <Select label="Tipo" options={[
            { value: 'full', label: 'Completo — todos os produtos' },
            { value: 'partial', label: 'Parcial — produtos selecionados' },
            { value: 'cyclic', label: 'Cíclico — produtos selecionados' },
          ]} value={type} onChange={(event) => setType(event.target.value as InventoryType)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de início" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <Input label="Responsável" value={user?.name ?? ''} disabled />
          </div>
          {type !== 'full' && (
            <div className="space-y-2">
              <Input label="Buscar produtos para incluir" placeholder="Nome ou código interno" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} leftIcon={<Search className="h-4 w-4" />} />
              <div className="max-h-40 space-y-1 overflow-y-auto rounded border border-[color:var(--border)] p-2">
                {productOptions.map((product) => {
                  const isSelected = selectedProducts.some((selected) => selected.id === product.id)
                  return <label key={product.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-[color:var(--bg-subtle)]">
                    <input type="checkbox" checked={isSelected} onChange={(event) => setSelectedProducts((current) => event.target.checked ? [...current.filter((item) => item.id !== product.id), product] : current.filter((item) => item.id !== product.id))} />
                    <span>{product.name} <span className="font-mono text-[color:var(--text-tertiary)]">{product.internalCode}</span></span>
                  </label>
                })}
                {productOptions.length === 0 && <p className="p-2 text-xs text-[color:var(--text-tertiary)]">Nenhum produto encontrado.</p>}
              </div>
              <p className="text-xs text-[color:var(--text-tertiary)]">{selectedProducts.length} produto(s) selecionado(s)</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
