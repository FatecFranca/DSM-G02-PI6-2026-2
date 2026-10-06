import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText, Badge, Banner, Button, Chips, ConfirmDialog, Fab, Input, KeyValue, ProgressBar, Screen, SearchBar, Sheet, SkeletonList, StatCard } from '@/components/ui'
import { api, errorMessage, fetchAll } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { ADMIN, hasRole, STAFF, WRITERS } from '@/lib/permissions'
import { POSITION_STATUS_LABELS } from '@/lib/status'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone, toneColors } from '@/theme/tokens'
import type { ApiAddress, PositionStatus } from '@/types/api'

const TONE: Record<PositionStatus, Tone> = { free: 'success', occupied: 'brand', blocked: 'danger', reserved: 'warning' }
const pct = (a: ApiAddress) => (a.capacity > 0 ? Math.min(100, Math.round((a.occupied / a.capacity) * 100)) : 0)

export default function EnderecosScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const canManage = hasRole(user?.role, STAFF)
  const canTransfer = hasRole(user?.role, WRITERS)
  const canDelete = hasRole(user?.role, ADMIN)

  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [aisle, setAisle] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | PositionStatus>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ApiAddress | null>(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<ApiAddress | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      setAddresses(await fetchAll<ApiAddress>('/warehouse'))
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Falha ao carregar endereços'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const aisles = useMemo(() => [...new Set(addresses.map(a => a.aisle))].sort(), [addresses])
  const activeAisle = aisle || aisles[0] || ''
  const count = (s: PositionStatus) => addresses.filter(a => a.status === s).length
  const occupancy = addresses.length ? Math.round((count('occupied') / addresses.length) * 100) : 0

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return addresses.filter(a => a.aisle === activeAisle && (!statusFilter || a.status === statusFilter) &&
      (!q || a.code.toLowerCase().includes(q) || (a.product?.name.toLowerCase().includes(q) ?? false)))
  }, [addresses, activeAisle, statusFilter, search])

  const shelves = useMemo(() => {
    const map = new Map<string, ApiAddress[]>()
    for (const a of filtered) {
      const key = `Rua ${a.street} · Prateleira ${a.shelf}`
      map.set(key, [...(map.get(key) ?? []), a])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  async function setStatus(a: ApiAddress, status: PositionStatus) {
    try {
      await api.patch(`/warehouse/${a.id}`, { status })
      setSelected(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
      setSelected(null)
    }
  }

  async function remove() {
    if (!toDelete) return
    setBusy(true)
    try {
      await api.delete(`/warehouse/${toDelete.id}`)
      setToDelete(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => load(true)} refreshing={refreshing} contentStyle={{ paddingBottom: 96 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <StatCard label="Posições" value={addresses.length} icon="map-pin" />
          <StatCard label="Livres" value={count('free')} icon="map-pin" tone="success" />
          <StatCard label="Ocupadas" value={count('occupied')} icon="map-pin" tone="info" />
          <StatCard label="Ocupação" value={`${occupancy}%`} icon="percent" tone={occupancy > 85 ? 'danger' : occupancy > 60 ? 'warning' : 'success'} />
        </View>
        {error ? <Banner onRetry={() => load()}>{error}</Banner> : null}

        <Chips value={activeAisle} onChange={setAisle} items={aisles.map(a => ({ id: a, label: `Corredor ${a}` }))} />
        <Chips<'' | PositionStatus>
          value={statusFilter}
          onChange={setStatusFilter}
          items={[{ id: '', label: 'Todos' }, ...(Object.keys(POSITION_STATUS_LABELS) as PositionStatus[]).map(s => ({ id: s as '' | PositionStatus, label: POSITION_STATUS_LABELS[s] }))]}
        />
        <SearchBar value={search} onChangeText={setSearch} placeholder={`Endereço ou produto no corredor ${activeAisle}`} />

        {loading ? <SkeletonList rows={4} /> : null}
        {!loading && filtered.length === 0 ? <AppText color="tertiary" align="center" style={{ padding: space.xl }}>Nenhuma posição encontrada.</AppText> : null}

        {shelves.map(([title, cells]) => (
          <View key={title} style={{ gap: 8 }}>
            <AppText variant="overline" color="tertiary">{title}</AppText>
            <View style={styles.cells}>
              {cells.map(a => {
                const c = toneColors(colors, TONE[a.status])
                return (
                  <Pressable
                    key={a.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Endereço ${a.code}, ${POSITION_STATUS_LABELS[a.status]}`}
                    onPress={() => setSelected(a)}
                    style={[styles.cell, { backgroundColor: c.bg, borderColor: c.border }]}
                  >
                    <AppText variant="caption" bold style={{ color: c.fg }}>{a.level}{a.position}</AppText>
                    {a.quantity ? <AppText style={{ color: c.fg, fontSize: 9 }}>{a.quantity}</AppText> : null}
                  </Pressable>
                )
              })}
            </View>
          </View>
        ))}
      </Screen>
      {canManage ? <Fab label="Novo endereço" onPress={() => setCreating(true)} /> : null}

      <Sheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.code} description={selected ? POSITION_STATUS_LABELS[selected.status] : undefined}>
        {selected ? (
          <>
            <Badge label={POSITION_STATUS_LABELS[selected.status]} tone={TONE[selected.status]} dot />
            {selected.product ? (
              <View style={{ gap: 2 }}>
                <AppText variant="overline" color="tertiary">Produto</AppText>
                <AppText bold>{selected.product.name}</AppText>
                <AppText variant="mono" color="tertiary">{selected.product.internalCode}</AppText>
              </View>
            ) : null}
            <View>
              <KeyValue label="Quantidade" value={selected.quantity ? `${formatNumber(selected.quantity)} un` : '—'} />
              {selected.lotNumber ? <KeyValue label="Lote" value={selected.lotNumber} mono /> : null}
              <KeyValue label="Corredor / Rua / Prateleira" value={`${selected.aisle} / ${selected.street} / ${selected.shelf}`} />
              <KeyValue label="Nível / Posição" value={`${selected.level} / ${selected.position}`} />
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="small" color="tertiary">Ocupação</AppText>
                <AppText variant="small" bold>{selected.occupied} de {selected.capacity} ({pct(selected)}%)</AppText>
              </View>
              <ProgressBar value={pct(selected)} />
            </View>
            <View style={{ gap: space.sm }}>
              {canTransfer && selected.status === 'occupied' && selected.product ? (
                <Button title="Transferir deste endereço" icon="shuffle" variant="outline" onPress={() => { const id = selected.product!.id; setSelected(null); router.push({ pathname: '/movimento', params: { kind: 'transfer', productId: id } }) }} />
              ) : null}
              {canManage && selected.status === 'free' ? <Button title="Reservar" icon="bookmark" variant="outline" onPress={() => setStatus(selected, 'reserved')} /> : null}
              {canManage && selected.status === 'reserved' ? <Button title="Liberar reserva" icon="unlock" variant="outline" onPress={() => setStatus(selected, 'free')} /> : null}
              {canManage && (selected.status === 'free' || selected.status === 'reserved') ? <Button title="Bloquear" icon="lock" variant="outline" onPress={() => setStatus(selected, 'blocked')} /> : null}
              {canManage && selected.status === 'blocked' ? <Button title="Desbloquear" icon="unlock" variant="outline" onPress={() => setStatus(selected, 'free')} /> : null}
              {canDelete && selected.status !== 'occupied' ? <Button title="Remover endereço" icon="trash-2" variant="danger" onPress={() => { setToDelete(selected); setSelected(null) }} /> : null}
            </View>
          </>
        ) : null}
      </Sheet>

      <CreateAddress open={creating} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void load() }} />
      <ConfirmDialog visible={!!toDelete} title="Remover endereço" message={`Remover o endereço ${toDelete?.code}?`} confirmLabel="Remover" loading={busy} onConfirm={remove} onClose={() => setToDelete(null)} />
    </View>
  )
}

function CreateAddress({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ aisle: '', street: '', shelf: '', level: '', position: '', capacity: '500' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }))
  const parts = [f.aisle, f.street, f.shelf, f.level, f.position]
  const code = parts.every(Boolean) ? parts.join('-').toUpperCase() : ''

  async function save() {
    if (!code || Number(f.capacity) <= 0) return setError('Preencha todos os campos e uma capacidade maior que zero.')
    setSaving(true)
    setError('')
    try {
      await api.post('/warehouse', { code, aisle: f.aisle.toUpperCase(), street: f.street, shelf: f.shelf, level: f.level.toUpperCase(), position: f.position, capacity: Number(f.capacity) })
      setF({ aisle: '', street: '', shelf: '', level: '', position: '', capacity: '500' })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao criar endereço'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible={open} onClose={onClose} title="Novo endereço" description="Código: Corredor-Rua-Prateleira-Nível-Posição"
      footer={<><Button title="Cancelar" variant="outline" onPress={onClose} /><Button title="Criar" onPress={save} loading={saving} /></>}>
      {error ? <Banner>{error}</Banner> : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}><Input label="Corredor" value={f.aisle} onChangeText={set('aisle')} autoCapitalize="characters" placeholder="A" /></View>
        <View style={{ flex: 1 }}><Input label="Rua" value={f.street} onChangeText={set('street')} placeholder="01" /></View>
        <View style={{ flex: 1 }}><Input label="Prateleira" value={f.shelf} onChangeText={set('shelf')} placeholder="01" /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}><Input label="Nível" value={f.level} onChangeText={set('level')} autoCapitalize="characters" placeholder="A" /></View>
        <View style={{ flex: 1 }}><Input label="Posição" value={f.position} onChangeText={set('position')} placeholder="01" /></View>
        <View style={{ flex: 1 }}><Input label="Capacidade" value={f.capacity} onChangeText={set('capacity')} keyboardType="number-pad" /></View>
      </View>
      <AppText variant="small" color="tertiary">Código gerado: <AppText variant="mono" bold>{code || '—'}</AppText></AppText>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { width: 48, height: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
