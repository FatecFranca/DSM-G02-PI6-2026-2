import { useState } from 'react'
import { View } from 'react-native'
import { ListScreen } from '@/components/ListScreen'
import { RequireRole } from '@/components/RequireRole'
import { AppText, Avatar, Badge, Button, Card, Chips, DateField, Select, Sheet } from '@/components/ui'
import { fetchAll } from '@/lib/api'
import { brDateToIso, formatDateTime, formatNumber } from '@/lib/format'
import { STAFF, ROLE_LABELS } from '@/lib/permissions'
import { shareCsv } from '@/lib/share'
import { usePaged } from '@/lib/usePaged'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone } from '@/theme/tokens'
import type { ApiAuditLog } from '@/types/api'

const ACTIONS: Record<string, { label: string; tone: Tone }> = {
  CREATE: { label: 'Criação', tone: 'success' },
  UPDATE: { label: 'Edição', tone: 'warning' },
  DELETE: { label: 'Exclusão', tone: 'danger' },
}
const ENTITIES = ['Product', 'Category', 'Brand', 'Supplier', 'Customer', 'User', 'Lot', 'WarehouseAddress', 'InventoryCount', 'InventoryCountItem', 'Movement', 'Settings']
type ActionFilter = '' | 'CREATE' | 'UPDATE' | 'DELETE'

const summarize = (v?: Record<string, unknown> | null) => (v ? JSON.stringify(v).slice(0, 90) : '')

export default function AuditoriaScreen() {
  return <RequireRole roles={STAFF}><Audit /></RequireRole>
}

function Audit() {
  const { colors } = useTheme()
  const [action, setAction] = useState<ActionFilter>('')
  const [entity, setEntity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [detail, setDetail] = useState<ApiAuditLog | null>(null)

  const fromIso = brDateToIso(from) ?? undefined
  const toIso = brDateToIso(to) ? new Date(new Date(brDateToIso(to)!).getTime() + 86_399_999).toISOString() : undefined
  const params = { entity: entity || undefined, from: fromIso, to: toIso }
  const list = usePaged<ApiAuditLog>('/audit', params, 30)
  const rows = { ...list, items: list.items.filter(l => !action || l.action === action) }

  async function exportCsv() {
    const all = await fetchAll<ApiAuditLog>('/audit', params)
    await shareCsv('auditoria.csv', ['Data', 'Ação', 'Entidade', 'Registro', 'Usuário', 'Perfil', 'IP', 'Antes', 'Depois'],
      all.map(l => [formatDateTime(l.createdAt), l.action, l.entity, l.entityName, l.user.name, l.user.role, l.ip, JSON.stringify(l.oldValue ?? ''), JSON.stringify(l.newValue ?? '')]))
  }

  return (
    <>
      <ListScreen
        state={rows}
        keyExtractor={l => l.id}
        empty={{ icon: 'shield', title: 'Nenhum registro encontrado' }}
        header={
          <>
            <Chips<ActionFilter> value={action} onChange={setAction} items={[{ id: '', label: 'Todas' }, ...(Object.keys(ACTIONS) as ActionFilter[]).filter(Boolean).map(a => ({ id: a, label: ACTIONS[a].label }))]} />
            <Select value={entity} onChange={setEntity} placeholder="Todas as entidades" clearable options={ENTITIES.map(e => ({ value: e, label: e }))} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="small" color="tertiary">{formatNumber(list.total)} registros</AppText>
              <View style={{ flexDirection: 'row' }}>
                <Button title={from || to ? 'Período ✓' : 'Período'} icon="calendar" variant="ghost" size="sm" onPress={() => setPeriodOpen(true)} />
                <Button title="CSV" icon="share" variant="ghost" size="sm" onPress={exportCsv} />
              </View>
            </View>
          </>
        }
        renderItem={log => {
          const meta = ACTIONS[log.action] ?? ACTIONS.UPDATE
          return (
            <Card onPress={() => setDetail(log)}>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Badge label={meta.label} tone={meta.tone} />
                  <AppText variant="mono" color="secondary">{log.entity}</AppText>
                  <AppText variant="caption" color="tertiary" style={{ marginLeft: 'auto' }}>{formatDateTime(log.createdAt)}</AppText>
                </View>
                <AppText bold numberOfLines={2}>{log.entityName}</AppText>
                {log.oldValue ? <AppText variant="caption" color="danger" numberOfLines={2}>− {summarize(log.oldValue)}</AppText> : null}
                {log.newValue ? <AppText variant="caption" color="success" numberOfLines={2}>+ {summarize(log.newValue)}</AppText> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar name={log.user.name} size={22} />
                  <AppText variant="caption" color="secondary">{log.user.name} · {ROLE_LABELS[log.user.role] ?? log.user.role} · {log.ip}</AppText>
                </View>
              </View>
            </Card>
          )
        }}
      />

      <Sheet visible={periodOpen} onClose={() => setPeriodOpen(false)} title="Período"
        footer={<><Button title="Limpar" variant="outline" onPress={() => { setFrom(''); setTo(''); setPeriodOpen(false) }} /><Button title="Aplicar" onPress={() => setPeriodOpen(false)} /></>}>
        <DateField label="De" value={from} onChangeText={setFrom} />
        <DateField label="Até" value={to} onChangeText={setTo} />
      </Sheet>

      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail ? `${(ACTIONS[detail.action] ?? ACTIONS.UPDATE).label} — ${detail.entity}` : ''} description={detail ? `${detail.entityName} · ${detail.user.name}` : ''}>
        {detail ? (['Antes', 'Depois'] as const).map(label => {
          const value = label === 'Antes' ? detail.oldValue : detail.newValue
          return (
            <View key={label} style={{ gap: 6 }}>
              <AppText variant="overline" color="tertiary">{label}</AppText>
              <View style={{ backgroundColor: colors.bgSubtle, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: space.md }}>
                <AppText variant="mono">{value ? JSON.stringify(value, null, 2) : '—'}</AppText>
              </View>
            </View>
          )
        }) : null}
      </Sheet>
    </>
  )
}
