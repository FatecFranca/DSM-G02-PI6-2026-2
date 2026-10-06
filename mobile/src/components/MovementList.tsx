import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { MovementRow } from '@/components/MovementRow'
import { AppText, Button, Fab, SearchBar, StatCard } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { fetchAll } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import { MOVEMENT_META } from '@/lib/movement'
import { hasRole, WRITERS } from '@/lib/permissions'
import { shareCsv } from '@/lib/share'
import { useDebounced, useFetch } from '@/lib/useFetch'
import { usePaged } from '@/lib/usePaged'
import { space } from '@/theme/tokens'
import type { ApiMovement, Paginated } from '@/types/api'

interface Props {
  /** Tipos buscados, separados por vírgula (ex.: "entry" ou "exit,loss"). */
  types: string
  newHref: '/entradas/nova' | '/saidas/nova'
  csvName: string
  labels: { today: string; units: string; value: string }
  icon: IconName
}

const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Lista de entradas/saídas com resumo do dia, busca, exportação e botão de novo registro. */
export function MovementList({ types, newHref, csvName, labels, icon }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const canWrite = hasRole(user?.role, WRITERS)
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search)

  const list = usePaged<ApiMovement>('/movements', { type: types, search: debounced.trim() || undefined })
  const today = useFetch<Paginated<ApiMovement>>('/movements', { type: types, from: startOfToday(), limit: 100 })
  const units = today.data?.data.reduce((a, m) => a + m.quantity, 0) ?? 0
  const value = today.data?.data.reduce((a, m) => a + m.totalValue, 0) ?? 0

  async function exportCsv() {
    const all = await fetchAll<ApiMovement>('/movements', { type: types })
    await shareCsv(csvName, ['Data', 'Tipo', 'Produto', 'Código', 'Quantidade', 'Valor unit.', 'Total', 'NF', 'Lote', 'Fornecedor', 'Cliente/Destino', 'Operador'],
      all.map(m => [formatDateTime(m.createdAt), MOVEMENT_META[m.type].label, m.product.name, m.product.internalCode, m.quantity, m.unitCost, m.totalValue, m.invoiceNumber, m.lotNumber, m.supplier?.name, m.customerName, m.user.name]))
  }

  return (
    <View style={{ flex: 1 }}>
      <ListScreen
        state={list}
        fab={canWrite}
        keyExtractor={m => m.id}
        empty={{ icon, title: 'Nenhum registro', description: 'Quando houver movimentações elas aparecem aqui.' }}
        header={
          <>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <StatCard label={labels.today} value={today.data?.total ?? 0} sub="hoje" icon={icon} tone="brand" />
              <StatCard label={labels.units} value={formatNumber(units)} sub="hoje" icon="package" />
            </View>
            <StatCard label={labels.value} value={formatCurrency(value)} sub="hoje" icon="dollar-sign" tone="info" />
            <SearchBar value={search} onChangeText={setSearch} placeholder="Produto, código, NF, lote, cliente…" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="small" color="tertiary">{formatNumber(list.total)} registros</AppText>
              <Button title="Exportar CSV" icon="share" variant="ghost" size="sm" onPress={exportCsv} />
            </View>
          </>
        }
        renderItem={m => <MovementRow m={m} />}
      />
      {canWrite ? <Fab label="Novo registro" onPress={() => router.push(newHref)} /> : null}
    </View>
  )
}
