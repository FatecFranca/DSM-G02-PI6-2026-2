'use client'
import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, Loader2, ServerOff, Terminal } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { PageLoading } from '@/components/ui/Loading'
import { useDebounce } from '@/hooks/useDebounce'
import { useFetch } from '@/hooks/useFetch'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/utils'
import type { SimulationModelInfo, SimulationScenario, SimulationStatus } from '@/types/api'

const HORIZONS = [7, 14, 28]
/** Representa cada faixa de promoção do notebook (0 · 1–3 · 4–16 · >16 itens) por um valor típico. */
const BAND_SAMPLES = [0, 2, 8, 20]
const MODEL_COLORS: Record<string, string> = {
  rfe_rf: '#2563eb', rf_full: '#7c3aed', kbest_rf: '#0891b2', rfe_linear: '#d97706', kbest_linear: '#64748b',
}
const bandOf = (items: number) => (items <= 0 ? 0 : items <= 3 ? 1 : items <= 16 ? 2 : 3)

function addDays(start: string, days: number): string {
  const d = new Date(`${start}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const familyLabel = (name: string) => name.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')

type Predictions = Record<string, number>[]

/** Simulação "e se…": modelos de regressão do notebook (Previsao_Vendas.ipynb) servidos pelo backend. */
export default function SimulacaoPage() {
  const [status, setStatus] = useState<SimulationStatus | null>(null)

  // Enquanto o serviço de modelos não está pronto (fora do ar ou treinando), consulta de tempos em tempos.
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const current = await api.get<SimulationStatus>('/simulation/status')
        if (!active) return
        setStatus(current)
        if (!current.available) timer = setTimeout(poll, 4000)
      } catch {
        if (active) timer = setTimeout(poll, 6000)
      }
    }
    void poll()
    return () => { active = false; if (timer) clearTimeout(timer) }
  }, [])

  const { data: info } = useFetch<SimulationModelInfo>(status?.available ? '/simulation/model' : null)

  if (!status) return <PageLoading rows={4} />
  if (!status.available || !info) return <Offline status={status} />
  return <Simulator info={info} />
}

function Offline({ status }: { status: SimulationStatus }) {
  const training = status.status === 'training' || status.status === 'loading'
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'Simulação de Vendas' }]} />
      <Card>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-[color:var(--bg-muted)] flex items-center justify-center">
            {training ? <Loader2 className="w-6 h-6 animate-spin text-[color:var(--brand)]" /> : <ServerOff className="w-6 h-6 text-[color:var(--text-tertiary)]" />}
          </div>
          <h1 className="text-lg font-bold text-[color:var(--text-primary)]">{training ? 'Preparando os modelos…' : 'Serviço de simulação indisponível'}</h1>
          <p className="max-w-md text-sm text-[color:var(--text-secondary)]">
            {training ? 'Os modelos do notebook estão sendo carregados. Esta página atualiza sozinha.' : 'A simulação usa os modelos de regressão do notebook, servidos por um serviço Python que ainda não está no ar.'}
          </p>
          {!training && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] px-3 py-2 font-mono text-xs text-[color:var(--text-primary)]">
              <Terminal className="w-3.5 h-3.5" /> cd backend && npm run ml:service
            </div>
          )}
          <p className="text-xs text-[color:var(--text-tertiary)]">{status.message}</p>
        </div>
      </Card>
    </div>
  )
}

function Simulator({ info }: { info: SimulationModelInfo }) {
  const [store, setStore] = useState(String(info.stores[0]?.id ?? 1))
  const [family, setFamily] = useState(info.families.includes('GROCERY I') ? 'GROCERY I' : info.families[0])
  const [promo, setPromo] = useState('0')
  const [oil, setOil] = useState('')
  const [start, setStart] = useState('2017-08-16')
  const [horizon, setHorizon] = useState(14)
  const [selected, setSelected] = useState<string[]>(['rfe_rf', 'rf_full'])
  const [main, setMain] = useState('rfe_rf')

  const inputs = useDebounce({ store, family, promo, oil, start, horizon }, 450)
  const [predictions, setPredictions] = useState<{ key: string; data: Predictions } | null>(null)
  const [error, setError] = useState('')

  // Um único pedido traz tudo: os dias do horizonte, as 4 faixas de promoção e as 5 lojas.
  const { scenarios, key } = useMemo(() => {
    const base = {
      family: inputs.family,
      onpromotion: Math.max(0, Math.round(Number(inputs.promo) || 0)),
      ...(inputs.oil !== '' && Number(inputs.oil) >= 0 ? { oil: Number(inputs.oil) } : {}),
    }
    const list: SimulationScenario[] = [
      ...Array.from({ length: inputs.horizon }, (_, i) => ({ ...base, store: Number(inputs.store), date: addDays(inputs.start, i) })),
      ...BAND_SAMPLES.map(items => ({ ...base, onpromotion: items, store: Number(inputs.store), date: inputs.start })),
      ...info.stores.map(s => ({ ...base, store: s.id, date: inputs.start })),
    ]
    return { scenarios: list, key: JSON.stringify(list) }
  }, [inputs, info.stores])

  useEffect(() => {
    let active = true
    api.post<{ predictions: Predictions }>('/simulation/predict', { scenarios })
      .then(res => { if (active) { setPredictions({ key, data: res.predictions }); setError('') } })
      .catch((err: unknown) => { if (active) setError(err instanceof ApiError ? err.message : 'Falha ao simular') })
    return () => { active = false }
  }, [scenarios, key])

  const ready = predictions?.key === key
  const data = predictions?.data ?? []
  const modelById = Object.fromEntries(info.models.map(m => [m.id, m]))
  const mainModel = modelById[main]
  const promoItems = Math.max(0, Math.round(Number(promo) || 0))
  const currentBand = bandOf(promoItems)
  const storeInfo = info.stores.find(s => s.id === Number(store))

  const daily = data.slice(0, inputs.horizon)
  const bands = data.slice(inputs.horizon, inputs.horizon + BAND_SAMPLES.length)
  const stores = data.slice(inputs.horizon + BAND_SAMPLES.length)

  const dailyChart = daily.map((row, i) => ({ label: shortDay(addDays(inputs.start, i)), full: dayLabel(addDays(inputs.start, i)), ...row }))
  const BAND_SHORT = ['0', '1–3', '4–16', '>16']
  const bandChart = bands.map((row, i) => ({ label: `${BAND_SHORT[i]} itens`, current: i === currentBand, ...row }))
  const mainSeries = daily.map(row => row[main] ?? 0)
  const mean = mainSeries.length ? mainSeries.reduce((a, b) => a + b, 0) / mainSeries.length : 0
  const total = mainSeries.reduce((a, b) => a + b, 0)
  const noPromo = bands[0]?.[main]
  const withBand = bands[currentBand]?.[main]
  const lift = noPromo && withBand !== undefined ? ((withBand - noPromo) / noPromo) * 100 : null
  const anyFlat = selected.some(id => !modelById[id]?.usesDate)

  const toggle = (id: string) => setSelected(cur => cur.includes(id) ? (cur.length > 1 ? cur.filter(x => x !== id) : cur) : [...cur, id])
  const modelLabel = (id: string) => `${modelById[id].name} · ${modelById[id].selection}`

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'Simulação de Vendas' }]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Simulação de Vendas</h1>
            <Badge variant="brand" size="sm"><FlaskConical className="w-3 h-3 mr-1" />Modelos do notebook</Badge>
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)]">Altere loja, família, promoção e data e veja a venda diária prevista por cada modelo de regressão</p>
        </div>
        <Badge variant="success" size="sm" dot>Serviço de modelos no ar</Badge>
      </div>

      {error && <Alert>{error}</Alert>}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Controles */}
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle description="Monte o cenário">Parâmetros</CardTitle></CardHeader>
          <div className="space-y-3">
            <Select label="Loja" value={store} onChange={e => setStore(e.target.value)} options={info.stores.map(s => ({ value: String(s.id), label: `Loja ${s.id} · ${s.city}` }))} />
            <Select label="Família de produtos" value={family} onChange={e => setFamily(e.target.value)} options={info.families.map(f => ({ value: f, label: familyLabel(f) }))} />
            <Input label="Itens em promoção" type="number" min={0} value={promo} onChange={e => setPromo(e.target.value)} hint={`Faixa: ${info.promoBands[currentBand]?.label}`} />
            <Input label="Preço do petróleo (US$)" type="number" min={0} step="0.01" placeholder={String(info.oil.default)} value={oil} onChange={e => setOil(e.target.value)} hint={`Padrão ${info.oil.default} · base entre ${info.oil.min} e ${info.oil.max}`} />
            <Input label="Data inicial" type="date" value={start} onChange={e => e.target.value && setStart(e.target.value)} />
            <Select label="Horizonte" value={String(horizon)} onChange={e => setHorizon(Number(e.target.value))} options={HORIZONS.map(h => ({ value: String(h), label: `${h} dias` }))} />
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-[color:var(--text-primary)] mb-1.5">Modelos no gráfico</p>
            <div className="space-y-1.5">
              {info.models.map(m => (
                <label key={m.id} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                  <span className="min-w-0">
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: MODEL_COLORS[m.id] }} />
                    <span className="font-medium text-[color:var(--text-primary)]">{m.name} · {m.selection}</span>
                    {m.origin === 'complementar' && <span className="ml-1 text-[color:var(--warning)]">(complementar)</span>}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Select label="Modelo principal" hint="Usado nos indicadores e nas comparações" value={main} onChange={e => setMain(e.target.value)} options={info.models.map(m => ({ value: m.id, label: `${m.name} · ${m.selection}` }))} />
            </div>
          </div>
        </Card>

        {/* Resultados */}
        <div className={cn('xl:col-span-3 space-y-5 transition-opacity', !ready && 'opacity-60')}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Venda média diária', value: `${formatNumber(Math.round(mean))} un`, sub: modelLabel(main) },
              { label: `Total em ${inputs.horizon} dias`, value: `${formatNumber(Math.round(total))} un`, sub: `${storeInfo?.city ?? ''} · ${familyLabel(inputs.family)}` },
              { label: 'Promoção', value: info.promoBands[currentBand]?.label ?? '—', sub: lift === null ? '—' : `${lift >= 0 ? '+' : ''}${lift.toFixed(0)}% vs. sem promoção` },
              { label: 'R² do modelo (teste)', value: mainModel.metrics.r2.toFixed(4).replace('.', ','), sub: `MAE ${formatNumber(mainModel.metrics.mae)} un` },
            ].map(k => (
              <div key={k.label} className="rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] p-4">
                <p className="text-xs text-[color:var(--text-tertiary)]">{k.label}</p>
                <p className="text-lg font-bold text-[color:var(--text-primary)] mt-0.5">{k.value}</p>
                <p className="text-[11px] text-[color:var(--text-tertiary)] truncate">{k.sub}</p>
              </div>
            ))}
          </div>

          <Card padding={false}>
            <CardHeader className="p-5 pb-3">
              <CardTitle description="Unidades vendidas por dia, previstas por modelo">Previsão diária</CardTitle>
              {!ready && <Loader2 className="w-4 h-4 animate-spin text-[color:var(--text-tertiary)]" />}
            </CardHeader>
            <div className="h-[260px] px-5 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChart} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} interval={inputs.horizon > 14 ? 1 : 0} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} labelFormatter={(_, items) => String(items?.[0]?.payload?.full ?? '')} formatter={(v, n) => [`${formatNumber(Number(v))} un`, modelLabel(String(n))]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={v => modelLabel(String(v))} />
                  {selected.map(id => <Line key={id} type="monotone" dataKey={id} stroke={MODEL_COLORS[id]} strokeWidth={2} dot={{ r: 2 }} strokeDasharray={modelById[id].origin === 'complementar' ? '5 4' : undefined} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {anyFlat && (
              <p className="px-5 pb-4 text-xs text-[color:var(--text-tertiary)]">
                Os modelos do notebook com seleção de atributos não usam a data (só loja, família e faixa de promoção), por isso a linha é constante.
                Só o modelo complementar (41 atributos) varia por dia da semana, mês e preço do petróleo.
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card padding={false}>
              <CardHeader className="p-5 pb-3"><CardTitle description={`Em ${dayLabel(inputs.start)}, loja ${inputs.store}`}>O que muda com a promoção</CardTitle></CardHeader>
              <div className="h-[230px] px-5 pb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bandChart} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [`${formatNumber(Number(v))} un`, modelLabel(String(n))]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={v => modelLabel(String(v))} />
                    {selected.map(id => <Bar key={id} dataKey={id} fill={MODEL_COLORS[id]} radius={[4, 4, 0, 0]} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle description={`${familyLabel(inputs.family)} · ${modelLabel(main)}`}>Comparar lojas</CardTitle></CardHeader>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[color:var(--border)]">
                  {['Loja', 'Cidade', 'Cluster', 'Venda/dia'].map(h => <th key={h} className="px-2 py-2 text-left text-[10px] font-bold uppercase text-[color:var(--text-tertiary)]">{h}</th>)}
                </tr></thead>
                <tbody>
                  {info.stores.map((s, i) => (
                    <tr key={s.id} className={cn('border-b border-[color:var(--border)] last:border-0', s.id === Number(inputs.store) && 'bg-[color:var(--brand-subtle)]')}>
                      <td className="px-2 py-2 font-medium">Loja {s.id}</td>
                      <td className="px-2 py-2 text-xs text-[color:var(--text-secondary)]">{s.city}</td>
                      <td className="px-2 py-2 text-xs text-[color:var(--text-secondary)]">{s.cluster}</td>
                      <td className="px-2 py-2 font-semibold">{stores[i] ? `${formatNumber(Math.round(stores[i][main] ?? 0))} un` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle description={`${formatNumber(info.dataset.rows)} registros · ${info.dataset.split}`}>Modelos e desempenho (conjunto de teste)</CardTitle></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-[color:var(--border)]">
                  {['Modelo', 'Seleção', 'Origem', 'R²', 'MAE', 'RMSE', 'Mais influentes'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[color:var(--text-tertiary)]">{h}</th>)}
                </tr></thead>
                <tbody>
                  {info.models.map(m => (
                    <tr key={m.id} className={cn('border-b border-[color:var(--border)] last:border-0', m.id === main && 'bg-[color:var(--bg-subtle)]')}>
                      <td className="px-3 py-2 font-medium"><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: MODEL_COLORS[m.id] }} />{m.name}</td>
                      <td className="px-3 py-2 text-xs">{m.selection}</td>
                      <td className="px-3 py-2"><Badge variant={m.origin === 'notebook' ? 'success' : 'warning'} size="sm">{m.origin === 'notebook' ? 'Notebook' : 'Complementar'}</Badge></td>
                      <td className="px-3 py-2 font-semibold">{m.metrics.r2.toFixed(4).replace('.', ',')}</td>
                      <td className="px-3 py-2 text-xs">{formatNumber(m.metrics.mae)}</td>
                      <td className="px-3 py-2 text-xs">{formatNumber(m.metrics.rmse)}</td>
                      <td className="px-3 py-2 text-[11px] text-[color:var(--text-secondary)]">{m.importance.slice(0, 3).map(i => `${i.feature.replace('family_', '')} (${Math.round(i.weight * 100)}%)`).join(' · ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[color:var(--text-tertiary)]">
              São os modelos de <code>machine-learning/Previsao_Vendas.ipynb</code>, reproduzidos sem alterações (mesmo recorte, divisão e parâmetros). O teste é uma divisão aleatória, então o R² é otimista para dias futuros. O modelo complementar (Random Forest com todos os atributos) não faz parte do notebook.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
