import { StyleSheet, View } from 'react-native'
import { initials } from '@/lib/format'
import { useTheme } from '@/theme/ThemeProvider'
import { AppText } from './Text'

const PALETTE = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#db2777']

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { isDark } = useTheme()
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length]
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + (isDark ? '40' : '22') }]}>
      <AppText bold style={{ color, fontSize: size * 0.38 }}>{initials(name) || '?'}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({ avatar: { alignItems: 'center', justifyContent: 'center' } })
