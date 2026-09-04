'use client'
import { useState } from 'react'
import { Search, ShieldCheck, Edit, Plus, Trash2, Eye, Filter } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Pagination } from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { mockAuditLogs } from '@/mocks/users'
import { USER_ROLE_LABELS } from '@/constants/status'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'

const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; variant: 'success'|'warning'|'danger'|'info' }> = {
  CREATE: { icon: Plus,    label: 'Criação',  variant: 'success' },
  UPDATE: { icon: Edit,    label: 'Edição',   variant: 'warning' },
  DELETE: { icon: Trash2,  label: 'Exclusão', variant: 'danger' },
  VIEW:   { icon: Eye,     label: 'Consulta', variant: 'info' },
}

const PER_PAGE = 6

export default function AuditoriaPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = mockAuditLogs.filter(log =>
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.entity.toLowerCase().includes(search.toLowerCase()) ||
    log.entityName.toLowerCase().includes(search.toLowerCase())
  )

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Administração' }, { label: 'Auditoria' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Auditoria do Sistema</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Histórico completo de todas as ações realizadas</p>
        </div>
        <Button variant="outline" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>Filtros avançados</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Buscar por usuário, entidade…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
          <option>Todas as ações</option>
          {Object.entries(ACTION_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
      </div>

      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Ação', 'Entidade', 'Registro', 'Modificações', 'Usuário', 'Perfil', 'IP', 'Data/Hora'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhum registro encontrado.</td></tr>
            )}
            {paginated.map(log => {
              const actionCfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG.VIEW
              const Icon = actionCfg.icon
              return (
                <tr key={log.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-7 h-7 rounded-[var(--radius-md)] flex items-center justify-center',
                        actionCfg.variant === 'success' ? 'bg-[color:var(--success-subtle)] text-[color:var(--success)]'
                        : actionCfg.variant === 'warning' ? 'bg-[color:var(--warning-subtle)] text-[color:var(--warning)]'
                        : actionCfg.variant === 'danger' ? 'bg-[color:var(--danger-subtle)] text-[color:var(--danger)]'
                        : 'bg-[color:var(--info-subtle)] text-[color:var(--info)]'
                      )}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <Badge variant={actionCfg.variant} size="sm">{actionCfg.label}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs bg-[color:var(--bg-muted)] px-2 py-1 rounded font-mono text-[color:var(--text-secondary)]">{log.entity}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-[color:var(--text-primary)] truncate max-w-[150px] block">{log.entityName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-xs space-y-0.5 max-w-[180px]">
                      {log.oldValue && <p className="text-[color:var(--danger)]">− {JSON.stringify(log.oldValue).slice(0, 40)}</p>}
                      {log.newValue && <p className="text-[color:var(--success)]">+ {JSON.stringify(log.newValue).slice(0, 40)}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={log.userName} size="xs" />
                      <span className="text-sm text-[color:var(--text-primary)]">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[color:var(--text-secondary)]">{USER_ROLE_LABELS[log.userRole] ?? log.userRole}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-[color:var(--text-tertiary)]">{log.ip}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[color:var(--text-tertiary)]">{formatDateTime(log.createdAt)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 py-4 border-t border-[color:var(--border)]">
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PER_PAGE)} total={filtered.length} perPage={PER_PAGE} onPage={setPage} />
        </div>
      </div>
    </div>
  )
}
