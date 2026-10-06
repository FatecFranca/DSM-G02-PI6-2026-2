import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { MovementRow } from '@/components/MovementRow'
import { AppText, Badge, Banner, Button, Card, CardHeader, ConfirmDialog, KeyValue, Loading, ProgressBar, Screen, Sheet, StatCard } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { STOCK_TONE } from '@/lib/movement'
import { ADMIN, hasRole, STAFF, WRITERS } from '@/lib/permissions'
import { PRODUCT_STATUS_LABELS, STOCK_STATUS_LABELS } from '@/lib/status'
import { useFetch } from '@/lib/useFetch'
import { useSafeBack } from '@/lib/useSafeBack'
import { space } from '@/theme/tokens'
import type { ApiMovement, ApiProductDetails, Paginated } from '@/types/api'

export default function ProdutoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const goBack = useSafeBack('/produtos')
  const { user } = useAuth()
  const product = useFetch<ApiProductDetails>(`/products/${id}`)
  const history = useFetch<Paginated<ApiMovement>>('/movements', { productId: id, limit: 5 })
  const [moving, setMoving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canMove = hasRole(user?.role, WRITERS)
  const canEdit = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const p = product.data

  if (product.loading && !p) return <Loading />
  if (!p) return <Screen><Banner onRetry={product.reload}>{product.error || 'Produto não encontrado'}</Banner></Screen>

  const margin = p.salePrice > 0 ? ((p.salePrice - p.purchasePrice) / p.salePrice) * 100 : 0
  const max = p.maxStock || Math.max(p.minStock * 2, p.currentStock, 1)
  const level = Math.min(100, (p.currentStock / max) * 100)
  const tone = STOCK_TONE[p.stockStatus]

  async function remove() {
    setBusy(true)
    try {
      await api.delete(`/products/${id}`)
      goBack()
    } catch (err) {
      setError(errorMessage(err))
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  function go(kind: string) {
    setMoving(false)
    if (kind === 'entry') router.push({ pathname: '/entradas/nova', params: { productId: p!.id } })
    else if (kind === 'exit') router.push({ pathname: '/saidas/nova', params: { productId: p!.id } })
    else router.push({ pathname: '/movimento', params: { kind, productId: p!.id } })
  }

  const refresh = () => { void product.refresh(); void history.refresh() }

  return (
    <Screen onRefresh={refresh} refreshing={product.refreshing || history.refreshing}>
      <Stack.Screen options={{ title: p.internalCode }} />
      {error ? <Banner>{error}</Banner> : null}

      <View style={{ gap: 6 }}>
        <AppText variant="heading">{p.name}</AppText>
        <AppText variant="mono" color="tertiary">{p.internalCode} · {p.sku}</AppText>
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <Badge label={PRODUCT_STATUS_LABELS[p.status]} tone={p.status === 'active' ? 'success' : 'neutral'} dot />
          <Badge label={STOCK_STATUS_LABELS[p.stockStatus]} tone={tone} dot />
        </View>
        {p.description ? <AppText color="secondary" style={{ marginTop: 4 }}>{p.description}</AppText> : null}
      </View>

      <View style={styles.actions}>
        {canMove ? <Button title="Movimentar" icon="repeat" onPress={() => setMoving(true)} style={{ flex: 1 }} /> : null}
        {canEdit ? <Button title="Editar" icon="edit-2" variant="outline" onPress={() => router.push({ pathname: '/produtos/form', params: { id: p.id } })} style={{ flex: 1 }} /> : null}
        {canDelete ? <Button icon="trash-2" variant="outline" accessibilityLabel="Excluir produto" onPress={() => setConfirmDelete(true)} /> : null}
      </View>

      <View style={styles.row}>
        <StatCard label="Estoque atual" value={`${formatNumber(p.currentStock)} ${p.unit}`} icon={p.currentStock > p.minStock ? 'trending-up' : 'trending-down'} tone={tone === 'success' ? 'success' : tone} />
        <StatCard label="Mín / Máx" value={`${formatNumber(p.minStock)} / ${formatNumber(p.maxStock)}`} icon="sliders" />
      </View>
      <StatCard label="Valor em estoque" value={formatCurrency(p.currentStock * p.purchasePrice)} sub="ao preço de custo" icon="dollar-sign" tone="info" />

      <Card>
        <CardHeader title="Nível de estoque" right={<AppText variant="small" color="tertiary">{Math.round(level)}% da capacidade</AppText>} />
        <ProgressBar value={level} tone={tone === 'success' ? 'success' : tone} height={10} />
        <View style={styles.between}>
          <AppText variant="caption" color="tertiary">0</AppText>
          <AppText variant="caption" color="tertiary">mín {p.minStock}</AppText>
          <AppText variant="caption" color="tertiary">máx {p.maxStock}</AppText>
        </View>
      </Card>

      <Card>
        <CardHeader title="Classificação" />
        <KeyValue label="Categoria" value={p.category.name} />
        <KeyValue label="Marca" value={p.brand.name} />
        <KeyValue label="Fornecedor" value={p.supplier.name} />
        <KeyValue label="Unidade" value={p.unit} />
        <KeyValue label="Código de barras" value={p.barcode} mono />
      </Card>

      <Card>
        <CardHeader title="Precificação" />
        <KeyValue label="Preço de compra" value={formatCurrency(p.purchasePrice)} />
        <KeyValue label="Preço de venda" value={formatCurrency(p.salePrice)} />
        <KeyValue label="Margem" value={`${margin.toFixed(1)}%`} />
      </Card>

      <Card>
        <CardHeader title="Endereços e lotes" />
        <AppText variant="small" color="tertiary" style={{ marginBottom: 6 }}>Endereços</AppText>
        {p.warehouseAddresses.length === 0 ? <AppText variant="small" color="secondary">Sem endereço registrado.</AppText> : (
          <View style={styles.chips}>
            {p.warehouseAddresses.map(a => <Badge key={a.id} label={`${a.code} · ${a.quantity ?? 0}`} tone="brand" />)}
          </View>
        )}
        <AppText variant="small" color="tertiary" style={{ marginTop: space.md, marginBottom: 6 }}>Lotes ativos</AppText>
        {p.lots.length === 0 ? <AppText variant="small" color="secondary">Sem lotes ativos.</AppText> : p.lots.map(l => (
          <KeyValue key={l.id} label={l.lotNumber} value={`${formatNumber(l.quantity)} un`} mono />
        ))}
      </Card>

      <Card>
        <CardHeader title="Dados físicos" />
        <KeyValue label="Peso" value={`${p.weight} kg`} />
        <KeyValue label="Largura × altura × profundidade" value={`${p.width} × ${p.height} × ${p.depth} cm`} />
        <KeyValue label="Cadastrado em" value={formatDate(p.createdAt)} />
        <KeyValue label="Atualizado em" value={formatDate(p.updatedAt)} />
      </Card>

      <View style={{ gap: space.sm }}>
        <AppText variant="overline" color="tertiary">Últimas movimentações</AppText>
        {history.data?.data.length === 0 ? <AppText color="tertiary">Nenhuma movimentação registrada.</AppText> : null}
        {history.data?.data.map(m => <MovementRow key={m.id} m={m} />)}
      </View>

      <Sheet visible={moving} onClose={() => setMoving(false)} title="Movimentar estoque" description={p.name}>
        <Button title="Entrada" icon="arrow-down-circle" variant="outline" onPress={() => go('entry')} />
        <Button title="Saída / perda" icon="arrow-up-circle" variant="outline" onPress={() => go('exit')} />
        <Button title="Transferir de endereço" icon="shuffle" variant="outline" onPress={() => go('transfer')} />
        <Button title="Ajustar estoque" icon="sliders" variant="outline" onPress={() => go('adjustment')} />
      </Sheet>
      <ConfirmDialog visible={confirmDelete} title="Excluir produto" message={`Excluir "${p.name}"? Produtos com movimentações não podem ser excluídos — marque-os como inativos.`} confirmLabel="Excluir" loading={busy} onConfirm={remove} onClose={() => setConfirmDelete(false)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.sm },
  row: { flexDirection: 'row', gap: space.md },
  between: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})
