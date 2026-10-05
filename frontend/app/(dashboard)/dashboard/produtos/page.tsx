'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Filter, LayoutGrid, List, Download,
  Package, Eye, Edit, Trash2, ChevronDown,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageLoading } from '@/components/ui/Loading'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'
import { api } from '@/lib/api'
import { fetchAll } from '@/lib/fetch-all'
import { downloadCsv } from '@/lib/csv'
import { useAuth } from '@/lib/auth-context'
import { ADMIN, hasRole, STAFF } from '@/lib/permissions'
import { useDebounce } from '@/hooks/useDebounce'
import { errorMessage, useFetch } from '@/hooks/useFetch'
import type { ApiCategory, ApiProduct, Paginated } from '@/types/api'

const STOCK_STATUS = {
  ok:       { label: 'Em Estoque',   variant: 'success' as const },
  low:      { label: 'Estoque Baixo',variant: 'warning' as const },
  critical: { label: 'Crítico',      variant: 'danger' as const  },
  out:      { label: 'Sem Estoque',  variant: 'danger' as const  },
}
const PRODUCT_STATUS = {
  active:       { label: 'Ativo',          variant: 'success' as const },
  inactive:     { label: 'Inativo',        variant: 'default' as const },
  discontinued: { label: 'Descontinuado',  variant: 'secondary' as const },
}

const PER_PAGE = 12
const selectCls = 'h-8 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]'

export default function ProdutosPage() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const [view, setView] = useState<'table' | 'card'>('table')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [toDelete, setToDelete] = useState<ApiProduct | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: categories } = useFetch<ApiCategory[]>('/categories')
  const { data, loading, error, reload } = useFetch<Paginated<ApiProduct>>('/products', {
    page, limit: PER_PAGE,
    search: debouncedSearch.trim() || undefined,
    categoryId: catFilter || undefined,
    status: statusFilter || undefined,
    stockStatus: stockFilter || undefined,
  })

  const products = data?.data ?? []
  const total = data?.total ?? 0

  async function handleDelete() {
    if (!toDelete) return
    setBusy(true)
    try {
      await api.delete(`/products/${toDelete.id}`)
      setToDelete(null)
      await reload()
    } catch (err) {
      setActionError(errorMessage(err, 'Falha ao remover produto'))
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  async function exportCsv() {
    const all = await fetchAll<ApiProduct>('/products', {
      search: debouncedSearch.trim() || undefined, categoryId: catFilter || undefined, status: statusFilter || undefined, stockStatus: stockFilter || undefined,
    })
    downloadCsv('produtos.csv',
      ['Código', 'SKU', 'Código de barras', 'Produto', 'Categoria', 'Marca', 'Fornecedor', 'Unidade', 'Estoque', 'Mínimo', 'Máximo', 'Preço compra', 'Preço venda', 'Status'],
      all.map(p => [p.internalCode, p.sku, p.barcode, p.name, p.category.name, p.brand.name, p.supplier.name, p.unit, p.currentStock, p.minStock, p.maxStock, p.purchasePrice, p.salePrice, PRODUCT_STATUS[p.status].label]))
  }

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Produtos' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Produtos</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{formatNumber(total)} produtos {debouncedSearch || catFilter || statusFilter || stockFilter ? 'encontrados' : 'cadastrados'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={exportCsv}>Exportar</Button>
          {canEdit && (
            <Link href="/dashboard/produtos/novo">
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Produto</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por nome, código, SKU ou código de barras…"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Filter className="w-3.5 h-3.5" />}
            rightIcon={<ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />}
            onClick={() => setShowFilters(v => !v)}
          >
            Filtros {(catFilter || statusFilter || stockFilter) ? <Badge variant="brand" size="sm" className="ml-1">!</Badge> : ''}
          </Button>
          <div className="flex gap-1 border border-[color:var(--border)] rounded-[var(--radius-md)] p-0.5">
            <button onClick={() => setView('table')} className={cn('px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors', view === 'table' ? 'bg-[color:var(--bg-muted)] text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]')}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('card')} className={cn('px-2.5 py-1.5 rounded-[var(--radius-sm)] transition-colors', view === 'card' ? 'bg-[color:var(--bg-muted)] text-[color:var(--text-primary)]' : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex gap-3 flex-wrap pt-2 border-t border-[color:var(--border)] animate-fade-in">
            <select
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value); resetPage() }}
              className={selectCls}
            >
              <option value="">Todas as categorias</option>
              {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); resetPage() }}
              className={selectCls}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="discontinued">Descontinuado</option>
            </select>
            <select
              value={stockFilter}
              onChange={e => { setStockFilter(e.target.value); resetPage() }}
              className={selectCls}
            >
              <option value="">Qualquer estoque</option>
              <option value="ok">Em Estoque</option>
              <option value="low">Estoque Baixo</option>
              <option value="critical">Crítico</option>
              <option value="out">Sem Estoque</option>
            </select>
            {(catFilter || statusFilter || stockFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setCatFilter(''); setStatusFilter(''); setStockFilter(''); resetPage() }}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {(error || actionError) && <Alert>{error || actionError}</Alert>}

      {/* Content */}
      {loading && !data ? (
        <PageLoading />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="Nenhum produto encontrado"
          description="Tente ajustar seus filtros ou cadastre um novo produto."
          action={canEdit ? <Link href="/dashboard/produtos/novo"><Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Produto</Button></Link> : undefined}
        />
      ) : view === 'table' ? (
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Produto', 'Categoria', 'Estoque Atual', 'Preço Venda', 'Status', 'Estoque'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/dashboard/produtos/${p.id}`}>
                            <p className="font-semibold text-[color:var(--text-primary)] hover:text-[color:var(--brand)] truncate max-w-[200px] transition-colors">{p.name}</p>
                          </Link>
                          <p className="text-xs text-[color:var(--text-tertiary)] font-mono">{p.internalCode} · {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[color:var(--text-secondary)]">{p.category.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-[color:var(--text-primary)]">{formatNumber(p.currentStock)} <span className="text-xs font-normal text-[color:var(--text-tertiary)]">{p.unit}</span></p>
                        <p className="text-xs text-[color:var(--text-tertiary)]">Mín: {p.minStock} · Máx: {p.maxStock}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(p.salePrice)}</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">Custo: {formatCurrency(p.purchasePrice)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={PRODUCT_STATUS[p.status].variant} dot>{PRODUCT_STATUS[p.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STOCK_STATUS[p.stockStatus].variant} dot>{STOCK_STATUS[p.stockStatus].label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Link href={`/dashboard/produtos/${p.id}`} title="Ver detalhes">
                          <span className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"><Eye className="w-3.5 h-3.5" /></span>
                        </Link>
                        {canEdit && (
                          <Link href={`/dashboard/produtos/${p.id}/editar`} title="Editar">
                            <span className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"><Edit className="w-3.5 h-3.5" /></span>
                          </Link>
                        )}
                        {canDelete && (
                          <button title="Excluir" onClick={() => setToDelete(p)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-[color:var(--border)]">
            <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} perPage={PER_PAGE} onPage={setPage} />
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map(p => (
              <Link key={p.id} href={`/dashboard/produtos/${p.id}`}>
                <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 hover:shadow-[var(--shadow-md)] hover:border-[color:var(--brand-muted)] transition-all group cursor-pointer">
                  <div className="w-full aspect-square rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center mb-3 group-hover:bg-[color:var(--brand-subtle)] transition-colors">
                    <Package className="w-8 h-8 text-[color:var(--text-tertiary)] group-hover:text-[color:var(--brand)] transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">{p.name}</p>
                  <p className="text-xs text-[color:var(--text-tertiary)] font-mono mt-0.5">{p.internalCode}</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={STOCK_STATUS[p.stockStatus].variant} size="sm" dot>{STOCK_STATUS[p.stockStatus].label}</Badge>
                    <span className="text-xs font-semibold text-[color:var(--text-primary)]">{formatCurrency(p.salePrice)}</span>
                  </div>
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">{formatNumber(p.currentStock)} {p.unit} em estoque</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={data?.totalPages ?? 1} total={total} perPage={PER_PAGE} onPage={setPage} />
          </div>
        </div>
      )}
      <ConfirmDialog open={!!toDelete} title="Excluir produto" message={`Excluir "${toDelete?.name}"? Produtos com movimentações não podem ser excluídos — marque-os como inativos.`} confirmLabel="Excluir" loading={busy} onConfirm={handleDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}
