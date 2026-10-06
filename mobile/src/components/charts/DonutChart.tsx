import { StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { AppText } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'

interface Props {
  data: { label: string; value: number; color: string }[]
  size?: number
  center?: { title: string; subtitle?: string }
}

/** Rosca com legenda (distribuição por categoria). */
export function DonutChart({ data, size = 160, center }: Props) {
  const { colors } = useTheme()
  const total = data.reduce((a, d) => a + d.value, 0)
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.bgMuted} strokeWidth={stroke} fill="none" />
          {total > 0 ? data.map(d => {
            const len = (d.value / total) * c
            const circle = (
              <Circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            )
            offset += len
            return circle
          }) : null}
        </Svg>
        {center ? (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <AppText variant="heading">{center.title}</AppText>
            {center.subtitle ? <AppText variant="caption" color="tertiary">{center.subtitle}</AppText> : null}
          </View>
        ) : null}
      </View>
      <View style={styles.legend}>
        {data.map(d => (
          <View key={d.label} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: d.color }]} />
            <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>{d.label}</AppText>
            <AppText variant="small" bold>{total > 0 ? Math.round((d.value / total) * 100) : 0}%</AppText>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  legend: { alignSelf: 'stretch', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
})
