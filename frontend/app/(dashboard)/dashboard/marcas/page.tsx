'use client'
import { useEffect, useState } from 'react'
import { Plus, Search, Edit, Trash2, Award, Package } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatNumber, slugify } from '@/lib/utils'
import { api, ApiError } from '@/lib/api'

interface Brand {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  _count: { products: number }
}

export default function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Brand | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      setBrands(await api.get<Brand[]>('/brands'))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar marcas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = brands.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  const openNew = () => { setEditing(null); setName(''); setFormError(''); setShowModal(true) }
  const openEdit = (b: Brand) => { setEditing(b); setName(b.name); setFormError(''); setShowModal(true) }

  async function handleSave() {
    setSaving(true)
    setFormError('')
    try {
      if (editing) {
        await api.patch(`/brands/${editing.id}`, { name })
      } else {
        await api.post('/brands', { name, slug: slugify(name) })
      }
      setShowModal(false)
      await load()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Falha ao salvar marca')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(b: Brand) {
    if (!confirm(`Remover a marca "${b.name}"?`)) return
    try {
      await api.delete(`/brands/${b.id}`)
      await load()
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Falha ao remover marca')
    }
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Marcas' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Marcas</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{formatNumber(brands.length)} marcas cadastradas</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openNew}>Nova Marca</Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar marca…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      {error && (
        <p className="text-sm text-[color:var(--danger)] bg-[color:var(--danger-subtle)] border border-[color:var(--danger)]/30 rounded-[var(--radius-md)] px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[color:var(--text-tertiary)]">Carregando…</p>
      ) : filtered.length === 0 ? (
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
                      <span className="text-sm">{formatNumber(brand._count.products)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(brand)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(brand)} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--danger-subtle)] text-[color:var(--text-tertiary)] hover:text-[color:var(--danger)] transition-colors">
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
            <Button size="sm" loading={saving} onClick={handleSave}>{editing ? 'Salvar' : 'Criar marca'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <p className="text-sm text-[color:var(--danger)] bg-[color:var(--danger-subtle)] border border-[color:var(--danger)]/30 rounded-[var(--radius-md)] px-3 py-2">{formError}</p>
          )}
          <Input label="Nome da marca *" placeholder="Ex: Nexus Pro" value={name} onChange={e => setName(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
