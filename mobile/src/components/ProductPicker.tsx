import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { AppText, Icon, Input, Sheet } from '@/components/ui'
import { api } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useDebounced } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'
import type { ApiProduct, Paginated } from '@/types/api'

interface Props {
  value: ApiProduct | null
  onChange: (product: ApiProduct | null) => void
  label?: string
  error?: string
  /** Só produtos com estoque (para saídas). */
  requireStock?: boolean
  disabled?: boolean
}

/** Seletor de produto com busca no servidor (nome, código, SKU ou código de barras). */
export function ProductPicker({ value, onChange, label = 'Produto', error, requireStock, disabled }: Props) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(false)
  const debounced = useDebounced(term, 250)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    api.get<Paginated<ApiProduct>>('/products', { search: debounced.trim() || undefined, status: 'active', limit: 20 })
      .then(res => { if (!cancelled) setResults(requireStock ? res.data.filter(p => p.currentStock > 0) : res.data) })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debounced, open, requireStock])

  return (
    <View>
      <AppText variant="small" bold style={{ marginBottom: 6 }}>{label}</AppText>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[styles.box, { backgroundColor: colors.bgBase, borderColor: error ? colors.danger : colors.border }, disabled && { opacity: 0.55 }]}
      >
        <Icon name="package" size={16} color="tertiary" />
        <View style={{ flex: 1 }}>
          {value ? (
            <>
              <AppText numberOfLines={1} bold>{value.name}</AppText>
              <AppText variant="caption" color="tertiary" numberOfLines={1}>{value.internalCode} · estoque {formatNumber(value.currentStock)} {value.unit}</AppText>
            </>
          ) : (
            <AppText color="tertiary">Buscar produto…</AppText>
          )}
        </View>
        {value && !disabled ? (
          <Pressable hitSlop={10} onPress={() => onChange(null)} accessibilityLabel="Remover produto"><Icon name="x" size={16} color="tertiary" /></Pressable>
        ) : <Icon name="search" size={16} color="tertiary" />}
      </Pressable>
      {error ? <AppText variant="caption" color="danger" style={{ marginTop: 4 }}>{error}</AppText> : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title="Selecionar produto">
        <Input value={term} onChangeText={setTerm} placeholder="Nome, código, SKU ou código de barras" leftIcon="search" autoFocus autoCorrect={false} autoCapitalize="none" />
        {loading ? <AppText color="tertiary" variant="small">Buscando…</AppText> : null}
        {!loading && results.length === 0 ? <AppText color="tertiary" align="center" style={{ padding: space.lg }}>Nenhum produto encontrado</AppText> : null}
        <FlatList
          data={results}
          scrollEnabled={false}
          keyExtractor={p => p.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { onChange(item); setOpen(false); setTerm('') }}
              style={[styles.option, { borderBottomColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <AppText bold numberOfLines={2}>{item.name}</AppText>
                <AppText variant="caption" color="tertiary">{item.internalCode} · {item.sku}</AppText>
              </View>
              <AppText variant="small" color="secondary">{formatNumber(item.currentStock)} {item.unit}</AppText>
            </Pressable>
          )}
        />
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, minHeight: 48, paddingHorizontal: 12, paddingVertical: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
})
