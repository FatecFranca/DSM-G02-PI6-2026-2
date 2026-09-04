'use client'
import { useState } from 'react'
import { Plus, Search, Edit, Trash2, Award, Package } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { mockBrands } from '@/mocks/products'
import { formatNumber } from '@/lib/utils'

export default function MarcasPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<(typeof mockBrands)[0] | null>(null)
  const [name, setName] = useState('')

  const filtered = mockBrands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => { setEditing(null); setName(''); setShowModal(true) }
  const openEdit = (b: (typeof mockBrands)[0]) => { setEditing(b); setName(b.name); setShowModal(true) }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Marcas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Marcas</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{mockBrands.length} marcas cadastradas</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew}>Nova Marca</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar marca…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Award className="w-6 h-6" />} title="Nenhuma marca encontrada" action={<Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew}>Nova Marca</Button>} />
      ) : (
        <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)]">
                {['Marca', 'Slug', 'Produtos', 'Ações'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(brand => (
                <tr key={brand.id} className="border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center">
                        <Award className="w-4 h-4 text-[color:var(--text-tertiary)]" />
                      </div>
                      <span className="font-semibold text-[color:var(--text-primary)]">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-[color:var(--text-tertiary)] bg-[color:var(--bg-muted)] px-2 py-1 rounded">{brand.slug}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)]">
                      <Package className="w-3.5 h-3.5" />
                      <span className="text-sm">{formatNumber(brand.productCount)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(brand)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Editar Marca' : 'Nova Marca'}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => setShowModal(false)}>{editing ? 'Salvar' : 'Criar marca'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nome da marca *" placeholder="Ex: Nexus Pro" value={name} onChange={e => setName(e.target.value)} />
          <div className="border-2 border-dashed border-[color:var(--border)] rounded-[var(--radius-lg)] p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[color:var(--brand)] transition-colors">
            <Award className="w-8 h-8 text-[color:var(--text-tertiary)]" />
            <p className="text-sm text-[color:var(--text-tertiary)]">Enviar logotipo (opcional)</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
