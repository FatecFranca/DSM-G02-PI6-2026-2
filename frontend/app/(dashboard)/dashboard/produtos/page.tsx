'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Filter, LayoutGrid, List, Download,
  Package, MoreHorizontal, Eye, Edit, Trash2, ArrowUpDown,
  ChevronDown,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { mockProducts, mockCategories } from '@/mocks/products'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

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

const PER_PAGE = 10

export default function ProdutosPage() {
  const [view, setView] = useState<'table' | 'card'>('table')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')

  const filtered = useMemo(() => {
    let list = [...mockProducts]
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.internalCode.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    if (catFilter) list = list.filter(p => p.categoryId === catFilter)
    if (statusFilter) list = list.filter(p => p.status === statusFilter)
    if (stockFilter) list = list.filter(p => p.stockStatus === stockFilter)
    list.sort((a, b) => {
      const va = String(a[sortKey as keyof typeof a] ?? '')
      const vb = String(b[sortKey as keyof typeof b] ?? '')
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
    return list
  }, [search, catFilter, statusFilter, stockFilter, sortKey, sortDir])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Produtos' }]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Produtos</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{formatNumber(mockProducts.length)} produtos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>Exportar</Button>
          <Link href="/dashboard/produtos/novo">
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Produto</Button>
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Buscar por nome, código, SKU…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
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
              onChange={e => { setCatFilter(e.target.value); setPage(1) }}
              className="h-8 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            >
              <option value="">Todas as categorias</option>
              {mockCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="h-8 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            >
              <option value="">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="discontinued">Descontinuado</option>
            </select>
            <select
              value={stockFilter}
              onChange={e => { setStockFilter(e.target.value); setPage(1) }}
              className="h-8 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            >
              <option value="">Qualquer estoque</option>
              <option value="ok">Em Estoque</option>
              <option value="low">Estoque Baixo</option>
              <option value="critical">Crítico</option>
              <option value="out">Sem Estoque</option>
            </select>
            {(catFilter || statusFilter || stockFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setCatFilter(''); setStatusFilter(''); setStockFilter('') }}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-6 h-6" />}
          title="Nenhum produto encontrado"
          description="Tente ajustar seus filtros ou cadastre um novo produto."
          action={<Link href="/dashboard/produtos/novo"><Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Produto</Button></Link>}
        />
      ) : view === 'table' ? (
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded" />
                  </th>
                  {[
                    { key: 'name', label: 'Produto' },
                    { key: 'categoryName', label: 'Categoria' },
                    { key: 'currentStock', label: 'Estoque Atual' },
                    { key: 'salePrice', label: 'Preço Venda' },
                    { key: 'status', label: 'Status' },
                    { key: 'stockStatus', label: 'Estoque' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] cursor-pointer hover:text-[color:var(--text-primary)] transition-colors whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <tr key={p.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors group">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
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
                      <span className="text-sm text-[color:var(--text-secondary)]">{p.categoryName}</span>
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/dashboard/produtos/${p.id}`}>
                          <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors" title="Ver detalhes">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </Link>
                        <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors" title="Editar">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)] transition-colors" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-[color:var(--border)]">
            <Pagination
              page={page}
              totalPages={Math.ceil(filtered.length / PER_PAGE)}
              total={filtered.length}
              perPage={PER_PAGE}
              onPage={setPage}
            />
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginated.map(p => (
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
            <Pagination page={page} totalPages={Math.ceil(filtered.length / PER_PAGE)} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
          </div>
        </div>
      )}
    </div>
  )
}
