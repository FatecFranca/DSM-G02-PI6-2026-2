import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { AppText, Badge, Button, Card, Chips, Icon, SearchBar, StatCard } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { fetchAll } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'
import { shareCsv } from '@/lib/share'
import { LOT_STATUS_LABELS } from '@/lib/status'
import { useDebounced, useFetch } from '@/lib/useFetch'
import { usePaged } from '@/lib/usePaged'
import { space, Tone } from '@/theme/tokens'
import type { ApiLot, ApiLotReport, LotStatus } from '@/types/api'

type Filter = '' | LotStatus
const META: Record<LotStatus, { tone: Tone; icon: IconName }> = {
  valid: { tone: 'success', icon: 'check-circle' },
  expiring: { tone: 'warning', icon: 'clock' },
  expired: { tone: 'danger', icon: 'x-circle' },
  quarantine: { tone: 'neutral', icon: 'alert-triangle' },
}

export default function LotesScreen() {
  const router = useRouter()
  const [now] = useState(() => Date.now())
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Filter>('')
  const debounced = useDebounced(search)
  const params = { search: debounced.trim() || undefined, status: status || undefined }
  const list = usePaged<ApiLot>('/lots', params)
  const report = useFetch<ApiLotReport>('/reports/lots', { days: 30 })
  const counts: Record<LotStatus, number> = {
    valid: report.data?.summary.valid ?? 0,
    expiring: report.data?.summary.expiringSoon ?? 0,
    expired: report.data?.summary.expired ?? 0,
    quarantine: report.data?.summary.quarantine ?? 0,
  }

  async function exportCsv() {
    const all = await fetchAll<ApiLot>('/lots', params)
    await shareCsv('lotes.csv', ['Lote', 'Produto', 'Código', 'Quantidade', 'Fabricação', 'Validade', 'Fornecedor', 'Endereço', 'Status'],
      all.map(l => [l.lotNumber, l.product.name, l.product.internalCode, l.quantity, formatDate(l.manufacturingDate), formatDate(l.expirationDate), l.supplier.name, l.address, LOT_STATUS_LABELS[l.status]]))
  }

  return (
    <ListScreen
      state={list}
      keyExtractor={l => l.id}
      empty={{ icon: 'layers', title: 'Nenhum lote encontrado' }}
      header={
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {(['valid', 'expiring', 'expired', 'quarantine'] as LotStatus[]).map(s => (
              <StatCard key={s} label={LOT_STATUS_LABELS[s]} value={counts[s]} icon={META[s].icon} tone={META[s].tone} />
            ))}
          </View>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Lote, produto ou fornecedor" />
          <Chips<Filter> value={status} onChange={setStatus} items={[{ id: '', label: 'Todos' }, ...(['valid', 'expiring', 'expired', 'quarantine'] as LotStatus[]).map(s => ({ id: s as Filter, label: LOT_STATUS_LABELS[s] }))]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="small" color="tertiary">{formatNumber(list.total)} lotes</AppText>
            <Button title="Exportar CSV" icon="share" variant="ghost" size="sm" onPress={exportCsv} />
          </View>
        </>
      }
      renderItem={lot => {
        const daysLeft = Math.ceil((new Date(lot.expirationDate).getTime() - now) / 86_400_000)
        const meta = META[lot.status]
        return (
          <Card onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: lot.productId } })}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name={meta.icon} size={14} color={meta.tone} />
                  <AppText variant="mono" bold>{lot.lotNumber}</AppText>
                </View>
                <AppText bold numberOfLines={2}>{lot.product.name}</AppText>
                <AppText variant="caption" color="tertiary">{lot.supplier.name} · endereço {lot.address}</AppText>
                <AppText variant="caption" color={daysLeft < 0 ? 'danger' : daysLeft < 30 ? 'warning' : 'success'} bold>
                  Vence em {formatDate(lot.expirationDate)} · {daysLeft < 0 ? `venceu há ${Math.abs(daysLeft)} dias` : `${daysLeft} dias`}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge label={LOT_STATUS_LABELS[lot.status]} tone={meta.tone} dot />
                <AppText bold>{formatNumber(lot.quantity)} <AppText variant="caption" color="tertiary">un</AppText></AppText>
              </View>
            </View>
          </Card>
        )
      }}
    />
  )
}
