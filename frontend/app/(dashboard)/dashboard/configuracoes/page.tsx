'use client'
import { useState } from 'react'
import {
  Building2, Globe, Bell, Palette, Shield, Plug, Save, Moon, Sun,
  Mail, Smartphone, ChevronRight,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/cn'

const SECTIONS = [
  { id: 'company', icon: Building2, label: 'Empresa' },
  { id: 'preferences', icon: Globe, label: 'Preferências' },
  { id: 'theme', icon: Palette, label: 'Aparência' },
  { id: 'notifications', icon: Bell, label: 'Notificações' },
  { id: 'security', icon: Shield, label: 'Segurança' },
  { id: 'integrations', icon: Plug, label: 'Integrações' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn('w-10 h-5.5 rounded-full transition-colors relative flex-shrink-0', checked ? 'bg-[color:var(--brand)]' : 'bg-[color:var(--border-strong)]')}
      style={{ height: '22px' }}
    >
      <span className={cn('absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform', checked && 'translate-x-[18px]')} style={{ width: '18px', height: '18px', transition: 'transform 0.15s' }} />
    </button>
  )
}

export default function ConfiguracoesPage() {
  const [section, setSection] = useState('company')
  const { theme, toggle: toggleTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [notifs, setNotifs] = useState({ email: true, push: false, stockAlert: true, expiryAlert: true, divergence: true, reports: false })

  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r, 1000)); setSaving(false) }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Configurações' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Configurações</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Gerencie sua empresa, preferências e integrações</p>
        </div>
        <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors text-left',
                  section === s.id
                    ? 'bg-[color:var(--brand-subtle)] text-[color:var(--brand)]'
                    : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-muted)] hover:text-[color:var(--text-primary)]'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {s.label}
                {section === s.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {section === 'company' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle description="Dados cadastrais da empresa">Informações da Empresa</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input label="Razão Social *" defaultValue="StockIQ Sistemas de Gestão Ltda" />
                  </div>
                  <Input label="Nome Fantasia" defaultValue="StockIQ" />
                  <Input label="CNPJ" defaultValue="12.345.678/0001-99" />
                  <Input label="E-mail" type="email" defaultValue="contato@stockiq.com.br" />
                  <Input label="Telefone" defaultValue="(11) 3456-7890" />
                  <div className="sm:col-span-2">
                    <Input label="Website" defaultValue="https://stockiq.com.br" />
                  </div>
                </div>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle description="Endereço principal">Localização</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3"><Input label="Endereço" defaultValue="Av. Paulista, 1000" /></div>
                  <Input label="CEP" defaultValue="01310-100" />
                  <Input label="Cidade" defaultValue="São Paulo" />
                  <Input label="Estado" defaultValue="SP" />
                </div>
              </Card>
            </>
          )}

          {section === 'theme' && (
            <Card>
              <CardHeader>
                <CardTitle description="Personalize a aparência do sistema">Aparência</CardTitle>
              </CardHeader>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-[color:var(--text-primary)] mb-3">Tema</p>
                  <div className="flex gap-3">
                    {[
                      { id: 'light', icon: Sun, label: 'Claro' },
                      { id: 'dark', icon: Moon, label: 'Escuro' },
                    ].map(t => {
                      const Icon = t.icon
                      return (
                        <button
                          key={t.id}
                          onClick={() => theme !== t.id && toggleTheme()}
                          className={cn(
                            'flex flex-col items-center gap-2 px-6 py-4 rounded-[var(--radius-lg)] border-2 transition-all',
                            theme === t.id ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)]' : 'border-[color:var(--border)] hover:border-[color:var(--brand-muted)]'
                          )}
                        >
                          <Icon className={cn('w-6 h-6', theme === t.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-tertiary)]')} />
                          <span className={cn('text-sm font-semibold', theme === t.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-secondary)]')}>{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-[color:var(--text-primary)] mb-3">Idioma</p>
                  <select className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
                    <option>Português (Brasil)</option>
                    <option>English (US)</option>
                    <option>Español</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle description="Configure como e quando receber alertas">Notificações</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-3">Canais</p>
                  {[
                    { key: 'email', icon: Mail, label: 'E-mail', desc: 'Receber alertas por e-mail' },
                    { key: 'push', icon: Smartphone, label: 'Push (Mobile)', desc: 'Notificações no aplicativo' },
                  ].map(ch => (
                    <div key={ch.key} className="flex items-center justify-between py-3 border-b border-[color:var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                          <ch.icon className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[color:var(--text-primary)]">{ch.label}</p>
                          <p className="text-xs text-[color:var(--text-tertiary)]">{ch.desc}</p>
                        </div>
                      </div>
                      <Toggle checked={notifs[ch.key as keyof typeof notifs] as boolean} onChange={() => setNotifs(n => ({ ...n, [ch.key]: !n[ch.key as keyof typeof n] }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-3">Tipos de Alerta</p>
                  {[
                    { key: 'stockAlert', label: 'Estoque mínimo/crítico', desc: 'Quando produto atingir o estoque mínimo' },
                    { key: 'expiryAlert', label: 'Vencimento de lotes', desc: 'Produtos vencendo nos próximos 30 dias' },
                    { key: 'divergence', label: 'Divergências de inventário', desc: 'Inconsistências detectadas no inventário' },
                    { key: 'reports', label: 'Relatórios automáticos', desc: 'Envio automático de relatórios semanais' },
                  ].map(nt => (
                    <div key={nt.key} className="flex items-center justify-between py-3 border-b border-[color:var(--border)] last:border-0">
                      <div>
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">{nt.label}</p>
                        <p className="text-xs text-[color:var(--text-tertiary)]">{nt.desc}</p>
                      </div>
                      <Toggle checked={notifs[nt.key as keyof typeof notifs] as boolean} onChange={() => setNotifs(n => ({ ...n, [nt.key]: !n[nt.key as keyof typeof n] }))} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {section === 'integrations' && (
            <div className="space-y-4">
              {[
                { name: 'ERP / TOTVS', desc: 'Sincronize produtos, pedidos e notas fiscais', status: 'connected', badge: 'success' as const },
                { name: 'E-commerce / VTEX', desc: 'Sincronize estoque com sua loja virtual', status: 'disconnected', badge: 'default' as const },
                { name: 'Logística / Correios', desc: 'Rastreamento de envios e fretes', status: 'disconnected', badge: 'default' as const },
                { name: 'NFe / SEFAZ', desc: 'Emissão e recepção de notas fiscais eletrônicas', status: 'connected', badge: 'success' as const },
                { name: 'Slack / Teams', desc: 'Receba alertas críticos via mensageiro', status: 'disconnected', badge: 'default' as const },
                { name: 'API REST', desc: 'Integre sistemas proprietários via API', status: 'beta', badge: 'warning' as const },
              ].map(int => (
                <div key={int.name} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                    <Plug className="w-5 h-5 text-[color:var(--text-tertiary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{int.name}</p>
                      <Badge variant={int.badge} size="sm" dot>
                        {int.status === 'connected' ? 'Conectado' : int.status === 'beta' ? 'Beta' : 'Desconectado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{int.desc}</p>
                  </div>
                  <Button size="sm" variant={int.status === 'connected' ? 'outline' : 'primary'}>
                    {int.status === 'connected' ? 'Gerenciar' : 'Conectar'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {section === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle description="Configurações de segurança e acesso">Segurança</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: 'Autenticação de dois fatores (2FA)', desc: 'Adiciona uma camada extra de segurança ao login', value: false },
                  { label: 'Sessão única por usuário', desc: 'Impede múltiplos logins simultâneos', value: true },
                  { label: 'Log de acessos por IP', desc: 'Registra todos os acessos com endereço IP', value: true },
                  { label: 'Timeout automático de sessão', desc: 'Encerra a sessão após 30 minutos de inatividade', value: true },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-[color:var(--border)] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[color:var(--text-primary)]">{s.label}</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">{s.desc}</p>
                    </div>
                    <Toggle checked={s.value} onChange={() => {}} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {(section === 'preferences') && (
            <Card>
              <CardHeader>
                <CardTitle description="Configurações gerais do sistema">Preferências Gerais</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Fuso horário</label>
                  <select className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
                    <option>America/Sao_Paulo (UTC-3)</option>
                    <option>America/Manaus (UTC-4)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Moeda</label>
                  <select className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
                    <option>BRL — Real Brasileiro</option>
                    <option>USD — Dólar Americano</option>
                  </select>
                </div>
                <Input label="Prefixo de código interno" defaultValue="PROD-" hint="Aplicado automaticamente ao criar produtos" />
                <div>
                  <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Unidade de peso padrão</label>
                  <select className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
                    <option>Quilogramas (kg)</option>
                    <option>Gramas (g)</option>
                  </select>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
