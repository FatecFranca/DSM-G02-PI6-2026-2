'use client'
import { useState } from 'react'
import { Plus, Search, Eye, Edit, Users, Mail, Phone, MapPin, ShoppingCart, DollarSign } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { mockCustomers } from '@/mocks/products'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function ClientesPage() {
  const [search, setSearch] = useState('')

  const filtered = mockCustomers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tradeName.toLowerCase().includes(search.toLowerCase()) ||
    c.cnpj.includes(search)
  )

  const totalValue = mockCustomers.reduce((acc, c) => acc + c.totalValue, 0)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Clientes' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Clientes</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{mockCustomers.length} clientes · {formatCurrency(totalValue)} em pedidos</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Cliente</Button>
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar por nome, CNPJ…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              {['Cliente', 'CNPJ', 'Contato', 'Localidade', 'Pedidos', 'Total', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors group">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={c.tradeName} size="sm" />
                    <div>
                      <p className="font-semibold text-[color:var(--text-primary)] whitespace-nowrap">{c.tradeName}</p>
                      <p className="text-xs text-[color:var(--text-tertiary)] truncate max-w-[160px]">{c.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-mono text-xs text-[color:var(--text-tertiary)]">{c.cnpj}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="space-y-0.5">
                    <p className="text-xs text-[color:var(--text-primary)]">{c.contactName}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)]">{c.email}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                    <MapPin className="w-3 h-3 text-[color:var(--text-tertiary)]" />
                    {c.city} — {c.state}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                    <span className="font-medium text-[color:var(--text-primary)]">{c.totalOrders}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-semibold text-[color:var(--text-primary)]">{formatCurrency(c.totalValue)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <Badge variant={c.status === 'active' ? 'success' : 'default'} dot size="sm">
                    {c.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
