import { ActivityIndicator, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius } from '@/theme/tokens'
import { Icon, IconName } from './Icon'
import { AppText } from './Text'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps {
  title?: string
  onPress?: () => void
  variant?: Variant
  size?: Size
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  full?: boolean
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}

const heights: Record<Size, number> = { sm: 34, md: 42, lg: 50 }

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, full, style, accessibilityLabel }: ButtonProps) {
  const { colors } = useTheme()
  const palette = {
    primary: { bg: colors.brand, fg: 'inverse' as const, border: colors.brand },
    secondary: { bg: colors.bgMuted, fg: 'primary' as const, border: colors.bgMuted },
    outline: { bg: colors.bgBase, fg: 'primary' as const, border: colors.border },
    ghost: { bg: 'transparent', fg: 'secondary' as const, border: 'transparent' },
    danger: { bg: colors.danger, fg: 'inverse' as const, border: colors.danger },
  }[variant]
  const off = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        { height: heights[size], backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        !title && { width: heights[size], paddingHorizontal: 0 },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? colors.textInverse : colors.textSecondary} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} color={palette.fg} /> : null}
          {title ? <AppText variant={size === 'sm' ? 'small' : 'body'} bold color={palette.fg}>{title}</AppText> : null}
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
