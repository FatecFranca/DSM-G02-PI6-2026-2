'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ScanLine, Search, Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, CheckCircle2, MapPin, Layers, X } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { ApiError, api } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const MODES = [
  { id: 'entry', label: 'Entrada', icon: ArrowDownToLine, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
  { id: 'exit', label: 'Saída', icon: ArrowUpFromLine, color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]' },
  { id: 'query', label: 'Consulta', icon: Search, color: 'text-[color:var(--brand)]', bg: 'bg-[color:var(--brand-subtle)]' },
  { id: 'transfer', label: 'Transferência', icon: RefreshCw, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
]

type StockStatus = 'ok' | 'low' | 'critical' | 'out'

interface ScannedProduct {
  id: string
  name: string
  internalCode: string
  sku: string
  barcode: string
  currentStock: number
  unit: string
  salePrice: number | string
  stockStatus: StockStatus
  category: { name: string } | null
  warehouseAddresses?: { id: string; code: string; quantity: number }[]
  lots?: { id: string; lotNumber: string; quantity: number }[]
}

const STATUS_LABEL: Record<StockStatus, { text: string; variant: 'success' | 'warning' | 'danger' }> = {
  ok: { text: 'Em estoque', variant: 'success' },
  low: { text: 'Estoque baixo', variant: 'warning' },
  critical: { text: 'Estoque crítico', variant: 'danger' },
  out: { text: 'Sem estoque', variant: 'danger' },
}

/** Dígitos (EAN/UPC) chegam sem espaços; leitores USB costumam acrescentar quebra de linha/tab. */
const clean = (value: string) => value.replace(/[\r\n\t]/g, '').trim()

export default function ScannerPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const lastCode = useRef('')
  const [mode, setMode] = useState('query')
  const [input, setInput] = useState('')
  const [found, setFound] = useState<ScannedProduct | null>(null)
  const [similar, setSimilar] = useState<ScannedProduct[]>([])
  const [searched, setSearched] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [recentScans, setRecentScans] = useState<ScannedProduct[]>([])

  useEffect(() => { inputRef.current?.focus() }, [])

  const remember = useCallback((product: ScannedProduct) => {
    setRecentScans(current => [product, ...current.filter(item => item.id !== product.id)].slice(0, 8))
  }, [])

  const lookup = useCallback(async (raw: string) => {
    const code = clean(raw)
    if (!code) return
    const id = ++requestId.current
    lastCode.current = code
    setSearching(true)
    setError('')
    try {
      // 1) Correspondência exata por código de barras, SKU ou código interno.
      let product: ScannedProduct | null = null
      try {
        product = await api.get<ScannedProduct>(`/products/scan/${encodeURIComponent(code)}`)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err
      }
      if (id !== requestId.current) return
      if (product) {
        setFound(product)
        setSimilar([])
        setSearched(code)
        remember(product)
        return
      }
      // 2) Sem correspondência exata: sugere produtos que contêm o texto (parte do código ou do nome).
      const result = await api.get<{ data: ScannedProduct[] }>('/products', { search: code, limit: 6 })
      if (id !== requestId.current) return
      setFound(null)
      setSimilar(result.data)
      setSearched(code)
    } catch (err) {
      if (id !== requestId.current) return
      setFound(null)
      setSimilar([])
      setError(err instanceof Error ? err.message : 'Falha ao consultar produto')
    } finally {
      if (id === requestId.current) setSearching(false)
    }
  }, [remember])

  // Busca automática enquanto digita (a partir de 3 caracteres); Enter e o botão buscam na hora.
  useEffect(() => {
    const code = clean(input)
    if (code.length < 3 || code === lastCode.current) return
    const timer = setTimeout(() => { void lookup(code) }, 450)
    return () => clearTimeout(timer)
  }, [input, lookup])

  function handleChange(value: string) {
    setInput(value)
    setError('')
    if (clean(value).length < 3) {
      requestId.current++
      lastCode.current = ''
      setSearching(false)
      setFound(null)
      setSimilar([])
      setSearched('')
    }
  }

  function reset() {
    requestId.current++
    lastCode.current = ''
    setInput('')
    setFound(null)
    setSimilar([])
    setSearched('')
    setError('')
    setSearching(false)
    inputRef.current?.focus()
  }

  function pick(product: ScannedProduct) {
    requestId.current++
    lastCode.current = clean(product.barcode || product.internalCode)
    setInput(product.barcode || product.internalCode)
    setFound(product)
    setSimilar([])
    setSearched(product.barcode || product.internalCode)
    remember(product)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void lookup(input)
    }
  }

  const notFound = !found && !searching && !error && searched !== ''
  const currentMode = MODES.find(m => m.id === mode)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'WMS' }, { label: 'Scanner' }]} />

      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Scanner de Código</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Leia ou digite o código de barras, SKU ou código interno — a busca é automática</p>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODES.map(m => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); inputRef.current?.focus() }}
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
        <div className="space-y-4">
          <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-xl)] p-6 space-y-5">
            <div className="flex items-center justify-center">
              <div className={cn(
                'w-24 h-24 rounded-[var(--radius-2xl)] flex items-center justify-center transition-all',
                found ? 'bg-[color:var(--success-subtle)]' : notFound ? 'bg-[color:var(--danger-subtle)]' : 'bg-[color:var(--bg-muted)]'
              )}>
                {found
                  ? <CheckCircle2 className="w-12 h-12 text-[color:var(--success)]" />
                  : <ScanLine className={cn('w-12 h-12', notFound ? 'text-[color:var(--danger)]' : searching ? 'text-[color:var(--brand)] animate-pulse' : 'text-[color:var(--text-tertiary)]')} />
                }
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-[color:var(--text-primary)]" aria-live="polite">
                {searching ? 'Buscando…' : found ? 'Produto encontrado!' : notFound ? 'Produto não encontrado' : 'Aguardando leitura…'}
              </p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">
                {currentMode?.label} · use o leitor ou digite o código e pressione Enter
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Código de barras, SKU ou código interno…"
                value={input}
                onChange={e => handleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                leftIcon={<ScanLine className="w-4 h-4" />}
                rightIcon={input ? (
                  <button type="button" onClick={reset} aria-label="Limpar" className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined}
                autoComplete="off"
                inputMode="text"
                className="flex-1"
              />
              <Button onClick={() => void lookup(input)} loading={searching} disabled={!clean(input)}>Buscar</Button>
            </div>
            {error && <p role="alert" className="text-center text-xs text-[color:var(--danger)]">{error}</p>}
          </div>

          {/* Result */}
          {found && (
            <div className="bg-[color:var(--success-subtle)] border border-[color:var(--success-muted)] rounded-[var(--radius-lg)] p-5 animate-fade-in space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[color:var(--bg-base)] flex items-center justify-center">
                  <Package className="w-5 h-5 text-[color:var(--success)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{found.name}</p>
                  <p className="text-xs font-mono text-[color:var(--text-tertiary)]">{found.internalCode} · {found.sku} · {found.barcode}</p>
                </div>
                <Badge variant={STATUS_LABEL[found.stockStatus].variant} dot>{STATUS_LABEL[found.stockStatus].text}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Estoque', value: `${formatNumber(found.currentStock)} ${found.unit}` },
                  { label: 'Categoria', value: found.category?.name ?? '—' },
                  { label: 'Preço Venda', value: formatCurrency(Number(found.salePrice)) },
                ].map(d => (
                  <div key={d.label} className="bg-[color:var(--bg-base)]/60 rounded-[var(--radius-md)] p-2 text-center">
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{d.label}</p>
                    <p className="text-xs font-bold text-[color:var(--text-primary)] mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>
              {(found.warehouseAddresses?.length || found.lots?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {!!found.warehouseAddresses?.length && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 font-semibold text-[color:var(--text-secondary)]"><MapPin className="w-3 h-3" />Endereços</p>
                      {found.warehouseAddresses.slice(0, 4).map(a => (
                        <p key={a.id} className="text-[color:var(--text-secondary)]"><span className="font-mono">{a.code}</span> · {formatNumber(a.quantity)} un</p>
                      ))}
                    </div>
                  )}
                  {!!found.lots?.length && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-1 font-semibold text-[color:var(--text-secondary)]"><Layers className="w-3 h-3" />Lotes ativos</p>
                      {found.lots.slice(0, 4).map(l => (
                        <p key={l.id} className="text-[color:var(--text-secondary)]"><span className="font-mono">{l.lotNumber}</span> · {formatNumber(l.quantity)} un</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {mode !== 'query' && (
                  <Link href={`/dashboard/${mode === 'entry' ? 'entradas' : mode === 'exit' ? 'saidas' : 'movimentacoes'}?productId=${encodeURIComponent(found.id)}`}>
                    <Button size="sm">{mode === 'entry' ? 'Registrar entrada' : mode === 'exit' ? 'Registrar saída' : 'Abrir movimentações'}</Button>
                  </Link>
                )}
                <Link href={`/dashboard/produtos/${found.id}`}><Button size="sm" variant="outline">Ver produto</Button></Link>
                <Button size="sm" variant="ghost" onClick={reset}>Nova leitura</Button>
              </div>
            </div>
          )}

          {notFound && (
            <div className="bg-[color:var(--danger-subtle)] border border-[color:var(--danger-muted)] rounded-[var(--radius-lg)] p-4 animate-fade-in">
              <p className="text-sm font-semibold text-[color:var(--danger)]">Nenhum produto com o código &quot;{searched}&quot;</p>
              {similar.length > 0 ? (
                <>
                  <p className="text-xs text-[color:var(--text-secondary)] mt-1">Produtos parecidos — toque para selecionar:</p>
                  <div className="mt-2 space-y-1.5">
                    {similar.map(p => (
                      <button key={p.id} onClick={() => pick(p)} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-[color:var(--bg-base)] p-2.5 text-left hover:bg-[color:var(--bg-subtle)]">
                        <Package className="h-4 w-4 flex-shrink-0 text-[color:var(--text-tertiary)]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[color:var(--text-primary)]">{p.name}</span>
                          <span className="block font-mono text-xs text-[color:var(--text-tertiary)]">{p.barcode} · {p.internalCode}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[color:var(--text-secondary)] mt-1">O código não corresponde a nenhum produto cadastrado.</p>
              )}
              <div className="flex gap-2 mt-3">
                <Link href="/dashboard/produtos/novo"><Button size="sm" variant="outline">Cadastrar produto</Button></Link>
                <Button size="sm" variant="ghost" onClick={reset}>Tentar novamente</Button>
              </div>
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-4">Consultas Recentes nesta Sessão</h3>
          <div className="space-y-3">
            {recentScans.map((product) => (
              <button key={product.id} onClick={() => pick(product)} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] p-3 text-left hover:bg-[color:var(--bg-muted)]">
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
