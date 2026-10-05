'use client'

import { useEffect, useState } from 'react'
import { ArrowDownToLine, Download, FileText, Package, Plus, Search } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { ApiError, api } from '@/lib/api'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { MovementRecord } from '@/types/movement'

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
}

interface SupplierOption {
  id: string
  name: string
}

interface AddressOption {
  id: string
  code: string
  status: 'free' | 'occupied' | 'blocked' | 'reserved'
}

const PAGE_SIZE = 20

export default function EntradasPage() {
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
      type: 'entry',
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
        error: err instanceof Error ? err.message : 'Falha ao carregar entradas',
      })
    })
    return () => { active = false }
  }, [key, page, search])

  const entries = result?.key === key ? result.data : []
  const total = result?.key === key ? result.total : 0
  const loading = result?.key !== key
  const error = result?.key === key ? result.error : undefined
  const totalValue = entries.reduce((sum, movement) => sum + movement.totalValue, 0)
  const totalQty = entries.reduce((sum, movement) => sum + movement.quantity, 0)

  if (showForm) {
    return <NovaEntradaForm onBack={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Entradas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Entradas de Estoque</h1>
          <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">{total} entradas registradas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-3.5 w-3.5" />}>Exportar</Button>
          <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => setShowForm(true)}>
            Nova Entrada
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Entradas Encontradas" value={total} sub="movimentos" icon={<ArrowDownToLine className="h-4 w-4" />} variant="success" />
        <StatCard label="Unidades na Página" value={formatNumber(totalQty)} sub="unidades" icon={<Package className="h-4 w-4" />} />
        <StatCard label="Valor na Página" value={formatCurrency(totalValue)} sub="entradas exibidas" icon={<FileText className="h-4 w-4" />} variant="info" />
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
              {['Produto', 'Código', 'Qtd', 'Custo Unit.', 'Total', 'NF / Lote', 'Fornecedor', 'Operador', 'Data/Hora'].map((heading) => (
                <th key={heading} className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && entries.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma entrada encontrada.</td></tr>
            )}
            {entries.map((movement) => (
              <tr key={movement.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)]">
                <td className="px-5 py-3.5 font-medium text-[color:var(--text-primary)]">{movement.product.name}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-[color:var(--text-tertiary)]">{movement.product.internalCode}</td>
                <td className="px-5 py-3.5 font-semibold text-[color:var(--success)]">+{formatNumber(movement.quantity)}</td>
                <td className="px-5 py-3.5">{formatCurrency(movement.unitCost)}</td>
                <td className="px-5 py-3.5 font-semibold">{formatCurrency(movement.totalValue)}</td>
                <td className="px-5 py-3.5 text-xs">
                  {movement.invoiceNumber ?? '—'}
                  {movement.lotNumber && <p className="text-[color:var(--text-tertiary)]">Lote: {movement.lotNumber}</p>}
                </td>
                <td className="px-5 py-3.5 text-xs">{movement.supplier?.name ?? '—'}</td>
                <td className="px-5 py-3.5">{movement.user.name}</td>
                <td className="px-5 py-3.5 text-xs text-[color:var(--text-tertiary)]">{formatDateTime(movement.createdAt)}</td>
              </tr>
            ))}
            {loading && <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Carregando entradas…</td></tr>}
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

function NovaEntradaForm({ onBack }: { onBack: () => void }) {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [addresses, setAddresses] = useState<AddressOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    unitCost: '',
    invoiceNumber: '',
    supplierId: '',
    lotNumber: '',
    manufacturingDate: '',
    expirationDate: '',
    toAddressId: '',
    notes: '',
  })

  useEffect(() => {
    Promise.all([
      api.get<Paginated<ProductOption>>('/products', { page: 1, limit: 100 }),
      api.get<Paginated<SupplierOption>>('/suppliers', { page: 1, limit: 100 }),
      api.get<Paginated<AddressOption>>('/warehouse', { page: 1, limit: 100 }),
    ]).then(([productResult, supplierResult, addressResult]) => {
      setProducts(productResult.data)
      setSuppliers(supplierResult.data)
      setAddresses(addressResult.data)
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Falha ao carregar opções do formulário')
    }).finally(() => setLoadingOptions(false))
  }, [])

  const setField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    setError('')
    const quantity = Number(form.quantity)
    const unitCost = Number(form.unitCost)
    if (!form.productId || !Number.isInteger(quantity) || quantity <= 0 || !form.toAddressId) {
      setError('Selecione o produto e o endereço e informe uma quantidade inteira positiva.')
      return
    }
    if (form.lotNumber && (!form.supplierId || !form.manufacturingDate || !form.expirationDate)) {
      setError('Para registrar um lote, informe fornecedor e datas de fabricação e validade.')
      return
    }

    setSaving(true)
    try {
      await api.post('/movements', {
        type: 'entry',
        productId: form.productId,
        quantity,
        unitCost: Number.isFinite(unitCost) ? unitCost : 0,
        invoiceNumber: form.invoiceNumber || undefined,
        supplierId: form.supplierId || undefined,
        lotNumber: form.lotNumber || undefined,
        manufacturingDate: form.manufacturingDate ? `${form.manufacturingDate}T00:00:00.000Z` : undefined,
        expirationDate: form.expirationDate ? `${form.expirationDate}T00:00:00.000Z` : undefined,
        toAddressId: form.toAddressId,
        notes: form.notes || undefined,
      })
      onBack()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao registrar entrada')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <Breadcrumb items={[{ label: 'Entradas', href: '/dashboard/entradas' }, { label: 'Nova Entrada' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Nova Entrada de Estoque</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
          <Button size="sm" loading={saving || loadingOptions} leftIcon={<ArrowDownToLine className="h-3.5 w-3.5" />} onClick={handleSave}>
            {saving ? 'Registrando…' : 'Registrar Entrada'}
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-5">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Dados do recebimento</h2>
          <Input label="Número da NF" value={form.invoiceNumber} onChange={(event) => setField('invoiceNumber', event.target.value)} />
          <Select
            label="Fornecedor"
            placeholder="Selecione o fornecedor"
            options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            value={form.supplierId}
            onChange={(event) => setField('supplierId', event.target.value)}
          />
          <Input label="Número do lote (opcional)" value={form.lotNumber} onChange={(event) => setField('lotNumber', event.target.value)} />
          <Input label="Data de fabricação" type="date" value={form.manufacturingDate} onChange={(event) => setField('manufacturingDate', event.target.value)} />
          <Input label="Data de validade" type="date" value={form.expirationDate} onChange={(event) => setField('expirationDate', event.target.value)} />
        </div>

        <div className="space-y-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-5">
          <h2 className="text-sm font-semibold text-[color:var(--text-primary)]">Item da entrada</h2>
          <Select
            label="Produto *"
            placeholder="Selecione o produto"
            options={products.map((product) => ({ value: product.id, label: `${product.name} (${product.internalCode})` }))}
            value={form.productId}
            onChange={(event) => setField('productId', event.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantidade *" type="number" min="1" value={form.quantity} onChange={(event) => setField('quantity', event.target.value)} />
            <Input label="Custo unitário" type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => setField('unitCost', event.target.value)} />
          </div>
          <Select
            label="Endereço de destino *"
            placeholder="Selecione o endereço"
            options={addresses
              .filter((address) => address.status === 'free' || address.status === 'occupied')
              .map((address) => ({ value: address.id, label: address.code }))}
            value={form.toAddressId}
            onChange={(event) => setField('toAddressId', event.target.value)}
          />
          <Input label="Observações" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
        </div>
      </div>
    </div>
  )
}
