'use client'
import { useState } from 'react'
import { ScanLine, Search, Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { mockProducts } from '@/mocks/products'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const MODES = [
  { id: 'entry', label: 'Entrada', icon: ArrowDownToLine, color: 'text-[color:var(--success)]', bg: 'bg-[color:var(--success-subtle)]' },
  { id: 'exit', label: 'Saída', icon: ArrowUpFromLine, color: 'text-[color:var(--danger)]', bg: 'bg-[color:var(--danger-subtle)]' },
  { id: 'query', label: 'Consulta', icon: Search, color: 'text-[color:var(--brand)]', bg: 'bg-[color:var(--brand-subtle)]' },
  { id: 'transfer', label: 'Transferência', icon: RefreshCw, color: 'text-[color:var(--warning)]', bg: 'bg-[color:var(--warning-subtle)]' },
]

const RECENT_SCANS = [
  { code: '7891234567890', product: 'Cabo HDMI 2.0 2m', action: 'entry', qty: 50, time: '14:32' },
  { code: '7891234567891', product: 'Luva de Segurança CA', action: 'exit', qty: 24, time: '14:15' },
  { code: '7891234567893', product: 'Parafuso M8×50', action: 'transfer', qty: 500, time: '12:30' },
]

export default function ScannerPage() {
  const [mode, setMode] = useState('query')
  const [input, setInput] = useState('')
  const [found, setFound] = useState<(typeof mockProducts)[0] | null>(null)
  const [scanned, setScanned] = useState(false)

  const handleSearch = () => {
    const product = mockProducts.find(p =>
      p.barcode === input || p.internalCode === input || p.sku === input
    )
    setFound(product ?? null)
    setScanned(true)
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
              <Button onClick={handleSearch}>Buscar</Button>
            </div>
            <p className="text-center text-xs text-[color:var(--text-tertiary)]">
              Tente: <button onClick={() => setInput('7891234567890')} className="text-[color:var(--brand)] underline">7891234567890</button>{' '}
              ou <button onClick={() => setInput('EL-0042')} className="text-[color:var(--brand)] underline">EL-0042</button>
            </p>
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
                  { label: 'Categoria', value: found.categoryName },
                  { label: 'Preço Venda', value: formatCurrency(found.salePrice) },
                ].map(d => (
                  <div key={d.label} className="bg-white/50 rounded-[var(--radius-md)] p-2 text-center">
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{d.label}</p>
                    <p className="text-xs font-bold text-[color:var(--text-primary)] mt-0.5">{d.value}</p>
                  </div>
                ))}
              </div>
              {mode !== 'query' && (
                <div className="flex gap-2">
                  <Input type="number" placeholder="Quantidade" className="flex-1" />
                  <Button size="sm">{MODES.find(m => m.id === mode)?.label}</Button>
                </div>
              )}
            </div>
          )}

          {scanned && !found && (
            <div className="bg-[color:var(--danger-subtle)] border border-[color:var(--danger-muted)] rounded-[var(--radius-lg)] p-4 animate-fade-in">
              <p className="text-sm font-semibold text-[color:var(--danger)]">Produto não encontrado</p>
              <p className="text-xs text-[color:var(--text-secondary)] mt-1">O código "{input}" não corresponde a nenhum produto cadastrado.</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline">Cadastrar produto</Button>
                <Button size="sm" variant="ghost" onClick={() => { setScanned(false); setInput('') }}>Tentar novamente</Button>
              </div>
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5">
          <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-4">Leituras Recentes</h3>
          <div className="space-y-3">
            {RECENT_SCANS.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0',
                  s.action === 'entry' ? 'bg-[color:var(--success-subtle)]' : s.action === 'exit' ? 'bg-[color:var(--danger-subtle)]' : 'bg-[color:var(--warning-subtle)]'
                )}>
                  {s.action === 'entry'
                    ? <ArrowDownToLine className="w-4 h-4 text-[color:var(--success)]" />
                    : s.action === 'exit'
                    ? <ArrowUpFromLine className="w-4 h-4 text-[color:var(--danger)]" />
                    : <RefreshCw className="w-4 h-4 text-[color:var(--warning)]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">{s.product}</p>
                  <p className="text-xs font-mono text-[color:var(--text-tertiary)]">{s.code} · {s.qty} un</p>
                </div>
                <span className="text-xs text-[color:var(--text-tertiary)]">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
