'use client'
import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Tag, Package } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { mockCategories } from '@/mocks/products'
import { formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const COLORS = [
  '#2563eb','#7c3aed','#059669','#d97706','#dc2626',
  '#0891b2','#65a30d','#9333ea','#db2777','#ea580c',
]

export default function CategoriasPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<(typeof mockCategories)[0] | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const filtered = mockCategories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditing(null); setName(''); setColor(COLORS[0]); setShowModal(true) }
  const openEdit = (c: (typeof mockCategories)[0]) => { setEditing(c); setName(c.name); setColor(c.color); setShowModal(true) }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Categorias' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Categorias</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{mockCategories.length} categorias cadastradas</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew}>Nova Categoria</Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar categoria…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-6 h-6" />}
          title="Nenhuma categoria encontrada"
          action={<Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew}>Nova Categoria</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(cat => (
            <div key={cat.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center"
                  style={{ background: cat.color + '20' }}
                >
                  <Tag className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(cat)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">{cat.name}</p>
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <span className="text-xs text-[color:var(--text-tertiary)]">{formatNumber(cat.productCount)} produtos</span>
              </div>
              <div className="mt-3 h-1 rounded-full" style={{ background: cat.color + '30' }}>
                <div className="h-full rounded-full" style={{ background: cat.color, width: `${Math.min(100, (cat.productCount / 500) * 100)}%` }} />
              </div>
            </div>
          ))}
          {/* Add card */}
          <button onClick={openNew} className="border-2 border-dashed border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 flex flex-col items-center justify-center gap-2 hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-subtle)] transition-all cursor-pointer min-h-[140px]">
            <Plus className="w-6 h-6 text-[color:var(--text-tertiary)]" />
            <span className="text-sm text-[color:var(--text-tertiary)]">Nova categoria</span>
          </button>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Categoria' : 'Nova Categoria'}
        description="Defina nome e cor de identificação"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => setShowModal(false)}>
              {editing ? 'Salvar alterações' : 'Criar categoria'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da categoria *"
            placeholder="Ex: Eletrônicos"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <div>
            <p className="text-sm font-medium text-[color:var(--text-primary)] mb-2">Cor de identificação</p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all',
                    color === c && 'ring-2 ring-offset-2 ring-[color:var(--brand)] scale-110'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="p-4 rounded-[var(--radius-lg)] flex items-center gap-3" style={{ background: color + '15' }}>
            <div className="w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center" style={{ background: color + '25' }}>
              <Tag className="w-5 h-5" style={{ color }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[color:var(--text-primary)]">{name || 'Nome da categoria'}</p>
              <p className="text-xs text-[color:var(--text-tertiary)]">Pré-visualização</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
