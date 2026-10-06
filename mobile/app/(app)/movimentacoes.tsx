import { useState } from 'react'
import { View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { MovementRow } from '@/components/MovementRow'
import { AppText, Button, Chips, DateField, SearchBar, Sheet, StatCard } from '@/components/ui'
import { fetchAll } from '@/lib/api'
import { brDateToIso, formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import { MOVEMENT_META } from '@/lib/movement'
import { shareCsv } from '@/lib/share'
import { useDebounced, useFetch } from '@/lib/useFetch'
import { usePaged } from '@/lib/usePaged'
import { space } from '@/theme/tokens'
import type { ApiMovement, ApiMovementReport, MovementType } from '@/types/api'

type TypeFilter = '' | MovementType

export default function MovimentacoesScreen() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState<TypeFilter>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const debounced = useDebounced(search)

  const fromIso = brDateToIso(from) ?? undefined
  const toIso = brDateToIso(to) ? new Date(new Date(brDateToIso(to)!).getTime() + 86_399_999).toISOString() : undefined
  const params = { type: type || undefined, search: debounced.trim() || undefined, from: fromIso, to: toIso }
  const list = usePaged<ApiMovement>('/movements', params)
  const summary = useFetch<ApiMovementReport>('/reports/movements', { from: fromIso, to: toIso })

  const byType = (t: MovementType) => summary.data?.byType.find(x => x.type === t)

  async function exportCsv() {
    const all = await fetchAll<ApiMovement>('/movements', params)
    await shareCsv('movimentacoes.csv', ['Data', 'Tipo', 'Produto', 'Código', 'Quantidade', 'Valor', 'Operador', 'NF', 'Lote', 'Cliente', 'Observações'],
      all.map(m => [formatDateTime(m.createdAt), MOVEMENT_META[m.type].label, m.product.name, m.product.internalCode, m.quantity, m.totalValue, m.user.name, m.invoiceNumber, m.lotNumber, m.customerName, m.notes]))
  }

  const activeFilters = (from ? 1 : 0) + (to ? 1 : 0)

  return (
    <>
      <ListScreen
        state={list}
        keyExtractor={m => m.id}
        empty={{ icon: 'clock', title: 'Nenhuma movimentação encontrada', description: 'Ajuste a busca, o tipo ou o período.' }}
        header={
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(['entry', 'exit', 'transfer', 'loss'] as MovementType[]).map(t => (
                <StatCard key={t} label={MOVEMENT_META[t].label} value={formatNumber(byType(t)?.count ?? 0)} sub={formatCurrency(byType(t)?.value ?? 0)} icon={MOVEMENT_META[t].icon} tone={MOVEMENT_META[t].tone} />
              ))}
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Produto, código, operador, NF, lote…" />
            <Chips<TypeFilter>
              value={type}
              onChange={setType}
              items={[{ id: '', label: 'Todos' }, ...(Object.keys(MOVEMENT_META) as MovementType[]).map(t => ({ id: t as TypeFilter, label: MOVEMENT_META[t].label }))]}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="small" color="tertiary">{formatNumber(list.total)} registros</AppText>
              <View style={{ flexDirection: 'row' }}>
                <Button title={activeFilters ? `Período (${activeFilters})` : 'Período'} icon="calendar" variant="ghost" size="sm" onPress={() => setShowFilters(true)} />
                <Button title="CSV" icon="share" variant="ghost" size="sm" onPress={exportCsv} />
              </View>
            </View>
          </>
        }
        renderItem={m => <MovementRow m={m} />}
      />
      <Sheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Período"
        footer={<><Button title="Limpar" variant="outline" onPress={() => { setFrom(''); setTo(''); setShowFilters(false) }} /><Button title="Aplicar" onPress={() => setShowFilters(false)} /></>}
      >
        <DateField label="De" value={from} onChangeText={setFrom} error={from.length === 10 && !brDateToIso(from) ? 'Data inválida' : undefined} />
        <DateField label="Até" value={to} onChangeText={setTo} error={to.length === 10 && !brDateToIso(to) ? 'Data inválida' : undefined} />
      </Sheet>
    </>
  )
}
