import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { BarChart, DonutChart, LineAreaChart } from '@/components/charts'
import { AppText, Banner, Button, Card, CardHeader, Chips, Icon, ListRow, ProgressBar, Screen, SectionTitle, SkeletonList, StatCard } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/format'
import { MOVEMENT_META, movementSign } from '@/lib/movement'
import { useFetch } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'
import type { ApiAbcCurve, ApiCategoryDistribution, ApiDashboard, ApiInventoryReport, ApiLotReport, ApiTopProduct, ApiTrendPoint } from '@/types/api'

type ChartTab = 'evolution' | 'abc' | 'categories'

const CATEGORY_FALLBACK = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#6b7280']

export default function DashboardScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const [tab, setTab] = useState<ChartTab>('evolution')

  const summary = useFetch<ApiDashboard>('/dashboard')
  const trend = useFetch<ApiTrendPoint[]>('/dashboard/movement-trend', { months: 12 })
  const categories = useFetch<ApiCategoryDistribution[]>('/dashboard/category-distribution')
  const top = useFetch<ApiTopProduct[]>('/dashboard/top-products', { limit: 5 })
  const abc = useFetch<ApiAbcCurve>('/dashboard/abc')
  const inventory = useFetch<ApiInventoryReport>('/reports/inventory')
  const lots = useFetch<ApiLotReport>('/reports/lots', { days: 30 })

  const all = [summary, trend, categories, top, abc, inventory, lots]
  const refreshing = all.some(f => f.refreshing)
  const refresh = () => { all.forEach(f => void f.refresh()) }
  const firstError = all.map(f => f.error).find(Boolean)

  const stats = summary.data
  const sum = (items: { totalValue: number }[]) => items.reduce((a, i) => a + i.totalValue, 0)
  const abcBars = abc.data
    ? [
        { label: 'A', value: sum(abc.data.A), color: colors.brand },
        { label: 'B', value: sum(abc.data.B), color: colors.info },
        { label: 'C', value: sum(abc.data.C), color: colors.textTertiary },
      ]
    : []
  const abcTotal = abcBars.reduce((a, b) => a + b.value, 0)
  const donut = (categories.data ?? []).map((c, i) => ({ label: c.name, value: c.productCount, color: c.color || CATEGORY_FALLBACK[i % CATEGORY_FALLBACK.length] }))
  const monthLabel = (m: string) => m.split(/[ .]/)[0]
  const todayRaw = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <View>
        <AppText variant="heading">Olá, {user?.name.split(' ')[0]}</AppText>
        <AppText color="tertiary">{today}</AppText>
      </View>

      {firstError ? <Banner onRetry={refresh}>{firstError}</Banner> : null}
      {!stats ? (summary.loading ? <SkeletonList rows={4} /> : null) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Produtos" value={formatNumber(stats.products.total)} sub="cadastrados" icon="package" />
            <StatCard label="Ativos" value={formatNumber(stats.products.active)} sub={`${stats.products.total ? Math.round((stats.products.active / stats.products.total) * 100) : 0}% do total`} icon="trending-up" tone="success" />
            <StatCard label="Sem estoque" value={stats.products.outStock} sub="produtos zerados" icon="alert-triangle" tone="danger" />
            <StatCard label="Estoque baixo" value={stats.products.lowStock} sub="abaixo do mínimo" icon="trending-down" tone="warning" />
          </View>
          <StatCard label="Valor do estoque" value={formatCurrency(stats.stock.totalPurchaseValue)} sub={`${formatCurrency(stats.stock.totalSaleValue)} a preço de venda`} icon="dollar-sign" tone="info" />

          <SectionTitle>Hoje</SectionTitle>
          <View style={styles.grid}>
            <StatCard label="Entradas" value={stats.movements.todayEntries?.count ?? 0} sub={formatCurrency(stats.movements.todayEntries?.value ?? 0)} icon="arrow-down-circle" tone="success" />
            <StatCard label="Saídas" value={stats.movements.todayExits?.count ?? 0} sub={formatCurrency(stats.movements.todayExits?.value ?? 0)} icon="arrow-up-circle" tone="info" />
            <StatCard label="Inventários" value={stats.inventory?.pendingCounts ?? 0} sub="pendentes" icon="clipboard" tone="warning" />
            <StatCard label="Lotes vencendo" value={lots.data?.summary.expiringSoon ?? stats.lots?.expiringSoon ?? 0} sub="próx. 30 dias" icon="clock" tone="danger" />
          </View>
        </>
      )}

      <Card>
        <CardHeader title="Análise de estoque" description="Unidades movimentadas nos últimos 12 meses" />
        <Chips<ChartTab>
          value={tab}
          onChange={setTab}
          items={[{ id: 'evolution', label: 'Evolução' }, { id: 'abc', label: 'Curva ABC' }, { id: 'categories', label: 'Categorias' }]}
        />
        <View style={{ marginTop: space.md }}>
          {tab === 'evolution' && (trend.data
            ? <LineAreaChart
                labels={trend.data.map(t => monthLabel(t.month))}
                series={[
                  { name: 'Entradas', data: trend.data.map(t => t.entries), color: '#2563eb', area: true },
                  { name: 'Saídas', data: trend.data.map(t => t.exits), color: '#0891b2', area: true },
                ]}
                labelEvery={2}
              />
            : <SkeletonList rows={2} />)}
          {tab === 'abc' && (abc.data
            ? <>
                <BarChart data={abcBars} format={v => (abcTotal > 0 ? `${Math.round((v / abcTotal) * 100)}%` : '0%')} />
                <View style={{ gap: 8, marginTop: space.md }}>
                  {abcBars.map((b, i) => (
                    <View key={b.label} style={styles.abcRow}>
                      <View style={[styles.abcBadge, { backgroundColor: b.color }]}><AppText bold color="inverse">{b.label}</AppText></View>
                      <View style={{ flex: 1 }}>
                        <AppText bold>{formatCurrency(b.value)}</AppText>
                        <AppText variant="caption" color="tertiary">{abc.data!.summary[(['A', 'B', 'C'] as const)[i]].count} produtos</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            : <SkeletonList rows={2} />)}
          {tab === 'categories' && (categories.data
            ? <DonutChart data={donut} center={{ title: String(donut.reduce((a, d) => a + d.value, 0)), subtitle: 'produtos' }} />
            : <SkeletonList rows={2} />)}
        </View>
      </Card>

      <Card>
        <CardHeader title="Mais movimentados" description="Por número de movimentações" right={<Button title="Ver tudo" variant="ghost" size="sm" onPress={() => router.push('/movimentacoes')} />} />
        {top.data?.length === 0 ? <AppText color="tertiary">Sem movimentações ainda.</AppText> : null}
        <View style={{ gap: space.md }}>
          {top.data?.map((p, i) => (
            <View key={p.product?.id ?? i} style={styles.topRow}>
              <AppText variant="small" bold color="tertiary" style={{ width: 16 }}>{i + 1}</AppText>
              <View style={{ flex: 1, gap: 4 }}>
                <AppText bold numberOfLines={1}>{p.product?.name ?? '—'}</AppText>
                <ProgressBar value={(p.movementCount / (top.data![0].movementCount || 1)) * 100} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <AppText bold>{formatNumber(p.movementCount)}</AppText>
                {typeof p.trend === 'number' ? <AppText variant="caption" color={p.trend >= 0 ? 'success' : 'danger'}>{p.trend >= 0 ? '+' : ''}{p.trend}%</AppText> : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <SectionTitle right={<Button title="Histórico" variant="ghost" size="sm" onPress={() => router.push('/movimentacoes')} />}>Atividade recente</SectionTitle>
      <View style={{ gap: space.sm }}>
        {stats?.recentMovements.length === 0 ? <AppText color="tertiary">Nenhuma movimentação registrada.</AppText> : null}
        {stats?.recentMovements.slice(0, 6).map(m => {
          const meta = MOVEMENT_META[m.type]
          const sign = movementSign(m)
          return (
            <ListRow
              key={m.id}
              icon={meta.icon}
              tone={meta.tone}
              title={m.product.name}
              subtitle={`${meta.label} · ${m.user.name} · ${formatDateTime(m.createdAt)}`}
              right={<AppText bold color={sign === '+' ? 'success' : sign === '−' ? 'danger' : 'primary'}>{sign}{formatNumber(Math.abs(m.quantity))}</AppText>}
            />
          )
        })}
      </View>

      {stats ? (
        <Card>
          <CardHeader title="Saúde do estoque" />
          <View style={{ gap: space.lg }}>
            {[
              { label: 'Ocupação do galpão', value: stats.warehouse.occupancyRate },
              { label: 'Produtos ativos', value: stats.products.total ? Math.round((stats.products.active / stats.products.total) * 100) : 0 },
              { label: 'Lotes válidos', value: stats.lots?.validPercentage ?? 100 },
              { label: 'Acuracidade do inventário', value: inventory.data?.summary.avgAccuracy ?? 0, empty: inventory.data?.summary.avgAccuracy == null },
            ].map(m => (
              <View key={m.label} style={{ gap: 6 }}>
                <View style={styles.healthHead}>
                  <AppText variant="small" color="secondary">{m.label}</AppText>
                  <AppText variant="small" bold>{m.empty ? '—' : `${m.value}%`}</AppText>
                </View>
                <ProgressBar value={m.value} />
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <SectionTitle>Ações rápidas</SectionTitle>
      <View style={styles.grid}>
        {[
          { label: 'Nova entrada', icon: 'arrow-down-circle' as const, href: '/entradas/nova' },
          { label: 'Nova saída', icon: 'arrow-up-circle' as const, href: '/saidas/nova' },
          { label: 'Scanner', icon: 'maximize' as const, href: '/scanner' },
          { label: 'IA Analítica', icon: 'cpu' as const, href: '/ia-analitica' },
        ].map(a => (
          <Card key={a.label} onPress={() => router.push(a.href as never)} style={{ flex: 1, minWidth: 140 }}>
            <View style={styles.quick}>
              <View style={[styles.quickIcon, { backgroundColor: colors.brandSubtle }]}><Icon name={a.icon} size={18} color="brand" /></View>
              <AppText bold style={{ flex: 1 }}>{a.label}</AppText>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  abcRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  abcBadge: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  healthHead: { flexDirection: 'row', justifyContent: 'space-between' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
