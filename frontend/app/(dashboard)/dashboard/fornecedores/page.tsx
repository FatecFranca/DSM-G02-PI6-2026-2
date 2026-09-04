'use client'
import { useState } from 'react'
import { Plus, Search, Eye, Edit, Truck, Mail, Phone, MapPin } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { mockSuppliers } from '@/mocks/products'
import { cn } from '@/lib/cn'

export default function FornecedoresPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = mockSuppliers.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.tradeName.toLowerCase().includes(search.toLowerCase()) ||
      s.cnpj.includes(search)
    const matchStatus = !statusFilter || s.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Fornecedores' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Fornecedores</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{mockSuppliers.length} fornecedores cadastrados</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>Novo Fornecedor</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Buscar por nome, CNPJ…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={s.tradeName} size="md" />
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)] leading-tight">{s.tradeName}</p>
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{s.category}</p>
                </div>
              </div>
              <Badge variant={s.status === 'active' ? 'success' : 'default'} dot size="sm">
                {s.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <Truck className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <span className="font-mono text-[color:var(--text-tertiary)]">{s.cnpj}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <Mail className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <span className="truncate">{s.email}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <Phone className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <span>{s.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
                <MapPin className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <span>{s.city} — {s.state}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">Contato</p>
                <p className="text-xs font-medium text-[color:var(--text-primary)]">{s.contactName}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
