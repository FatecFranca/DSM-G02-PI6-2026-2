'use client'
import {
  BrainCircuit, TrendingDown, TrendingUp, AlertTriangle,
  ShoppingCart, Lightbulb, BarChart3, Calendar, Zap,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const demandData = [
  { month: 'Jan', real: 420, forecast: 440 },
  { month: 'Fev', real: 380, forecast: 390 },
  { month: 'Mar', real: 510, forecast: 500 },
  { month: 'Abr', real: 460, forecast: 470 },
  { month: 'Mai', real: 580, forecast: 560 },
  { month: 'Jun', real: 620, forecast: 610 },
  { month: 'Jul', real: null, forecast: 660 },
  { month: 'Ago', real: null, forecast: 710 },
  { month: 'Set', real: null, forecast: 740 },
]

const INSIGHTS = [
  { type: 'warning', icon: TrendingDown, title: 'Risco de Ruptura em 12 dias', desc: 'Extintor PQS 4Kg e Álcool 70% têm alta demanda prevista e estoque crítico.', action: 'Comprar agora' },
  { type: 'success', icon: TrendingUp, title: 'Crescimento: Baterias 18650', desc: '+21% de saídas no último mês. Considere aumentar o estoque mínimo.', action: 'Ajustar mínimo' },
  { type: 'info', icon: ShoppingCart, title: 'Sugestão de compra gerada', desc: '8 produtos precisam de reposição esta semana para evitar ruptura.', action: 'Ver lista' },
  { type: 'warning', icon: AlertTriangle, title: 'Sazonalidade detectada', desc: 'Categoria EPI tem pico histórico em julho. Antecipe compras.', action: 'Planejar' },
]

const INSIGHT_STYLES = {
  warning: { border: 'border-l-[color:var(--warning)]', iconBg: 'bg-[color:var(--warning-subtle)]', iconColor: 'text-[color:var(--warning)]' },
  success: { border: 'border-l-[color:var(--success)]', iconBg: 'bg-[color:var(--success-subtle)]', iconColor: 'text-[color:var(--success)]' },
  info:    { border: 'border-l-[color:var(--info)]',    iconBg: 'bg-[color:var(--info-subtle)]',    iconColor: 'text-[color:var(--info)]' },
}

const TOP_SUGGESTIONS = [
  { product: 'Extintor PQS 4Kg ABC', qty: 10, urgency: 'Urgente', reason: 'Ruptura em 3 dias' },
  { product: 'Álcool 70% INPM 1L', qty: 300, urgency: 'Alta', reason: 'Estoque zerado' },
  { product: 'Luva Segurança CA M', qty: 100, urgency: 'Alta', reason: 'Abaixo do mínimo' },
  { product: 'Lâmpada LED E27 9W', qty: 50, urgency: 'Média', reason: 'Estoque crítico' },
  { product: 'Bateria 18650 3.7V', qty: 200, urgency: 'Média', reason: 'Pico de demanda previsto' },
]

const URGENCY_VARIANTS: Record<string, 'danger'|'warning'|'default'> = {
  'Urgente': 'danger', 'Alta': 'warning', 'Média': 'default',
}

const abcXyzData = [
  { product: 'Cabo HDMI 2.0', abc: 'A', xyz: 'X', giro: 42, value: 98 },
  { product: 'Luva Seg. CA', abc: 'A', xyz: 'Y', giro: 31, value: 87 },
  { product: 'Álcool 70%', abc: 'B', xyz: 'X', giro: 28, value: 62 },
  { product: 'Fita Isolante', abc: 'C', xyz: 'Z', giro: 8, value: 15 },
  { product: 'Extintor PQS', abc: 'B', xyz: 'Y', giro: 18, value: 44 },
]

export default function IAAnaliticaPage() {
  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'IA Analítica' }]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">IA Analítica</h1>
            <Badge variant="brand" size="sm"><BrainCircuit className="w-3 h-3 mr-1" />Powered by AI</Badge>
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)]">Previsões, insights e recomendações geradas automaticamente pela IA</p>
        </div>
        <Button size="sm" variant="outline" leftIcon={<Zap className="w-3.5 h-3.5" />}>Atualizar análise</Button>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {INSIGHTS.map((ins, i) => {
          const style = INSIGHT_STYLES[ins.type as keyof typeof INSIGHT_STYLES]
          const Icon = ins.icon
          return (
            <div key={i} className={cn('bg-[color:var(--bg-base)] border border-[color:var(--border)] border-l-4 rounded-[var(--radius-lg)] p-4 flex items-start gap-3 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow', style.border)}>
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', style.iconBg)}>
                <Icon className={cn('w-4 h-4', style.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{ins.title}</p>
                <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">{ins.desc}</p>
              </div>
              <Button size="xs" variant="ghost" className="flex-shrink-0">{ins.action} →</Button>
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Demand forecast */}
        <Card padding={false}>
          <CardHeader className="p-5 pb-3">
            <CardTitle description="Real vs Previsto pela IA">Previsão de Demanda</CardTitle>
            <Badge variant="brand" size="sm">Jul–Set previsto</Badge>
          </CardHeader>
          <div className="h-[220px] px-5 pb-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} formatter={v => v === 'real' ? 'Real' : 'Previsto (IA)'} />
                <Line type="monotone" dataKey="real" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" stroke="#7c3aed" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ABC/XYZ matrix */}
        <Card>
          <CardHeader>
            <CardTitle description="Classificação de valor e variabilidade">Matriz ABC × XYZ</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)]">
                  {['Produto', 'ABC', 'XYZ', 'Giro', 'Valor'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {abcXyzData.map((row, i) => (
                  <tr key={i} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                    <td className="px-3 py-2.5 text-xs font-medium text-[color:var(--text-primary)] max-w-[120px] truncate">{row.product}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs text-white', row.abc === 'A' ? 'bg-[color:var(--brand)]' : row.abc === 'B' ? 'bg-[color:var(--info)]' : 'bg-[color:var(--text-tertiary)]')}>
                        {row.abc}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('w-6 h-6 inline-flex items-center justify-center rounded font-bold text-xs text-white', row.xyz === 'X' ? 'bg-[color:var(--success)]' : row.xyz === 'Y' ? 'bg-[color:var(--warning)]' : 'bg-[color:var(--danger)]')}>
                        {row.xyz}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[color:var(--brand)] rounded-full" style={{ width: `${row.giro}%` }} />
                        </div>
                        <span className="text-xs text-[color:var(--text-tertiary)]">{row.giro}×</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-14 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[color:var(--success)] rounded-full" style={{ width: `${row.value}%` }} />
                        </div>
                        <span className="text-xs text-[color:var(--text-tertiary)]">{row.value}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Purchase suggestions */}
      <Card>
        <CardHeader>
          <CardTitle description="Lista gerada pela IA com base em demanda e estoque">Sugestões de Compra</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">{TOP_SUGGESTIONS.length} produtos</Badge>
            <Button size="sm" variant="outline" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>Gerar Pedido</Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Produto', 'Qtd Sugerida', 'Urgência', 'Motivo', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TOP_SUGGESTIONS.map((s, i) => (
                <tr key={i} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                        <ShoppingCart className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                      </div>
                      <span className="font-medium text-[color:var(--text-primary)]">{s.product}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-[color:var(--text-primary)]">{s.qty} un</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={URGENCY_VARIANTS[s.urgency]} size="sm" dot>{s.urgency}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-[color:var(--text-secondary)]">{s.reason}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="xs" variant="outline">Incluir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
