'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Save, Image as ImageIcon, Barcode, Tag } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/cn'
import { api, ApiError } from '@/lib/api'

const TABS = [
  { id: 'basic', label: 'Informações Básicas' },
  { id: 'stock', label: 'Estoque e Preço' },
  { id: 'logistics', label: 'Logística' },
]

const UNITS = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'M', label: 'Metro (M)' },
  { value: 'PAR', label: 'Par (PAR)' },
  { value: 'RL', label: 'Rolo (RL)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
]

interface Option { id: string; name: string; tradeName?: string }

export default function NovoProdutoPage() {
  const router = useRouter()
  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [categories, setCategories] = useState<Option[]>([])
  const [brands, setBrands] = useState<Option[]>([])
  const [suppliers, setSuppliers] = useState<Option[]>([])

  const [name, setName] = useState('')
  const [internalCode, setInternalCode] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unit, setUnit] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'discontinued'>('active')

  const [minStock, setMinStock] = useState('0')
  const [maxStock, setMaxStock] = useState('0')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')

  const [weight, setWeight] = useState('0')
  const [width, setWidth] = useState('0')
  const [height, setHeight] = useState('0')
  const [depth, setDepth] = useState('0')

  useEffect(() => {
    Promise.all([
      api.get<Option[]>('/categories'),
      api.get<Option[]>('/brands'),
      api.get<{ data: Option[] }>('/suppliers', { limit: 100 }),
    ]).then(([cats, brs, sups]) => {
      setCategories(cats)
      setBrands(brs)
      setSuppliers(sups.data)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/products', {
        name,
        internalCode,
        sku,
        barcode,
        categoryId,
        brandId,
        supplierId,
        unit,
        description: description || undefined,
        weight: Number(weight) || 0,
        width: Number(width) || 0,
        height: Number(height) || 0,
        depth: Number(depth) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        salePrice: Number(salePrice) || 0,
        minStock: Number(minStock) || 0,
        maxStock: Number(maxStock) || 0,
        status,
      })
      router.push('/dashboard/produtos')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <Breadcrumb items={[{ label: 'Produtos', href: '/dashboard/produtos' }, { label: 'Novo Produto' }]} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/produtos">
            <button className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] border border-[color:var(--border)] hover:bg-[color:var(--bg-muted)] transition-colors text-[color:var(--text-secondary)]">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Novo Produto</h1>
            <p className="text-sm text-[color:var(--text-tertiary)]">Preencha os dados do produto abaixo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/produtos">
            <Button variant="outline" size="sm">Cancelar</Button>
          </Link>
          <Button size="sm" loading={saving} leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Salvar Produto'}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[color:var(--danger)] bg-[color:var(--danger-subtle)] border border-[color:var(--danger)]/30 rounded-[var(--radius-md)] px-3 py-2">{error}</p>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <CardTitle description="Dados de identificação do produto">Informações Gerais</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Nome do Produto *" placeholder="Ex: Cabo HDMI 2.0 4K Ultra HD 2m" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <Input label="Código Interno *" placeholder="EX: EL-0042" leftIcon={<Tag className="w-3.5 h-3.5" />} value={internalCode} onChange={e => setInternalCode(e.target.value)} />
                <Input label="SKU (Stock Keeping Unit) *" placeholder="EX: CAB-HDMI-2M-BK" value={sku} onChange={e => setSku(e.target.value)} />
                <Input label="Código de Barras (EAN/GTIN) *" placeholder="7891234567890" leftIcon={<Barcode className="w-3.5 h-3.5" />} value={barcode} onChange={e => setBarcode(e.target.value)} />
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Descrição</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o produto em detalhes, especificações técnicas, características…"
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle description="Classificação e hierarquia">Categorização</CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Categoria *"
                  placeholder="Selecione a categoria"
                  options={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                />
                <Select
                  label="Marca *"
                  placeholder="Selecione a marca"
                  options={brands.map(b => ({ value: b.id, label: b.name }))}
                  value={brandId}
                  onChange={e => setBrandId(e.target.value)}
                />
                <Select
                  label="Unidade de Medida *"
                  placeholder="Selecione a unidade"
                  options={UNITS}
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                />
                <Select
                  label="Fornecedor Principal *"
                  placeholder="Selecione o fornecedor"
                  options={suppliers.map(s => ({ value: s.id, label: s.tradeName ?? s.name }))}
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                />
                <Select
                  label="Status"
                  options={[
                    { value: 'active', label: 'Ativo' },
                    { value: 'inactive', label: 'Inativo' },
                    { value: 'discontinued', label: 'Descontinuado' },
                  ]}
                  value={status}
                  onChange={e => setStatus(e.target.value as typeof status)}
                />
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Imagem Principal</CardTitle>
              </CardHeader>
              <div className="border-2 border-dashed border-[color:var(--border)] rounded-[var(--radius-lg)] p-8 flex flex-col items-center justify-center gap-3 hover:border-[color:var(--brand-muted)] hover:bg-[color:var(--brand-subtle)] transition-all cursor-pointer group">
                <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-[color:var(--bg-muted)] flex items-center justify-center group-hover:bg-[color:var(--brand-subtle)]">
                  <ImageIcon className="w-6 h-6 text-[color:var(--text-tertiary)] group-hover:text-[color:var(--brand)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[color:var(--text-primary)]">Clique para enviar</p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">PNG, JPG ou WebP até 5MB</p>
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Progresso</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                {TABS.map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      tab === t.id ? 'bg-[color:var(--brand)] text-white' : i < TABS.findIndex(x => x.id === tab) ? 'bg-[color:var(--success)] text-white' : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]'
                    )}>
                      {i + 1}
                    </div>
                    <span className={cn('text-sm', tab === t.id ? 'font-semibold text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]')}>{t.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'stock' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle description="Configurações de controle de estoque">Controle de Estoque</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Estoque Mínimo *" type="number" placeholder="0" hint="Abaixo disso gera alerta" value={minStock} onChange={e => setMinStock(e.target.value)} />
              <Input label="Estoque Máximo" type="number" placeholder="1000" hint="Quantidade máxima" value={maxStock} onChange={e => setMaxStock(e.target.value)} />
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle description="Preços e margens">Precificação</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Preço de Compra *" placeholder="0,00" leftIcon={<span className="text-xs font-medium">R$</span>} value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
              <Input label="Preço de Venda *" placeholder="0,00" leftIcon={<span className="text-xs font-medium">R$</span>} value={salePrice} onChange={e => setSalePrice(e.target.value)} />
              <div className="col-span-2 p-4 rounded-[var(--radius-md)] bg-[color:var(--success-subtle)] border border-[color:var(--success-muted)]">
                <p className="text-xs font-medium text-[color:var(--success)] mb-1">Margem estimada</p>
                <p className="text-2xl font-bold text-[color:var(--success)]">
                  {purchasePrice && salePrice ? `${(((Number(salePrice) - Number(purchasePrice)) / Number(salePrice)) * 100).toFixed(1)}%` : '—'}
                </p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">Preencha os preços acima</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'logistics' && (
        <Card>
          <CardHeader>
            <CardTitle description="Dimensões e peso para WMS">Informações Logísticas</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="Peso (kg)" type="number" placeholder="0,000" value={weight} onChange={e => setWeight(e.target.value)} />
            <Input label="Largura (cm)" type="number" placeholder="0,0" value={width} onChange={e => setWidth(e.target.value)} />
            <Input label="Altura (cm)" type="number" placeholder="0,0" value={height} onChange={e => setHeight(e.target.value)} />
            <Input label="Profundidade (cm)" type="number" placeholder="0,0" value={depth} onChange={e => setDepth(e.target.value)} />
          </div>
        </Card>
      )}

      {/* Bottom nav */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTab(TABS[Math.max(0, TABS.findIndex(t => t.id === tab) - 1)].id)}
          disabled={tab === TABS[0].id}
        >
          ← Anterior
        </Button>
        {tab === TABS[TABS.length - 1].id ? (
          <Button size="sm" loading={saving} leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
            {saving ? 'Salvando…' : 'Salvar Produto'}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => setTab(TABS[Math.min(TABS.length - 1, TABS.findIndex(t => t.id === tab) + 1)].id)}
          >
            Próximo →
          </Button>
        )}
      </div>
    </div>
  )
}
