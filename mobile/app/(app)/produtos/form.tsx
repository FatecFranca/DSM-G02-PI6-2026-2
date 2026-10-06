import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { RequireRole } from '@/components/RequireRole'
import { Banner, Button, Card, CardHeader, Chips, Input, Loading, Screen, Select } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { formatCurrency, parseDecimal } from '@/lib/format'
import { STAFF } from '@/lib/permissions'
import { useSafeBack } from '@/lib/useSafeBack'
import { useFetch } from '@/lib/useFetch'
import { space } from '@/theme/tokens'
import type { ApiBrand, ApiCategory, ApiProduct, ApiSupplier, Paginated } from '@/types/api'

const UNITS = ['UN', 'CX', 'KG', 'L', 'GL', 'M', 'PAR', 'RL', 'PCT'].map(u => ({ value: u, label: u }))
type Status = 'active' | 'inactive' | 'discontinued'
const num = (n: number) => String(n).replace('.', ',')

/** Cadastro (sem `id`) e edição (`?id=`) de produto. */
export default function ProdutoFormScreen() {
  return <RequireRole roles={STAFF}><ProdutoForm /></RequireRole>
}

function ProdutoForm() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const goBack = useSafeBack('/produtos')
  const editing = !!id
  const current = useFetch<ApiProduct>(editing ? `/products/${id}` : null)
  const categories = useFetch<ApiCategory[]>('/categories')
  const brands = useFetch<ApiBrand[]>('/brands')
  const suppliers = useFetch<Paginated<ApiSupplier>>('/suppliers', { limit: 100 })

  const [section, setSection] = useState<'basic' | 'stock' | 'logistics'>('basic')
  const [name, setName] = useState('')
  const [internalCode, setInternalCode] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [unit, setUnit] = useState('')
  const [status, setStatus] = useState<Status>('active')
  const [minStock, setMinStock] = useState('0')
  const [maxStock, setMaxStock] = useState('0')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [weight, setWeight] = useState('0')
  const [width, setWidth] = useState('0')
  const [height, setHeight] = useState('0')
  const [depth, setDepth] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(!editing)

  useEffect(() => {
    const p = current.data
    if (!p || loaded) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(p.name); setInternalCode(p.internalCode); setSku(p.sku); setBarcode(p.barcode); setDescription(p.description ?? '')
    setCategoryId(p.categoryId); setBrandId(p.brandId); setSupplierId(p.supplierId); setUnit(p.unit); setStatus(p.status)
    setMinStock(String(p.minStock)); setMaxStock(String(p.maxStock)); setPurchasePrice(p.purchasePrice.toFixed(2).replace('.', ',')); setSalePrice(p.salePrice.toFixed(2).replace('.', ','))
    setWeight(num(p.weight)); setWidth(num(p.width)); setHeight(num(p.height)); setDepth(num(p.depth))
    setLoaded(true)
  }, [current.data, loaded])

  if (editing && !loaded) return current.error ? <Screen><Banner onRetry={current.reload}>{current.error}</Banner></Screen> : <Loading />

  const margin = parseDecimal(salePrice) > 0 ? (((parseDecimal(salePrice) - parseDecimal(purchasePrice)) / parseDecimal(salePrice)) * 100).toFixed(1) + '%' : '—'

  async function save() {
    if (name.trim().length < 2) return setError('Informe o nome do produto (mínimo 2 caracteres).')
    if (!internalCode.trim() || !sku.trim() || !barcode.trim()) return setError('Código interno, SKU e código de barras são obrigatórios.')
    if (!categoryId || !brandId || !supplierId || !unit) return setError('Selecione categoria, marca, fornecedor e unidade.')
    if (Number(maxStock) > 0 && Number(minStock) > Number(maxStock)) return setError('O estoque mínimo não pode ser maior que o máximo.')
    setSaving(true)
    setError('')
    const body = {
      name: name.trim(), internalCode: internalCode.trim(), sku: sku.trim(), barcode: barcode.trim(), categoryId, brandId, supplierId, unit,
      description: description.trim() || undefined, status,
      weight: parseDecimal(weight), width: parseDecimal(width), height: parseDecimal(height), depth: parseDecimal(depth),
      purchasePrice: parseDecimal(purchasePrice), salePrice: parseDecimal(salePrice),
      minStock: Number(minStock) || 0, maxStock: Number(maxStock) || 0,
    }
    try {
      if (editing) await api.patch(`/products/${id}`, body)
      else await api.post('/products', body)
      goBack()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao salvar produto'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen footer={<><Button title="Cancelar" variant="outline" onPress={() => goBack()} disabled={saving} /><Button title={saving ? 'Salvando…' : 'Salvar produto'} icon="check" onPress={save} loading={saving} style={{ flex: 1 }} /></>}>
      <Stack.Screen options={{ title: editing ? 'Editar produto' : 'Novo produto' }} />
      {error ? <Banner>{error}</Banner> : null}
      <Chips value={section} onChange={setSection} items={[{ id: 'basic', label: 'Básico' }, { id: 'stock', label: 'Estoque e preço' }, { id: 'logistics', label: 'Logística' }]} />

      {section === 'basic' ? (
        <>
          <Card>
            <CardHeader title="Informações gerais" />
            <View style={{ gap: space.md }}>
              <Input label="Nome do produto *" value={name} onChangeText={setName} placeholder="Ex.: Cabo HDMI 2.0 4K 2m" />
              <Input label="Código interno *" value={internalCode} onChangeText={setInternalCode} autoCapitalize="characters" placeholder="EL-0042" />
              <Input label="SKU *" value={sku} onChangeText={setSku} autoCapitalize="characters" placeholder="CAB-HDMI-2M-BK" />
              <Input label="Código de barras (EAN/GTIN) *" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" placeholder="7891234567890" />
              <Input label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="Especificações técnicas…" />
            </View>
          </Card>
          <Card>
            <CardHeader title="Categorização" />
            <View style={{ gap: space.md }}>
              <Select label="Categoria *" value={categoryId} onChange={setCategoryId} options={(categories.data ?? []).map(c => ({ value: c.id, label: c.name }))} />
              <Select label="Marca *" value={brandId} onChange={setBrandId} options={(brands.data ?? []).map(b => ({ value: b.id, label: b.name }))} />
              <Select label="Fornecedor principal *" value={supplierId} onChange={setSupplierId} options={(suppliers.data?.data ?? []).map(s => ({ value: s.id, label: s.tradeName || s.name }))} />
              <Select label="Unidade de medida *" value={unit} onChange={setUnit} options={UNITS} />
              <Select label="Status" value={status} onChange={v => setStatus(v as Status)} options={[{ value: 'active', label: 'Ativo' }, { value: 'inactive', label: 'Inativo' }, { value: 'discontinued', label: 'Descontinuado' }]} />
            </View>
          </Card>
        </>
      ) : null}

      {section === 'stock' ? (
        <>
          <Card>
            <CardHeader title="Controle de estoque" description="O estoque atual só muda por movimentações" />
            <View style={{ gap: space.md }}>
              <Input label="Estoque mínimo *" value={minStock} onChangeText={setMinStock} keyboardType="number-pad" hint="Abaixo disso gera alerta" />
              <Input label="Estoque máximo" value={maxStock} onChangeText={setMaxStock} keyboardType="number-pad" />
            </View>
          </Card>
          <Card>
            <CardHeader title="Precificação" description={`Margem estimada: ${margin}`} />
            <View style={{ gap: space.md }}>
              <Input label="Preço de compra (R$) *" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="decimal-pad" placeholder="0,00" />
              <Input label="Preço de venda (R$) *" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" placeholder="0,00"
                hint={parseDecimal(salePrice) > 0 ? `Lucro por unidade: ${formatCurrency(parseDecimal(salePrice) - parseDecimal(purchasePrice))}` : undefined} />
            </View>
          </Card>
        </>
      ) : null}

      {section === 'logistics' ? (
        <Card>
          <CardHeader title="Dimensões e peso" description="Usados no endereçamento do armazém" />
          <View style={{ gap: space.md }}>
            <Input label="Peso (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            <Input label="Largura (cm)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" />
            <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
            <Input label="Profundidade (cm)" value={depth} onChangeText={setDepth} keyboardType="decimal-pad" />
          </View>
        </Card>
      ) : null}
    </Screen>
  )
}
