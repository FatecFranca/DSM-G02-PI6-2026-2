import { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space, Tone, toneColors } from '@/theme/tokens'
import { Button } from './Button'
import { Icon, IconName } from './Icon'
import { AppText } from './Text'

/** Faixa de mensagem (erro, sucesso, aviso, informação), como o <Alert> do web. */
export function Banner({ children, tone = 'danger', onRetry }: { children: ReactNode; tone?: Tone; onRetry?: () => void }) {
  const { colors } = useTheme()
  const c = toneColors(colors, tone)
  const icon: IconName = tone === 'success' ? 'check-circle' : tone === 'danger' ? 'alert-circle' : tone === 'warning' ? 'alert-triangle' : 'info'
  return (
    <View accessibilityRole={tone === 'danger' ? 'alert' : undefined} style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Icon name={icon} size={16} color={tone} />
      <AppText variant="small" style={{ flex: 1, color: c.fg }}>{children}</AppText>
      {onRetry ? <Button title="Tentar de novo" size="sm" variant="outline" onPress={onRetry} /> : null}
    </View>
  )
}

export function EmptyState({ icon = 'inbox', title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  const { colors } = useTheme()
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.bgMuted }]}>
        <Icon name={icon} size={24} color="tertiary" />
      </View>
      <AppText variant="subheading" align="center">{title}</AppText>
      {description ? <AppText variant="small" color="tertiary" align="center" style={{ maxWidth: 280 }}>{description}</AppText> : null}
      {action}
    </View>
  )
}

export function Loading({ label }: { label?: string }) {
  const { colors } = useTheme()
  return (
    <View style={styles.loading} accessibilityLabel="Carregando">
      <ActivityIndicator color={colors.brand} />
      {label ? <AppText variant="small" color="tertiary">{label}</AppText> : null}
    </View>
  )
}

/** Linhas cinzas pulsando (esqueleto de lista). */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  const { colors } = useTheme()
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.skeleton, { backgroundColor: colors.bgMuted, opacity: 1 - i * 0.12 }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md, borderWidth: 1 },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: 48, paddingHorizontal: space.xl },
  emptyIcon: { width: 56, height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: 48 },
  skeleton: { height: 64, borderRadius: radius.lg },
})
