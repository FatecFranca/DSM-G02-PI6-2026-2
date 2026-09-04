'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Save, Package, Image as ImageIcon, Barcode, Tag } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { mockCategories, mockBrands, mockSuppliers } from '@/mocks/products'
import { cn } from '@/lib/cn'

const TABS = [
  { id: 'basic', label: 'Informações Básicas' },
  { id: 'stock', label: 'Estoque e Preço' },
  { id: 'logistics', label: 'Logística' },
  { id: 'images', label: 'Imagens' },
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

export default function NovoProdutoPage() {
  const [tab, setTab] = useState('basic')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1200))
    setSaving(false)
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
                  <Input label="Nome do Produto *" placeholder="Ex: Cabo HDMI 2.0 4K Ultra HD 2m" />
                </div>
                <Input label="Código Interno *" placeholder="EX: EL-0042" leftIcon={<Tag className="w-3.5 h-3.5" />} />
                <Input label="SKU (Stock Keeping Unit)" placeholder="EX: CAB-HDMI-2M-BK" />
                <Input label="Código de Barras (EAN/GTIN)" placeholder="7891234567890" leftIcon={<Barcode className="w-3.5 h-3.5" />} />
                <Input label="QR Code (opcional)" placeholder="Identificador único" />
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[color:var(--text-primary)] block mb-1.5">Descrição</label>
                  <textarea
                    rows={3}
                    placeholder="Descreva o produto em detalhes, especificações técnicas, características…"
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none"
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
                  options={mockCategories.map(c => ({ value: c.id, label: c.name }))}
                />
                <Select
                  label="Marca"
                  placeholder="Selecione a marca"
                  options={mockBrands.map(b => ({ value: b.id, label: b.name }))}
                />
                <Select
                  label="Unidade de Medida *"
                  placeholder="Selecione a unidade"
                  options={UNITS}
                />
                <Select
                  label="Fornecedor Principal"
                  placeholder="Selecione o fornecedor"
                  options={mockSuppliers.map(s => ({ value: s.id, label: s.tradeName }))}
                />
                <Select
                  label="Status"
                  options={[
                    { value: 'active', label: 'Ativo' },
                    { value: 'inactive', label: 'Inativo' },
                    { value: 'discontinued', label: 'Descontinuado' },
                  ]}
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
              <Input label="Estoque Mínimo *" type="number" placeholder="0" hint="Abaixo disso gera alerta" />
              <Input label="Estoque Máximo" type="number" placeholder="1000" hint="Quantidade máxima" />
              <Input label="Ponto de Reposição" type="number" placeholder="50" hint="Quando disparar compra" />
              <Input label="Quantidade Inicial" type="number" placeholder="0" hint="Estoque de abertura" />
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle description="Preços e margens">Precificação</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Preço de Compra *" placeholder="0,00" leftIcon={<span className="text-xs font-medium">R$</span>} />
              <Input label="Preço de Venda *" placeholder="0,00" leftIcon={<span className="text-xs font-medium">R$</span>} />
              <div className="col-span-2 p-4 rounded-[var(--radius-md)] bg-[color:var(--success-subtle)] border border-[color:var(--success-muted)]">
                <p className="text-xs font-medium text-[color:var(--success)] mb-1">Margem estimada</p>
                <p className="text-2xl font-bold text-[color:var(--success)]">—</p>
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
            <Input label="Peso Líquido (kg)" type="number" placeholder="0,000" />
            <Input label="Peso Bruto (kg)" type="number" placeholder="0,000" />
            <Input label="Largura (cm)" type="number" placeholder="0,0" />
            <Input label="Altura (cm)" type="number" placeholder="0,0" />
            <Input label="Profundidade (cm)" type="number" placeholder="0,0" />
            <Input label="Volume (m³)" type="number" placeholder="0,0000" />
            <div className="col-span-2">
              <Select label="Controla Lote?" options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]} />
            </div>
            <div className="col-span-2">
              <Select label="Controla Validade?" options={[{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não' }]} />
            </div>
          </div>
        </Card>
      )}

      {tab === 'images' && (
        <Card>
          <CardHeader>
            <CardTitle description="Fotos do produto para o catálogo">Galeria de Imagens</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="aspect-square border-2 border-dashed border-[color:var(--border)] rounded-[var(--radius-lg)] flex flex-col items-center justify-center gap-2 hover:border-[color:var(--brand)] hover:bg-[color:var(--brand-subtle)] cursor-pointer transition-all">
                <ImageIcon className="w-6 h-6 text-[color:var(--text-tertiary)]" />
                <span className="text-[10px] text-[color:var(--text-tertiary)]">+ Imagem</span>
              </div>
            ))}
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
