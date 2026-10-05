'use client'

import { useEffect, useState } from 'react'
import { Search, Download, Plus, Pencil, Trash2, Eye, Shield, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
interface AuditRecord {
  id: string
  action: string
  entity: string
  entityName: string | null
  entityId: string | null
  userId: string
  ipAddress: string | null
  createdAt: string
  user: { id: string; name: string; role: string } | null
}
interface AuditResponse {
  data: AuditRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const ACTION_CONFIG: Record<AuditAction, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: typeof Plus }> = {
  CREATE: { label: 'Criou', variant: 'success', icon: Plus },
  UPDATE: { label: 'Editou', variant: 'warning', icon: Pencil },
  DELETE: { label: 'Removeu', variant: 'danger', icon: Trash2 },
  VIEW: { label: 'Visualizou', variant: 'default', icon: Eye },
}

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'CREATE', label: 'Criou' },
  { value: 'UPDATE', label: 'Editou' },
  { value: 'DELETE', label: 'Removeu' },
  { value: 'VIEW', label: 'Visualizou' },
]

export default function AuditoriaPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [requestResult, setRequestResult] = useState<{ key: string; data?: AuditResponse; error?: string } | null>(null)
  const requestKey = JSON.stringify([page, search, action, dateFrom, dateTo])
  const loading = requestResult?.key !== requestKey
  const result = requestResult?.key === requestKey ? requestResult.data ?? null : null
  const error = requestResult?.key === requestKey ? requestResult.error ?? '' : ''

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search.trim()) params.set('search', search.trim())
    if (action) params.set('action', action)
    if (dateFrom) params.set('from', new Date(`${dateFrom}T00:00:00`).toISOString())
    if (dateTo) params.set('to', new Date(`${dateTo}T23:59:59.999`).toISOString())
    api.get<AuditResponse>(`/audit?${params.toString()}`)
      .then((data) => { if (active) setRequestResult({ key: requestKey, data }) })
      .catch((err: unknown) => {
        if (active) setRequestResult({ key: requestKey, error: err instanceof Error ? err.message : 'Falha ao carregar auditoria' })
      })
    return () => { active = false }
  }, [page, search, action, dateFrom, dateTo, requestKey])

  const exportCsv = () => {
    const rows = result?.data ?? []
    const csv = [
      ['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Registro', 'IP'],
      ...rows.map((log) => [
        formatDateTime(log.createdAt),
        log.user?.name ?? 'Usuário removido',
        ACTION_CONFIG[log.action as AuditAction]?.label ?? log.action,
        log.entity,
        log.entityName ?? log.entityId ?? '',
        log.ipAddress ?? '',
      ]),
    ].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }))
    link.download = 'auditoria.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Sistema' }, { label: 'Auditoria' }]} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Auditoria</h1>
          <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">Histórico persistido de operações do sistema</p>
        </div>
        <button onClick={exportCsv} disabled={!result?.data.length} className="inline-flex items-center gap-2 self-start rounded-[var(--radius-md)] border border-[color:var(--border)] px-3 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--bg-muted)] disabled:opacity-50">
          <Download className="h-4 w-4" /> Exportar página CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Input placeholder="Buscar usuário, ação ou registro…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} leftIcon={<Search className="h-4 w-4" />} />
        </div>
        <Select value={action} onChange={(event) => { setAction(event.target.value); setPage(1) }} options={ACTION_OPTIONS} />
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
          <input type="date" aria-label="Data inicial" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1) }} className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2 py-2 text-xs text-[color:var(--text-primary)]" />
          <input type="date" aria-label="Data final" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1) }} className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2 py-2 text-xs text-[color:var(--text-primary)]" />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--info)]/20 bg-[color:var(--info-subtle)] px-4 py-2.5 text-xs text-[color:var(--info)]">
        <Shield className="h-4 w-4 shrink-0" />
        <span>Os registros de auditoria são permanentes e não podem ser alterados pelos usuários.</span>
      </div>
      {error && <p role="alert" className="text-sm text-[color:var(--danger)]">{error}</p>}

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--bg-base)] shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Data/Hora', 'Usuário', 'Ação', 'Entidade', 'Registro', 'IP'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{heading}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--text-tertiary)]">Carregando auditoria…</td></tr>}
            {!loading && result?.data.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[color:var(--text-tertiary)]">Nenhum registro encontrado.</td></tr>}
            {!loading && result?.data.map((log) => {
              const config = ACTION_CONFIG[log.action as AuditAction]
              const Icon = config?.icon ?? Eye
              return (
                <tr key={log.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)]">
                  <td className="whitespace-nowrap px-4 py-3.5 text-xs text-[color:var(--text-secondary)]">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[color:var(--text-primary)]">{log.user?.name ?? 'Usuário removido'}</p>
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{log.user?.role ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3.5"><Badge variant={config?.variant ?? 'default'} size="sm"><Icon className="mr-1 h-3 w-3" />{config?.label ?? log.action}</Badge></td>
                  <td className="px-4 py-3.5 text-xs font-medium capitalize">{log.entity}</td>
                  <td className="max-w-[220px] truncate px-4 py-3.5 text-xs text-[color:var(--text-secondary)]">{log.entityName ?? log.entityId ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-[10px] text-[color:var(--text-tertiary)]">{log.ipAddress ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[color:var(--border)] px-4 py-3 text-xs text-[color:var(--text-secondary)]">
          <span>{result ? `${result.total} registros · Página ${result.page} de ${Math.max(1, result.totalPages)}` : ''}</span>
          <div className="flex gap-1">
            <button aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)} className={cn('rounded p-1.5 hover:bg-[color:var(--bg-muted)] disabled:opacity-40')}><ChevronLeft className="h-4 w-4" /></button>
            <button aria-label="Próxima página" disabled={!result || page >= result.totalPages || loading} onClick={() => setPage((current) => current + 1)} className="rounded p-1.5 hover:bg-[color:var(--bg-muted)] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
