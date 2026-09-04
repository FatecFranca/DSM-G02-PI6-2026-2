'use client'
import { useState } from 'react'
import { Plus, Search, ArrowUpFromLine, Package, DollarSign, Download } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { Select } from '@/components/ui/Select'
import { mockMovements } from '@/mocks/movements'
import { EXIT_REASON_LABELS } from '@/constants/status'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'

const exits = mockMovements.filter(m => m.type === 'exit' || m.type === 'loss' || m.type === 'transfer')

const EXIT_REASONS = [
  { value: 'sale', label: 'Venda' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'loss', label: 'Perda' },
  { value: 'break', label: 'Quebra' },
  { value: 'internal', label: 'Consumo Interno' },
]

const REASON_VARIANT: Record<string, 'success' | 'info' | 'danger' | 'warning' | 'default'> = {
  sale: 'success', transfer: 'info', loss: 'danger', break: 'danger', internal: 'warning',
}

export default function SaidasPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const totalValue = exits.reduce((acc, m) => acc + m.totalValue, 0)
  const totalQty = exits.reduce((acc, m) => acc + m.quantity, 0)
  const filtered = exits.filter(m =>
    m.productName.toLowerCase().includes(search.toLowerCase()) ||
    m.productCode.toLowerCase().includes(search.toLowerCase())
  )

  if (showForm) return <NovaSaidaForm onBack={() => setShowForm(false)} reasons={EXIT_REASONS} />

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Saídas' }]} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Saídas de Estoque</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{exits.length} saídas registradas hoje</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>Exportar</Button>
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>Nova Saída</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Saídas Hoje" value={exits.length} sub="movimentos" icon={<ArrowUpFromLine className="w-4 h-4" />} variant="danger" />
        <StatCard label="Unidades Expedidas" value={formatNumber(totalQty)} sub="unidades" icon={<Package className="w-4 h-4" />} />
        <StatCard label="Valor Total" value={formatCurrency(totalValue)} sub="em saídas hoje" icon={<DollarSign className="w-4 h-4" />} variant="info" />
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar produto, código…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Produto', 'Código', 'Qtd', 'Valor Unit.', 'Total', 'Motivo', 'Destino', 'Operador', 'Data/Hora'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">Nenhuma saída encontrada.</td></tr>
            )}
            {filtered.map(m => {
              const reason = m.exitReason ?? (m.type === 'transfer' ? 'transfer' : 'loss')
              return (
                <tr key={m.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[color:var(--danger-subtle)] flex items-center justify-center">
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-[color:var(--danger)]" />
                      </div>
                      <span className="font-medium text-[color:var(--text-primary)] truncate max-w-[140px]">{m.productName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><span className="font-mono text-xs text-[color:var(--text-tertiary)]">{m.productCode}</span></td>
                  <td className="px-5 py-3.5"><span className="font-semibold text-[color:var(--danger)]">−{formatNumber(m.quantity)}</span></td>
                  <td className="px-5 py-3.5"><span className="text-[color:var(--text-primary)]">{formatCurrency(m.unitCost)}</span></td>
                  <td className="px-5 py-3.5"><span className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(m.totalValue)}</span></td>
                  <td className="px-5 py-3.5">
                    <Badge variant={REASON_VARIANT[reason] ?? 'default'} size="sm">
                      {EXIT_REASON_LABELS[reason] ?? reason}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-secondary)]">{m.customerName ?? '—'}</span></td>
                  <td className="px-5 py-3.5"><span className="text-[color:var(--text-secondary)]">{m.userName}</span></td>
                  <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-tertiary)]">{formatDateTime(m.createdAt)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NovaSaidaForm({ onBack, reasons }: { onBack: () => void; reasons: { value: string; label: string }[] }) {
  const [saving, setSaving] = useState(false)
  const handleSave = async () => { setSaving(true); await new Promise(r => setTimeout(r, 1000)); setSaving(false); onBack() }
  return (
    <div className="space-y-5 max-w-3xl">
      <Breadcrumb items={[{ label: 'Saídas', href: '/dashboard/saidas' }, { label: 'Nova Saída' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Nova Saída de Estoque</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
          <Button size="sm" leftIcon={<ArrowUpFromLine className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
            {saving ? 'Registrando…' : 'Registrar Saída'}
          </Button>
        </div>
      </div>
      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select label="Motivo da Saída *" options={reasons} placeholder="Selecione o motivo" />
          <Select label="Produto *" options={[{ value: '1', label: 'Cabo HDMI 2.0 2m' }, { value: '2', label: 'Luva de Segurança CA' }]} placeholder="Selecione o produto" />
          <Input label="Quantidade *" type="number" placeholder="0" />
          <Input label="Cliente / Destino" placeholder="Nome do cliente ou setor" />
          <div className="col-span-2">
            <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Observações</label>
            <textarea rows={3} className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none" placeholder="Detalhes da saída, observações…" />
          </div>
        </div>
      </div>
    </div>
  )
}
