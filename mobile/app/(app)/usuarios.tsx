import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { RequireRole } from '@/components/RequireRole'
import { AppText, Avatar, Badge, Banner, Button, Card, ConfirmDialog, EmptyState, Fab, Input, Screen, SearchBar, Select, Sheet, SkeletonList } from '@/components/ui'
import { api, errorMessage, fetchAll } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { ADMIN, hasRole, ROLE_LABELS, STAFF } from '@/lib/permissions'
import { space, Tone } from '@/theme/tokens'
import type { User, UserRole } from '@/types/user'

const ROLE_TONE: Record<UserRole, Tone> = { admin: 'danger', supervisor: 'warning', operator: 'info', viewer: 'neutral' }
const STATUS: Record<string, { label: string; tone: Tone }> = { active: { label: 'Ativo', tone: 'success' }, inactive: { label: 'Inativo', tone: 'neutral' }, pending: { label: 'Pendente', tone: 'warning' } }
const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as UserRole[]).map(r => ({ value: r, label: ROLE_LABELS[r] }))

export default function UsuariosScreen() {
  return <RequireRole roles={STAFF}><Users /></RequireRole>
}

function Users() {
  const { user: me } = useAuth()
  const isAdmin = hasRole(me?.role, ADMIN)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ user: User | null } | null>(null)
  const [actions, setActions] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      setUsers(await fetchAll<User>('/users'))
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Falha ao carregar usuários'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q))
  }, [users, search])

  async function toggleStatus(u: User) {
    setActions(null)
    try {
      await api.patch(`/users/${u.id}/status`, { status: u.status === 'active' ? 'inactive' : 'active' })
      await load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setBusy(true)
    try {
      await api.delete(`/users/${toDelete.id}`)
      setToDelete(null)
      await load()
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível excluir. Usuários com histórico devem ser apenas inativados.'))
      setToDelete(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => load(true)} refreshing={refreshing} contentStyle={{ paddingBottom: 96 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nome, e-mail ou setor" />
        <AppText variant="small" color="tertiary">{filtered.length} usuários</AppText>
        {error ? <Banner onRetry={() => load()}>{error}</Banner> : null}
        {loading ? <SkeletonList rows={4} /> : null}
        {!loading && filtered.length === 0 ? <EmptyState icon="users" title="Nenhum usuário encontrado" /> : null}
        <View style={{ gap: space.sm }}>
          {filtered.map(u => (
            <Card key={u.id} onPress={() => setActions(u)}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <Avatar name={u.name} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText bold numberOfLines={1}>{u.name}{u.id === me?.id ? ' (você)' : ''}</AppText>
                  <AppText variant="caption" color="tertiary" numberOfLines={1}>{u.email}</AppText>
                  <AppText variant="caption" color="tertiary">{u.department} · {u.lastLogin ? `acesso ${formatDateTime(u.lastLogin)}` : 'nunca acessou'}</AppText>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge label={ROLE_LABELS[u.role]} tone={ROLE_TONE[u.role]} />
                  <Badge label={STATUS[u.status].label} tone={STATUS[u.status].tone} dot />
                </View>
              </View>
            </Card>
          ))}
        </View>
      </Screen>
      <Fab label="Novo usuário" onPress={() => setForm({ user: null })} />

      <Sheet visible={!!actions} onClose={() => setActions(null)} title={actions?.name} description={actions?.email}>
        {actions ? (
          <>
            <Button title="Editar dados e perfil" icon="edit-2" variant="outline" onPress={() => { setForm({ user: actions }); setActions(null) }} />
            {isAdmin && actions.id !== me?.id ? (
              <>
                <Button title={actions.status === 'active' ? 'Inativar acesso' : 'Ativar acesso'} icon="power" variant="outline" onPress={() => toggleStatus(actions)} />
                <Button title="Redefinir senha" icon="key" variant="outline" onPress={() => { setResetting(actions); setActions(null) }} />
                <Button title="Excluir usuário" icon="trash-2" variant="danger" onPress={() => { setToDelete(actions); setActions(null) }} />
              </>
            ) : null}
          </>
        ) : null}
      </Sheet>

      <UserForm state={form} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load() }} />
      <ResetPassword user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog visible={!!toDelete} title="Excluir usuário" message={`Excluir "${toDelete?.name}"? Se houver movimentações registradas, prefira inativá-lo.`} confirmLabel="Excluir" loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </View>
  )
}

function UserForm({ state, isAdmin, onClose, onSaved }: { state: { user: User | null } | null; isAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const target = state?.user ?? null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('operator')
  const [department, setDepartment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!state) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(target?.name ?? ''); setEmail(target?.email ?? ''); setPassword(''); setRole(target?.role ?? 'operator'); setDepartment(target?.department ?? ''); setError('')
  }, [state, target])

  // Supervisores gerenciam usuários, mas não concedem o perfil de administrador.
  const roles = isAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter(o => o.value !== 'admin')

  async function save() {
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !department.trim()) return setError('Informe nome, e-mail válido e departamento.')
    if (!target && password.length < 6) return setError('A senha temporária deve ter ao menos 6 caracteres.')
    setSaving(true)
    setError('')
    try {
      if (target) await api.patch(`/users/${target.id}`, { name: name.trim(), email: email.trim(), role, department: department.trim() })
      else await api.post('/users', { name: name.trim(), email: email.trim(), password, role, department: department.trim() })
      onSaved()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao salvar usuário'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible={!!state} onClose={onClose} title={target ? 'Editar usuário' : 'Novo usuário'} description={target?.email}
      footer={<><Button title="Cancelar" variant="outline" onPress={onClose} /><Button title={target ? 'Salvar' : 'Criar'} onPress={save} loading={saving} /></>}>
      {error ? <Banner>{error}</Banner> : null}
      <Input label="Nome completo *" value={name} onChangeText={setName} />
      <Input label="E-mail *" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      {!target ? <Input label="Senha temporária *" value={password} onChangeText={setPassword} password hint="Mínimo de 6 caracteres" /> : null}
      <Select label="Perfil de acesso *" value={role} onChange={v => setRole(v as UserRole)} options={roles} />
      <Input label="Departamento *" value={department} onChangeText={setDepartment} placeholder="Ex.: Logística" />
    </Sheet>
  )
}

function ResetPassword({ user, onClose }: { user: User | null; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function close() { setPassword(''); setError(''); setDone(false); onClose() }

  async function save() {
    if (!user) return
    if (password.length < 6) return setError('A senha deve ter ao menos 6 caracteres.')
    setSaving(true)
    setError('')
    try {
      await api.patch(`/users/${user.id}/password`, { newPassword: password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet visible={!!user} onClose={close} title="Redefinir senha" description={user?.name}
      footer={done ? <Button title="Fechar" onPress={close} /> : <><Button title="Cancelar" variant="outline" onPress={close} /><Button title="Redefinir" onPress={save} loading={saving} /></>}>
      {error ? <Banner>{error}</Banner> : null}
      {done ? <Banner tone="success">Senha redefinida. Informe a nova senha ao usuário.</Banner> : <Input label="Nova senha *" value={password} onChangeText={setPassword} password hint="Mínimo de 6 caracteres" />}
    </Sheet>
  )
}
