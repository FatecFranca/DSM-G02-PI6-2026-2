import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { AppText, Badge, Card, Chips, Fab, Icon, ProgressBar, StatCard } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { INVENTORY_STATUS, INVENTORY_TYPES } from '@/lib/inventory'
import { formatDate, formatNumber } from '@/lib/format'
import { hasRole, STAFF } from '@/lib/permissions'
import { usePaged } from '@/lib/usePaged'
import { space } from '@/theme/tokens'
import type { ApiInventoryCount, InventoryStatus } from '@/types/api'

type Filter = '' | InventoryStatus

export default function InventarioScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<Filter>('')
  const list = usePaged<ApiInventoryCount & { statusCounts?: never }>('/inventory', { status: status || undefined })
  const canCreate = hasRole(user?.role, STAFF)
  const count = (s: InventoryStatus) => list.items.filter(i => i.status === s).length

  return (
    <View style={{ flex: 1 }}>
      <ListScreen
        state={list}
        fab={canCreate}
        keyExtractor={i => i.id}
        empty={{ icon: 'clipboard', title: 'Nenhum inventário', description: canCreate ? 'Crie o primeiro com o botão +.' : undefined }}
        header={
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(Object.keys(INVENTORY_STATUS) as InventoryStatus[]).map(s => (
                <StatCard key={s} label={INVENTORY_STATUS[s].label} value={status && status !== s ? '—' : count(s)} icon={INVENTORY_STATUS[s].icon} tone={INVENTORY_STATUS[s].tone} />
              ))}
            </View>
            <Chips<Filter> value={status} onChange={setStatus} items={[{ id: '', label: 'Todos' }, ...(Object.keys(INVENTORY_STATUS) as InventoryStatus[]).map(s => ({ id: s as Filter, label: INVENTORY_STATUS[s].label }))]} />
          </>
        }
        renderItem={inv => {
          const meta = INVENTORY_STATUS[inv.status]
          const progress = inv.totalItems > 0 ? Math.round((inv.countedItems / inv.totalItems) * 100) : 0
          const accuracy = inv.totalItems > 0 ? (((inv.totalItems - inv.divergences) / inv.totalItems) * 100).toFixed(1) : null
          return (
            <Card onPress={() => router.push({ pathname: '/inventario/[id]', params: { id: inv.id } })}>
              <View style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={meta.icon} size={16} color={meta.tone} />
                  <AppText bold style={{ flex: 1 }} numberOfLines={2}>{inv.name}</AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  <Badge label={meta.label} tone={meta.tone} />
                  <Badge label={INVENTORY_TYPES[inv.type]} />
                </View>
                <AppText variant="caption" color="tertiary">
                  {inv.responsible.name} · início {formatDate(inv.startDate)}{inv.endDate ? ` · fim ${formatDate(inv.endDate)}` : ''}
                </AppText>
                <ProgressBar value={progress} tone={inv.status === 'completed' ? 'success' : 'brand'} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="caption" color="secondary">{formatNumber(inv.countedItems)} / {formatNumber(inv.totalItems)} contados ({progress}%)</AppText>
                  <AppText variant="caption" color={inv.divergences > 0 ? 'danger' : 'success'} bold>
                    {inv.divergences} divergência(s){inv.status === 'completed' && accuracy ? ` · ${accuracy}%` : ''}
                  </AppText>
                </View>
              </View>
            </Card>
          )
        }}
      />
      {canCreate ? <Fab label="Novo inventário" onPress={() => router.push('/inventario/novo')} /> : null}
    </View>
  )
}
