import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { LineAreaChart } from '@/components/charts'
import { AppText, Badge, Banner, Button, Card, CardHeader, EmptyState, Icon, ProgressBar, Screen, SectionTitle, SkeletonList } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { shareCsv } from '@/lib/share'
import { formatCurrency } from '@/lib/format'
import { useFetch } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone } from '@/theme/tokens'
import type { ApiAnalytics } from '@/types/api'

const INSIGHT: Record<string, { icon: IconName; tone: Tone }> = {
  warning: { icon: 'alert-triangle', tone: 'warning' },
  success: { icon: 'trending-up', tone: 'success' },
  info: { icon: 'shopping-cart', tone: 'info' },
}
const URGENCY: Record<string, Tone> = { Urgente: 'danger', Alta: 'warning', Média: 'neutral' }
const ABC: Record<string, string> = { A: '#2563eb', B: '#0891b2', C: '#94a3b8' }
const XYZ: Record<string, string> = { X: '#16a34a', Y: '#d97706', Z: '#dc2626' }

export default function IaAnaliticaScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { data, loading, error, reload, refresh, refreshing } = useFetch<ApiAnalytics>('/analytics', { historyMonths: 6 })
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (loading && !data) return <Screen><SkeletonList rows={5} /></Screen>
  if (!data) return <Screen><Banner onRetry={reload}>{error || 'Sem dados'}</Banner></Screen>

  const { model, window: win, demand, suggestions } = data
  const bt = model.backtest
  const gain = bt ? Math.round((1 - bt.model.rmsle / bt.baseline.rmsle) * 1000) / 10 : null
  const future = demand.filter(d => d.real === null)
  const forecastLabel = future.length ? `${future[0].label}–${future[future.length - 1].label}` : ''

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  async function exportOrder() {
    const rows = suggestions.filter(s => selected.size === 0 || selected.has(s.productId))
    await shareCsv('pedido-sugerido.csv', ['Código', 'Produto', 'Categoria', 'Estoque atual', 'Quantidade sugerida', 'Custo estimado', 'Urgência', 'Motivo'],
      rows.map(s => [s.code, s.product, s.category, s.currentStock, s.quantity, s.estimatedCost, s.urgency, s.reason]))
  }

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View style={[styles.model, { backgroundColor: model.source === 'ml' ? colors.brandSubtle : colors.warningSubtle, borderColor: model.source === 'ml' ? colors.brandMuted : colors.warningMuted }]}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Icon name="cpu" size={16} color={model.source === 'ml' ? 'brand' : 'warning'} />
          <AppText bold style={{ flex: 1 }}>{model.source === 'ml' ? `Modelo de ML ativo (v${model.version ?? '—'})` : 'Previsão por média móvel (ML inativo)'}</AppText>
        </View>
        {model.source === 'ml' && bt ? (
          <>
            <AppText variant="caption" color="secondary">Treinado em: {model.trainedOn}</AppText>
            <AppText variant="caption" color="secondary">
              Backtest ({bt.horizonDays} dias): RMSLE {bt.model.rmsle} vs {bt.baseline.rmsle} do baseline{gain !== null && gain > 0 ? ` (−${gain}%)` : ''} · viés {bt.model.vies_pct}% · faixa cobre {Math.round(bt.intervalCoverage * 100)}%
            </AppText>
          </>
        ) : <AppText variant="caption" color="secondary">{model.reason}</AppText>}
        <AppText variant="caption" color="tertiary">Origem {win.asOf} · prazo de reposição {win.leadTimeDays}d</AppText>
      </View>

      {data.insights.length === 0 ? <Banner tone="success">Nenhum ponto de atenção identificado no momento.</Banner> : null}
      {data.insights.map((ins, i) => {
        const meta = INSIGHT[ins.type]
        return (
          <Card key={i} accent={colors[meta.tone === 'neutral' ? 'border' : (meta.tone as 'warning' | 'success' | 'info')]}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <Icon name={meta.icon} size={18} color={meta.tone} />
              <View style={{ flex: 1, gap: 3 }}>
                <AppText bold>{ins.title}</AppText>
                <AppText variant="small" color="secondary">{ins.desc}</AppText>
                {!ins.href.startsWith('#') ? <Button title={`${ins.action} →`} variant="ghost" size="sm" onPress={() => router.push(ins.href as never)} style={{ alignSelf: 'flex-start' }} /> : null}
              </View>
            </View>
          </Card>
        )
      })}

      <Card>
        <CardHeader title="Previsão de demanda" description="Unidades por semana: real vs. previsto" right={<Badge label={`${forecastLabel} previsto`} tone="brand" />} />
        <LineAreaChart
          labels={demand.map(d => d.label)}
          series={[
            { name: 'Real', data: demand.map(d => d.real), color: '#2563eb' },
            { name: 'Previsto', data: demand.map(d => d.forecast), color: '#7c3aed', dashed: true },
          ]}
          band={{ low: demand.map(d => d.low), high: demand.map(d => d.high), color: '#7c3aed' }}
          labelEvery={3}
        />
      </Card>

      <Card>
        <CardHeader title="Matriz ABC × XYZ" description="ABC = valor movimentado · XYZ = variabilidade da demanda" />
        <View style={{ gap: space.md }}>
          {data.matrix.slice(0, 10).map(row => (
            <View key={row.productId} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.tag, { backgroundColor: ABC[row.abc] }]}><AppText variant="caption" bold color="inverse">{row.abc}</AppText></View>
                <View style={[styles.tag, { backgroundColor: XYZ[row.xyz] }]}><AppText variant="caption" bold color="inverse">{row.xyz}</AppText></View>
                <AppText variant="small" bold style={{ flex: 1 }} numberOfLines={1}>{row.product}</AppText>
                <AppText variant="caption" color="tertiary">{row.turnover === null ? '—' : `${row.turnover}×/ano`}</AppText>
              </View>
              <ProgressBar value={Math.min(100, row.valueShare * 4)} tone="success" height={4} />
              <AppText variant="caption" color="tertiary">{row.valueShare}% do valor movimentado</AppText>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle right={<Button title={selected.size ? `Exportar (${selected.size})` : 'Exportar pedido'} icon="share" variant="ghost" size="sm" onPress={exportOrder} disabled={suggestions.length === 0} />}>
        {`Sugestões de compra · ${suggestions.length}`}
      </SectionTitle>
      <AppText variant="caption" color="tertiary">Cobre {win.coverageDays} dias de demanda prevista + estoque de segurança (prazo {win.leadTimeDays}d).</AppText>
      {suggestions.length === 0 ? <Card><EmptyState icon="check-circle" title="Nenhuma reposição necessária" /></Card> : null}
      {suggestions.map(s => {
        const on = selected.has(s.productId)
        return (
          <Card key={s.productId} onPress={() => toggle(s.productId)} accent={on ? colors.brand : undefined}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <AppText bold style={{ flex: 1 }} numberOfLines={2}>{s.product}</AppText>
                <Badge label={s.urgency} tone={URGENCY[s.urgency]} dot />
              </View>
              <AppText variant="caption" color="secondary">{s.reason}</AppText>
              <View style={styles.metrics}>
                <Metric label="Estoque" value={`${s.currentStock}${s.daysOfCover !== null ? ` · ${s.daysOfCover}d` : ''}`} />
                <Metric label="Prev. 7d / 28d" value={`${s.forecast7} / ${s.forecast28}`} />
                <Metric label="Sugerido" value={`${s.quantity} un`} strong />
                <Metric label="Custo est." value={formatCurrency(s.estimatedCost)} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="caption" color="tertiary">incl. {s.safetyStock} de segurança</AppText>
                <Badge label={on ? 'Incluído no pedido' : 'Toque para incluir'} tone={on ? 'brand' : 'neutral'} />
              </View>
            </View>
          </Card>
        )
      })}
    </Screen>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ minWidth: '44%', flexGrow: 1 }}>
      <AppText variant="caption" color="tertiary">{label}</AppText>
      <AppText variant="small" bold={strong} style={strong ? { fontSize: 15 } : undefined}>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  model: { borderWidth: 1, borderRadius: 12, padding: space.md, gap: 4 },
  tag: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: 4 },
})
