import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { AppText, Badge, Banner, Button, Card, CardHeader, Chips, EmptyState, Icon, Input, KeyValue, ListRow, Screen } from '@/components/ui'
import { ApiError, api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatNumber } from '@/lib/format'
import { STOCK_TONE } from '@/lib/movement'
import { hasRole, WRITERS } from '@/lib/permissions'
import { STOCK_STATUS_LABELS } from '@/lib/status'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'
import type { ApiProduct, ApiProductDetails, Paginated } from '@/types/api'

type Mode = 'entry' | 'exit' | 'query' | 'transfer'
const MODES: { id: Mode; label: string }[] = [
  { id: 'query', label: 'Consulta' },
  { id: 'entry', label: 'Entrada' },
  { id: 'exit', label: 'Saída' },
  { id: 'transfer', label: 'Transferência' },
]

/** Dígitos (EAN/UPC) chegam sem espaços; leitores USB costumam acrescentar quebra de linha/tab. */
const clean = (value: string) => value.replace(/[\r\n\t]/g, '').trim()

export default function ScannerScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const canWrite = hasRole(user?.role, WRITERS)
  const [permission, requestPermission] = useCameraPermissions()
  const [cameraOn, setCameraOn] = useState(false)
  const [mode, setMode] = useState<Mode>('query')
  const [code, setCode] = useState('')
  const [searching, setSearching] = useState(false)
  const [product, setProduct] = useState<ApiProductDetails | null>(null)
  const [similar, setSimilar] = useState<ApiProduct[]>([])
  const [searched, setSearched] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<ApiProductDetails[]>([])
  const requestId = useRef(0)
  const lastCode = useRef('')
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 })

  const remember = useCallback((p: ApiProductDetails) => {
    setRecent(cur => [p, ...cur.filter(x => x.id !== p.id)].slice(0, 8))
  }, [])

  /** 1) correspondência exata (barras, SKU ou código interno); 2) sem ela, sugere produtos parecidos. */
  const lookup = useCallback(async (raw: string) => {
    const term = clean(raw)
    if (!term) return
    const id = ++requestId.current
    lastCode.current = term
    setSearching(true)
    setError('')
    try {
      let found: ApiProductDetails | null = null
      try {
        found = await api.get<ApiProductDetails>(`/products/scan/${encodeURIComponent(term)}`)
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) throw err
      }
      if (id !== requestId.current) return
      if (found) {
        setProduct(found)
        setSimilar([])
        setSearched(term)
        remember(found)
        return
      }
      const res = await api.get<Paginated<ApiProduct>>('/products', { search: term, limit: 6 })
      if (id !== requestId.current) return
      setProduct(null)
      setSimilar(res.data)
      setSearched(term)
    } catch (err) {
      if (id !== requestId.current) return
      setProduct(null)
      setSimilar([])
      setError(errorMessage(err))
    } finally {
      if (id === requestId.current) setSearching(false)
    }
  }, [remember])

  // Busca automática enquanto digita (a partir de 3 caracteres); "Buscar"/Enter buscam na hora.
  useEffect(() => {
    const term = clean(code)
    if (term.length < 3 || term === lastCode.current) return
    const timer = setTimeout(() => { void lookup(term) }, 450)
    return () => clearTimeout(timer)
  }, [code, lookup])

  function onChange(value: string) {
    setCode(value)
    setError('')
    if (clean(value).length < 3) {
      requestId.current++
      lastCode.current = ''
      setSearching(false)
      setProduct(null)
      setSimilar([])
      setSearched('')
    }
  }

  function reset() {
    requestId.current++
    lastCode.current = ''
    setCode('')
    setProduct(null)
    setSimilar([])
    setSearched('')
    setError('')
    setSearching(false)
  }

  /** Abre um produto já conhecido (sugestão ou leitura recente) sem nova busca por código. */
  async function pick(id: string) {
    const req = ++requestId.current
    setSearching(true)
    setError('')
    try {
      const found = await api.get<ApiProductDetails>(`/products/${id}`)
      if (req !== requestId.current) return
      const term = found.barcode || found.internalCode
      lastCode.current = term
      setCode(term)
      setProduct(found)
      setSimilar([])
      setSearched(term)
      remember(found)
    } catch (err) {
      if (req === requestId.current) setError(errorMessage(err))
    } finally {
      if (req === requestId.current) setSearching(false)
    }
  }

  // O leitor dispara várias vezes por segundo: ignora a mesma leitura por 2 s.
  function onScanned({ data }: { data: string }) {
    const now = Date.now()
    if (data === lastScan.current.code && now - lastScan.current.at < 2000) return
    lastScan.current = { code: data, at: now }
    setCode(data)
    setCameraOn(false)
    void lookup(data)
  }

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) return
    }
    setCameraOn(true)
  }

  const go = (pathname: '/entradas/nova' | '/saidas/nova' | '/movimento', kind?: string) => {
    if (!product) return
    router.push({ pathname, params: { productId: product.id, ...(kind ? { kind } : {}) } } as never)
  }

  const notFound = !product && !searching && !error && searched !== ''
  const active = MODES.find(m => m.id === mode)

  return (
    <Screen>
      <Chips<Mode> value={mode} onChange={setMode} items={MODES.map(m => ({ id: m.id, label: m.label }))} />

      <Card>
        <View style={{ gap: space.md }}>
          <Input label="Código de barras, SKU ou código interno" value={code} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} leftIcon="maximize"
            onSubmitEditing={() => lookup(code)} returnKeyType="search" placeholder="7891234510000 · EL-0042"
            hint={`${active?.label} · a busca é automática ao digitar`}
            right={code ? <Button icon="x" variant="ghost" size="sm" accessibilityLabel="Limpar" onPress={reset} /> : undefined} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Buscar" icon="search" onPress={() => lookup(code)} loading={searching} disabled={!clean(code)} style={{ flex: 1 }} />
            <Button title={cameraOn ? 'Fechar câmera' : 'Ler com a câmera'} icon="camera" variant="outline" onPress={cameraOn ? () => setCameraOn(false) : openCamera} style={{ flex: 1 }} />
          </View>
          {permission && !permission.granted && permission.canAskAgain === false ? (
            <Banner tone="warning">A permissão da câmera foi negada. Ative-a nas configurações do aparelho ou digite o código.</Banner>
          ) : null}
        </View>
      </Card>

      {cameraOn ? (
        <View style={[styles.camera, { borderColor: colors.border }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
            onBarcodeScanned={onScanned}
          />
          <View style={styles.reticle} pointerEvents="none" />
          <View style={styles.hint}><AppText variant="small" color="inverse">Aponte para o código de barras</AppText></View>
        </View>
      ) : null}

      {Platform.OS === 'web' && !cameraOn ? <AppText variant="caption" color="tertiary" align="center">No navegador a câmera depende de HTTPS; no celular use o app Expo Go.</AppText> : null}
      {error ? <Banner onRetry={() => lookup(code)}>{error}</Banner> : null}

      {notFound ? (
        <Card>
          <EmptyState icon="alert-circle" title="Produto não encontrado" description={`Nenhum produto com o código "${searched}".`}
            action={hasRole(user?.role, ['admin', 'supervisor']) ? <Button title="Cadastrar produto" variant="outline" onPress={() => router.push('/produtos/form')} /> : undefined} />
          {similar.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="small" color="secondary">Produtos parecidos — toque para selecionar:</AppText>
              {similar.map(p => (
                <ListRow key={p.id} title={p.name} subtitle={`${p.barcode} · ${p.internalCode}`} icon="package" chevron onPress={() => pick(p.id)} />
              ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {product ? (
        <Card>
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
              <View style={[styles.found, { backgroundColor: colors.successSubtle }]}><Icon name="check-circle" size={20} color="success" /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText bold>{product.name}</AppText>
                <AppText variant="mono" color="tertiary">{product.internalCode} · {product.sku}</AppText>
              </View>
              <Badge label={STOCK_STATUS_LABELS[product.stockStatus]} tone={STOCK_TONE[product.stockStatus]} dot />
            </View>
            <View>
              <KeyValue label="Estoque" value={`${formatNumber(product.currentStock)} ${product.unit}`} />
              <KeyValue label="Categoria" value={product.category.name} />
              <KeyValue label="Preço de venda" value={formatCurrency(product.salePrice)} />
              <KeyValue label="Código de barras" value={product.barcode} mono />
              <KeyValue label="Endereços" value={product.warehouseAddresses.length ? product.warehouseAddresses.slice(0, 4).map(a => `${a.code} (${a.quantity ?? 0})`).join(', ') : '—'} />
              <KeyValue label="Lotes ativos" value={product.lots.length ? product.lots.slice(0, 4).map(l => `${l.lotNumber} (${l.quantity})`).join(', ') : '—'} />
            </View>
            <Button title="Ver detalhes do produto" icon="package" variant="outline" onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: product.id } })} />
            {canWrite ? (
              <View style={{ gap: space.sm }}>
                <AppText variant="overline" color="tertiary">{mode === 'query' ? 'Movimentar este produto' : `Modo ${active?.label.toLowerCase()}`}</AppText>
                {mode === 'entry' ? <Button title="Registrar entrada" icon="arrow-down-circle" onPress={() => go('/entradas/nova')} /> : null}
                {mode === 'exit' ? <Button title="Registrar saída" icon="arrow-up-circle" onPress={() => go('/saidas/nova')} /> : null}
                {mode === 'transfer' ? <Button title="Transferir de endereço" icon="shuffle" onPress={() => go('/movimento', 'transfer')} /> : null}
                {mode === 'query' ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <Button title="Entrada" icon="arrow-down-circle" size="sm" onPress={() => go('/entradas/nova')} style={{ flex: 1 }} />
                      <Button title="Saída" icon="arrow-up-circle" size="sm" onPress={() => go('/saidas/nova')} style={{ flex: 1 }} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: space.sm }}>
                      <Button title="Transferir" icon="shuffle" size="sm" variant="outline" onPress={() => go('/movimento', 'transfer')} style={{ flex: 1 }} />
                      <Button title="Ajustar" icon="sliders" size="sm" variant="outline" onPress={() => go('/movimento', 'adjustment')} style={{ flex: 1 }} />
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}
            <Button title="Nova leitura" icon="refresh-cw" variant="ghost" size="sm" onPress={reset} />
          </View>
        </Card>
      ) : null}

      {recent.length > 0 ? (
        <Card>
          <CardHeader title="Consultas recentes" description="Nesta sessão" />
          <View style={{ gap: space.sm }}>
            {recent.map(p => (
              <ListRow key={p.id} title={p.name} subtitle={p.barcode || p.internalCode} icon="package" chevron onPress={() => pick(p.id)} />
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  camera: { height: 280, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, backgroundColor: '#000' },
  reticle: { position: 'absolute', top: '25%', left: '12%', right: '12%', bottom: '25%', borderWidth: 2, borderColor: '#ffffffcc', borderRadius: 12 },
  hint: { position: 'absolute', bottom: 10, alignSelf: 'center', backgroundColor: '#00000099', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  found: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
})
