import { ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space, Tone, toneColors } from '@/theme/tokens'
import { Icon, IconName } from './Icon'
import { Input } from './Input'
import { AppText } from './Text'

/** Chips de filtro/aba rolando na horizontal (equivale ao <Tabs> e filtros de status do web). */
export function Chips<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string; badge?: number | string }[]
  value: T
  onChange: (id: T) => void
}) {
  const { colors } = useTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: 2 }}>
      {items.map(item => {
        const active = item.id === value
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.id)}
            style={[styles.chip, { backgroundColor: active ? colors.brand : colors.bgBase, borderColor: active ? colors.brand : colors.border }]}
          >
            <AppText variant="small" bold color={active ? 'inverse' : 'secondary'}>{item.label}</AppText>
            {item.badge !== undefined ? (
              <View style={[styles.chipBadge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : colors.bgMuted }]}>
                <AppText variant="caption" bold color={active ? 'inverse' : 'secondary'}>{item.badge}</AppText>
              </View>
            ) : null}
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function SearchBar({ value, onChangeText, placeholder = 'Buscar…' }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return <Input value={value} onChangeText={onChangeText} placeholder={placeholder} leftIcon="search" autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
}

export function StatCard({ label, value, sub, icon, tone = 'neutral', style }: { label: string; value: string | number; sub?: string; icon?: IconName; tone?: Tone; style?: object }) {
  const { colors } = useTheme()
  const c = toneColors(colors, tone)
  return (
    <View style={[styles.stat, { backgroundColor: colors.bgBase, borderColor: colors.border, borderLeftColor: tone === 'neutral' ? colors.border : c.fg, borderLeftWidth: tone === 'neutral' ? 1 : 3 }, style]}>
      <View style={styles.statTop}>
        <AppText variant="overline" color="tertiary" numberOfLines={1} style={{ flex: 1 }}>{label}</AppText>
        {icon ? (
          <View style={[styles.statIcon, { backgroundColor: c.bg }]}>
            <Icon name={icon} size={14} color={tone} />
          </View>
        ) : null}
      </View>
      <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 6 }}>{value}</AppText>
      {sub ? <AppText variant="caption" color="tertiary" numberOfLines={1} style={{ marginTop: 2 }}>{sub}</AppText> : null}
    </View>
  )
}

export function Fab({ icon = 'plus', onPress, label }: { icon?: IconName; onPress: () => void; label: string }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name={icon} size={22} color="inverse" />
    </Pressable>
  )
}

export function ProgressBar({ value, tone = 'brand', height = 6 }: { value: number; tone?: Tone; height?: number }) {
  const { colors } = useTheme()
  const c = toneColors(colors, tone)
  return (
    <View style={{ height, borderRadius: height, backgroundColor: colors.bgMuted, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', borderRadius: height, backgroundColor: c.fg }} />
    </View>
  )
}

export function KeyValue({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  const { colors } = useTheme()
  return (
    <View style={[styles.kv, { borderBottomColor: colors.border }]}>
      <AppText variant="small" color="tertiary">{label}</AppText>
      {typeof value === 'string' || typeof value === 'number'
        ? <AppText variant={mono ? 'mono' : 'small'} bold style={{ flexShrink: 1, textAlign: 'right' }}>{value}</AppText>
        : value}
    </View>
  )
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" color="tertiary">{children}</AppText>
      {right}
    </View>
  )
}

/** Linha de lista tocável com ícone, título, subtítulo e valor à direita. */
export function ListRow({
  title, subtitle, icon, tone = 'neutral', right, onPress, chevron, children,
}: {
  title: string; subtitle?: string; icon?: IconName; tone?: Tone; right?: ReactNode; onPress?: () => void; chevron?: boolean; children?: ReactNode
}) {
  const { colors } = useTheme()
  const c = toneColors(colors, tone)
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.bgSubtle : colors.bgBase, borderColor: colors.border }]}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: c.bg }]}>
          <Icon name={icon} size={16} color={tone} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText bold numberOfLines={2}>{title}</AppText>
        {subtitle ? <AppText variant="caption" color="tertiary" numberOfLines={2}>{subtitle}</AppText> : null}
        {children}
      </View>
      {right}
      {chevron ? <Icon name="chevron-right" size={16} color="tertiary" /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.full, borderWidth: 1 },
  chipBadge: { minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: space.md, minWidth: 140 },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIcon: { width: 26, height: 26, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderWidth: 1, borderRadius: radius.lg },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
