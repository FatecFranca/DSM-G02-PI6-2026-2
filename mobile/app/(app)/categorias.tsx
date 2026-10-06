import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText, Banner, Button, ConfirmDialog, EmptyState, Fab, Icon, Input, ListRow, Screen, SearchBar, Sheet, SkeletonList } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatNumber, slugify } from '@/lib/format'
import { ADMIN, hasRole, STAFF } from '@/lib/permissions'
import { useFetch } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'
import type { ApiCategory } from '@/types/api'

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#9333ea', '#db2777', '#ea580c']

export default function CategoriasScreen() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const canEdit = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const list = useFetch<ApiCategory[]>('/categories')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<ApiCategory | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toDelete, setToDelete] = useState<ApiCategory | null>(null)
  const [actionError, setActionError] = useState('')

  const filtered = (list.data ?? []).filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))
  const open = creating || !!editing

  function openNew() { setEditing(null); setName(''); setColor(COLORS[0]); setError(''); setCreating(true) }
  function openEdit(c: ApiCategory) { setCreating(false); setEditing(c); setName(c.name); setColor(c.color); setError('') }
  const close = () => { setCreating(false); setEditing(null) }

  async function save() {
    if (name.trim().length < 2) return setError('O nome precisa ter ao menos 2 caracteres.')
    setSaving(true)
    setError('')
    try {
      if (editing) await api.patch(`/categories/${editing.id}`, { name: name.trim(), color })
      else await api.post('/categories', { name: name.trim(), slug: slugify(name), color })
      close()
      await list.reload()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao salvar categoria'))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!toDelete) return
    setSaving(true)
    try {
      await api.delete(`/categories/${toDelete.id}`)
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
        <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar categoria…" />
        <AppText variant="small" color="tertiary">{formatNumber(list.data?.length ?? 0)} categorias</AppText>
        {list.error || actionError ? <Banner onRetry={list.reload}>{list.error || actionError}</Banner> : null}
        {list.loading && !list.data ? <SkeletonList rows={5} /> : null}
        {list.data && filtered.length === 0 ? <EmptyState icon="tag" title="Nenhuma categoria encontrada" /> : null}
        <View style={{ gap: space.sm }}>
          {filtered.map(c => (
            <ListRow
              key={c.id}
              title={c.name}
              subtitle={`${formatNumber(c._count.products)} produtos`}
              onPress={canEdit ? () => openEdit(c) : undefined}
              chevron={canEdit}
              right={<View style={[styles.swatch, { backgroundColor: c.color }]} />}
            />
          ))}
        </View>
      </Screen>
      {canEdit ? <Fab label="Nova categoria" onPress={openNew} /> : null}

      <Sheet
        visible={open}
        onClose={close}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description="Defina nome e cor de identificação"
        footer={
          <>
            {editing && canDelete ? <Button icon="trash-2" variant="outline" accessibilityLabel="Excluir" onPress={() => setToDelete(editing)} /> : null}
            <Button title="Cancelar" variant="outline" onPress={close} />
            <Button title={editing ? 'Salvar' : 'Criar'} onPress={save} loading={saving} />
          </>
        }
      >
        {error ? <Banner>{error}</Banner> : null}
        <Input label="Nome da categoria *" value={name} onChangeText={setName} placeholder="Ex.: Eletrônicos" />
        <View style={{ gap: 8 }}>
          <AppText variant="small" bold>Cor</AppText>
          <View style={styles.colors}>
            {COLORS.map(c => (
              <Pressable key={c} onPress={() => setColor(c)} accessibilityLabel={`Cor ${c}`} style={[styles.color, { backgroundColor: c, borderColor: color === c ? colors.text : 'transparent' }]}>
                {color === c ? <Icon name="check" size={14} color="inverse" /> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Sheet>
      <ConfirmDialog visible={!!toDelete} title="Excluir categoria" message={`Excluir "${toDelete?.name}"? Categorias com produtos não podem ser excluídas.`} confirmLabel="Excluir" loading={saving} onConfirm={remove} onClose={() => setToDelete(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  swatch: { width: 22, height: 22, borderRadius: 11 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  color: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
})
