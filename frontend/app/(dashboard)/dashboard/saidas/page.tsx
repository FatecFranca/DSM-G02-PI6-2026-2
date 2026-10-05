'use client'

import { useEffect, useState } from 'react'
import { ArrowUpFromLine, DollarSign, Download, Package, Plus, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { EXIT_REASON_LABELS } from '@/constants/status'
import { ApiError, api } from '@/lib/api'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { ExitReason, MovementRecord } from '@/types/movement'

interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ProductOption {
  id: string
  name: string
  internalCode: string
  currentStock: number
}

interface ProductDetails extends ProductOption {
  warehouseAddresses: { id: string; code: string; quantity: number | null; lotNumber: string | null }[]
  lots: { id: string; lotNumber: string; quantity: number }[]
}

const PAGE_SIZE = 20
const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: 'sale', label: 'Venda' },
  { value: 'loss', label: 'Perda' },
  { value: 'break', label: 'Quebra' },
  { value: 'internal', label: 'Consumo Interno' },
]

const REASON_VARIANT: Record<ExitReason, 'success' | 'info' | 'danger' | 'warning' | 'default'> = {
  sale: 'success',
  transfer: 'info',
  loss: 'danger',
  break: 'danger',
  internal: 'warning',
}

export default function SaidasPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{
    key: string
    data: MovementRecord[]
    total: number
    error?: string
  } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const key = `${page}:${search}`

  useEffect(() => {
    let active = true
    api.get<Paginated<MovementRecord>>('/movements', {
      type: 'exit,loss,transfer',
      page,
      limit: PAGE_SIZE,
      search,
    }).then((result) => {
      if (!active) return
      setResult({ key, data: result.data, total: result.total })
    }).catch((err: unknown) => {
      if (active) setResult({
        key,
        data: [],
        total: 0,
        error: err instanceof Error ? err.message : 'Falha ao carregar saídas',
      })
    })
    return () => { active = false }
  }, [key, page, search])

  const exits = result?.key === key ? result.data : []
  const total = result?.key === key ? result.total : 0
  const loading = result?.key !== key
  const error = result?.key === key ? result.error : undefined
  const totalValue = exits.reduce((sum, movement) => sum + movement.totalValue, 0)
  const totalQty = exits.reduce((sum, movement) => sum + movement.quantity, 0)

  if (showForm) {
    return <NovaSaidaForm onBack={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Saídas' }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Saídas de Estoque</h1>
          <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">{total} saídas registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>Exportar</Button>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowForm(true)}>Nova Saída</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Saídas Encontradas" value={total} sub="movimentos" icon={<ArrowUpFromLine className="h-4 w-4" />} variant="danger" />
        <StatCard label="Unidades na Página" value={formatNumber(totalQty)} sub="unidades" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Valor na Página" value={formatCurrency(totalValue)} sub="saídas exibidas" icon={<DollarSign className="h-4 w-4" />} variant="info" />
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Buscar produto, código, NF ou lote…"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1) }}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>
      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Produto', 'Código', 'Qtd', 'Valor Unit.', 'Total', 'Motivo', 'Destino', 'Operador', 'Data/Hora'].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && exits.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma saída encontrada.</td></tr>
            )}
            {exits.map((movement) => {
              const reason = movement.exitReason ?? (movement.type === 'transfer' ? 'transfer' : movement.type === 'loss' ? 'loss' : 'internal')
              return (
                <tr key={movement.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)]">
                  <td className="px-5 py-3.5 font-medium text-[color:var(--text-primary)]">{movement.product.name}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-[color:var(--text-tertiary)]">{movement.product.internalCode}</td>
                  <td className="px-5 py-3.5 font-semibold text-[color:var(--danger)]">−{formatNumber(movement.quantity)}</td>
                  <td className="px-5 py-3.5">{formatCurrency(movement.unitCost)}</td>
                  <td className="px-5 py-3.5 font-semibold">{formatCurrency(movement.totalValue)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={REASON_VARIANT[reason]} size="sm">{EXIT_REASON_LABELS[reason] ?? reason}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[color:var(--text-secondary)]">{movement.customerName ?? movement.toAddress?.code ?? '—'}</td>
                  <td className="px-5 py-3.5">{movement.user.name}</td>
                  <td className="px-5 py-3.5 text-xs text-[color:var(--text-tertiary)]">{formatDateTime(movement.createdAt)}</td>
                </tr>
              )
            })}
            {loading && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Carregando saídas…</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--text-tertiary)]">Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 1 || loading} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / PAGE_SIZE) || loading} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
        </div>
      </div>
    </div>
  )
}

function NovaSaidaForm({ onBack }: { onBack: () => void }) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productDetails, setProductDetails] = useState<ProductDetails | null>(null)
  const [reason, setReason] = useState<ExitReason | ''>('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [fromAddressId, setFromAddressId] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Paginated<ProductOption>>('/products', { page: 1, limit: 100 })
      .then((result) => setProducts(result.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Falha ao carregar produtos'))
      .finally(() => setLoadingOptions(false))
  }, [])

  const selectProduct = async (id: string) => {
    setProductId(id)
    setProductDetails(null)
    setFromAddressId('')
    setLotNumber('')
    if (!id) return
    try {
      const details = await api.get<ProductDetails>(`/products/${id}`)
      setProductDetails(details)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar endereços e lotes do produto')
    }
  }

  const handleSave = async () => {
    setError('')
    const requestedQuantity = Number(quantity)
    if (!productId || !reason || !Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      setError('Selecione o produto e o motivo e informe uma quantidade inteira positiva.')
      return
    }
    if (productDetails?.warehouseAddresses.length && !fromAddressId) {
      setError('Selecione o endereço de origem do estoque.')
      return
    }
    if (productDetails?.lots.length && !lotNumber) {
      setError('Selecione o lote da saída.')
      return
    }

    setSaving(true)
    try {
      await api.post('/movements', {
        type: reason === 'loss' ? 'loss' : 'exit',
        productId,
        quantity: requestedQuantity,
        exitReason: reason,
        customerName: customerName || undefined,
        notes: notes || undefined,
        fromAddressId: fromAddressId || undefined,
        lotNumber: lotNumber || undefined,
      })
      onBack()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao registrar saída')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Breadcrumb items={[{ label: 'Saídas', href: '/dashboard/saidas' }, { label: 'Nova Saída' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Nova Saída de Estoque</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
          <Button size="sm" loading={saving || loadingOptions} leftIcon={<ArrowUpFromLine className="h-3.5 w-3.5" />} onClick={handleSave}>
            {saving ? 'Registrando…' : 'Registrar Saída'}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}
      <div className="space-y-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-5">
        <Select
          label="Motivo da saída *"
          options={EXIT_REASONS}
          placeholder="Selecione o motivo"
          value={reason}
          onChange={(event) => setReason(event.target.value as ExitReason | '')}
        />
        <Select
          label="Produto *"
          options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.internalCode}) — estoque ${product.currentStock}` }))}
          placeholder="Selecione o produto"
          value={productId}
          onChange={(event) => { void selectProduct(event.target.value) }}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Quantidade *" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Input label="Cliente / destino" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        </div>
        {!!productDetails?.warehouseAddresses.length && (
          <Select
            label="Endereço de origem *"
            options={productDetails.warehouseAddresses.map((address) => ({ value: address.id, label: `${address.code} (${address.quantity ?? 0} unidades)` }))}
            placeholder="Selecione o endereço"
            value={fromAddressId}
            onChange={(event) => setFromAddressId(event.target.value)}
          />
        )}
        {!!productDetails?.lots.length && (
          <Select
            label="Lote *"
            options={productDetails.lots.map((lot) => ({ value: lot.lotNumber, label: `${lot.lotNumber} (${lot.quantity} unidades)` }))}
            placeholder="Selecione o lote"
            value={lotNumber}
            onChange={(event) => setLotNumber(event.target.value)}
          />
        )}
        <label className="block text-sm font-medium text-[color:var(--text-primary)]">
          Observações
          <textarea
            rows={3}
            className="mt-1.5 w-full resize-none rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>
    </div>
  )
}
