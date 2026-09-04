'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Filter, ArrowDownToLine, FileText,
  Package, ChevronDown, Download,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/StatCard'
import { mockMovements } from '@/mocks/movements'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'

const entries = mockMovements.filter(m => m.type === 'entry')

export default function EntradasPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)

  const totalValue = entries.reduce((acc, m) => acc + m.totalValue, 0)
  const totalQty = entries.reduce((acc, m) => acc + m.quantity, 0)

  const filtered = entries.filter(m =>
    m.productName.toLowerCase().includes(search.toLowerCase()) ||
    m.productCode.toLowerCase().includes(search.toLowerCase()) ||
    (m.invoiceNumber ?? '').includes(search)
  )

  if (showForm) return <NovaEntradaForm onBack={() => setShowForm(false)} />

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Movimentações' }, { label: 'Entradas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Entradas de Estoque</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{entries.length} entradas registradas hoje</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>Exportar</Button>
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>Nova Entrada</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Entradas Hoje" value={entries.length} sub="movimentos" icon={<ArrowDownToLine className="w-4 h-4" />} variant="success" />
        <StatCard label="Unidades Recebidas" value={formatNumber(totalQty)} sub="unidades" icon={<Package className="w-4 h-4" />} />
        <StatCard label="Valor Total" value={formatCurrency(totalValue)} sub="em entradas hoje" icon={<FileText className="w-4 h-4" />} variant="info" />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Buscar produto, código, NF…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <Button variant="outline" size="md" leftIcon={<Filter className="w-3.5 h-3.5" />} rightIcon={<ChevronDown className="w-3.5 h-3.5" />}>
          Filtrar
        </Button>
      </div>

      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Produto', 'Código', 'Qtd', 'Custo Unit.', 'Total', 'NF / Lote', 'Fornecedor', 'Operador', 'Data/Hora'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-sm text-[color:var(--text-tertiary)]">
                  Nenhuma entrada encontrada.
                </td>
              </tr>
            )}
            {filtered.map(m => (
              <tr key={m.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[color:var(--success-subtle)] flex items-center justify-center">
                      <ArrowDownToLine className="w-3.5 h-3.5 text-[color:var(--success)]" />
                    </div>
                    <span className="font-medium text-[color:var(--text-primary)] truncate max-w-[160px]">{m.productName}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className="font-mono text-xs text-[color:var(--text-tertiary)]">{m.productCode}</span></td>
                <td className="px-5 py-3.5"><span className="font-semibold text-[color:var(--success)]">+{formatNumber(m.quantity)}</span></td>
                <td className="px-5 py-3.5"><span className="text-[color:var(--text-primary)]">{formatCurrency(m.unitCost)}</span></td>
                <td className="px-5 py-3.5"><span className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(m.totalValue)}</span></td>
                <td className="px-5 py-3.5">
                  <div>
                    {m.invoiceNumber && <p className="text-xs font-medium text-[color:var(--text-primary)]">{m.invoiceNumber}</p>}
                    {m.lotNumber && <p className="text-xs text-[color:var(--text-tertiary)]">Lote: {m.lotNumber}</p>}
                  </div>
                </td>
                <td className="px-5 py-3.5"><span className="text-[color:var(--text-secondary)] text-xs">{m.supplierName ?? '—'}</span></td>
                <td className="px-5 py-3.5"><span className="text-[color:var(--text-secondary)]">{m.userName}</span></td>
                <td className="px-5 py-3.5"><span className="text-xs text-[color:var(--text-tertiary)]">{formatDateTime(m.createdAt)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NovaEntradaForm({ onBack }: { onBack: () => void }) {
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState([{ product: '', qty: '', cost: '' }])

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    setSaving(false)
    onBack()
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Breadcrumb items={[{ label: 'Entradas', href: '/dashboard/entradas' }, { label: 'Nova Entrada' }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Nova Entrada de Estoque</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
          <Button size="sm" leftIcon={<ArrowDownToLine className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
            {saving ? 'Registrando…' : 'Registrar Entrada'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Dados da Nota Fiscal</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Número da NF *" placeholder="NF-2026-00001" />
              <Input label="Data de Emissão" type="date" />
              <div className="col-span-2">
                <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Fornecedor *</label>
                <select className="w-full h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]">
                  <option value="">Selecione o fornecedor</option>
                  <option>TechDistrib Ltda</option>
                  <option>EPI Brasil S.A.</option>
                  <option>QuimiNorte Distribuidora</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Controle de Lote</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Número do Lote" placeholder="LOT-2026-001" />
              <Input label="Data de Fabricação" type="date" />
              <Input label="Data de Validade" type="date" className="col-span-2" />
            </div>
          </div>
        </div>

        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Itens da Entrada</h3>
            <Button variant="ghost" size="xs" leftIcon={<Plus className="w-3 h-3" />}
              onClick={() => setItems(i => [...i, { product: '', qty: '', cost: '' }])}>
              Adicionar item
            </Button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                <div className="col-span-3">
                  <input className="w-full h-8 px-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-xs text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]" placeholder="Produto" />
                </div>
                <input className="h-8 px-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-xs text-center text-[color:var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]" placeholder="Qtd" type="number" />
                <input className="h-8 px-2 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-xs text-[color:var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[color:var(--brand)]" placeholder="R$ 0,00" />
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[color:var(--border)] flex items-center justify-between">
            <span className="text-sm text-[color:var(--text-secondary)]">Total da entrada:</span>
            <span className="text-lg font-bold text-[color:var(--text-primary)]">R$ 0,00</span>
          </div>
          <Input label="Observações" placeholder="Observações sobre a entrada…" />
        </div>
      </div>
    </div>
  )
}
