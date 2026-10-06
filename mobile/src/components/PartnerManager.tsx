import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { AppText, Avatar, Badge, Banner, Button, Card, Chips, ConfirmDialog, EmptyState, Fab, Icon, Input, Screen, SearchBar, Select, Sheet, SkeletonList } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { api, errorMessage, fetchAll } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { maskCnpj } from '@/lib/format'
import { ADMIN, hasRole, STAFF } from '@/lib/permissions'
import { space } from '@/theme/tokens'

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

export interface PartnerConfig {
  path: '/suppliers' | '/customers'
  title: string
  singular: string
  newLabel: string
  /** Fornecedores exigem telefone, contato e categoria; clientes não. */
  strict: boolean
  icon: IconName
}

export const SUPPLIERS: PartnerConfig = { path: '/suppliers', title: 'fornecedores', singular: 'fornecedor', newLabel: 'Novo fornecedor', strict: true, icon: 'truck' }
export const CUSTOMERS: PartnerConfig = { path: '/customers', title: 'clientes', singular: 'cliente', newLabel: 'Novo cliente', strict: false, icon: 'users' }

const EMPTY = { name: '', tradeName: '', cnpj: '', email: '', phone: '', contactName: '', category: '', city: '', state: '', status: 'active' as 'active' | 'inactive' }

/** CRUD de fornecedores e clientes (mesma API e mesmos campos do web). */
export function PartnerManager({ config }: { config: PartnerConfig }) {
  const { user } = useAuth()
  const canManage = hasRole(user?.role, STAFF)
  const canDelete = hasRole(user?.role, ADMIN)
  const [items, setItems] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('')
  const [editing, setEditing] = useState<Partner | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Partner | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    try {
      setItems(await fetchAll<Partner>(config.path))
      setError('')
    } catch (err) {
      setError(errorMessage(err, `Falha ao carregar ${config.title}`))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [config.path, config.title])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(s =>
      (!statusFilter || s.status === statusFilter) &&
      (!q || s.name.toLowerCase().includes(q) || s.tradeName.toLowerCase().includes(q) || s.cnpj.includes(q) || s.email.toLowerCase().includes(q)))
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
    <View style={{ flex: 1 }}>
      <Screen onRefresh={() => load(true)} refreshing={refreshing} contentStyle={{ paddingBottom: 96 }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Nome, CNPJ ou e-mail" />
        <Chips value={statusFilter} onChange={setStatusFilter} items={[{ id: '', label: 'Todos' }, { id: 'active', label: 'Ativos' }, { id: 'inactive', label: 'Inativos' }]} />
        <AppText variant="small" color="tertiary">{filtered.length} {config.title}</AppText>
        {error ? <Banner onRetry={() => load()}>{error}</Banner> : null}
        {loading ? <SkeletonList rows={4} /> : null}
        {!loading && filtered.length === 0 ? <EmptyState icon={config.icon} title={`Nenhum ${config.singular} encontrado`} description="Ajuste a busca ou cadastre um novo registro." /> : null}

        <View style={{ gap: space.sm }}>
          {filtered.map(s => (
            <Card key={s.id} onPress={canManage ? () => { setEditing(s); setFormOpen(true) } : undefined}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <Avatar name={s.tradeName} size={42} />
                <View style={{ flex: 1, gap: 3 }}>
                  <AppText bold numberOfLines={1}>{s.tradeName}</AppText>
                  <AppText variant="caption" color="tertiary" numberOfLines={1}>{s.category ?? s.name}</AppText>
                  <AppText variant="mono" color="tertiary">{s.cnpj}</AppText>
                  <Row icon="mail" text={s.email} />
                  {s.phone ? <Row icon="phone" text={s.phone} /> : null}
                  <Row icon="map-pin" text={`${s.city} — ${s.state}`} />
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Badge label={s.status === 'active' ? 'Ativo' : 'Inativo'} tone={s.status === 'active' ? 'success' : 'neutral'} dot />
                  {s._count ? <AppText variant="caption" color="tertiary">{s._count.products} produtos</AppText> : s.contactName ? <AppText variant="caption" color="tertiary" numberOfLines={1}>{s.contactName}</AppText> : null}
                </View>
              </View>
            </Card>
          ))}
        </View>
      </Screen>
      {canManage ? <Fab label={config.newLabel} onPress={() => { setEditing(null); setFormOpen(true) }} /> : null}

      <PartnerForm config={config} partner={editing} open={formOpen} canDelete={canDelete} onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); void load() }} onDelete={p => { setFormOpen(false); setToDelete(p) }} />
      <ConfirmDialog visible={!!toDelete} title={`Excluir ${config.singular}`} message={`Excluir "${toDelete?.tradeName}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" loading={busy} onConfirm={confirmDelete} onClose={() => setToDelete(null)} />
    </View>
  )
}

function Row({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Icon name={icon} size={12} color="tertiary" />
      <AppText variant="caption" color="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>{text}</AppText>
    </View>
  )
}

function PartnerForm({ config, partner, open, canDelete, onClose, onSaved, onDelete }: {
  config: PartnerConfig; partner: Partner | null; open: boolean; canDelete: boolean
  onClose: () => void; onSaved: () => void; onDelete: (p: Partner) => void
}) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError('')
    setForm(partner ? {
      name: partner.name, tradeName: partner.tradeName, cnpj: partner.cnpj, email: partner.email, phone: partner.phone ?? '',
      contactName: partner.contactName ?? '', category: partner.category ?? '', city: partner.city, state: partner.state, status: partner.status,
    } : EMPTY)
  }, [open, partner])

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    if (form.name.trim().length < 2 || form.tradeName.trim().length < 2) return setError('Informe razão social e nome fantasia.')
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(form.cnpj)) return setError('CNPJ inválido (XX.XXX.XXX/XXXX-XX).')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('E-mail inválido.')
    if (form.city.trim().length < 2 || form.state.trim().length !== 2) return setError('Informe cidade e UF (2 letras).')
    if (config.strict && (form.phone.trim().length < 10 || form.contactName.trim().length < 2 || !form.category.trim())) {
      return setError('Fornecedores exigem telefone (com DDD), contato e categoria.')
    }
    const body = {
      name: form.name.trim(), tradeName: form.tradeName.trim(), cnpj: form.cnpj, email: form.email.trim(),
      phone: form.phone.trim() || undefined, contactName: form.contactName.trim() || undefined,
      city: form.city.trim(), state: form.state.trim().toUpperCase(), status: form.status,
      ...(config.strict ? { category: form.category.trim() } : {}),
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
    <Sheet
      visible={open}
      onClose={onClose}
      title={partner ? `Editar ${config.singular}` : config.newLabel}
      footer={
        <>
          {partner && canDelete ? <Button icon="trash-2" variant="outline" accessibilityLabel="Excluir" onPress={() => onDelete(partner)} /> : null}
          <Button title="Cancelar" variant="outline" onPress={onClose} />
          <Button title={partner ? 'Salvar' : 'Cadastrar'} onPress={save} loading={saving} />
        </>
      }
    >
      {error ? <Banner>{error}</Banner> : null}
      <Input label="Razão social *" value={form.name} onChangeText={set('name')} />
      <Input label="Nome fantasia *" value={form.tradeName} onChangeText={set('tradeName')} />
      <Input label="CNPJ *" value={form.cnpj} onChangeText={v => set('cnpj')(maskCnpj(v))} keyboardType="number-pad" placeholder="00.000.000/0000-00" />
      <Input label="E-mail *" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Input label={`Telefone${config.strict ? ' *' : ''}`} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="(11) 90000-0000" />
      <Input label={`Contato${config.strict ? ' *' : ''}`} value={form.contactName} onChangeText={set('contactName')} />
      {config.strict ? <Input label="Categoria *" value={form.category} onChangeText={set('category')} placeholder="Ex.: Eletrônicos" /> : null}
      <Input label="Cidade *" value={form.city} onChangeText={set('city')} />
      <Input label="UF *" value={form.state} onChangeText={v => set('state')(v.toUpperCase())} maxLength={2} autoCapitalize="characters" />
      <Select label="Status" value={form.status} onChange={v => set('status')(v)} options={[{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }]} />
    </Sheet>
  )
}
