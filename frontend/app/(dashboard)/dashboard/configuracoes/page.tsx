'use client'
import { useEffect, useState } from 'react'
import { Building2, SlidersHorizontal, Palette, Shield, UserCircle, Server, Save, Moon, Sun, ExternalLink, ChevronRight } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/Loading'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import { ADMIN, hasRole, ROLE_LABELS } from '@/lib/permissions'
import { errorMessage, useFetch } from '@/hooks/useFetch'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'
import type { User } from '@/types/user'

interface Company {
  legalName: string; tradeName: string; cnpj: string; email: string; phone: string
  website: string; address: string; zip: string; city: string; state: string
}
interface Settings { company: Company; preferences: { expiryAlertDays: number } }

const SECTIONS = [
  { id: 'profile', icon: UserCircle, label: 'Meu Perfil' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'theme', icon: Palette, label: 'Aparência' },
  { id: 'company', icon: Building2, label: 'Empresa' },
  { id: 'preferences', icon: SlidersHorizontal, label: 'Preferências' },
  { id: 'system', icon: Server, label: 'Sistema' },
]

const PERMISSIONS: { area: string; roles: string[] }[] = [
  { area: 'Consultar produtos, estoque, relatórios e dashboard', roles: ['admin', 'supervisor', 'operator', 'viewer'] },
  { area: 'Registrar entradas, saídas, transferências e lotes', roles: ['admin', 'supervisor', 'operator'] },
  { area: 'Cadastrar/editar produtos, fornecedores, clientes e endereços', roles: ['admin', 'supervisor'] },
  { area: 'Criar inventários, gerenciar usuários e ver auditoria', roles: ['admin', 'supervisor'] },
  { area: 'Excluir registros, redefinir senhas e alterar configurações', roles: ['admin'] },
]

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/api\/?$/, '')

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const [section, setSection] = useState('profile')
  const isAdmin = hasRole(user?.role, ADMIN)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Configurações' }]} />
      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Configurações</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Seu perfil, segurança, aparência e parâmetros do sistema</p>
      </div>

      <div className="flex gap-5 flex-col md:flex-row">
        <div className="md:w-52 flex-shrink-0 flex md:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors text-left whitespace-nowrap',
                  section === s.id ? 'bg-[color:var(--brand-subtle)] text-[color:var(--brand)]' : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-muted)] hover:text-[color:var(--text-primary)]')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
                {section === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto hidden md:block" />}
              </button>
            )
          })}
        </div>

        <div className="flex-1 min-w-0 space-y-5">
          {section === 'profile' && <ProfileSection />}
          {section === 'security' && <SecuritySection />}
          {section === 'theme' && <ThemeSection />}
          {section === 'company' && <CompanySection editable={isAdmin} />}
          {section === 'preferences' && <PreferencesSection editable={isAdmin} />}
          {section === 'system' && <SystemSection />}
        </div>
      </div>
    </div>
  )
}

function ProfileSection() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
      <CardHeader><CardTitle description="Seus dados de acesso">Meu Perfil</CardTitle>{user && <Badge variant="brand">{ROLE_LABELS[user.role]}</Badge>}</CardHeader>
      <div className="space-y-4">
        {msg && <Alert variant={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Departamento" value={department} onChange={e => setDepartment(e.target.value)} />
          <Input label="E-mail" value={user?.email ?? ''} disabled hint="O e-mail só pode ser alterado por um administrador." />
          <Input label="Último acesso" value={user?.lastLogin ? formatDateTime(user.lastLogin) : '—'} disabled />
        </div>
        <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={save}>Salvar perfil</Button>
      </div>
    </Card>
  )
}

function SecuritySection() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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
      <CardHeader><CardTitle description="Altere a senha da sua conta">Segurança</CardTitle></CardHeader>
      <div className="space-y-4 max-w-md">
        {msg && <Alert variant={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        <Input label="Senha atual" type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" />
        <Input label="Nova senha" type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" hint="Mínimo de 6 caracteres" />
        <Input label="Confirmar nova senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
        <Button size="sm" loading={saving} onClick={save}>Alterar senha</Button>
      </div>
    </Card>
  )
}

function ThemeSection() {
  const { theme, toggle } = useTheme()
  return (
    <Card>
      <CardHeader><CardTitle description="A preferência fica salva neste navegador">Aparência</CardTitle></CardHeader>
      <div className="flex gap-3">
        {[{ id: 'light', icon: Sun, label: 'Claro' }, { id: 'dark', icon: Moon, label: 'Escuro' }].map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => theme !== t.id && toggle()}
              className={cn('flex flex-col items-center gap-2 px-6 py-4 rounded-[var(--radius-lg)] border-2 transition-all', theme === t.id ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)]' : 'border-[color:var(--border)] hover:border-[color:var(--brand-muted)]')}>
              <Icon className={cn('w-6 h-6', theme === t.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-tertiary)]')} />
              <span className={cn('text-sm font-semibold', theme === t.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-secondary)]')}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

/** Shared loader/saver for the company and preferences sections (GET/PUT /settings). */
function useSettings() {
  const { data, loading, error, reload } = useFetch<Settings>('/settings')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

const COMPANY_FIELDS: { key: keyof Company; label: string; span?: boolean }[] = [
  { key: 'legalName', label: 'Razão Social', span: true },
  { key: 'tradeName', label: 'Nome Fantasia' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'email', label: 'E-mail' },
  { key: 'phone', label: 'Telefone' },
  { key: 'website', label: 'Website', span: true },
  { key: 'address', label: 'Endereço', span: true },
  { key: 'zip', label: 'CEP' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'UF' },
]

function CompanySection({ editable }: { editable: boolean }) {
  const { data, loading, error, saving, msg, save } = useSettings()
  const [form, setForm] = useState<Company | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setForm(data.company)
  }, [data])

  if (loading || !form) return error ? <Alert>{error}</Alert> : <PageLoading rows={3} />

  return (
    <Card>
      <CardHeader><CardTitle description={editable ? 'Dados cadastrais da empresa' : 'Somente administradores podem editar'}>Informações da Empresa</CardTitle></CardHeader>
      <div className="space-y-4">
        {msg && <Alert variant={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {COMPANY_FIELDS.map(f => (
            <div key={f.key} className={f.span ? 'sm:col-span-2' : undefined}>
              <Input label={f.label} value={form[f.key]} disabled={!editable} maxLength={f.key === 'state' ? 2 : undefined}
                onChange={e => setForm(prev => (prev ? { ...prev, [f.key]: f.key === 'state' ? e.target.value.toUpperCase() : e.target.value } : prev))} />
            </div>
          ))}
        </div>
        {editable && <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={() => save({ company: form })}>Salvar empresa</Button>}
      </div>
    </Card>
  )
}

function PreferencesSection({ editable }: { editable: boolean }) {
  const { data, loading, error, saving, msg, save } = useSettings()
  const [days, setDays] = useState('')

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setDays(String(data.preferences.expiryAlertDays))
  }, [data])

  if (loading || !data) return error ? <Alert>{error}</Alert> : <PageLoading rows={2} />

  return (
    <Card>
      <CardHeader><CardTitle description="Parâmetros usados nos alertas e no status dos lotes">Preferências do Sistema</CardTitle></CardHeader>
      <div className="space-y-4 max-w-md">
        {msg && <Alert variant={msg.ok ? 'success' : 'danger'}>{msg.text}</Alert>}
        <Input label="Antecedência do alerta de vencimento (dias)" type="number" min={1} max={365} value={days} disabled={!editable} onChange={e => setDays(e.target.value)}
          hint="Lotes que vencem dentro deste prazo ficam como “Vencendo” e geram alertas." />
        {editable && (
          <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={() => save({ preferences: { expiryAlertDays: Number(days) } })}>Salvar preferências</Button>
        )}
      </div>
    </Card>
  )
}

function SystemSection() {
  const { user } = useAuth()
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle description="Documentação interativa da API REST">API</CardTitle></CardHeader>
        <div className="flex flex-wrap gap-2">
          <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>Swagger UI</Button></a>
          <a href={`${API_BASE}/docs.json`} target="_blank" rel="noreferrer"><Button size="sm" variant="outline" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>OpenAPI JSON</Button></a>
        </div>
        <p className="text-xs text-[color:var(--text-tertiary)] mt-3">Servidor: <span className="font-mono">{API_BASE}</span></p>
      </Card>
      <Card>
        <CardHeader><CardTitle description="O que cada perfil pode fazer">Perfis de Acesso</CardTitle>{user && <Badge variant="brand" size="sm">Você: {ROLE_LABELS[user.role]}</Badge>}</CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                <th className="py-2 pr-4 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">Permissão</th>
                {(['admin', 'supervisor', 'operator', 'viewer'] as const).map(r => <th key={r} className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(p => (
                <tr key={p.area} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="py-2.5 pr-4 text-xs text-[color:var(--text-primary)]">{p.area}</td>
                  {(['admin', 'supervisor', 'operator', 'viewer'] as const).map(r => <td key={r} className="px-3 py-2.5 text-center">{p.roles.includes(r) ? <span className="text-[color:var(--success)]">✓</span> : <span className="text-[color:var(--text-tertiary)]">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
