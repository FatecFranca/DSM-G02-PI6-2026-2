import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { AppText, Badge, Banner, Button, Card, CardHeader, ConfirmDialog, Input, KeyValue, Loading, ProgressBar, Screen } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDate, formatNumber } from '@/lib/format'
import { INVENTORY_STATUS, INVENTORY_TYPES } from '@/lib/inventory'
import { ADMIN, hasRole, STAFF, WRITERS } from '@/lib/permissions'
import { useFetch } from '@/lib/useFetch'
import { useSafeBack } from '@/lib/useSafeBack'
import { space } from '@/theme/tokens'
import type { ApiInventoryDetails, ApiInventoryItem, InventoryStatus } from '@/types/api'

export default function InventarioDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const goBack = useSafeBack('/inventario')
  const { user } = useAuth()
  const detail = useFetch<ApiInventoryDetails>(`/inventory/${id}`)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const inv = detail.data
  const isStaff = hasRole(user?.role, STAFF)
  const canCount = hasRole(user?.role, WRITERS)
  const canDelete = hasRole(user?.role, ADMIN)

  if (detail.loading && !inv) return <Loading />
  if (!inv) return <Screen><Banner onRetry={detail.reload}>{detail.error || 'Inventário não encontrado'}</Banner></Screen>

  const meta = INVENTORY_STATUS[inv.status]
  const progress = inv.totalItems > 0 ? Math.round((inv.countedItems / inv.totalItems) * 100) : 0

  async function changeStatus(status: InventoryStatus) {
    setBusy(true)
    setError('')
    try {
      await api.patch(`/inventory/${id}`, { status })
      await detail.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api.delete(`/inventory/${id}`)
      goBack()
    } catch (err) {
      setError(errorMessage(err))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen onRefresh={detail.refresh} refreshing={detail.refreshing}>
      <Stack.Screen options={{ title: 'Contagem' }} />
      {error ? <Banner>{error}</Banner> : null}

      <View style={{ gap: 6 }}>
        <AppText variant="heading">{inv.name}</AppText>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={meta.label} tone={meta.tone} dot />
          <Badge label={INVENTORY_TYPES[inv.type]} />
        </View>
      </View>

      <Card>
        <KeyValue label="Responsável" value={inv.responsible.name} />
        <KeyValue label="Início" value={formatDate(inv.startDate)} />
        {inv.endDate ? <KeyValue label="Fim" value={formatDate(inv.endDate)} /> : null}
        <KeyValue label="Itens contados" value={`${formatNumber(inv.countedItems)} / ${formatNumber(inv.totalItems)}`} />
        <KeyValue label="Divergências" value={String(inv.divergences)} />
        {inv.status === 'completed' && inv.totalItems > 0 ? <KeyValue label="Acuracidade" value={`${(((inv.totalItems - inv.divergences) / inv.totalItems) * 100).toFixed(1)}%`} /> : null}
        <View style={{ marginTop: space.md }}><ProgressBar value={progress} tone={inv.status === 'completed' ? 'success' : 'brand'} height={8} /></View>
      </Card>

      <View style={{ gap: space.sm }}>
        {canCount && inv.status === 'planned' ? <Button title="Iniciar contagem" icon="play" onPress={() => changeStatus('in_progress')} loading={busy} /> : null}
        {canCount && inv.status === 'in_progress' ? <Button title="Enviar para revisão" icon="send" onPress={() => changeStatus('review')} loading={busy} disabled={inv.countedItems < inv.totalItems} /> : null}
        {canCount && inv.status === 'in_progress' && inv.countedItems < inv.totalItems ? <AppText variant="caption" color="tertiary">Conte todos os itens para enviar à revisão.</AppText> : null}
        {isStaff && inv.status === 'review' ? <Button title="Concluir inventário" icon="check" onPress={() => changeStatus('completed')} loading={busy} /> : null}
        {isStaff && inv.status === 'review' ? <Button title="Reabrir contagem" variant="outline" onPress={() => changeStatus('in_progress')} loading={busy} /> : null}
        {canDelete && inv.status === 'planned' ? <Button title="Excluir inventário" icon="trash-2" variant="outline" onPress={() => setConfirmDelete(true)} /> : null}
      </View>

      <AppText variant="overline" color="tertiary" style={{ marginTop: space.sm }}>Itens ({inv.items.length})</AppText>
      {inv.items.length === 0 ? <AppText color="tertiary">Este inventário não tem itens.</AppText> : null}
      {inv.items.map(item => (
        <ItemRow key={item.id} item={item} editable={canCount && inv.status === 'in_progress'} inventoryId={inv.id} onSaved={detail.reload} onError={setError} />
      ))}

      <ConfirmDialog visible={confirmDelete} title="Excluir inventário" message={`Excluir "${inv.name}"?`} confirmLabel="Excluir" loading={busy} onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </Screen>
  )
}

function ItemRow({ item, editable, inventoryId, onSaved, onError }: { item: ApiInventoryItem; editable: boolean; inventoryId: string; onSaved: () => Promise<void>; onError: (m: string) => void }) {
  const [value, setValue] = useState(item.countedQuantity === null ? '' : String(item.countedQuantity))
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setValue(item.countedQuantity === null ? '' : String(item.countedQuantity)) }, [item.countedQuantity])

  const counted = item.countedQuantity !== null
  const dirty = value !== (counted ? String(item.countedQuantity) : '')

  async function save() {
    const n = Number(value)
    if (value === '' || !Number.isInteger(n) || n < 0) return onError('Informe uma quantidade inteira maior ou igual a zero.')
    setSaving(true)
    onError('')
    try {
      await api.post(`/inventory/${inventoryId}/items/${item.id}/count`, { countedQuantity: n })
      await onSaved()
    } catch (err) {
      onError(errorMessage(err, 'Falha ao registrar a contagem'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title={item.product.name} description={`${item.product.internalCode} · esperado ${formatNumber(item.expectedQuantity)} ${item.product.unit}`}
        right={counted ? <Badge label={item.discrepancy === 0 ? 'Confere' : `${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}`} tone={item.discrepancy === 0 ? 'success' : 'danger'} dot /> : <Badge label="Pendente" />} />
      {editable ? (
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}><Input label="Quantidade contada" value={value} onChangeText={setValue} keyboardType="number-pad" placeholder="0" /></View>
          <Button title={counted ? 'Atualizar' : 'Registrar'} onPress={save} loading={saving} disabled={!dirty && counted} />
        </View>
      ) : (
        <AppText color="secondary">{counted ? `Contado: ${formatNumber(item.countedQuantity!)} ${item.product.unit}${item.countedBy ? ` por ${item.countedBy.name}` : ''}` : 'Não contado'}</AppText>
      )}
    </Card>
  )
}
