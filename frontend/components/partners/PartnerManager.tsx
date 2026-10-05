'use client'
import { useMemo, useState } from 'react'
import { Plus, Search, Edit, Trash2, Truck, Mail, Phone, MapPin, Users } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageLoading } from '@/components/ui/Loading'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { fetchAll } from '@/lib/fetch-all'
import { ADMIN, hasRole, STAFF } from '@/lib/permissions'
import { errorMessage } from '@/hooks/useFetch'
import { useCallback, useEffect } from 'react'

export interface Partner {
  id: string
  name: string
  tradeName: string
  cnpj: string
  email: string
  phone?: string | null
  contactName?: string | null
  category?: string
  city: string
  state: string
  status: 'active' | 'inactive'
  _count?: { products: number }
}

interface Config {
  kind: 'suppliers' | 'customers'
  path: '/suppliers' | '/customers'
  title: string
  singular: string
  newLabel: string
  hasCategory: boolean
  icon: React.ElementType
}

export const SUPPLIERS_CONFIG: Config = { kind: 'suppliers', path: '/suppliers', title: 'Fornecedores', singular: 'fornecedor', newLabel: 'Novo Fornecedor', hasCategory: true, icon: Truck }
export const CUSTOMERS_CONFIG: Config = { kind: 'customers', path: '/customers', title: 'Clientes', singular: 'cliente', newLabel: 'Novo Cliente', hasCategory: false, icon: Users }

const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

const EMPTY = { name: '', tradeName: '', cnpj: '', email: '', phone: '', contactName: '', category: '', city: '', state: '', status: 'active' as 'active' | 'inactive' }

export function PartnerManager({ config }: { config: Config }) {
  const { user } = useAuth()
  const [items, setItems] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Partner | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toDelete, setToDelete] = useState<Partner | null>(null)
  const [busy, setBusy] = useState(false)

  const canManage = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const Icon = config.icon

  const load = useCallback(async () => {
    try {
      setItems(await fetchAll<Partner>(config.path))
      setError('')
    } catch (err) {
      setError(errorMessage(err, `Falha ao carregar ${config.title.toLowerCase()}`))
    } finally {
      setLoading(false)
    }
  }, [config.path, config.title])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(s =>
      (!statusFilter || s.status === statusFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.tradeName.toLowerCase().includes(q) || s.cnpj.includes(q) || s.email.toLowerCase().includes(q)),
    )
  }, [items, search, statusFilter])

  async function confirmDelete() {
    if (!toDelete) return
    setBusy(true)
    try {
      await api.delete(`${config.path}/${toDelete.id}`)
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
    <div className="space-y-5">
      <Breadcrumb items={[{ label: config.title }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">{config.title}</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{items.length} {config.title.toLowerCase()} cadastrados</p>
        </div>
        {canManage && <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditing(null); setShowForm(true) }}>{config.newLabel}</Button>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input placeholder="Buscar por nome, CNPJ, e-mail…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      {error && <Alert>{error}</Alert>}
      {loading ? <PageLoading rows={3} /> : filtered.length === 0 ? (
        <EmptyState icon={<Icon className="w-6 h-6" />} title={`Nenhum ${config.singular} encontrado`} description="Ajuste a busca ou cadastre um novo registro." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar name={s.tradeName} size="md" />
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)] leading-tight">{s.tradeName}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{s.category ?? s.name}</p>
                  </div>
                </div>
                <Badge variant={s.status === 'active' ? 'success' : 'default'} dot size="sm">{s.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
              </div>

              <div className="space-y-2 mb-4 text-xs text-[color:var(--text-secondary)]">
                <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" /><span className="font-mono text-[color:var(--text-tertiary)]">{s.cnpj}</span></div>
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" /><span className="truncate">{s.email}</span></div>
                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" /><span>{s.phone}</span></div>}
                <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" /><span>{s.city} — {s.state}</span></div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">{s._count ? 'Produtos' : 'Contato'}</p>
                  <p className="text-xs font-medium text-[color:var(--text-primary)]">{s._count ? s._count.products : s.contactName || '—'}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  {canManage && (
                    <button title="Editar" onClick={() => { setEditing(s); setShowForm(true) }} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button title="Excluir" onClick={() => setToDelete(s)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PartnerForm config={config} partner={editing} open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); void load() }} />
      <ConfirmDialog open={!!toDelete} title={`Excluir ${config.singular}`} message={`Excluir "${toDelete?.tradeName}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </div>
  )
}

function PartnerForm({ config, partner, open, onClose, onSaved }: { config: Config; partner: Partner | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [syncedKey, setSyncedKey] = useState('')

  const key = open ? (partner?.id ?? 'new') : ''
  if (key !== syncedKey) {
    setSyncedKey(key)
    if (open) {
      setError('')
      setForm(partner ? {
        name: partner.name, tradeName: partner.tradeName, cnpj: partner.cnpj, email: partner.email, phone: partner.phone ?? '',
        contactName: partner.contactName ?? '', category: partner.category ?? '', city: partner.city, state: partner.state, status: partner.status,
      } : EMPTY)
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    const supplier = config.kind === 'suppliers'
    if (form.name.trim().length < 2 || form.tradeName.trim().length < 2) return setError('Informe razão social e nome fantasia.')
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(form.cnpj)) return setError('CNPJ inválido (formato XX.XXX.XXX/XXXX-XX).')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('E-mail inválido.')
    if (form.city.trim().length < 2 || form.state.trim().length !== 2) return setError('Informe cidade e UF (2 letras).')
    if (supplier && (form.phone.trim().length < 10 || form.contactName.trim().length < 2 || !form.category.trim())) return setError('Fornecedores exigem telefone (com DDD), contato e categoria.')

    const body = {
      name: form.name.trim(), tradeName: form.tradeName.trim(), cnpj: form.cnpj, email: form.email.trim(),
      phone: form.phone.trim() || undefined, contactName: form.contactName.trim() || undefined,
      city: form.city.trim(), state: form.state.trim().toUpperCase(), status: form.status,
      ...(supplier ? { category: form.category.trim() } : {}),
    }
    setSaving(true)
    setError('')
    try {
      if (partner) await api.patch(`${config.path}/${partner.id}`, body)
      else await api.post(config.path, body)
      onSaved()
    } catch (err) {
      setError(errorMessage(err, `Falha ao salvar ${config.singular}`))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={partner ? `Editar ${config.singular}` : config.newLabel} size="lg"
      footer={<><Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button><Button size="sm" loading={saving} onClick={save}>{partner ? 'Salvar alterações' : 'Cadastrar'}</Button></>}>
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Input label="Razão social *" value={form.name} onChange={set('name')} /></div>
          <Input label="Nome fantasia *" value={form.tradeName} onChange={set('tradeName')} />
          <Input label="CNPJ *" placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: formatCnpj(e.target.value) }))} />
          <Input label="E-mail *" type="email" value={form.email} onChange={set('email')} />
          <Input label={`Telefone${config.hasCategory ? ' *' : ''}`} placeholder="(11) 90000-0000" value={form.phone} onChange={set('phone')} />
          <Input label={`Contato${config.hasCategory ? ' *' : ''}`} value={form.contactName} onChange={set('contactName')} />
          {config.hasCategory && <Input label="Categoria *" placeholder="Ex: Eletrônicos" value={form.category} onChange={set('category')} />}
          <Input label="Cidade *" value={form.city} onChange={set('city')} />
          <Input label="UF *" maxLength={2} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} />
          <Select label="Status" value={form.status} onChange={set('status')} options={[{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }]} />
        </div>
      </div>
    </Modal>
  )
}
