import { ReactNode } from 'react'
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'
import { AppText } from './Text'

interface CardProps {
  children: ReactNode
  padded?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  /** Barra colorida à esquerda (como os alertas e cartões de destaque do web). */
  accent?: string
}

export function Card({ children, padded = true, onPress, style, accent }: CardProps) {
  const { colors } = useTheme()
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: colors.bgBase, borderColor: colors.border },
    padded && styles.padded,
    accent ? { borderLeftColor: accent, borderLeftWidth: 3 } : null,
    style,
  ]
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { backgroundColor: colors.bgSubtle }]}>
        {children}
      </Pressable>
    )
  }
  return <View style={base}>{children}</View>
}

export function CardHeader({ title, description, right }: { title: string; description?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <AppText variant="subheading">{title}</AppText>
        {description ? <AppText variant="small" color="tertiary" style={{ marginTop: 2 }}>{description}</AppText> : null}
      </View>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  padded: { padding: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
})
