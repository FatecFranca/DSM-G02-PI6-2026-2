'use client'
import { useState } from 'react'
import { Bell, AlertTriangle, CheckCircle2, Info, Filter, Check, Trash2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'

type AlertType = 'critical' | 'warning' | 'info' | 'success'

const ALL_ALERTS = [
  { id: '1', type: 'critical' as AlertType, category: 'stock', title: 'Estoque zerado: Extintor PQS 4Kg ABC', desc: 'O produto SE-0012 atingiu zero unidades em estoque.', time: '14:32 · 30/06/2026', read: false },
  { id: '2', type: 'warning' as AlertType, category: 'stock', title: 'Estoque crítico: Álcool 70% 1L (0 un)', desc: 'QM-0091 está abaixo do estoque mínimo de 100 unidades.', time: '14:15 · 30/06/2026', read: false },
  { id: '3', type: 'warning' as AlertType, category: 'expiry', title: 'Lote vencendo: LOT-ALC-000 em 5 dias', desc: '50 unidades do Álcool 70% 1L vencem em 05/07/2026.', time: '12:00 · 30/06/2026', read: false },
  { id: '4', type: 'critical' as AlertType, category: 'stock', title: 'Divergência: Parafuso M8 (−15 un)', desc: 'Sistema registra 145 un mas inventário contou 130.', time: '11:20 · 30/06/2026', read: false },
  { id: '5', type: 'warning' as AlertType, category: 'stock', title: 'Estoque baixo: Bateria 18650 3.7V (38 un)', desc: 'EL-0098 está abaixo do ponto de reposição de 50 unidades.', time: '10:45 · 30/06/2026', read: false },
  { id: '6', type: 'info' as AlertType, category: 'system', title: 'Inventário #INV-2026-06 concluído com sucesso', desc: '1.847 itens contados. 12 divergências identificadas.', time: '09:00 · 30/06/2026', read: true },
  { id: '7', type: 'success' as AlertType, category: 'system', title: 'Entrada registrada: 200 un Álcool 70%', desc: 'Entrada da NF-2026-00891 processada por Rafael Costa.', time: '13:48 · 30/06/2026', read: true },
  { id: '8', type: 'critical' as AlertType, category: 'expiry', title: 'Lote VENCIDO: LOT-DESF-OLD', desc: 'Extintor PQS 4Kg — lote venceu em 31/12/2025. Aguarda descarte.', time: '08:00 · 30/06/2026', read: true },
]

const TYPE_CONFIG: Record<AlertType, { icon: React.ElementType; iconColor: string; iconBg: string; variant: 'danger'|'warning'|'info'|'success' }> = {
  critical: { icon: AlertTriangle, iconColor: 'text-[color:var(--danger)]',  iconBg: 'bg-[color:var(--danger-subtle)]',  variant: 'danger' },
  warning:  { icon: AlertTriangle, iconColor: 'text-[color:var(--warning)]', iconBg: 'bg-[color:var(--warning-subtle)]', variant: 'warning' },
  info:     { icon: Info,          iconColor: 'text-[color:var(--info)]',    iconBg: 'bg-[color:var(--info-subtle)]',    variant: 'info' },
  success:  { icon: CheckCircle2,  iconColor: 'text-[color:var(--success)]', iconBg: 'bg-[color:var(--success-subtle)]', variant: 'success' },
}

const TABS = [
  { id: 'all', label: 'Todos', badge: ALL_ALERTS.length },
  { id: 'unread', label: 'Não lidos', badge: ALL_ALERTS.filter(a => !a.read).length },
  { id: 'critical', label: 'Críticos', badge: ALL_ALERTS.filter(a => a.type === 'critical').length },
  { id: 'expiry', label: 'Validade', badge: ALL_ALERTS.filter(a => a.category === 'expiry').length },
]

export default function AlertasPage() {
  const [tab, setTab] = useState('all')
  const [read, setRead] = useState<Set<string>>(new Set(ALL_ALERTS.filter(a => a.read).map(a => a.id)))

  const filtered = ALL_ALERTS.filter(a => {
    if (tab === 'unread') return !read.has(a.id)
    if (tab === 'critical') return a.type === 'critical'
    if (tab === 'expiry') return a.category === 'expiry'
    return true
  })

  const unreadCount = ALL_ALERTS.filter(a => !read.has(a.id)).length

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Alertas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Central de Alertas</h1>
            {unreadCount > 0 && <Badge variant="danger">{unreadCount} novos</Badge>}
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Notificações e alertas do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRead(new Set(ALL_ALERTS.map(a => a.id)))}>
            <Check className="w-3.5 h-3.5 mr-1.5" />Marcar todos como lidos
          </Button>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[color:var(--success-subtle)] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-[color:var(--success)]" />
            </div>
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">Nenhum alerta por aqui</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">Todos os alertas foram tratados.</p>
          </div>
        )}

        {filtered.map(alert => {
          const cfg = TYPE_CONFIG[alert.type]
          const Icon = cfg.icon
          const isRead = read.has(alert.id)
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border transition-all hover:shadow-[var(--shadow-sm)]',
                isRead
                  ? 'bg-[color:var(--bg-base)] border-[color:var(--border)]'
                  : 'bg-[color:var(--bg-base)] border-[color:var(--border)] border-l-4',
                !isRead && alert.type === 'critical' && 'border-l-[color:var(--danger)]',
                !isRead && alert.type === 'warning' && 'border-l-[color:var(--warning)]',
                !isRead && alert.type === 'info' && 'border-l-[color:var(--info)]',
                !isRead && alert.type === 'success' && 'border-l-[color:var(--success)]',
              )}
            >
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', cfg.iconBg)}>
                <Icon className={cn('w-4 h-4', cfg.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={cn('text-sm font-semibold', isRead ? 'text-[color:var(--text-secondary)]' : 'text-[color:var(--text-primary)]')}>{alert.title}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{alert.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge variant={cfg.variant} size="sm">{alert.type === 'critical' ? 'Crítico' : alert.type === 'warning' ? 'Atenção' : alert.type === 'info' ? 'Info' : 'Sucesso'}</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-[color:var(--text-tertiary)]">{alert.time}</p>
                  <div className="flex items-center gap-1">
                    {!isRead && (
                      <button
                        onClick={() => setRead(prev => new Set([...prev, alert.id]))}
                        className="text-[10px] text-[color:var(--brand)] hover:underline"
                      >
                        Marcar como lido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
