import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius, space } from '@/theme/tokens'
import { Icon } from './Icon'
import { Input } from './Input'
import { Sheet } from './Sheet'
import { AppText } from './Text'

export interface Option {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  label?: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  /** Mostra uma busca no topo (automático acima de 8 opções). */
  searchable?: boolean
  /** Permite voltar a "nenhum" (valor vazio). */
  clearable?: boolean
}

export function Select({ label, value, options, onChange, placeholder = 'Selecione', error, hint, disabled, searchable, clearable }: SelectProps) {
  const { colors } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = options.find(o => o.value === value)
  const showSearch = searchable ?? options.length > 8

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter(o => o.label.toLowerCase().includes(q) || o.description?.toLowerCase().includes(q)) : options
  }, [options, query])

  function pick(next: string) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <View style={{ alignSelf: 'stretch' }}>
      {label ? <AppText variant="small" bold style={{ marginBottom: 6 }}>{label}</AppText> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.box, { backgroundColor: colors.bgBase, borderColor: error ? colors.danger : colors.border }, disabled && { opacity: 0.55 }]}
      >
        <AppText style={{ flex: 1, fontSize: font.md }} color={selected ? 'primary' : 'tertiary'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </AppText>
        <Icon name="chevron-down" size={16} color="tertiary" />
      </Pressable>
      {error ? <AppText variant="caption" color="danger" style={{ marginTop: 4 }}>{error}</AppText> : null}
      {hint && !error ? <AppText variant="caption" color="tertiary" style={{ marginTop: 4 }}>{hint}</AppText> : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={label ?? placeholder}>
        {showSearch ? <Input value={query} onChangeText={setQuery} placeholder="Buscar…" leftIcon="search" autoCorrect={false} /> : null}
        {clearable && value ? (
          <Pressable onPress={() => pick('')} style={styles.option}>
            <AppText color="secondary">Limpar seleção</AppText>
          </Pressable>
        ) : null}
        <FlatList
          data={filtered}
          scrollEnabled={false}
          keyExtractor={o => o.value}
          ListEmptyComponent={<AppText color="tertiary" align="center" style={{ padding: space.lg }}>Nenhuma opção</AppText>}
          renderItem={({ item }) => {
            const active = item.value === value
            return (
              <Pressable
                onPress={() => pick(item.value)}
                accessibilityRole="menuitem"
                style={[styles.option, { borderBottomColor: colors.border }, active && { backgroundColor: colors.brandSubtle }]}
              >
                <View style={{ flex: 1 }}>
                  <AppText bold={active} color={active ? 'brand' : 'primary'}>{item.label}</AppText>
                  {item.description ? <AppText variant="caption" color="tertiary">{item.description}</AppText> : null}
                </View>
                {active ? <Icon name="check" size={16} color="brand" /> : null}
              </Pressable>
            )
          }}
        />
      </Sheet>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, minHeight: 44, paddingHorizontal: 12, gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
})
