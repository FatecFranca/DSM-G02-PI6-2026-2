import { useState } from 'react'
import { View } from 'react-native'
import { AppText, Banner, Button, ConfirmDialog, EmptyState, Fab, Input, ListRow, Screen, SearchBar, Sheet, SkeletonList } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatNumber, slugify } from '@/lib/format'
import { ADMIN, hasRole, STAFF } from '@/lib/permissions'
import { useFetch } from '@/lib/useFetch'
import { space } from '@/theme/tokens'
import type { ApiBrand } from '@/types/api'

export default function MarcasScreen() {
  const { user } = useAuth()
  const canEdit = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const list = useFetch<ApiBrand[]>('/brands')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ApiBrand | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<ApiBrand | null>(null)
  const [actionError, setActionError] = useState('')

  const filtered = (list.data ?? []).filter(b => b.name.toLowerCase().includes(search.trim().toLowerCase()))
  const close = () => { setCreating(false); setEditing(null) }

  async function save() {
    if (name.trim().length < 2) return setError('O nome precisa ter ao menos 2 caracteres.')
    setSaving(true)
    setError('')
    try {
      if (editing) await api.patch(`/brands/${editing.id}`, { name: name.trim() })
      else await api.post('/brands', { name: name.trim(), slug: slugify(name) })
      close()
      await list.reload()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao salvar marca'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!toDelete) return
    setSaving(true)
    try {
      await api.delete(`/brands/${toDelete.id}`)
      setToDelete(null)
      close()
      await list.reload()
    } catch (err) {
      setActionError(errorMessage(err))
      setToDelete(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={list.refresh} refreshing={list.refreshing} contentStyle={{ paddingBottom: 96 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar marca…" />
        <AppText variant="small" color="tertiary">{formatNumber(list.data?.length ?? 0)} marcas</AppText>
        {list.error || actionError ? <Banner onRetry={list.reload}>{list.error || actionError}</Banner> : null}
        {list.loading && !list.data ? <SkeletonList rows={5} /> : null}
        {list.data && filtered.length === 0 ? <EmptyState icon="award" title="Nenhuma marca encontrada" /> : null}
        <View style={{ gap: space.sm }}>
          {filtered.map(b => (
            <ListRow key={b.id} icon="award" tone="brand" title={b.name} subtitle={`${formatNumber(b._count.products)} produtos`}
              chevron={canEdit} onPress={canEdit ? () => { setCreating(false); setEditing(b); setName(b.name); setError('') } : undefined} />
          ))}
        </View>
      </Screen>
      {canEdit ? <Fab label="Nova marca" onPress={() => { setEditing(null); setName(''); setError(''); setCreating(true) }} /> : null}

      <Sheet
        visible={creating || !!editing}
        onClose={close}
        title={editing ? 'Editar marca' : 'Nova marca'}
        footer={
          <>
            {editing && canDelete ? <Button icon="trash-2" variant="outline" accessibilityLabel="Excluir" onPress={() => setToDelete(editing)} /> : null}
            <Button title="Cancelar" variant="outline" onPress={close} />
            <Button title={editing ? 'Salvar' : 'Criar'} onPress={save} loading={saving} />
          </>
        }
      >
        {error ? <Banner>{error}</Banner> : null}
        <Input label="Nome da marca *" value={name} onChangeText={setName} placeholder="Ex.: Bosch" />
      </Sheet>
      <ConfirmDialog visible={!!toDelete} title="Excluir marca" message={`Excluir "${toDelete?.name}"? Marcas com produtos não podem ser excluídas.`} confirmLabel="Excluir" loading={saving} onConfirm={remove} onClose={() => setToDelete(null)} />
    </View>
  )
}
