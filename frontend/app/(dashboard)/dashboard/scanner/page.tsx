'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ScanLine, Search, Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const MODES = [
  { id: 'entry', label: 'Entrada', icon: ArrowDownToLine, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
  { id: 'exit', label: 'Saída', icon: ArrowUpFromLine, color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]' },
  { id: 'query', label: 'Consulta', icon: Search, color: 'text-[color:var(--brand)]', bg: 'bg-[color:var(--brand-subtle)]' },
  { id: 'transfer', label: 'Transferência', icon: RefreshCw, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
]

interface ScannedProduct {
  id: string
  name: string
  internalCode: string
  sku: string
  barcode: string
  currentStock: number
  unit: string
  salePrice: number
  stockStatus: 'ok' | 'low' | 'critical' | 'out'
  category: { name: string } | null
}

export default function ScannerPage() {
  const [mode, setMode] = useState('query')
  const [input, setInput] = useState('')
  const [found, setFound] = useState<ScannedProduct | null>(null)
  const [scanned, setScanned] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState<ScannedProduct[]>([])

  const handleSearch = async () => {
    if (!input.trim()) return
    setSearching(true)
    setError('')
    setScanned(false)
    try {
      const result = await api.get<{ data: ScannedProduct[] }>('/products', { search: input.trim(), limit: 100 })
      const product = result.data.find((item) =>
        item.barcode === input.trim() || item.internalCode === input.trim() || item.sku === input.trim()
      ) ?? null
      setFound(product)
      setScanned(true)
      if (product) setRecentScans((current) => [product, ...current.filter((item) => item.id !== product.id)].slice(0, 8))
    } catch (err) {
      setFound(null)
      setError(err instanceof Error ? err.message : 'Falha ao consultar produto')
    } finally {
      setSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'WMS' }, { label: 'Scanner' }]} />

      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Scanner de Código</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Leitura de código de barras, QR Code e SKU</p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODES.map(m => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setScanned(false); setFound(null); setInput('') }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-[var(--radius-lg)] border text-left transition-all',
                mode === m.id
                  ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] shadow-md'
                  : 'bg-[color:var(--bg-base)] border-[color:var(--border)] hover:shadow-sm'
              )}
            >
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', m.bg)}>
                <Icon className={cn('w-4 h-4', m.color)} />
              </div>
              <span className={cn('text-sm font-semibold', mode === m.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-primary)]')}>{m.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Scanner input */}
        <div className="space-y-4">
          <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-xl)] p-6 space-y-5">
            <div className="flex items-center justify-center">
              <div className={cn(
                'w-24 h-24 rounded-[var(--radius-2xl)] flex items-center justify-center transition-all',
                scanned && found ? 'bg-[color:var(--success-subtle)]' : scanned && !found ? 'bg-[color:var(--danger-subtle)]' : 'bg-[color:var(--bg-muted)]'
              )}>
                {scanned && found
                  ? <CheckCircle2 className="w-12 h-12 text-[color:var(--success)]" />
                  : <ScanLine className={cn('w-12 h-12', scanned && !found ? 'text-[color:var(--danger)]' : 'text-[color:var(--text-tertiary)]')} />
                }
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                {scanned
                  ? found ? `Produto encontrado!` : 'Produto não encontrado'
                  : 'Aguardando leitura…'}
              </p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                {MODES.find(m => m.id === mode)?.label} · Posicione o código na câmera ou digite abaixo
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Código de barras, SKU ou código interno…"
                value={input}
                onChange={e => { setInput(e.target.value); setScanned(false) }}
                onKeyDown={handleKeyDown}
                leftIcon={<ScanLine className="w-4 h-4" />}
                className="flex-1"
              />
              <Button onClick={handleSearch} loading={searching} disabled={!input.trim()}>Buscar</Button>
            </div>
            {error && <p role="alert" className="text-center text-xs text-[color:var(--danger)]">{error}</p>}
          </div>

          {/* Result */}
          {scanned && found && (
            <div className="bg-[color:var(--success-subtle)] border border-[color:var(--success-muted)] rounded-[var(--radius-lg)] p-5 animate-fade-in space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[color:var(--success)] bg-opacity-20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[color:var(--success)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{found.name}</p>
                  <p className="text-xs font-mono text-[color:var(--text-tertiary)]">{found.internalCode} · {found.sku}</p>
                </div>
                <Badge variant={found.stockStatus === 'ok' ? 'success' : found.stockStatus === 'out' ? 'danger' : 'warning'} dot>
                  {found.stockStatus === 'ok' ? 'Em Estoque' : found.stockStatus === 'out' ? 'Sem Estoque' : 'Baixo'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Estoque', value: `${formatNumber(found.currentStock)} ${found.unit}` },
                  { label: 'Categoria', value: found.category?.name ?? '—' },
                  { label: 'Preço Venda', value: formatCurrency(found.salePrice) },
                ].map(d => (
                  <div key={d.label} className="bg-white/50 rounded-[var(--radius-md)] p-2 text-center">
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{d.label}</p>
                    <p className="text-xs font-bold text-[color:var(--text-primary)] mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>
              {mode !== 'query' && (
                <Link href={`/dashboard/${mode === 'entry' ? 'entradas' : mode === 'exit' ? 'saidas' : 'movimentacoes'}?productId=${encodeURIComponent(found.id)}`} className="inline-flex">
                  <Button size="sm">{mode === 'entry' ? 'Registrar entrada' : mode === 'exit' ? 'Registrar saída' : 'Abrir movimentações'}</Button>
                </Link>
              )}
            </div>
          )}

          {scanned && !found && (
            <div className="bg-[color:var(--danger-subtle)] border border-[color:var(--danger-muted)] rounded-[var(--radius-lg)] p-4 animate-fade-in">
              <p className="text-sm font-semibold text-[color:var(--danger)]">Produto não encontrado</p>
              <p className="text-xs text-[color:var(--text-secondary)] mt-1">O código &quot;{input}&quot; não corresponde a nenhum produto cadastrado.</p>
              <div className="flex gap-2 mt-3">
                <Link href="/dashboard/produtos/novo"><Button size="sm" variant="outline">Cadastrar produto</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => { setScanned(false); setInput('') }}>Tentar novamente</Button>
              </div>
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-4">Consultas Recentes nesta Sessão</h3>
          <div className="space-y-3">
            {recentScans.map((product) => (
              <button key={product.id} onClick={() => { setInput(product.barcode || product.internalCode); setFound(product); setScanned(true) }} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] p-3 text-left">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color:var(--brand-subtle)]">
                  <Package className="h-4 w-4 text-[color:var(--brand)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[color:var(--text-primary)]">{product.name}</p>
                  <p className="font-mono text-xs text-[color:var(--text-tertiary)]">{product.barcode || product.internalCode}</p>
                </div>
              </button>
            ))}
            {recentScans.length === 0 && <p className="py-8 text-center text-xs text-[color:var(--text-tertiary)]">Os produtos consultados aparecerão aqui.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
