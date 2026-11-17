import { useRouter } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { LineAreaChart } from '@/components/charts'
import { AppText, Badge, Banner, Button, Card, CardHeader, Chips, EmptyState, Input, ListRow, ProgressBar, Screen, Select, SkeletonList, StatCard } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { addDays, COVERAGE_DAYS, fmt, ForecastItem, longDay, project, shortDay, situation, sum, weekday } from '@/lib/forecast'
import { formatNumber } from '@/lib/format'
import { useFetch } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone } from '@/theme/tokens'
import type { ApiProductForecasts } from '@/types/api'

const HORIZONS = [7, 14, 28] as const
type Horizon = `${(typeof HORIZONS)[number]}`
const SCENARIOS = [
  { value: '0.8', label: 'Demanda 20% menor' },
  { value: '1', label: 'Previsão do modelo' },
  { value: '1.2', label: 'Demanda 20% maior' },
  { value: '1.5', label: 'Demanda 50% maior' },
]
const OVERVIEW_PAGE = 10

/** Previsão de demanda dos produtos do sistema, treinada com as saídas reais do estoque (mesma tela do web). */
export default function PrevisaoScreen() {
  const { data, loading, error, reload, refresh, refreshing } = useFetch<ApiProductForecasts>('/analytics/products-forecast', { horizon: 28 })
  if (loading && !data) return <Screen><SkeletonList rows={5} /></Screen>
  if (!data) return <Screen><Banner onRetry={reload}>{error || 'Não foi possível carregar a previsão'}</Banner></Screen>
  return <Forecast data={data} onRefresh={refresh} refreshing={refreshing} />
}

function Forecast({ data, onRefresh, refreshing }: { data: ApiProductForecasts; onRefresh: () => void; refreshing: boolean }) {
  const router = useRouter()
  const { colors } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const lead = data.leadTimeDays
  const { model } = data
  const [selectedId, setSelectedId] = useState('')
  const [category, setCategory] = useState('')
  const [days, setDays] = useState<Horizon>('14')
  const [scenario, setScenario] = useState('1')
  const [stockInput, setStockInput] = useState('')
  const [shown, setShown] = useState(OVERVIEW_PAGE)
  const horizon = Number(days)
  const factor = Number(scenario)

  const categories = useMemo(() => [...new Set(data.products.map(p => p.category))].sort(), [data.products])

  // Visão geral: todos os produtos com o estoque real, ordenados por urgência.
  const overview = useMemo(() => data.products.map(p => {
    const proj = project(p, p.currentStock, factor, COVERAGE_DAYS, lead)
    return { p, proj, sit: situation(p.currentStock, proj.coverDays, lead) }
  }).sort((a, b) => (a.proj.coverDays ?? 999) - (b.proj.coverDays ?? 999) || b.proj.total - a.proj.total), [data.products, factor, lead])

  const product: ForecastItem | undefined = data.products.find(p => p.id === selectedId) ?? overview[0]?.p

  if (!product) {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <Card><EmptyState icon="trending-up" title="Sem saídas para prever" description="Registre movimentações de saída para que o modelo aprenda com o histórico do estoque." /></Card>
      </Screen>
    )
  }

  const visible = data.products.filter(p => !category || p.category === category)
  const productOptions = (visible.some(p => p.id === product.id) ? visible : [product, ...visible]).map(p => ({ value: p.id, label: p.name, description: `${p.code} · ${p.category}` }))

  const stock = stockInput !== '' ? Math.max(0, Math.round(Number(stockInput) || 0)) : product.currentStock
  const proj = project(product, stock, factor, horizon, lead)
  const recentTotal = sum(product.recent.map(r => r.quantity))
  const recentMean = product.recent.length ? recentTotal / product.recent.length : 0
  const mean = proj.total / Math.max(horizon, 1)
  const change = recentMean > 0 ? ((mean - recentMean) / recentMean) * 100 : null
  const allRecent = sum(data.products.flatMap(p => p.recent.map(r => r.quantity)))
  const runOutIso = proj.runOutIndex !== null ? product.daily[proj.runOutIndex].date : null
  const sit = situation(stock, proj.coverDays, lead)
  const orderByIso = runOutIso ? addDays(runOutIso, -lead) : null
  const orderNow = stock === 0 || (orderByIso !== null && orderByIso <= data.asOf)

  // Gráfico 1: saídas reais (últimos dias) + previsão com a faixa de incerteza.
  const nRecent = product.recent.length
  const fut = product.daily.slice(0, horizon)
  const demandLabels = [...product.recent.map(r => shortDay(r.date)), ...fut.map(d => shortDay(d.date))]
  const pad = (n: number) => Array<null>(n).fill(null)
  const round = (v: number) => Math.round(v * 100) / 100
  const real = [...product.recent.map(r => r.quantity), ...pad(fut.length)]
  const forecast = [...pad(nRecent), ...fut.map((_, i) => round(proj.mean[i]))]
  const low = [...pad(nRecent), ...fut.map(d => round(d.low * factor))]
  const high = [...pad(nRecent), ...fut.map(d => round(d.high * factor))]

  // Gráfico 2: estoque projetado sem reposição (a falta é mostrada no texto; o eixo começa em zero).
  const stockLabels = fut.map(d => shortDay(d.date))
  const remaining = proj.remaining.map(v => Math.max(0, v))
  const minLine = product.minStock > 0 ? stockLabels.map(() => product.minStock) : null

  const bt = model.backtest
  const details = model.details
  const rf = details?.compared.find(c => c.id === 'rf')?.score
  const base = details?.compared.find(c => c.id === 'baseline')?.score
  const importance = (details?.importance ?? []).slice(0, 5)
  const maxWeight = Math.max(...importance.map(i => i.weight), 0.0001)
  const beatsBaseline = rf && base ? rf.wape < base.wape : null

  const pick = (id: string) => { setSelectedId(id); setStockInput(''); scrollRef.current?.scrollTo({ y: 0, animated: true }) }
  const coverValue = stock === 0 ? 'Sem estoque' : proj.coverDays === null ? `> ${horizon} dias` : `${fmt(proj.coverDays)} dias`
  const sitTone: Tone = sit.tone

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing} scrollRef={scrollRef}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">Previsão de Vendas</AppText>
          <AppText variant="small" color="tertiary">Quanto cada produto deve sair nos próximos dias, calculado a partir das saídas reais do estoque.</AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge label={model.source === 'ml' ? 'Modelo de ML ativo' : 'Média móvel (ML inativo)'} tone={model.source === 'ml' ? 'success' : 'warning'} dot />
        <AppText variant="caption" color="tertiary">Dados até {shortDay(data.asOf)} · puxe para recalcular</AppText>
      </View>

      {model.source !== 'ml' ? (
        <Banner tone="warning">O serviço de ML não respondeu ({model.reason ?? 'indisponível'}). A previsão usa a média dos últimos 28 dias.</Banner>
      ) : null}
      {allRecent === 0 ? (
        <Banner tone="info">Não houve nenhuma saída nos últimos 28 dias (até {shortDay(data.asOf)}). As previsões ficam baixas até que novas saídas sejam registradas.</Banner>
      ) : null}

      <Card>
        <View style={{ gap: space.md }}>
          <Select label="Categoria" value={category} options={categories.map(c => ({ value: c, label: c }))} placeholder="Todas" clearable
            onChange={v => { setCategory(v); setSelectedId(''); setStockInput('') }} />
          <Select label="Produto" value={product.id} options={productOptions} searchable onChange={pick} />
          <View style={{ gap: 6 }}>
            <AppText variant="small" bold>Período</AppText>
            <Chips<Horizon> value={days} onChange={setDays} items={HORIZONS.map(h => ({ id: `${h}` as Horizon, label: `${h} dias` }))} />
          </View>
          <Select label="Cenário" value={scenario} options={SCENARIOS} onChange={setScenario} />
          <Input label="Estoque considerado" keyboardType="number-pad" value={stockInput} onChangeText={t => setStockInput(t.replace(/\D/g, ''))}
            placeholder={String(product.currentStock)}
            hint={`Estoque atual: ${formatNumber(product.currentStock)} ${product.unit} · mínimo ${formatNumber(product.minStock)}. Altere para simular uma compra ou perda.`} />
          <AppText variant="caption" color="tertiary">Prazo de reposição: <AppText variant="caption" bold color="secondary">{lead} dias</AppText> (Configurações).</AppText>
        </View>
      </Card>

      <View style={styles.row}>
        <StatCard label={`Demanda ${horizon}d`} value={`${fmt(proj.total)} ${product.unit}`} icon="trending-up"
          sub={`≈ ${fmt(mean, 1)}/dia${change !== null ? ` · ${change >= 0 ? '+' : ''}${fmt(change)}%` : ''}`} />
        <StatCard label="Cobertura" value={coverValue} icon="package" tone={sitTone}
          sub={runOutIso ? `Acaba ${weekday(runOutIso)}, ${shortDay(runOutIso)}` : `${formatNumber(stock)} ${product.unit} cobrem o período`} />
      </View>
      <View style={styles.row}>
        <StatCard label="Reposição sugerida" value={proj.reorder > 0 ? `${fmt(proj.reorder)} ${product.unit}` : 'Não precisa'} icon="shopping-cart"
          sub={proj.reorder > 0 ? `${COVERAGE_DAYS}d + segurança de ${fmt(proj.safety)}` : `Cobre os próximos ${COVERAGE_DAYS} dias`} />
        <StatCard label="Pedir até" value={proj.reorder === 0 ? '—' : orderNow ? 'Agora' : orderByIso ? shortDay(orderByIso) : '—'} icon="calendar"
          tone={proj.reorder > 0 && orderNow ? 'danger' : 'neutral'} sub={proj.reorder === 0 ? 'Sem ruptura prevista' : `Considera ${lead}d de prazo`} />
      </View>

      <Card>
        <CardHeader title={product.name} description="Saídas reais e previsão, com faixa de 80% dos dias" right={<Badge label={product.category} />} />
        <LineAreaChart
          labels={demandLabels}
          series={[
            { name: 'Saída real', data: real, color: colors.textTertiary },
            { name: 'Previsto', data: forecast, color: colors.brand },
          ]}
          band={{ low, high, color: colors.brand }}
          format={v => fmt(v, 1)}
        />
      </Card>

      <Card>
        <CardHeader title="Estoque projetado" description={`Partindo de ${formatNumber(stock)} ${product.unit}, sem nenhuma reposição`} right={<Badge label={sit.label} tone={sitTone} dot />} />
        <LineAreaChart
          labels={stockLabels}
          series={[
            { name: 'Restante', data: remaining, color: colors.brand, area: true },
            ...(minLine ? [{ name: 'Mínimo', data: minLine, color: colors.warning, dashed: true }] : []),
          ]}
          format={v => fmt(v)}
        />
        <AppText variant="caption" color="tertiary" style={{ marginTop: space.sm }}>
          {runOutIso
            ? `Ruptura prevista em ${longDay(runOutIso)}; com ${lead} dias de prazo, o pedido precisa sair ${orderNow ? 'agora' : `até ${shortDay(orderByIso!)}`}.`
            : 'Sem ruptura prevista no período escolhido.'}
        </AppText>
      </Card>

      <Card>
        <CardHeader title="Todos os produtos" description={`Estoque atual contra a demanda dos próximos ${COVERAGE_DAYS} dias — mais urgentes primeiro`} right={<Badge label={`${overview.length}`} tone="brand" />} />
        <View style={{ gap: space.sm }}>
          {overview.slice(0, shown).map(({ p, proj: pr, sit: s }) => {
            const cover = p.currentStock === 0 ? '0 dias' : pr.coverDays === null ? `> ${COVERAGE_DAYS} dias` : `${fmt(pr.coverDays)} dias`
            const icon: IconName = s.tone === 'success' ? 'check-circle' : 'alert-triangle'
            return (
              <ListRow key={p.id} title={p.name} icon={icon} tone={s.tone} onPress={() => pick(p.id)}
                subtitle={`${p.code} · estoque ${formatNumber(p.currentStock)} ${p.unit} · demanda ${fmt(pr.total)} · cobre ${cover}${pr.reorder > 0 ? ` · repor ${fmt(pr.reorder)}` : ''}`}
                right={<Badge label={s.label} tone={s.tone} />} />
            )
          })}
        </View>
        {overview.length > shown ? <Button title={`Mostrar mais (${overview.length - shown})`} variant="ghost" onPress={() => setShown(n => n + OVERVIEW_PAGE)} style={{ marginTop: space.sm }} /> : null}
        <Button title="Ver pedido sugerido (IA Analítica)" icon="shopping-cart" variant="outline" onPress={() => router.push('/ia-analitica')} style={{ marginTop: space.sm }} />
      </Card>

      <Card>
        <CardHeader title="Como o modelo foi avaliado" description={model.trainedOn ?? 'Modelo de previsão'} right={bt ? <Badge label={`${bt.testOrigins.length} testes de ${bt.horizonDays}d`} /> : undefined} />
        {!bt || !details ? (
          <AppText variant="small" color="secondary">O modelo ainda não tem histórico suficiente para ser avaliado. {model.reason ?? ''}</AppText>
        ) : (
          <View style={{ gap: space.lg }}>
            <Banner tone={beatsBaseline ? 'success' : 'warning'}>
              {rf && base
                ? beatsBaseline
                  ? `No teste, o modelo errou menos que a média simples (erro ${fmt(rf.wape * 100)}% contra ${fmt(base.wape * 100)}%).`
                  : `O modelo ainda não supera a média simples do mesmo dia da semana (erro ${fmt(rf.wape * 100)}% contra ${fmt(base.wape * 100)}%). Com cerca de um ano de saídas isso é esperado e melhora conforme o sistema acumula movimentações.`
                : 'Sem comparação com a média simples.'}
              {` A faixa de 80% acertou ${fmt(bt.intervalCoverage * 100)}% dos dias.`}
            </Banner>

            <View style={{ gap: 6 }}>
              <AppText variant="small" color="secondary">Métodos comparados (por produto e semana)</AppText>
              {details.compared.map(c => (
                <View key={c.id} style={[styles.method, { borderColor: c.id === 'rf' ? colors.brandMuted : colors.border, backgroundColor: c.id === 'rf' ? colors.brandSubtle : colors.bgBase }]}>
                  <AppText bold style={{ flex: 1 }}>{c.name}{c.id === 'rf' ? ' (usado)' : ''}</AppText>
                  <Metric label="R²" value={c.score.r2 == null ? '—' : fmt(c.score.r2, 2)} />
                  <Metric label="Erro méd." value={c.score.mae == null ? '—' : `±${fmt(c.score.mae, 1)}`} />
                  <Metric label="WAPE" value={`${fmt(c.score.wape * 100)}%`} />
                </View>
              ))}
              <AppText variant="caption" color="tertiary">Regressão Linear com seleção de atributos e Random Forest, treinados com as saídas deste sistema e testados em semanas que o modelo não viu.</AppText>
            </View>

            {importance.length > 0 ? (
              <View style={{ gap: space.sm }}>
                <AppText variant="small" color="secondary">O que mais pesa na previsão</AppText>
                {importance.map(i => (
                  <View key={i.feature} style={{ gap: 4 }}>
                    <View style={styles.between}>
                      <AppText variant="caption" color="secondary" style={{ flex: 1 }} numberOfLines={1}>{i.label}</AppText>
                      <AppText variant="caption" color="tertiary">{Math.round(i.weight * 100)}%</AppText>
                    </View>
                    <ProgressBar value={(i.weight / maxWeight) * 100} height={6} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </Card>
    </Screen>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 52, alignItems: 'flex-end' }}>
      <AppText variant="caption" color="tertiary">{label}</AppText>
      <AppText variant="small" bold>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  between: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  method: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: 1, borderRadius: 12 },
})
