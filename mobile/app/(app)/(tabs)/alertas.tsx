import { useRouter } from 'expo-router'
import { useState } from 'react'
import { FlatList, RefreshControl, View } from 'react-native'
import { AppText, Badge, Button, Card, Chips, EmptyState, Icon, SkeletonList } from '@/components/ui'
import { useAlerts } from '@/lib/alerts'
import { relativeTime } from '@/lib/format'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone } from '@/theme/tokens'

type Tab = 'all' | 'unread' | 'critical' | 'stock' | 'expiry'
const TONE: Record<string, Tone> = { critical: 'danger', warning: 'warning', info: 'info' }
const LABEL: Record<string, string> = { critical: 'Crítico', warning: 'Atenção', info: 'Info' }

export default function AlertasScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { alerts, unread, loading, reload, markRead, markAllRead } = useAlerts()
  const [tab, setTab] = useState<Tab>('all')
  const [refreshing, setRefreshing] = useState(false)

  const filtered = alerts.filter(a => {
    if (tab === 'unread') return !a.read
    if (tab === 'critical') return a.type === 'critical'
    if (tab === 'stock') return a.category === 'stock'
    if (tab === 'expiry') return a.category === 'expiry'
    return true
  })

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bgSubtle }}
      contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: 40 }}
      data={filtered}
      keyExtractor={a => a.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false) }} tintColor={colors.brand} />}
      ListHeaderComponent={
        <View style={{ gap: space.md, marginBottom: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <AppText variant="subheading">Central de alertas</AppText>
              <AppText variant="small" color="tertiary">Gerados a partir do estoque e da validade dos lotes</AppText>
            </View>
            {unread > 0 ? <Badge label={`${unread} novos`} tone="danger" /> : null}
          </View>
          <Chips<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { id: 'all', label: 'Todos', badge: alerts.length },
              { id: 'unread', label: 'Não lidos', badge: unread },
              { id: 'critical', label: 'Críticos', badge: alerts.filter(a => a.type === 'critical').length },
              { id: 'stock', label: 'Estoque', badge: alerts.filter(a => a.category === 'stock').length },
              { id: 'expiry', label: 'Validade', badge: alerts.filter(a => a.category === 'expiry').length },
            ]}
          />
          {unread > 0 ? <Button title="Marcar todos como lidos" icon="check" variant="outline" size="sm" onPress={markAllRead} /> : null}
        </View>
      }
      ListEmptyComponent={loading ? <SkeletonList rows={4} /> : <EmptyState icon="check-circle" title="Nenhum alerta por aqui" description="Tudo em ordem nesta categoria." />}
      renderItem={({ item }) => {
        const tone = TONE[item.type]
        return (
          <Card
            accent={item.read ? undefined : tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.info}
            onPress={() => { void markRead(item.id); router.push(item.category === 'expiry' ? '/lotes' : '/produtos') }}
          >
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Icon name="alert-triangle" size={18} color={tone} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText bold={!item.read} color={item.read ? 'secondary' : 'primary'}>{item.title}</AppText>
                <AppText variant="small" color="tertiary">{item.desc}</AppText>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Badge label={LABEL[item.type]} tone={tone} />
                  <AppText variant="caption" color="tertiary">{relativeTime(item.createdAt)}</AppText>
                </View>
              </View>
              {!item.read ? (
                <Button icon="check" variant="ghost" size="sm" accessibilityLabel="Marcar como lido" onPress={() => void markRead(item.id)} />
              ) : null}
            </View>
          </Card>
        )
      }}
    />
  )
}
