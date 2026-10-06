import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { AppText, Badge, Button, Card, Chips, Fab, Icon, SearchBar, Select } from '@/components/ui'
import { fetchAll } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatNumber } from '@/lib/format'
import { hasRole, STAFF } from '@/lib/permissions'
import { shareCsv } from '@/lib/share'
import { PRODUCT_STATUS_LABELS, STOCK_STATUS_LABELS } from '@/lib/status'
import { STOCK_TONE } from '@/lib/movement'
import { useDebounced, useFetch } from '@/lib/useFetch'
import { usePaged } from '@/lib/usePaged'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'
import type { ApiCategory, ApiProduct } from '@/types/api'

type StockFilter = '' | 'ok' | 'low' | 'critical' | 'out'

export default function ProdutosScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const canEdit = hasRole(user?.role, STAFF)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [stock, setStock] = useState<StockFilter>('')
  const debounced = useDebounced(search)
  const categories = useFetch<ApiCategory[]>('/categories')

  const params = { search: debounced.trim() || undefined, categoryId: category || undefined, status: status || undefined, stockStatus: stock || undefined }
  const list = usePaged<ApiProduct>('/products', params)

  async function exportCsv() {
    const all = await fetchAll<ApiProduct>('/products', params)
    await shareCsv('produtos.csv',
      ['Código', 'SKU', 'Código de barras', 'Produto', 'Categoria', 'Marca', 'Fornecedor', 'Unidade', 'Estoque', 'Mínimo', 'Máximo', 'Preço compra', 'Preço venda', 'Status'],
      all.map(p => [p.internalCode, p.sku, p.barcode, p.name, p.category.name, p.brand.name, p.supplier.name, p.unit, p.currentStock, p.minStock, p.maxStock, p.purchasePrice, p.salePrice, PRODUCT_STATUS_LABELS[p.status]]))
  }

  return (
    <View style={{ flex: 1 }}>
      <ListScreen
        state={list}
        fab={canEdit}
        keyExtractor={p => p.id}
        empty={{ icon: 'package', title: 'Nenhum produto encontrado', description: 'Ajuste a busca ou os filtros.' }}
        header={
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Nome, código, SKU ou código de barras" />
            <Chips<StockFilter>
              value={stock}
              onChange={setStock}
              items={[
                { id: '', label: 'Todos' },
                { id: 'ok', label: STOCK_STATUS_LABELS.ok },
                { id: 'low', label: STOCK_STATUS_LABELS.low },
                { id: 'critical', label: STOCK_STATUS_LABELS.critical },
                { id: 'out', label: STOCK_STATUS_LABELS.out },
              ]}
            />
            <View style={styles.filters}>
              <View style={{ flex: 1 }}>
                <Select value={category} onChange={setCategory} placeholder="Categoria" clearable options={(categories.data ?? []).map(c => ({ value: c.id, label: c.name }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Select value={status} onChange={setStatus} placeholder="Status" clearable options={Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label }))} />
              </View>
            </View>
            <View style={styles.summary}>
              <AppText variant="small" color="tertiary">{formatNumber(list.total)} produtos</AppText>
              <Button title="Exportar CSV" icon="share" variant="ghost" size="sm" onPress={exportCsv} />
            </View>
          </>
        }
        renderItem={p => (
          <Card onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: p.id } })}>
            <View style={styles.row}>
              <View style={[styles.thumb, { backgroundColor: colors.bgMuted }]}><Icon name="package" size={18} color="tertiary" /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText bold numberOfLines={2}>{p.name}</AppText>
                <AppText variant="mono" color="tertiary" numberOfLines={1}>{p.internalCode} · {p.sku}</AppText>
                <AppText variant="caption" color="tertiary">{p.category.name} · {p.brand.name}</AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <AppText bold>{formatNumber(p.currentStock)} <AppText variant="caption" color="tertiary">{p.unit}</AppText></AppText>
                <Badge label={STOCK_STATUS_LABELS[p.stockStatus]} tone={STOCK_TONE[p.stockStatus]} dot />
                <AppText variant="caption" color="secondary">{formatCurrency(p.salePrice)}</AppText>
              </View>
            </View>
          </Card>
        )}
      />
      {canEdit ? <Fab label="Novo produto" onPress={() => router.push('/produtos/form')} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: space.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  thumb: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
