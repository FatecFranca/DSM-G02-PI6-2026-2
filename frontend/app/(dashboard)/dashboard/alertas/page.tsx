'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Check, RefreshCw } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { PageLoading } from '@/components/ui/Loading'
import { useAlerts } from '@/lib/alerts-context'
import { cn } from '@/lib/cn'

const TYPE_CONFIG = {
  critical: { iconColor: 'text-[color:var(--danger)]',  iconBg: 'bg-[color:var(--danger-subtle)]',  variant: 'danger' as const,  label: 'Crítico' },
  warning:  { iconColor: 'text-[color:var(--warning)]', iconBg: 'bg-[color:var(--warning-subtle)]', variant: 'warning' as const, label: 'Atenção' },
  info:     { iconColor: 'text-[color:var(--info)]',    iconBg: 'bg-[color:var(--info-subtle)]',    variant: 'info' as const,    label: 'Info' },
}

export default function AlertasPage() {
  const { alerts, unread, loading, reload, markRead, markAllRead } = useAlerts()
  const [tab, setTab] = useState('all')

  const filtered = alerts.filter(a => {
    if (tab === 'unread') return !a.read
    if (tab === 'critical') return a.type === 'critical'
    if (tab === 'expiry') return a.category === 'expiry'
    if (tab === 'stock') return a.category === 'stock'
    return true
  })

  const tabs = [
    { id: 'all', label: 'Todos', badge: alerts.length },
    { id: 'unread', label: 'Não lidos', badge: unread },
    { id: 'critical', label: 'Críticos', badge: alerts.filter(a => a.type === 'critical').length },
    { id: 'stock', label: 'Estoque', badge: alerts.filter(a => a.category === 'stock').length },
    { id: 'expiry', label: 'Validade', badge: alerts.filter(a => a.category === 'expiry').length },
  ]

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Alertas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Central de Alertas</h1>
            {unread > 0 && <Badge variant="danger">{unread} novos</Badge>}
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Alertas gerados automaticamente a partir do estoque e da validade dos lotes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={reload}>Atualizar</Button>
          <Button variant="outline" size="sm" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={markAllRead} disabled={unread === 0}>Marcar todos como lidos</Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {loading && alerts.length === 0 ? <PageLoading rows={4} /> : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[color:var(--success-subtle)] flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-[color:var(--success)]" />
              </div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">Nenhum alerta por aqui</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">Tudo em ordem nesta categoria.</p>
            </div>
          )}

          {filtered.map(alert => {
            const cfg = TYPE_CONFIG[alert.type]
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] transition-all hover:shadow-[var(--shadow-sm)]',
                  !alert.read && 'border-l-4',
                  !alert.read && alert.type === 'critical' && 'border-l-[color:var(--danger)]',
                  !alert.read && alert.type === 'warning' && 'border-l-[color:var(--warning)]',
                  !alert.read && alert.type === 'info' && 'border-l-[color:var(--info)]',
                )}
              >
                <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', cfg.iconBg)}>
                  <AlertTriangle className={cn('w-4 h-4', cfg.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={cn('text-sm font-semibold', alert.read ? 'text-[color:var(--text-secondary)]' : 'text-[color:var(--text-primary)]')}>{alert.title}</p>
                      <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{alert.desc}</p>
                    </div>
                    <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <Link href={alert.category === 'expiry' ? '/dashboard/lotes' : '/dashboard/produtos'} className="text-[11px] text-[color:var(--brand)] hover:underline">
                      {alert.category === 'expiry' ? 'Ver lotes →' : 'Ver produtos →'}
                    </Link>
                    {!alert.read && (
                      <button onClick={() => markRead(alert.id)} className="text-[11px] text-[color:var(--brand)] hover:underline">Marcar como lido</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
