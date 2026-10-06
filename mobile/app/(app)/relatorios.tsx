import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Banner, Button, Card, CardHeader, DateField, ListRow, Loading, Screen, Sheet } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { brDateToIso, formatDateTime, formatNumber } from '@/lib/format'
import { Cell, REPORTS, ReportDef, ReportResult } from '@/lib/reports'
import { shareCsv } from '@/lib/share'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'

const PREVIEW_ROWS = 15
const display = (c: Cell) => (typeof c === 'number' && !Number.isInteger(c) ? formatNumber(c) : c === null || c === undefined || c === '' ? '—' : String(c))

export default function RelatoriosScreen() {
  const { colors } = useTheme()
  const [selected, setSelected] = useState<ReportDef | null>(null)
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [generatedAt, setGeneratedAt] = useState(new Date())

  const fromIso = brDateToIso(from) ?? undefined
  const toIso = brDateToIso(to) ? new Date(new Date(brDateToIso(to)!).getTime() + 86_399_999).toISOString() : undefined

  async function generate(def: ReportDef) {
    setSelected(def)
    setLoading(true)
    setError('')
    setResult(null)
    try {
      setResult(await def.load({ from: fromIso, to: toIso }))
      setGeneratedAt(new Date())
    } catch (err) {
      setError(errorMessage(err, 'Falha ao gerar o relatório'))
    } finally {
      setLoading(false)
    }
  }

  async function exportCsv() {
    if (!result || !selected) return
    await shareCsv(`${selected.id}-${new Date().toISOString().slice(0, 10)}.csv`, result.headers, result.rows)
  }

  if (selected) {
    return (
      <Screen>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Button icon="arrow-left" variant="outline" size="sm" accessibilityLabel="Voltar aos relatórios" onPress={() => { setSelected(null); setResult(null) }} />
          <View style={{ flex: 1 }}>
            <AppText variant="subheading" numberOfLines={1}>{selected.label}</AppText>
            <AppText variant="caption" color="tertiary">Gerado em {formatDateTime(generatedAt)}</AppText>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {selected.usesPeriod ? <Button title={from || to ? 'Período ✓' : 'Período'} icon="calendar" variant="outline" size="sm" onPress={() => setPeriodOpen(true)} style={{ flex: 1 }} /> : null}
          <Button title="Atualizar" icon="refresh-cw" variant="outline" size="sm" onPress={() => generate(selected)} loading={loading} style={{ flex: 1 }} />
          <Button title="CSV" icon="share" size="sm" onPress={exportCsv} disabled={!result} style={{ flex: 1 }} />
        </View>

        {error ? <Banner onRetry={() => generate(selected)}>{error}</Banner> : null}
        {loading ? <Loading label="Gerando relatório…" /> : null}

        {result ? (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {result.summary.map(s => (
                <View key={s.label} style={{ flexGrow: 1, minWidth: '46%', padding: space.md, borderRadius: 12, backgroundColor: colors.bgBase, borderWidth: 1, borderColor: colors.border }}>
                  <AppText variant="overline" color="tertiary">{s.label}</AppText>
                  <AppText variant="subheading" style={{ marginTop: 2 }}>{s.value}</AppText>
                </View>
              ))}
            </View>

            <Card>
              <CardHeader title={result.title} description={`${formatNumber(result.rows.length)} linhas`} />
              {result.rows.length === 0 ? <AppText color="tertiary">Sem dados para o período.</AppText> : null}
              {result.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                <View key={i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, gap: 2 }}>
                  <AppText bold numberOfLines={2}>{display(row[1] ?? row[0])}</AppText>
                  <AppText variant="caption" color="secondary">
                    {result.headers.map((h, j) => (j === 1 ? null : `${h}: ${display(row[j])}`)).filter(Boolean).slice(0, 6).join(' · ')}
                  </AppText>
                </View>
              ))}
              {result.rows.length > PREVIEW_ROWS ? (
                <AppText variant="caption" color="tertiary" style={{ marginTop: space.sm }}>Mostrando {PREVIEW_ROWS} de {formatNumber(result.rows.length)} linhas — o CSV contém todas.</AppText>
              ) : null}
            </Card>
          </>
        ) : null}

        <Sheet visible={periodOpen} onClose={() => setPeriodOpen(false)} title="Período"
          footer={<><Button title="Limpar" variant="outline" onPress={() => { setFrom(''); setTo('') }} /><Button title="Aplicar" onPress={() => { setPeriodOpen(false); void generate(selected) }} /></>}>
          <DateField label="De" value={from} onChangeText={setFrom} error={from.length === 10 && !brDateToIso(from) ? 'Data inválida' : undefined} />
          <DateField label="Até" value={to} onChangeText={setTo} error={to.length === 10 && !brDateToIso(to) ? 'Data inválida' : undefined} />
          <AppText variant="caption" color="tertiary">Vazio = todo o histórico.</AppText>
        </Sheet>
      </Screen>
    )
  }

  return (
    <Screen>
      <AppText color="tertiary">Dados em tempo real do sistema. Exporte em CSV (abre no Excel) e compartilhe.</AppText>
      <View style={{ gap: space.sm }}>
        {REPORTS.map(r => <ListRow key={r.id} icon={r.icon} tone="brand" title={r.label} subtitle={r.desc} chevron onPress={() => generate(r)} />)}
      </View>
    </Screen>
  )
}
