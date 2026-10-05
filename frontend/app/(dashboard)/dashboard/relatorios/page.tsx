'use client'

import { useState } from 'react'
import {
  FileBarChart, Download, FileText, BarChart3, Package,
  ArrowDownToLine, ArrowUpFromLine, Layers, Users,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const REPORTS = [
  { id: 'stock', endpoint: '/reports/stock', icon: Package, label: 'Posição de Estoque', desc: 'Estoque atual por produto e categoria', popular: true },
  { id: 'entries', endpoint: '/reports/movements', icon: ArrowDownToLine, label: 'Entradas por Período', desc: 'Entradas agrupadas pelo período escolhido' },
  { id: 'exits', endpoint: '/reports/movements', icon: ArrowUpFromLine, label: 'Saídas por Período', desc: 'Saídas agrupadas pelo período escolhido' },
  { id: 'movements', endpoint: '/reports/movements', icon: BarChart3, label: 'Movimentações', desc: 'Movimentações agrupadas por tipo e produto' },
  { id: 'lots', endpoint: '/reports/lots', icon: Layers, label: 'Validade de Lotes', desc: 'Lotes vencidos, próximos do vencimento e em quarentena', popular: true },
  { id: 'abc', endpoint: '/reports/abc', icon: FileBarChart, label: 'Curva ABC', desc: 'Classificação ABC por valor de movimentação' },
  { id: 'inventory', endpoint: '/reports/inventory', icon: FileText, label: 'Inventário', desc: 'Inventários e divergências registradas' },
  { id: 'suppliers', endpoint: '/reports/suppliers', icon: Users, label: 'Por Fornecedor', desc: 'Entradas e valor por fornecedor' },
]

type ReportRow = Record<string, unknown>
type ReportResponse = Record<string, unknown>

function reportRows(id: string, report: ReportResponse): ReportRow[] {
  if (id === 'stock') return (report.products as ReportRow[]) ?? []
  if (id === 'entries' || id === 'exits') {
    const types = (report.byType as ReportRow[]) ?? []
    return types.filter((item) => item.type === (id === 'entries' ? 'entry' : 'exit'))
  }
  if (id === 'movements') return (report.byType as ReportRow[]) ?? []
  if (id === 'lots') {
    return [
      ...((report.expired as ReportRow[]) ?? []).map((lot) => ({ ...lot, reportStatus: 'expired' })),
      ...((report.expiringSoon as ReportRow[]) ?? []).map((lot) => ({ ...lot, reportStatus: 'expiring soon' })),
      ...((report.quarantine as ReportRow[]) ?? []).map((lot) => ({ ...lot, reportStatus: 'quarantine' })),
    ]
  }
  if (id === 'abc') return [...((report.A as ReportRow[]) ?? []), ...((report.B as ReportRow[]) ?? []), ...((report.C as ReportRow[]) ?? [])]
  if (id === 'inventory') return (report.counts as ReportRow[]) ?? []
  if (id === 'suppliers') return (report.suppliers as ReportRow[]) ?? []
  return []
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const normalized = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${normalized.replaceAll('"', '""')}"`
}

function exportCsv(rows: ReportRow[], name: string): void {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))]
  const content = [
    columns.map(csvValue).join(';'),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(';')),
  ].join('\n')
  const url = URL.createObjectURL(new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [generating, setGenerating] = useState(false)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [summary, setSummary] = useState<ReportRow | null>(null)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    const selected = REPORTS.find((report) => report.id === selectedReport)
    if (!selected) return
    setGenerating(true)
    setError('')
    try {
      const params = selectedReport === 'lots'
        ? { days: 90 }
        : {
            from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
            to: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : undefined,
          }
      const report = await api.get<ReportResponse>(selected.endpoint, params)
      const resultRows = reportRows(selectedReport, report)
      setRows(resultRows)
      setSummary((report.summary as ReportRow | undefined) ?? null)
      exportCsv(resultRows, selected.label.toLowerCase().replaceAll(' ', '-'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao gerar relatório')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Relatórios' }]} />
      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Relatórios</h1>
        <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)]">Consulte dados persistidos e exporte o resultado em CSV</p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Selecione o relatório</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REPORTS.map((report) => {
              const Icon = report.icon
              return (
                <button
                  key={report.id}
                  onClick={() => { setSelectedReport(report.id); setRows([]); setSummary(null); setError('') }}
                  className={cn(
                    'flex items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all',
                    selectedReport === report.id
                      ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] shadow-md'
                      : 'border-[color:var(--border)] bg-[color:var(--bg-base)] hover:shadow-sm',
                  )}
                >
                  <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)]', selectedReport === report.id ? 'bg-[color:var(--brand)] text-white' : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-semibold', selectedReport === report.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-primary)]')}>{report.label}</p>
                      {report.popular && <Badge variant="brand" size="sm">Popular</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{report.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {rows.length > 0 && (
            <Card padding={false}>
              <CardHeader className="p-5 pb-3">
                <CardTitle description={`${formatNumber(rows.length)} linhas disponíveis para exportação`}>Prévia do Relatório</CardTitle>
                <Badge variant="success" size="sm" dot>Dados da API</Badge>
              </CardHeader>
              {summary && <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 pb-4 text-xs text-[color:var(--text-secondary)]">
                {Object.entries(summary).map(([key, value]) => <span key={key}><strong className="capitalize">{key.replaceAll('_', ' ')}:</strong> {typeof value === 'number' ? (key.toLowerCase().includes('value') ? formatCurrency(value) : formatNumber(value)) : String(value)}</span>)}
              </div>}
              <div className="overflow-x-auto border-t border-[color:var(--border)]">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-[color:var(--border)]">{Object.keys(rows[0]).slice(0, 5).map((key) => <th key={key} className="px-4 py-2 text-left capitalize text-[color:var(--text-tertiary)]">{key}</th>)}</tr></thead>
                  <tbody>{rows.slice(0, 5).map((row, index) => <tr key={index} className="border-b border-[color:var(--border)] last:border-0">{Object.keys(rows[0]).slice(0, 5).map((key) => <td key={key} className="max-w-[220px] truncate px-4 py-2">{typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] ?? '—')}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Configurações</CardTitle></CardHeader>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[color:var(--text-primary)]">Período</p>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Data inicial" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 min-w-0 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2 text-xs text-[color:var(--text-primary)]" />
                  <input aria-label="Data final" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 min-w-0 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] px-2 text-xs text-[color:var(--text-primary)]" />
                </div>
                {selectedReport === 'lots' && <p className="mt-1 text-[10px] text-[color:var(--text-tertiary)]">O relatório de lotes considera os próximos 90 dias.</p>}
              </div>
              <Button className="w-full" disabled={!selectedReport} loading={generating} leftIcon={<Download className="h-3.5 w-3.5" />} onClick={handleGenerate}>
                {generating ? 'Consultando…' : 'Consultar e exportar CSV'}
              </Button>
              {!selectedReport && <p className="text-center text-xs text-[color:var(--text-tertiary)]">Selecione um relatório para consultar</p>}
              {error && <p role="alert" className="text-xs text-[color:var(--danger)]">{error}</p>}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Formato disponível</CardTitle></CardHeader>
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[color:var(--bg-subtle)] p-3">
              <FileText className="h-4 w-4 text-[color:var(--text-tertiary)]" />
              <div><p className="text-xs font-medium text-[color:var(--text-primary)]">CSV</p><p className="text-[10px] text-[color:var(--text-tertiary)]">Compatível com planilhas</p></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
