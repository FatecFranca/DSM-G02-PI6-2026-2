import { useMemo, useState } from 'react'
import { GestureResponderEvent, LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { AppText } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { useTheme } from '@/theme/ThemeProvider'

export interface ChartSeries {
  name: string
  data: (number | null)[]
  color: string
  dashed?: boolean
  /** Preenche a área sob a linha. */
  area?: boolean
}

export interface ChartBand {
  low: (number | null)[]
  high: (number | null)[]
  color: string
}

interface Props {
  labels: string[]
  series: ChartSeries[]
  band?: ChartBand
  height?: number
  /** Mostra um rótulo do eixo X a cada N pontos (automático por padrão). */
  labelEvery?: number
  format?: (n: number) => string
}

/** O <text> do SVG no web não herda a fonte do app: define uma família sem serifa. */
const FONT = Platform.select({ web: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', default: undefined })

const PAD = { left: 40, right: 10, top: 12, bottom: 24 }

function niceMax(value: number): number {
  if (value <= 0) return 10
  const pow = 10 ** Math.floor(Math.log10(value))
  const n = value / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/** Segmentos contínuos (quebra a linha onde há `null`). */
function segments(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): string[] {
  const out: string[] = []
  let current = ''
  values.forEach((v, i) => {
    if (v === null) {
      if (current) out.push(current)
      current = ''
    } else {
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `
    }
  })
  if (current) out.push(current)
  return out
}

export function LineAreaChart({ labels, series, band, height = 220, labelEvery, format = formatNumber }: Props) {
  const { colors } = useTheme()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState<number | null>(null)

  const geometry = useMemo(() => {
    const all = [...series.flatMap(s => s.data), ...(band?.high ?? []), ...(band?.low ?? [])].filter((v): v is number => v !== null)
    const max = niceMax(Math.max(0, ...all))
    const innerW = Math.max(0, width - PAD.left - PAD.right)
    const innerH = height - PAD.top - PAD.bottom
    const n = Math.max(labels.length, 1)
    const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    const y = (v: number) => PAD.top + innerH - (v / max) * innerH
    return { max, innerW, innerH, x, y, n }
  }, [series, band, labels.length, width, height])

  const { x, y, max, innerW, innerH, n } = geometry
  const every = labelEvery ?? Math.max(1, Math.ceil(n / 6))

  function onTouch(e: GestureResponderEvent) {
    if (innerW <= 0) return
    const rel = (e.nativeEvent.locationX - PAD.left) / innerW
    setActive(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))))
  }

  const bandPath = useMemo(() => {
    if (!band) return ''
    const idx = band.high.map((_, i) => i).filter(i => band.high[i] !== null && band.low[i] !== null)
    if (idx.length < 2) return ''
    const top = idx.map((i, k) => `${k ? 'L' : 'M'}${x(i)},${y(band.high[i]!)}`).join(' ')
    const bottom = [...idx].reverse().map(i => `L${x(i)},${y(band.low[i]!)}`).join(' ')
    return `${top} ${bottom} Z`
  }, [band, x, y])

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} style={{ height: height + 28 }}>
      {width > 0 ? (
        <>
          <View onStartShouldSetResponder={() => true} onResponderGrant={onTouch} onResponderMove={onTouch} onResponderRelease={() => setActive(null)} onResponderTerminate={() => setActive(null)}>
            <Svg width={width} height={height}>
              {[0, 0.25, 0.5, 0.75, 1].map(t => {
                const value = max * t
                return (
                  <G key={t}>
                    <Line x1={PAD.left} x2={width - PAD.right} y1={y(value)} y2={y(value)} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
                    <SvgText fontFamily={FONT} x={PAD.left - 6} y={y(value) + 4} fontSize={10} fill={colors.textTertiary} textAnchor="end">
                      {value >= 1000 ? `${+(value / 1000).toFixed(1)}k` : String(Math.round(value))}
                    </SvgText>
                  </G>
                )
              })}
              {labels.map((label, i) => (i % every === 0 ? (
                <SvgText fontFamily={FONT} key={i} x={x(i)} y={height - 6} fontSize={10} fill={colors.textTertiary} textAnchor="middle">{label}</SvgText>
              ) : null))}

              {bandPath ? <Path d={bandPath} fill={band!.color} fillOpacity={0.14} /> : null}

              {series.map(s => (
                <G key={s.name}>
                  {s.area ? segments(s.data, x, y).map((d, i) => {
                    const nums = [...d.matchAll(/[ML]([\d.]+),/g)].map(m => Number(m[1]))
                    const first = nums[0]
                    const last = nums[nums.length - 1]
                    return <Path key={i} d={`${d} L${last},${PAD.top + innerH} L${first},${PAD.top + innerH} Z`} fill={s.color} fillOpacity={0.12} />
                  }) : null}
                  {segments(s.data, x, y).map((d, i) => (
                    <Path key={i} d={d} stroke={s.color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? '6 5' : undefined} />
                  ))}
                  {n <= 16 ? s.data.map((v, i) => (v === null ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={colors.bgBase} stroke={s.color} strokeWidth={1.5} />)) : null}
                </G>
              ))}

              {active !== null ? (
                <>
                  <Line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} stroke={colors.borderStrong} strokeWidth={1} />
                  {series.map(s => (s.data[active] === null || s.data[active] === undefined ? null : <Circle key={s.name} cx={x(active)} cy={y(s.data[active]!)} r={4} fill={s.color} />))}
                </>
              ) : null}
            </Svg>
          </View>

          {active !== null ? (
            <View style={[styles.tip, { backgroundColor: colors.bgBase, borderColor: colors.border, left: Math.min(Math.max(x(active) - 60, 0), width - 130) }]}>
              <AppText variant="caption" bold>{labels[active]}</AppText>
              {series.map(s => (s.data[active] === null || s.data[active] === undefined ? null : (
                <AppText key={s.name} variant="caption" style={{ color: s.color }}>{s.name}: {format(s.data[active]!)}</AppText>
              )))}
              {band && band.low[active] !== null && band.high[active] !== null ? (
                <AppText variant="caption" color="tertiary">faixa {format(band.low[active]!)}–{format(band.high[active]!)}</AppText>
              ) : null}
            </View>
          ) : null}

          <View style={styles.legend}>
            {series.map(s => (
              <View key={s.name} style={styles.legendItem}>
                <View style={[styles.swatch, { backgroundColor: s.color }, s.dashed && { opacity: 0.6 }]} />
                <AppText variant="caption" color="secondary">{s.name}</AppText>
              </View>
            ))}
            {band ? (
              <View style={styles.legendItem}>
                <Svg width={12} height={12}><Rect width={12} height={12} rx={3} fill={band.color} fillOpacity={0.25} /></Svg>
                <AppText variant="caption" color="secondary">Faixa de incerteza</AppText>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  tip: { position: 'absolute', top: 0, width: 130, padding: 6, borderRadius: 8, borderWidth: 1, gap: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
})
