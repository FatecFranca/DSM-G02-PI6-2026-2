import { useState } from 'react'
import { LayoutChangeEvent, Platform, View } from 'react-native'
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg'
import { useTheme } from '@/theme/ThemeProvider'

/** O <text> do SVG no web não herda a fonte do app: define uma família sem serifa. */
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined })

interface Props {
  data: { label: string; value: number; color: string }[]
  height?: number
  format?: (n: number) => string
}

/** Barras verticais com o valor acima de cada barra (usado na Curva ABC). */
export function BarChart({ data, height = 180, format = n => String(n) }: Props) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const max = Math.max(1, ...data.map(d => d.value))
  const top = 20
  const bottom = 22
  const slot = data.length ? width / data.length : 0
  const barW = Math.min(56, slot * 0.55)

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={height - bottom} y2={height - bottom} stroke={colors.border} />
          {data.map((d, i) => {
            const h = ((height - top - bottom) * d.value) / max
            const cx = slot * i + slot / 2
            return (
              <G key={d.label}>
                <Rect x={cx - barW / 2} y={height - bottom - h} width={barW} height={Math.max(h, 1)} rx={5} fill={d.color} />
                <SvgText fontFamily={FONT} x={cx} y={height - bottom - h - 6} fontSize={11} fontWeight="600" fill={colors.text} textAnchor="middle">{format(d.value)}</SvgText>
                <SvgText fontFamily={FONT} x={cx} y={height - 6} fontSize={11} fill={colors.textTertiary} textAnchor="middle">{d.label}</SvgText>
              </G>
            )
          })}
        </Svg>
      ) : null}
    </View>
  )
}
