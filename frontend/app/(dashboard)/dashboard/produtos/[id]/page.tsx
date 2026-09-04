import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Edit, Package, Barcode, Tag, Truck, TrendingDown,
  TrendingUp, ArrowDownToLine, ArrowUpFromLine, History,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { mockProducts } from '@/mocks/products'
import { mockMovements } from '@/mocks/movements'
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils'
import { cn } from '@/lib/cn'

const STOCK_STATUS = {
  ok:       { label: 'Em Estoque',    variant: 'success' as const },
  low:      { label: 'Estoque Baixo', variant: 'warning' as const },
  critical: { label: 'Crítico',       variant: 'danger' as const },
  out:      { label: 'Sem Estoque',   variant: 'danger' as const },
}
const PRODUCT_STATUS = {
  active:       { label: 'Ativo',         variant: 'success' as const },
  inactive:     { label: 'Inativo',       variant: 'default' as const },
  discontinued: { label: 'Descontinuado', variant: 'secondary' as const },
}

export default async function ProdutoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = mockProducts.find(p => p.id === id)
  if (!product) notFound()

  const movements = mockMovements.filter(m => m.productId === id).slice(0, 5)
  const margin = ((product.salePrice - product.purchasePrice) / product.purchasePrice * 100)

  return (
    <div className="space-y-5 max-w-6xl">
      <Breadcrumb items={[
        { label: 'Produtos', href: '/dashboard/produtos' },
        { label: product.name },
      ]} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/produtos">
            <button className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] hover:bg-[color:var(--bg-muted)] transition-colors text-[color:var(--text-secondary)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[color:var(--text-primary)]">{product.name}</h1>
              <Badge variant={PRODUCT_STATUS[product.status].variant} dot>{PRODUCT_STATUS[product.status].label}</Badge>
            </div>
            <p className="text-sm text-[color:var(--text-tertiary)] font-mono mt-0.5">{product.internalCode} · {product.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Movimentar</Button>
          <Button size="sm" leftIcon={<Edit className="w-3.5 h-3.5" />}>Editar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Main info */}
        <div className="xl:col-span-2 space-y-5">
          {/* Image + basic */}
          <Card padding={false}>
            <div className="flex gap-5 p-5">
              <div className="w-28 h-28 rounded-[var(--radius-lg)] bg-[color:var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                <Package className="w-12 h-12 text-[color:var(--text-tertiary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Categoria</p>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{product.categoryName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Marca</p>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{product.brandName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Unidade</p>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{product.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Cód. de Barras</p>
                    <p className="text-sm font-medium text-[color:var(--text-primary)] font-mono">{product.barcode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Fornecedor</p>
                    <p className="text-sm font-medium text-[color:var(--text-primary)]">{product.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-0.5">Status Estoque</p>
                    <Badge variant={STOCK_STATUS[product.stockStatus].variant} dot size="sm">
                      {STOCK_STATUS[product.stockStatus].label}
                    </Badge>
                  </div>
                </div>
                {product.description && (
                  <p className="text-sm text-[color:var(--text-secondary)] mt-3 border-t border-[color:var(--border)] pt-3">{product.description}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Stock metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide font-medium">Estoque Atual</p>
                <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center',
                  product.stockStatus === 'ok' ? 'bg-[color:var(--success-subtle)]'
                  : product.stockStatus === 'low' ? 'bg-[color:var(--warning-subtle)]'
                  : 'bg-[color:var(--danger-subtle)]'
                )}>
                  {product.currentStock > product.minStock
                    ? <TrendingUp className={cn('w-4 h-4', product.stockStatus === 'ok' ? 'text-[color:var(--success)]' : 'text-[color:var(--warning)]')} />
                    : <TrendingDown className="w-4 h-4 text-[color:var(--danger)]" />
                  }
                </div>
              </div>
              <p className="text-2xl font-bold text-[color:var(--text-primary)]">{formatNumber(product.currentStock)}</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{product.unit}</p>
            </div>
            <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide font-medium mb-2">Mín / Máx</p>
              <p className="text-2xl font-bold text-[color:var(--text-primary)]">{formatNumber(product.minStock)}</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">até {formatNumber(product.maxStock)}</p>
            </div>
            <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4">
              <p className="text-xs text-[color:var(--text-tertiary)] uppercase tracking-wide font-medium mb-2">Valor em Estoque</p>
              <p className="text-xl font-bold text-[color:var(--text-primary)]">{formatCurrency(product.currentStock * product.purchasePrice)}</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">ao preço de custo</p>
            </div>
          </div>

          {/* Occupancy bar */}
          <Card>
            <CardHeader>
              <CardTitle>Nível de Estoque</CardTitle>
              <Badge
                variant={STOCK_STATUS[product.stockStatus].variant}
                dot
              >
                {STOCK_STATUS[product.stockStatus].label}
              </Badge>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[color:var(--text-tertiary)]">
                <span>0</span>
                <span>Mín: {product.minStock}</span>
                <span>Atual: {formatNumber(product.currentStock)}</span>
                <span>Máx: {product.maxStock}</span>
              </div>
              <div className="relative h-4 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (product.currentStock / product.maxStock) * 100)}%`,
                    background: product.stockStatus === 'ok' ? 'var(--success)' : product.stockStatus === 'low' ? 'var(--warning)' : 'var(--danger)',
                  }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-[color:var(--text-tertiary)] opacity-50"
                  style={{ left: `${(product.minStock / product.maxStock) * 100}%` }}
                />
              </div>
              <p className="text-xs text-[color:var(--text-tertiary)]">
                {Math.round((product.currentStock / product.maxStock) * 100)}% da capacidade máxima utilizada
              </p>
            </div>
          </Card>

          {/* Movement history */}
          <Card padding={false}>
            <CardHeader className="p-5 pb-3">
              <CardTitle description="Últimas movimentações">Histórico</CardTitle>
              <Link href="/dashboard/movimentacoes">
                <Button variant="ghost" size="xs" leftIcon={<History className="w-3 h-3" />}>Ver tudo</Button>
              </Link>
            </CardHeader>
            {movements.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="divide-y divide-[color:var(--border)]">
                {movements.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[color:var(--bg-subtle)] transition-colors">
                    <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0',
                      m.type === 'entry' ? 'bg-[color:var(--success-subtle)]' : 'bg-[color:var(--danger-subtle)]'
                    )}>
                      {m.type === 'entry'
                        ? <ArrowDownToLine className="w-4 h-4 text-[color:var(--success)]" />
                        : <ArrowUpFromLine className="w-4 h-4 text-[color:var(--danger)]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">
                        {m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Saída' : 'Transferência'} de {formatNumber(Math.abs(m.quantity))} {product.unit}
                      </p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">{m.userName} · {new Date(m.createdAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{formatCurrency(m.totalValue)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Precificação</CardTitle>
            </CardHeader>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                <span className="text-sm text-[color:var(--text-secondary)]">Preço de Compra</span>
                <span className="text-sm font-semibold text-[color:var(--text-primary)]">{formatCurrency(product.purchasePrice)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[color:var(--brand-subtle)] rounded-[var(--radius-md)]">
                <span className="text-sm text-[color:var(--text-secondary)]">Preço de Venda</span>
                <span className="text-sm font-bold text-[color:var(--brand)]">{formatCurrency(product.salePrice)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[color:var(--success-subtle)] rounded-[var(--radius-md)]">
                <span className="text-sm text-[color:var(--text-secondary)]">Margem</span>
                <span className="text-sm font-bold text-[color:var(--success)]">{margin.toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Físicos</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {[
                { label: 'Peso', value: `${product.weight} kg` },
                { label: 'Largura', value: `${product.dimensions.width} cm` },
                { label: 'Altura', value: `${product.dimensions.height} cm` },
                { label: 'Profundidade', value: `${product.dimensions.depth} cm` },
              ].map(d => (
                <div key={d.label} className="flex justify-between items-center py-1.5 border-b border-[color:var(--border)] last:border-0">
                  <span className="text-xs text-[color:var(--text-tertiary)]">{d.label}</span>
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">{d.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {[
                { label: 'Cadastrado em', value: formatDate(product.createdAt) },
                { label: 'Atualizado em', value: formatDate(product.updatedAt) },
                { label: 'Código interno', value: product.internalCode },
                { label: 'Fornecedor', value: product.supplierName },
              ].map(d => (
                <div key={d.label} className="py-1.5 border-b border-[color:var(--border)] last:border-0">
                  <p className="text-xs text-[color:var(--text-tertiary)]">{d.label}</p>
                  <p className="text-sm font-medium text-[color:var(--text-primary)] mt-0.5">{d.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
