import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { font, Tone, toneColors } from '@/theme/tokens'

export type TextVariant = 'title' | 'heading' | 'subheading' | 'body' | 'small' | 'caption' | 'label' | 'mono' | 'overline'

interface AppTextProps extends TextProps {
  variant?: TextVariant
  /** primary (padrão) | secondary | tertiary | um tom semântico. */
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | Tone
  bold?: boolean
  align?: TextStyle['textAlign']
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })

const variants: Record<TextVariant, TextStyle> = {
  title: { fontSize: font.xxl, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: font.xl, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: font.lg, fontWeight: '600' },
  body: { fontSize: font.base },
  small: { fontSize: font.sm },
  caption: { fontSize: font.xs },
  label: { fontSize: font.base, fontWeight: '500' },
  mono: { fontSize: font.sm, fontFamily: mono },
  overline: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
}

export function AppText({ variant = 'body', color = 'primary', bold, align, style, ...props }: AppTextProps) {
  const { colors } = useTheme()
  const resolved =
    color === 'primary' ? colors.text
    : color === 'secondary' ? colors.textSecondary
    : color === 'tertiary' ? colors.textTertiary
    : color === 'inverse' ? colors.textInverse
    : toneColors(colors, color).fg
  return (
    <Text
      style={[variants[variant], { color: resolved }, bold && styles.bold, align ? { textAlign: align } : null, style]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({ bold: { fontWeight: '700' } })
