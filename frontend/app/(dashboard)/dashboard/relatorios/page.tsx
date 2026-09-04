'use client'
import { useState } from 'react'
import {
  FileBarChart, Download, FileText, BarChart3, Package,
  ArrowDownToLine, ArrowUpFromLine, Layers, Users, Calendar,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { stockEvolutionData } from '@/mocks/dashboard'
import { cn } from '@/lib/cn'

const REPORTS = [
  { id: 'stock', icon: Package, label: 'Posição de Estoque', desc: 'Estoque atual por produto e categoria', popular: true },
  { id: 'entries', icon: ArrowDownToLine, label: 'Entradas por Período', desc: 'Relatório de todas as entradas' },
  { id: 'exits', icon: ArrowUpFromLine, label: 'Saídas por Período', desc: 'Relatório de todas as saídas' },
  { id: 'movements', icon: BarChart3, label: 'Movimentações', desc: 'Histórico completo de movimentações' },
  { id: 'lots', icon: Layers, label: 'Validade de Lotes', desc: 'Lotes por vencimento e status', popular: true },
  { id: 'abc', icon: FileBarChart, label: 'Curva ABC', desc: 'Classificação ABC por valor' },
  { id: 'inventory', icon: FileText, label: 'Inventário', desc: 'Resultado de contagens e divergências' },
  { id: 'suppliers', icon: Users, label: 'Por Fornecedor', desc: 'Compras e performance de fornecedores' },
]

const FORMATS = ['PDF', 'Excel', 'CSV']

export default function RelatoriosPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [format, setFormat] = useState('PDF')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    await new Promise(r => setTimeout(r, 1500))
    setGenerating(false)
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Relatórios' }]} />

      <div>
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Relatórios</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Gere e exporte relatórios detalhados em PDF, Excel ou CSV</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Report picker */}
        <div className="xl:col-span-2 space-y-3">
          <p className="text-sm font-semibold text-[color:var(--text-primary)]">Selecione o relatório</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REPORTS.map(r => {
              const Icon = r.icon
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReport(r.id)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border text-left transition-all',
                    selectedReport === r.id
                      ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)] shadow-md'
                      : 'bg-[color:var(--bg-base)] border-[color:var(--border)] hover:shadow-sm'
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 transition-colors',
                    selectedReport === r.id ? 'bg-[color:var(--brand)] text-white' : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]'
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('text-sm font-semibold', selectedReport === r.id ? 'text-[color:var(--brand)]' : 'text-[color:var(--text-primary)]')}>{r.label}</p>
                      {r.popular && <Badge variant="brand" size="sm">Popular</Badge>}
                    </div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{r.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Preview chart */}
          {selectedReport && (
            <Card padding={false} className="mt-2 animate-fade-in">
              <CardHeader className="p-5 pb-3">
                <CardTitle description="Pré-visualização dos dados">Prévia do Relatório</CardTitle>
                <Badge variant="success" size="sm" dot>Dados atualizados</Badge>
              </CardHeader>
              <div className="h-[200px] px-5 pb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockEvolutionData.slice(0, 6)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="entries" fill="#2563eb" radius={[4, 4, 0, 0]} name="Entradas" />
                    <Bar dataKey="exits" fill="#0891b2" radius={[4, 4, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Config panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)] mb-2">Período</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
                  <input type="date" className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-[color:var(--text-primary)] mb-2">Formato de exportação</p>
                <div className="flex gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        'flex-1 py-2 text-sm font-semibold rounded-[var(--radius-md)] border transition-all',
                        format === f
                          ? 'bg-[color:var(--brand)] text-white border-[color:var(--brand)]'
                          : 'border-[color:var(--border)] text-[color:var(--text-secondary)] hover:border-[color:var(--brand-muted)]'
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!selectedReport}
                loading={generating}
                leftIcon={<Download className="w-3.5 h-3.5" />}
                onClick={handleGenerate}
              >
                {generating ? 'Gerando…' : `Exportar ${format}`}
              </Button>
              {!selectedReport && (
                <p className="text-xs text-center text-[color:var(--text-tertiary)]">Selecione um relatório para exportar</p>
              )}
            </div>
          </Card>

          {/* Recent exports */}
          <Card>
            <CardHeader>
              <CardTitle>Exportações Recentes</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {[
                { name: 'Posição de Estoque', format: 'PDF', date: '29/06/2026' },
                { name: 'Entradas Jun/26', format: 'Excel', date: '28/06/2026' },
                { name: 'Curva ABC', format: 'CSV', date: '25/06/2026' },
              ].map((e, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)] transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[color:var(--text-primary)] truncate">{e.name}</p>
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">{e.date}</p>
                  </div>
                  <Badge variant="default" size="sm">{e.format}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
