'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Search, Edit, Shield, KeyRound, Trash2, Power } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageLoading } from '@/components/ui/Loading'
import { USER_ROLE_LABELS } from '@/constants/status'
import { formatDateTime } from '@/lib/utils'
import { api } from '@/lib/api'
import { fetchAll } from '@/lib/fetch-all'
import { useAuth } from '@/lib/auth-context'
import { ADMIN, hasRole } from '@/lib/permissions'
import { errorMessage } from '@/hooks/useFetch'
import type { User, UserRole } from '@/types/user'

const ROLE_VARIANT: Record<string, 'danger'|'warning'|'info'|'default'> = {
  admin: 'danger', supervisor: 'warning', operator: 'info', viewer: 'default',
}
const STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', pending: 'Pendente' }
const STATUS_VARIANT = { active: 'success', inactive: 'default', pending: 'warning' } as const

const ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))

export default function UsuariosPage() {
  const { user: me } = useAuth()
  const isAdmin = hasRole(me?.role, ADMIN)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ user: User | null } | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [toDelete, setToDelete] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setUsers(await fetchAll<User>('/users'))
      setError('')
    } catch (err) {
      setError(errorMessage(err, 'Falha ao carregar usuários'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.department.toLowerCase().includes(q))
  }, [users, search])

  async function toggleStatus(u: User) {
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
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Administração' }, { label: 'Usuários' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Usuários</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{users.length} usuários cadastrados</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setForm({ user: null })}>Novo Usuário</Button>
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar por nome, e-mail, setor…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      {error && <Alert>{error}</Alert>}
      {loading ? <PageLoading rows={3} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(user => (
            <div key={user.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{user.name}{user.id === me?.id && <span className="ml-1.5 text-[10px] text-[color:var(--brand)]">(você)</span>}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)]">{user.department}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button title="Editar" onClick={() => setForm({ user })} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"><Edit className="w-3.5 h-3.5" /></button>
                  {isAdmin && user.id !== me?.id && (
                    <>
                      <button title={user.status === 'active' ? 'Inativar' : 'Ativar'} onClick={() => toggleStatus(user)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--warning)]"><Power className="w-3.5 h-3.5" /></button>
                      <button title="Redefinir senha" onClick={() => setResetting(user)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"><KeyRound className="w-3.5 h-3.5" /></button>
                      <button title="Excluir" onClick={() => setToDelete(user)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-xs text-[color:var(--text-secondary)] mb-4">
                <p className="truncate">{user.email}</p>
                <p className="text-[color:var(--text-tertiary)]">{user.lastLogin ? `Último acesso: ${formatDateTime(user.lastLogin)}` : 'Nunca acessou'}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                  <Badge variant={ROLE_VARIANT[user.role] ?? 'default'} size="sm">{USER_ROLE_LABELS[user.role] ?? user.role}</Badge>
                </div>
                <Badge variant={STATUS_VARIANT[user.status]} dot size="sm">{STATUS_LABEL[user.status]}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserForm state={form} isAdmin={isAdmin} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load() }} />
      <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog open={!!toDelete} title="Excluir usuário" message={`Excluir "${toDelete?.name}"? Se o usuário tiver movimentações registradas, prefira inativá-lo.`} confirmLabel="Excluir" loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </div>
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
  const [syncedKey, setSyncedKey] = useState<string | null>(null)

  const key = state ? (target?.id ?? 'new') : null
  if (key !== syncedKey) {
    setSyncedKey(key)
    if (state) {
      setName(target?.name ?? ''); setEmail(target?.email ?? ''); setPassword(''); setRole(target?.role ?? 'operator'); setDepartment(target?.department ?? ''); setError('')
    }
  }

  // Supervisors can manage users but cannot hand out the admin role.
  const roleOptions = isAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter(o => o.value !== 'admin')

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
    <Modal open={!!state} onClose={onClose} title={target ? 'Editar Usuário' : 'Novo Usuário'} description={target ? target.email : 'Crie um novo acesso ao sistema'} size="md"
      footer={<><Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button><Button size="sm" loading={saving} onClick={save}>{target ? 'Salvar' : 'Criar Usuário'}</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Input label="Nome completo *" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="col-span-2"><Input label="E-mail corporativo *" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
          {!target && <div className="col-span-2"><Input label="Senha temporária *" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></div>}
          <Select label="Perfil de acesso *" options={roleOptions} value={role} onChange={e => setRole(e.target.value as UserRole)} />
          <Input label="Departamento *" placeholder="Ex: Logística" value={department} onChange={e => setDepartment(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose }: { user: User | null; onClose: () => void }) {
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
    <Modal open={!!user} onClose={close} title="Redefinir senha" description={user?.name} size="sm"
      footer={done ? <Button size="sm" onClick={close}>Fechar</Button> : <><Button variant="outline" size="sm" onClick={close}>Cancelar</Button><Button size="sm" loading={saving} onClick={save}>Redefinir</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {done ? <Alert variant="success">Senha redefinida. Informe a nova senha ao usuário.</Alert> : (
          <Input label="Nova senha *" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" hint="Mínimo de 6 caracteres" />
        )}
      </div>
    </Modal>
  )
}
