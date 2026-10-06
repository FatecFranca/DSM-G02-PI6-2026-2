import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, Tone, toneColors } from '@/theme/tokens'
import { AppText } from './Text'

export function Badge({ label, tone = 'neutral', dot }: { label: string; tone?: Tone; dot?: boolean }) {
  const { colors } = useTheme()
  const c = toneColors(colors, tone)
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c.fg }]} /> : null}
      <AppText variant="caption" bold style={{ color: c.fg }}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
})
