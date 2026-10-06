import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, View } from 'react-native'
import { AppText, Avatar, Badge, Banner, Button, Card, CardHeader, Chips, Input, KeyValue, Screen, SkeletonList } from '@/components/ui'
import { api, defaultApiUrl, errorMessage, getApiUrl, setApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { ADMIN, hasRole, ROLE_LABELS } from '@/lib/permissions'
import { useFetch } from '@/lib/useFetch'
import { ThemeMode, useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'
import type { User } from '@/types/user'

interface Company { legalName: string; tradeName: string; cnpj: string; email: string; phone: string; website: string; address: string; zip: string; city: string; state: string }
interface Settings { company: Company; preferences: { expiryAlertDays: number; leadTimeDays: number } }

const PERMISSIONS = [
  { area: 'Consultar produtos, estoque, relatórios e dashboard', roles: ['admin', 'supervisor', 'operator', 'viewer'] },
  { area: 'Registrar entradas, saídas, transferências e contagens', roles: ['admin', 'supervisor', 'operator'] },
  { area: 'Cadastrar/editar produtos, fornecedores, clientes e endereços', roles: ['admin', 'supervisor'] },
  { area: 'Criar inventários, gerenciar usuários e ver auditoria', roles: ['admin', 'supervisor'] },
  { area: 'Excluir registros, redefinir senhas e alterar configurações', roles: ['admin'] },
]

type Msg = { ok: boolean; text: string } | null

export default function ConfiguracoesScreen() {
  const { user, logout } = useAuth()
  const isAdmin = hasRole(user?.role, ADMIN)
  if (!user) return null
  return (
    <Screen>
      <Profile />
      <Security />
      <Appearance />
      <CompanyCard editable={isAdmin} />
      <Preferences editable={isAdmin} />
      <System />
      <Button title="Sair da conta" icon="log-out" variant="outline" onPress={logout} />
    </Screen>
  )
}

function Feedback({ msg }: { msg: Msg }) {
  return msg ? <Banner tone={msg.ok ? 'success' : 'danger'}>{msg.text}</Banner> : null
}

function Profile() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function save() {
    if (name.trim().length < 2 || !department.trim()) return setMsg({ ok: false, text: 'Informe nome e departamento.' })
    setSaving(true)
    setMsg(null)
    try {
      await api.patch<User>('/auth/profile', { name: name.trim(), department: department.trim() })
      await refresh()
      setMsg({ ok: true, text: 'Perfil atualizado.' })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md }}>
        <Avatar name={user!.name} size={52} />
        <View style={{ flex: 1 }}>
          <AppText variant="subheading">Meu perfil</AppText>
          <AppText variant="small" color="tertiary">{user!.email}</AppText>
        </View>
        <Badge label={ROLE_LABELS[user!.role]} tone="brand" />
      </View>
      <View style={{ gap: space.md }}>
        <Feedback msg={msg} />
        <Input label="Nome" value={name} onChangeText={setName} />
        <Input label="Departamento" value={department} onChangeText={setDepartment} />
        <Input label="Último acesso" value={user!.lastLogin ? formatDateTime(user!.lastLogin) : '—'} editable={false} />
        <Button title="Salvar perfil" icon="check" onPress={save} loading={saving} />
      </View>
    </Card>
  )
}

function Security() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function save() {
    if (next.length < 6) return setMsg({ ok: false, text: 'A nova senha deve ter ao menos 6 caracteres.' })
    if (next !== confirm) return setMsg({ ok: false, text: 'A confirmação não confere com a nova senha.' })
    setSaving(true)
    setMsg(null)
    try {
      await api.patch('/auth/password', { currentPassword: current, newPassword: next })
      setCurrent(''); setNext(''); setConfirm('')
      setMsg({ ok: true, text: 'Senha alterada com sucesso.' })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Segurança" description="Altere a senha da sua conta" />
      <View style={{ gap: space.md }}>
        <Feedback msg={msg} />
        <Input label="Senha atual" value={current} onChangeText={setCurrent} password />
        <Input label="Nova senha" value={next} onChangeText={setNext} password hint="Mínimo de 6 caracteres" />
        <Input label="Confirmar nova senha" value={confirm} onChangeText={setConfirm} password />
        <Button title="Alterar senha" icon="lock" onPress={save} loading={saving} />
      </View>
    </Card>
  )
}

function Appearance() {
  const { mode, setMode } = useTheme()
  return (
    <Card>
      <CardHeader title="Aparência" description="A preferência fica salva neste aparelho" />
      <Chips<ThemeMode> value={mode} onChange={setMode} items={[{ id: 'system', label: 'Sistema' }, { id: 'light', label: 'Claro' }, { id: 'dark', label: 'Escuro' }]} />
    </Card>
  )
}

/** Carrega e salva /settings (empresa e preferências). Somente administradores editam. */
function useSettings() {
  const { data, loading, error, reload } = useFetch<Settings>('/settings')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function save(patch: Partial<Settings>) {
    setSaving(true)
    setMsg(null)
    try {
      await api.put('/settings', patch)
      await reload()
      setMsg({ ok: true, text: 'Configurações salvas.' })
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) })
    } finally {
      setSaving(false)
    }
  }
  return { data, loading, error, saving, msg, save }
}

const COMPANY_FIELDS: { key: keyof Company; label: string }[] = [
  { key: 'legalName', label: 'Razão social' }, { key: 'tradeName', label: 'Nome fantasia' }, { key: 'cnpj', label: 'CNPJ' },
  { key: 'email', label: 'E-mail' }, { key: 'phone', label: 'Telefone' }, { key: 'website', label: 'Website' },
  { key: 'address', label: 'Endereço' }, { key: 'zip', label: 'CEP' }, { key: 'city', label: 'Cidade' }, { key: 'state', label: 'UF' },
]

function CompanyCard({ editable }: { editable: boolean }) {
  const { data, loading, error, saving, msg, save } = useSettings()
  const [form, setForm] = useState<Company | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (data) setForm(data.company) }, [data])

  return (
    <Card>
      <CardHeader title="Empresa" description={editable ? 'Dados cadastrais' : 'Somente administradores podem editar'} />
      {error ? <Banner>{error}</Banner> : null}
      {loading || !form ? (error ? null : <SkeletonList rows={2} />) : (
        <View style={{ gap: space.md }}>
          <Feedback msg={msg} />
          {COMPANY_FIELDS.map(f => (
            <Input key={f.key} label={f.label} value={form[f.key]} editable={editable} maxLength={f.key === 'state' ? 2 : undefined}
              onChangeText={v => setForm(prev => (prev ? { ...prev, [f.key]: f.key === 'state' ? v.toUpperCase() : v } : prev))} />
          ))}
          {editable ? <Button title="Salvar empresa" icon="check" onPress={() => save({ company: form })} loading={saving} /> : null}
        </View>
      )}
    </Card>
  )
}

function Preferences({ editable }: { editable: boolean }) {
  const { data, loading, error, saving, msg, save } = useSettings()
  const [days, setDays] = useState('')
  const [lead, setLead] = useState('')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) { setDays(String(data.preferences.expiryAlertDays)); setLead(String(data.preferences.leadTimeDays)) }
  }, [data])

  return (
    <Card>
      <CardHeader title="Preferências do sistema" description="Usadas nos alertas, lotes e sugestões de compra" />
      {error ? <Banner>{error}</Banner> : null}
      {loading || !data ? (error ? null : <SkeletonList rows={2} />) : (
        <View style={{ gap: space.md }}>
          <Feedback msg={msg} />
          <Input label="Antecedência do alerta de vencimento (dias)" value={days} onChangeText={setDays} keyboardType="number-pad" editable={editable} hint="Lotes que vencem nesse prazo ficam como “Vencendo” e geram alertas." />
          <Input label="Prazo de reposição dos fornecedores (dias)" value={lead} onChangeText={setLead} keyboardType="number-pad" editable={editable} hint="Define o ponto de pedido e o estoque de segurança da IA Analítica." />
          {editable ? <Button title="Salvar preferências" icon="check" onPress={() => save({ preferences: { expiryAlertDays: Number(days), leadTimeDays: Number(lead) } })} loading={saving} /> : null}
        </View>
      )}
    </Card>
  )
}

function System() {
  const { user } = useAuth()
  const router = useRouter()
  const [server, setServer] = useState(getApiUrl())
  const [msg, setMsg] = useState<Msg>(null)
  const base = server.replace(/\/api\/?$/, '')

  async function saveServer() {
    await setApiUrl(server)
    setServer(getApiUrl())
    setMsg({ ok: true, text: 'Endereço salvo. Puxe as telas para atualizar.' })
  }

  return (
    <>
      <Card>
        <CardHeader title="Servidor e API" description="Documentação interativa da API REST" />
        <View style={{ gap: space.md }}>
          <Feedback msg={msg} />
          <Input label="Endereço da API" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Salvar" variant="outline" size="sm" onPress={saveServer} style={{ flex: 1 }} />
            <Button title="Padrão" variant="ghost" size="sm" onPress={async () => { await setApiUrl(null); setServer(defaultApiUrl()) }} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Swagger UI" icon="external-link" variant="outline" size="sm" onPress={() => Linking.openURL(`${base}/docs`)} style={{ flex: 1 }} />
            <Button title="OpenAPI JSON" icon="external-link" variant="outline" size="sm" onPress={() => Linking.openURL(`${base}/docs.json`)} style={{ flex: 1 }} />
          </View>
          <KeyValue label="Versão do app" value={Constants.expoConfig?.version ?? '1.0.0'} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Perfis de acesso" right={user ? <Badge label={`Você: ${ROLE_LABELS[user.role]}`} tone="brand" /> : undefined} />
        {PERMISSIONS.map(p => (
          <View key={p.area} style={{ paddingVertical: 8, gap: 4 }}>
            <AppText variant="small">{p.area}</AppText>
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              {p.roles.map(r => <Badge key={r} label={ROLE_LABELS[r as keyof typeof ROLE_LABELS]} tone={r === user?.role ? 'brand' : 'neutral'} />)}
            </View>
          </View>
        ))}
        <Button title="Ver alertas do sistema" variant="ghost" size="sm" onPress={() => router.push('/alertas')} />
      </Card>
    </>
  )
}
