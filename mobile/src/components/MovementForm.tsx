import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { ProductPicker } from '@/components/ProductPicker'
import { AppText, Banner, Button, Card, CardHeader, Chips, DateField, Input, Screen, Select } from '@/components/ui'
import { api, errorMessage, fetchAll } from '@/lib/api'
import { brDateToIso, formatCurrency, formatNumber, parseDecimal } from '@/lib/format'
import { EXIT_REASON_LABELS } from '@/lib/status'
import { useSafeBack } from '@/lib/useSafeBack'
import { space } from '@/theme/tokens'
import type { ApiAddress, ApiCustomer, ApiProduct, ApiProductDetails, ApiSupplier, Paginated } from '@/types/api'

export type FormKind = 'entry' | 'exit' | 'transfer' | 'adjustment'

const money = (n: number) => n.toFixed(2).replace('.', ',')
const TITLE: Record<FormKind, string> = { entry: 'Registrar entrada', exit: 'Registrar saída', transfer: 'Transferir entre endereços', adjustment: 'Ajustar estoque' }
const EXIT_REASONS = ['sale', 'internal', 'break', 'loss'] as const

interface Props {
  kind: FormKind
  /** Produto pré-selecionado (vindo da tela de produto ou do scanner). */
  productId?: string
}

/**
 * Formulário único de movimentação. Regras espelham o backend:
 *  - produto já endereçado exige endereço de origem (saída/perda/ajuste−/transferência) e de destino (entrada/ajuste+/transferência);
 *  - produto controlado por lote exige o lote; o lote acompanha o endereço de origem;
 *  - entrada com lote novo exige fornecedor + fabricação + validade.
 */
export function MovementForm({ kind, productId }: Props) {
  const goBack = useSafeBack(kind === 'entry' ? '/entradas' : kind === 'exit' ? '/saidas' : '/movimentar')
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [details, setDetails] = useState<ApiProductDetails | null>(null)
  const [freeAddresses, setFreeAddresses] = useState<ApiAddress[]>([])
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [customers, setCustomers] = useState<ApiCustomer[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [quantity, setQuantity] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState<(typeof EXIT_REASONS)[number]>('sale')
  const [direction, setDirection] = useState<'increase' | 'decrease'>('decrease')
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [invoice, setInvoice] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [mfg, setMfg] = useState('')
  const [exp, setExp] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [destination, setDestination] = useState('')

  // Opções que independem do produto.
  useEffect(() => {
    const jobs: Promise<unknown>[] = [fetchAll<ApiAddress>('/warehouse', {}).then(setFreeAddresses)]
    if (kind === 'entry') jobs.push(api.get<Paginated<ApiSupplier>>('/suppliers', { limit: 100 }).then(r => setSuppliers(r.data.filter(s => s.status === 'active'))))
    if (kind === 'exit') jobs.push(api.get<Paginated<ApiCustomer>>('/customers', { limit: 100, status: 'active' }).then(r => setCustomers(r.data)))
    Promise.all(jobs).catch(err => setError(errorMessage(err, 'Falha ao carregar opções')))
  }, [kind])

  // Produto pré-selecionado.
  useEffect(() => {
    if (!productId) return
    api.get<ApiProductDetails>(`/products/${productId}`).then(d => { setProduct(d); setDetails(d) }).catch(err => setError(errorMessage(err)))
  }, [productId])

  async function pickProduct(p: ApiProduct | null) {
    setProduct(p)
    setDetails(null)
    setFromId(''); setToId(''); setLotNumber('')
    if (!p) return
    setUnitCost(money(kind === 'exit' ? p.salePrice : p.purchasePrice))
    setSupplierId(p.supplierId)
    try {
      setDetails(await api.get<ApiProductDetails>(`/products/${p.id}`))
    } catch (err) {
      setError(errorMessage(err, 'Falha ao carregar endereços e lotes do produto'))
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (details && !unitCost) setUnitCost(money(kind === 'exit' ? details.salePrice : details.purchasePrice))
    if (details && !supplierId) setSupplierId(details.supplierId)
  }, [details, kind, unitCost, supplierId])

  const stocked = details?.warehouseAddresses ?? []
  const lots = details?.lots ?? []
  const needsSource = kind === 'exit' || kind === 'transfer' || (kind === 'adjustment' && direction === 'decrease')
  const needsDestination = kind === 'entry' || kind === 'transfer' || (kind === 'adjustment' && direction === 'increase')
  const sourceRequired = needsSource && stocked.length > 0
  const destinationRequired = needsDestination && (stocked.length > 0 || kind === 'transfer')
  const sourceAddress = stocked.find(a => a.id === fromId)

  // Destinos válidos: livres, ou endereços do mesmo produto (e mesmo lote, se houver).
  const destinations = useMemo(() => {
    const lot = kind === 'transfer' ? sourceAddress?.lotNumber ?? lotNumber : lotNumber
    return freeAddresses.filter(a =>
      a.id !== fromId &&
      (a.status === 'free' || (a.status === 'occupied' && a.product?.id === product?.id && (!lot || !a.lotNumber || a.lotNumber === lot))),
    )
  }, [freeAddresses, fromId, product, lotNumber, kind, sourceAddress])

  function pickLot(lot: string) {
    setLotNumber(lot)
    // Um lote só ocupa um endereço: entrada de lote existente vai para o endereço onde ele já está.
    const home = stocked.find(a => a.lotNumber === lot)
    if (home && needsDestination && kind !== 'transfer') setToId(home.id)
  }

  function pickSource(id: string) {
    setFromId(id)
    const a = stocked.find(s => s.id === id)
    if (a?.lotNumber) setLotNumber(a.lotNumber)
  }

  async function submit() {
    setError('')
    const qty = Number(quantity)
    if (!product) return setError('Selecione o produto.')
    if (!Number.isInteger(qty) || qty <= 0) return setError('Informe uma quantidade inteira positiva.')
    if (sourceRequired && !fromId) return setError('Selecione o endereço de origem do estoque.')
    if (destinationRequired && !toId) return setError('Selecione o endereço de destino.')
    if (kind === 'exit' && qty > product.currentStock) return setError(`Estoque insuficiente: disponível ${product.currentStock} ${product.unit}.`)
    if (lots.length > 0 && !lotNumber) return setError('Este produto é controlado por lote: informe o lote.')

    const body: Record<string, unknown> = { productId: product.id, quantity: qty, notes: notes.trim() || undefined }
    if (kind === 'entry') {
      const newLot = lotNumber && !lots.some(l => l.lotNumber === lotNumber)
      if (newLot) {
        const mfgIso = brDateToIso(mfg)
        const expIso = brDateToIso(exp)
        if (!supplierId || !mfgIso || !expIso) return setError('Para criar um lote informe fornecedor e datas de fabricação e validade (DD/MM/AAAA).')
        if (new Date(expIso) <= new Date(mfgIso)) return setError('A validade deve ser posterior à fabricação.')
        body.manufacturingDate = mfgIso
        body.expirationDate = expIso
      }
      Object.assign(body, {
        type: 'entry', unitCost: unitCost ? parseDecimal(unitCost) : undefined, supplierId: supplierId || undefined,
        invoiceNumber: invoice.trim() || undefined, lotNumber: lotNumber.trim() || undefined, toAddressId: toId || undefined,
      })
    } else if (kind === 'exit') {
      const customer = customers.find(c => c.id === customerId)
      Object.assign(body, {
        type: reason === 'loss' ? 'loss' : 'exit', exitReason: reason, unitCost: unitCost ? parseDecimal(unitCost) : undefined,
        customerId: customer?.id, customerName: customer?.tradeName ?? (destination.trim() || undefined),
        fromAddressId: fromId || undefined, lotNumber: lotNumber || undefined,
      })
    } else if (kind === 'transfer') {
      Object.assign(body, { type: 'transfer', fromAddressId: fromId, toAddressId: toId, lotNumber: sourceAddress?.lotNumber ?? (lotNumber || undefined) })
    } else {
      Object.assign(body, {
        type: 'adjustment', adjustmentDirection: direction, lotNumber: lotNumber || undefined,
        fromAddressId: direction === 'decrease' ? fromId || undefined : undefined,
        toAddressId: direction === 'increase' ? toId || undefined : undefined,
      })
    }

    setSaving(true)
    try {
      await api.post('/movements', body)
      goBack()
    } catch (err) {
      setError(errorMessage(err, 'Falha ao registrar a movimentação'))
    } finally {
      setSaving(false)
    }
  }

  const total = parseDecimal(unitCost) * (Number(quantity) || 0)
  const addressLabel = (a: { code: string; quantity?: number | null; lotNumber?: string | null }) =>
    `${a.code}${a.quantity != null ? ` · ${formatNumber(a.quantity)} un` : ''}${a.lotNumber ? ` · lote ${a.lotNumber}` : ''}`

  return (
    <Screen footer={<><Button title="Cancelar" variant="outline" onPress={() => goBack()} disabled={saving} /><Button title={saving ? 'Registrando…' : TITLE[kind]} icon="check" onPress={submit} loading={saving} style={{ flex: 1 }} /></>}>
      {error ? <Banner>{error}</Banner> : null}

      <Card>
        <CardHeader title="Produto" />
        <View style={{ gap: space.md }}>
          <ProductPicker value={product} onChange={pickProduct} requireStock={kind === 'exit' || kind === 'transfer'} disabled={!!productId} />
          {details ? (
            <AppText variant="caption" color="tertiary">
              {stocked.length > 0 ? `Estocado em ${stocked.map(a => a.code).join(', ')}` : 'Sem endereço registrado'}{lots.length > 0 ? ` · ${lots.length} lote(s) ativo(s)` : ''}
            </AppText>
          ) : null}
        </View>
      </Card>

      <Card>
        <CardHeader title="Movimento" />
        <View style={{ gap: space.md }}>
          {kind === 'exit' ? (
            <Select label="Motivo da saída" value={reason} onChange={v => setReason(v as typeof reason)} options={EXIT_REASONS.map(r => ({ value: r, label: EXIT_REASON_LABELS[r] }))} />
          ) : null}
          {kind === 'adjustment' ? (
            <View style={{ gap: 6 }}>
              <AppText variant="small" bold>Sentido do ajuste</AppText>
              <Chips value={direction} onChange={d => { setDirection(d); setFromId(''); setToId('') }} items={[{ id: 'decrease', label: 'Reduzir estoque' }, { id: 'increase', label: 'Aumentar estoque' }]} />
            </View>
          ) : null}

          <Input label="Quantidade" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="0"
            hint={product && (kind === 'exit' || kind === 'transfer') ? `Disponível: ${formatNumber(product.currentStock)} ${product.unit}` : undefined} />

          {kind === 'entry' || kind === 'exit' ? (
            <Input label={kind === 'entry' ? 'Custo unitário (R$)' : 'Valor unitário (R$)'} value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" placeholder="0,00"
              hint={total > 0 ? `Total: ${formatCurrency(total)}` : undefined} />
          ) : null}

          {needsSource ? (
            <Select label={`Endereço de origem${sourceRequired ? ' *' : ''}`} value={fromId} onChange={pickSource} placeholder={stocked.length ? 'Selecione' : 'Produto sem endereço'} clearable={!sourceRequired}
              options={stocked.map(a => ({ value: a.id, label: addressLabel(a) }))} />
          ) : null}

          {kind === 'entry' || kind === 'adjustment' ? (
            lots.length > 0 ? (
              <Select label="Lote *" value={lotNumber} onChange={pickLot} placeholder="Selecione o lote" options={lots.map(l => ({ value: l.lotNumber, label: `${l.lotNumber} · ${formatNumber(l.quantity)} un` }))} />
            ) : null
          ) : null}

          {needsDestination ? (
            <Select label={`Endereço de destino${destinationRequired ? ' *' : ''}`} value={toId} onChange={setToId} placeholder="Selecione" clearable={!destinationRequired}
              hint={kind === 'entry' ? 'Atualiza o mapa do armazém.' : undefined}
              options={destinations.map(a => ({ value: a.id, label: `${a.code} — ${a.status === 'free' ? 'livre' : `mesmo produto (${a.quantity ?? 0} un)`}` }))} />
          ) : null}
        </View>
      </Card>

      {kind === 'entry' ? (
        <Card>
          <CardHeader title="Nota fiscal e lote" description="Lote novo exige fornecedor e datas" />
          <View style={{ gap: space.md }}>
            <Input label="Número da NF" value={invoice} onChangeText={setInvoice} placeholder="NF-2026-00001" autoCapitalize="characters" />
            <Select label="Fornecedor" value={supplierId} onChange={setSupplierId} clearable options={suppliers.map(s => ({ value: s.id, label: s.tradeName || s.name }))} />
            <Input label="Número do lote (opcional)" value={lotNumber} onChangeText={setLotNumber} placeholder="LOT-2026-001" autoCapitalize="characters" />
            {lotNumber && !lots.some(l => l.lotNumber === lotNumber) ? (
              <>
                <DateField label="Data de fabricação" value={mfg} onChangeText={setMfg} />
                <DateField label="Data de validade" value={exp} onChangeText={setExp} />
              </>
            ) : null}
          </View>
        </Card>
      ) : null}

      {kind === 'exit' ? (
        <Card>
          <CardHeader title="Destino" />
          <View style={{ gap: space.md }}>
            {reason === 'sale' ? (
              <Select label="Cliente" value={customerId} onChange={setCustomerId} clearable placeholder="Selecione o cliente" options={customers.map(c => ({ value: c.id, label: c.tradeName }))} />
            ) : (
              <Input label="Setor / destino" value={destination} onChangeText={setDestination} placeholder="Ex.: Manutenção" />
            )}
          </View>
        </Card>
      ) : null}

      <Card>
        <Input label="Observações" value={notes} onChangeText={setNotes} multiline placeholder="Opcional" />
      </Card>
    </Screen>
  )
}
