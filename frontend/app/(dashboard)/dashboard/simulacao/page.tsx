'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, CalendarClock, CheckCircle2, Info, PackageCheck, ShoppingCart, TrendingUp, Zap,
} from 'lucide-react'
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { PageLoading } from '@/components/ui/Loading'
import { useFetch } from '@/hooks/useFetch'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/utils'
import type { ApiProductForecasts } from '@/types/api'

type Item = ApiProductForecasts['products'][number]

const HORIZONS = [7, 14, 28]
const SCENARIOS = [
  { value: '0.8', label: 'Demanda 20% menor' },
  { value: '1', label: 'Previsão do modelo' },
  { value: '1.2', label: 'Demanda 20% maior' },
  { value: '1.5', label: 'Demanda 50% maior' },
]
const COVERAGE_DAYS = 28

// Uma cor de destaque (azul da marca) para o que importa; o resto fica em cinza neutro.
const ACCENT = 'var(--brand)'
const MUTED = 'var(--border-strong)'
const GRID = 'var(--border)'
const AXIS = { fill: 'var(--text-tertiary)', fontSize: 11 }
const TOOLTIP_STYLE = { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const longDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
const weekday = (iso: string) => longDay(iso).split(',')[0]
const fmt = (v: number, digits = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(v)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Projeção do produto: quando o estoque acaba, quanto repor e até quando. Mesmas regras do backend (IA Analítica). */
function project(p: Item, stock: number, factor: number, days: number, lead: number) {
  const mean = p.daily.map(d => d.mean * factor)
  const spread = p.daily.map(d => Math.max(0, d.high - d.mean) * factor)
  const window = mean.slice(0, days)

  let cum = 0
  let runOutIndex: number | null = null
  let coverDays: number | null = null
  for (let i = 0; i < window.length; i++) {
    if (cum + window[i] >= stock) {
      runOutIndex = i
      coverDays = stock === 0 ? 0 : i + (stock - cum) / Math.max(window[i], 1e-9)
      break
    }
    cum += window[i]
  }
  const total = sum(window)
  const safety = Math.sqrt(sum(spread.slice(0, lead).map(s => s * s)))
  const target = sum(mean.slice(0, COVERAGE_DAYS)) + safety
  const reorder = Math.max(0, Math.ceil(target - stock))
  const remaining = window.map((_, i) => Math.round(stock - sum(window.slice(0, i + 1))))
  return { mean, window, total, runOutIndex, coverDays, safety, reorder, remaining }
}

type Situation = { label: string; variant: 'danger' | 'warning' | 'success' }
function situation(stock: number, coverDays: number | null, lead: number): Situation {
  if (stock === 0) return { label: 'Sem estoque', variant: 'danger' }
  if (coverDays !== null && coverDays <= lead) return { label: 'Repor agora', variant: 'danger' }
  if (coverDays !== null && coverDays <= lead + 7) return { label: 'Atenção', variant: 'warning' }
  return { label: 'Coberto', variant: 'success' }
}

/** Previsão de demanda dos produtos do sistema, treinada com as saídas reais do estoque (Random Forest). */
export default function PrevisaoPage() {
  const { data, loading, error, reload } = useFetch<ApiProductForecasts>('/analytics/products-forecast', { horizon: 28 })
  if (loading && !data) return <PageLoading rows={4} />
  if (!data) return <div className="space-y-5"><Header /><Alert>{error || 'Não foi possível carregar a previsão'}</Alert></div>
  return <Forecast data={data} onReload={reload} reloading={loading} />
}

function Header({ right }: { right?: React.ReactNode }) {
  return (
    <>
      <Breadcrumb items={[{ label: 'Inteligência' }, { label: 'Previsão de Vendas' }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Previsão de Vendas</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Quanto cada produto deve sair nos próximos dias, calculado a partir das saídas reais do estoque.</p>
        </div>
        {right}
      </div>
    </>
  )
}

function Segmented<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[color:var(--text-primary)]">{label}</span>
      <div role="group" aria-label={label} className="flex h-9 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-muted)] p-0.5">
        {options.map(o => (
          <button
            key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}
            className={cn('flex-1 rounded-[calc(var(--radius-md)-2px)] px-2 text-sm font-medium transition-colors',
              o.value === value ? 'bg-[color:var(--bg-base)] text-[color:var(--text-primary)] shadow-[var(--shadow-sm)]' : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]')}
          >{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, sub, tone = 'default' }: {
  icon: React.ElementType; label: string; value: string; sub: string; tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const color = tone === 'success' ? 'text-[color:var(--success)]' : tone === 'warning' ? 'text-[color:var(--warning)]' : tone === 'danger' ? 'text-[color:var(--danger)]' : 'text-[color:var(--text-primary)]'
  return (
    <div className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className={cn('mt-1.5 text-2xl font-bold tabular-nums', color)}>{value}</p>
      <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)] truncate" title={sub}>{sub}</p>
    </div>
  )
}

function Forecast({ data, onReload, reloading }: { data: ApiProductForecasts; onReload: () => Promise<void>; reloading: boolean }) {
  const lead = data.leadTimeDays
  const { model } = data
  const [selectedId, setSelectedId] = useState<string>('')
  const [category, setCategory] = useState('')
  const [days, setDays] = useState(14)
  const [scenario, setScenario] = useState('1')
  const [stockInput, setStockInput] = useState('')
  const factor = Number(scenario)

  const categories = useMemo(() => [...new Set(data.products.map(p => p.category))].sort(), [data.products])
  const visible = data.products.filter(p => !category || p.category === category)

  // Visão geral: todos os produtos com o estoque real, ordenados por urgência.
  const overview = useMemo(() => data.products.map(p => {
    const proj = project(p, p.currentStock, factor, COVERAGE_DAYS, lead)
    return { p, proj, sit: situation(p.currentStock, proj.coverDays, lead) }
  }).sort((a, b) => (a.proj.coverDays ?? 999) - (b.proj.coverDays ?? 999) || b.proj.total - a.proj.total), [data.products, factor, lead])

  const defaultId = overview[0]?.p.id ?? ''
  const product = data.products.find(p => p.id === selectedId) ?? data.products.find(p => p.id === defaultId)

  if (!product) {
    return (
      <div className="space-y-5">
        <Header />
        <Card><p className="py-10 text-center text-sm text-[color:var(--text-secondary)]">Ainda não há saídas registradas para prever a demanda. Registre movimentações de saída para que o modelo aprenda com o histórico.</p></Card>
      </div>
    )
  }

  const stock = stockInput !== '' ? Math.max(0, Math.round(Number(stockInput) || 0)) : product.currentStock
  const proj = project(product, stock, factor, days, lead)
  const recentTotal = sum(product.recent.map(r => r.quantity))
  const recentMean = recentTotal / product.recent.length
  const mean = proj.total / Math.max(days, 1)
  const change = recentMean > 0 ? ((mean - recentMean) / recentMean) * 100 : null
  const allRecent = sum(data.products.flatMap(p => p.recent.map(r => r.quantity)))
  const runOutIso = proj.runOutIndex !== null ? product.daily[proj.runOutIndex].date : null
  const sit = situation(stock, proj.coverDays, lead)
  const orderByIso = runOutIso ? new Date(new Date(`${runOutIso}T12:00:00Z`).getTime() - lead * 86_400_000).toISOString().slice(0, 10) : null
  const orderNow = stock === 0 || (orderByIso !== null && orderByIso <= data.asOf)

  const chart = [
    ...product.recent.map(r => ({ date: r.date, label: shortDay(r.date), real: r.quantity } as Record<string, unknown>)),
    ...product.daily.slice(0, days).map((d, i) => ({
      date: d.date, label: shortDay(d.date), forecast: Math.round(proj.mean[i] * 100) / 100,
      band: [Math.round(d.low * factor * 100) / 100, Math.round(d.high * factor * 100) / 100],
    } as Record<string, unknown>)),
  ]
  const stockChart = proj.remaining.map((value, i) => ({ date: product.daily[i].date, label: shortDay(product.daily[i].date), value }))

  const bt = model.backtest
  const details = model.details
  const rf = details?.compared.find(c => c.id === 'rf')?.score
  const base = details?.compared.find(c => c.id === 'baseline')?.score
  const importance = (details?.importance ?? []).slice(0, 5)
  const maxWeight = Math.max(...importance.map(i => i.weight), 0.0001)
  const beatsBaseline = rf && base ? rf.wape < base.wape : null

  return (
    <div className="space-y-5">
      <Header right={
        <div className="flex items-center gap-2">
          <Badge variant={model.source === 'ml' ? 'success' : 'warning'} size="sm" dot>{model.source === 'ml' ? 'Modelo de ML ativo' : 'Média móvel (ML inativo)'}</Badge>
          <Button size="sm" variant="outline" leftIcon={<Zap className="w-3.5 h-3.5" />} onClick={() => void onReload()} loading={reloading}>Recalcular</Button>
        </div>
      } />

      {model.source !== 'ml' && (
        <Alert>
          O serviço de ML não respondeu ({model.reason ?? 'indisponível'}). A previsão abaixo usa a média dos últimos 28 dias. Para ativar o modelo, rode <code>cd backend && npm run ml:service</code> e defina <code>ML_SERVICE_URL=http://localhost:8100/wms</code>.
        </Alert>
      )}
      {allRecent === 0 && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[color:var(--warning-muted)] bg-[color:var(--warning-subtle)] p-4 text-sm text-[color:var(--text-primary)]">
          <Info className="mt-0.5 w-4 h-4 flex-shrink-0 text-[color:var(--warning)]" />
          <p>Não houve nenhuma saída nos últimos 28 dias (até {shortDay(data.asOf)}). O modelo parte desse histórico recente, então as previsões ficam baixas até que novas saídas sejam registradas.</p>
        </div>
      )}

      {/* Cenário */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select label="Categoria" value={category} onChange={e => { setCategory(e.target.value); setSelectedId(''); setStockInput('') }} placeholder="Todas" options={categories.map(c => ({ value: c, label: c }))} />
          <div className="lg:col-span-2">
            <Select
              label="Produto" value={product.id}
              onChange={e => { setSelectedId(e.target.value); setStockInput('') }}
              options={(visible.some(p => p.id === product.id) ? visible : [product, ...visible]).map(p => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </div>
          <Segmented label="Período" value={days} onChange={setDays} options={HORIZONS.map(h => ({ value: h, label: `${h} dias` }))} />
          <Select label="Cenário" value={scenario} onChange={e => setScenario(e.target.value)} options={SCENARIOS} />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input label="Estoque considerado" type="number" min={0} placeholder={String(product.currentStock)} value={stockInput} onChange={e => setStockInput(e.target.value)} hint={`Estoque atual: ${formatNumber(product.currentStock)} ${product.unit} · mínimo ${formatNumber(product.minStock)}`} />
          <p className="lg:col-span-4 self-end text-xs text-[color:var(--text-tertiary)] pb-2">
            Prazo de reposição: <strong className="text-[color:var(--text-secondary)]">{lead} dias</strong> (Configurações). Altere o estoque para simular uma compra ou perda e o cenário para ver o efeito de uma demanda diferente da prevista.
          </p>
        </div>
      </Card>

      {/* Indicadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={TrendingUp} label={`Demanda em ${days} dias`} value={`${fmt(proj.total)} ${product.unit}`}
          sub={`≈ ${fmt(mean, 1)}/dia${change !== null ? ` · ${change >= 0 ? '+' : ''}${fmt(change)}% vs. últimos 28 dias` : ''}`} />
        <Kpi icon={PackageCheck} label="Cobertura do estoque"
          value={stock === 0 ? 'Sem estoque' : proj.coverDays === null ? `> ${days} dias` : `${fmt(proj.coverDays)} dias`}
          sub={runOutIso ? `Acaba em ${weekday(runOutIso)}, ${shortDay(runOutIso)}` : `${formatNumber(stock)} ${product.unit} cobrem o período`}
          tone={sit.variant === 'danger' ? 'danger' : sit.variant === 'warning' ? 'warning' : 'success'} />
        <Kpi icon={ShoppingCart} label="Reposição sugerida" value={proj.reorder > 0 ? `${fmt(proj.reorder)} ${product.unit}` : 'Não precisa'}
          sub={proj.reorder > 0 ? `Cobre ${COVERAGE_DAYS} dias + segurança de ${fmt(proj.safety)}` : `Estoque cobre os próximos ${COVERAGE_DAYS} dias`} />
        <Kpi icon={CalendarClock} label="Pedir até"
          value={proj.reorder === 0 ? '—' : orderNow ? 'Agora' : orderByIso ? shortDay(orderByIso) : '—'}
          sub={proj.reorder === 0 ? 'Sem ruptura prevista' : `Considera ${lead} dias de prazo`}
          tone={proj.reorder > 0 && orderNow ? 'danger' : 'default'} />
      </div>

      {/* Gráficos */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card padding={false}>
          <CardHeader className="p-5 pb-3">
            <CardTitle description="Barras: saídas reais. Linha: previsão. Faixa: 80% dos dias">{product.name}</CardTitle>
            <Badge variant="default" size="sm">{product.category}</Badge>
          </CardHeader>
          <div className="h-[250px] px-5 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={Math.ceil(chart.length / 10) - 1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: MUTED }}
                  labelFormatter={(_, items) => { const d = items?.[0]?.payload?.date; return d ? longDay(String(d)) : '' }}
                  formatter={(v, name) => name === 'band' && Array.isArray(v) ? [`${fmt(Number(v[0]), 1)} – ${fmt(Number(v[1]), 1)}`, 'Faixa (80%)'] : [`${fmt(Number(v), 1)} ${product.unit}`, name === 'real' ? 'Saída real' : 'Previsto']} />
                <ReferenceLine x={shortDay(product.recent[product.recent.length - 1].date)} stroke="var(--text-tertiary)" strokeDasharray="4 4" label={{ value: 'hoje', position: 'insideTopRight', fill: 'var(--text-tertiary)', fontSize: 11 }} />
                <Area type="monotone" dataKey="band" stroke="none" fill={ACCENT} fillOpacity={0.12} isAnimationActive={false} />
                <Bar dataKey="real" fill={MUTED} radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Line type="monotone" dataKey="forecast" stroke={ACCENT} strokeWidth={2} dot={{ r: 2.5, fill: ACCENT, stroke: 'var(--bg-base)', strokeWidth: 1 }} activeDot={{ r: 5 }} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <CardHeader className="p-5 pb-3">
            <CardTitle description={`Partindo de ${formatNumber(stock)} ${product.unit}, sem nenhuma reposição`}>Estoque projetado</CardTitle>
            <Badge variant={sit.variant} size="sm" dot>{sit.label}</Badge>
          </CardHeader>
          <div className="h-[250px] px-5 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stockChart} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval={days > 14 ? 1 : 0} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: MUTED }}
                  labelFormatter={(_, items) => { const d = items?.[0]?.payload?.date; return d ? longDay(String(d)) : '' }}
                  formatter={v => [`${fmt(Number(v))} ${product.unit}`, Number(v) < 0 ? 'Falta' : 'Restante']} />
                <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="4 4" />
                {product.minStock > 0 && <ReferenceLine y={product.minStock} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'mínimo', position: 'insideTopRight', fill: 'var(--warning)', fontSize: 11 }} />}
                <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill={ACCENT} fillOpacity={0.1} dot={false} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="px-5 pb-4 text-xs text-[color:var(--text-tertiary)]">
            {runOutIso ? `Ruptura prevista em ${longDay(runOutIso)}; com ${lead} dias de prazo, o pedido precisa sair ${orderNow ? 'agora' : `até ${shortDay(orderByIso!)}`}.` : 'Sem ruptura prevista no período escolhido.'}
          </p>
        </Card>
      </div>

      {/* Todos os produtos */}
      <Card padding={false}>
        <CardHeader className="p-5 pb-3">
          <CardTitle description={`Estoque atual contra a demanda prevista dos próximos ${COVERAGE_DAYS} dias — mais urgentes primeiro`}>Todos os produtos</CardTitle>
          <Badge variant="brand" size="sm">{overview.length} produtos</Badge>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-y border-[color:var(--border)]">
              {['Produto', 'Estoque', `Demanda ${COVERAGE_DAYS}d`, 'Cobertura', 'Repor', 'Situação'].map(h => <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>)}
            </tr></thead>
            <tbody>
              {overview.map(({ p, proj: pr, sit: s }) => (
                <tr key={p.id} onClick={() => { setSelectedId(p.id); setStockInput(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className={cn('cursor-pointer border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)]', p.id === product.id && 'bg-[color:var(--brand-subtle)]')}>
                  <td className="px-4 py-2.5"><span className="font-medium text-[color:var(--text-primary)]">{p.name}</span><span className="block text-xs text-[color:var(--text-tertiary)]">{p.category} · {p.code}</span></td>
                  <td className="px-4 py-2.5 tabular-nums">{formatNumber(p.currentStock)} <span className="text-xs text-[color:var(--text-tertiary)]">{p.unit}</span></td>
                  <td className="px-4 py-2.5 tabular-nums">{fmt(pr.total)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-xs text-[color:var(--text-secondary)]">{p.currentStock === 0 ? '0 dias' : pr.coverDays === null ? `> ${COVERAGE_DAYS} dias` : `${fmt(pr.coverDays)} dias`}</td>
                  <td className="px-4 py-2.5 tabular-nums font-semibold">{pr.reorder > 0 ? fmt(pr.reorder) : '—'}</td>
                  <td className="px-4 py-2.5"><Badge variant={s.variant} size="sm" dot>{s.label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end p-4 pt-3">
          <Link href="/dashboard/ia-analitica"><Button size="sm" variant="outline" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>Ver pedido sugerido (IA Analítica)</Button></Link>
        </div>
      </Card>

      {/* Confiabilidade */}
      <Card>
        <CardHeader>
          <CardTitle description={model.trainedOn ?? 'Modelo de previsão'}>Como o modelo foi avaliado</CardTitle>
          {bt && <Badge variant="default" size="sm">{bt.testOrigins.length} testes de {bt.horizonDays} dias</Badge>}
        </CardHeader>
        {!bt || !details ? (
          <p className="text-sm text-[color:var(--text-secondary)]">O modelo ainda não tem histórico suficiente para ser avaliado. {model.reason ?? ''}</p>
        ) : (
          <div className="space-y-5">
            <div className={cn('flex items-start gap-3 rounded-[var(--radius-md)] p-3 text-sm', beatsBaseline ? 'bg-[color:var(--success-subtle)]' : 'bg-[color:var(--bg-subtle)]')}>
              {beatsBaseline ? <CheckCircle2 className="mt-0.5 w-4 h-4 flex-shrink-0 text-[color:var(--success)]" /> : <AlertTriangle className="mt-0.5 w-4 h-4 flex-shrink-0 text-[color:var(--warning)]" />}
              <p className="text-[color:var(--text-primary)]">
                {beatsBaseline
                  ? <>No teste, o modelo errou menos que a média simples (erro {fmt(rf!.wape * 100)}% contra {fmt(base!.wape * 100)}%).</>
                  : <>Com o histórico atual, o modelo ainda <strong>não supera</strong> a média simples do mesmo dia da semana (erro {fmt(rf!.wape * 100)}% contra {fmt(base!.wape * 100)}%). Isso é esperado com cerca de um ano de saídas e poucos padrões semanais; a previsão tende a melhorar conforme o sistema acumula movimentações.</>}
                {' '}A faixa de 80% acertou {fmt(bt.intervalCoverage * 100)}% dos dias.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="overflow-x-auto">
                <p className="text-sm text-[color:var(--text-secondary)] mb-2">Métodos comparados (por produto e semana)</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-[color:var(--border)]">
                    {['Método', 'R²', 'Erro médio', 'Erro (WAPE)'].map(h => <th key={h} className="px-2 py-2 text-left text-[10px] font-bold uppercase text-[color:var(--text-tertiary)]">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {details.compared.map(c => (
                      <tr key={c.id} className={cn('border-b border-[color:var(--border)] last:border-0', c.id === 'rf' && 'bg-[color:var(--bg-subtle)]')}>
                        <td className="px-2 py-2 font-medium">{c.name}{c.id === 'rf' && <span className="ml-1.5 text-xs text-[color:var(--brand)]">(usado)</span>}</td>
                        <td className="px-2 py-2 tabular-nums">{c.score.r2 == null ? '—' : fmt(c.score.r2, 2)}</td>
                        <td className="px-2 py-2 tabular-nums text-xs">{c.score.mae == null ? '—' : `±${fmt(c.score.mae, 1)} un`}</td>
                        <td className="px-2 py-2 tabular-nums text-xs">{fmt(c.score.wape * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">Regressão Linear com seleção de atributos e Random Forest, como no notebook, treinados com as saídas deste sistema e testados em semanas que o modelo não viu.</p>
              </div>
              <div>
                <p className="text-sm text-[color:var(--text-secondary)] mb-2">O que mais pesa na previsão</p>
                <ul className="space-y-2">
                  {importance.map(i => (
                    <li key={i.feature} className="flex items-center gap-3 text-xs">
                      <span className="w-48 truncate text-[color:var(--text-secondary)]" title={i.label}>{i.label}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-[color:var(--bg-muted)] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(i.weight / maxWeight) * 100}%`, background: ACCENT }} /></div>
                      <span className="w-9 text-right tabular-nums text-[color:var(--text-tertiary)]">{Math.round(i.weight * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
