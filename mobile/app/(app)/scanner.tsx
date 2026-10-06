import { CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { useCallback, useRef, useState } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { AppText, Badge, Banner, Button, Card, EmptyState, Icon, Input, KeyValue, Screen } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { formatCurrency, formatNumber } from '@/lib/format'
import { STOCK_TONE } from '@/lib/movement'
import { hasRole, WRITERS } from '@/lib/permissions'
import { STOCK_STATUS_LABELS } from '@/lib/status'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'
import type { ApiProduct, ApiProductDetails, Paginated } from '@/types/api'

/** Acha o produto pelo código lido: prioriza correspondência exata (barras, SKU, código interno). */
async function findProduct(code: string): Promise<ApiProductDetails | null> {
  const res = await api.get<Paginated<ApiProduct>>('/products', { search: code, limit: 20 })
  const exact = res.data.find(p => [p.barcode, p.sku, p.internalCode].some(v => v.toLowerCase() === code.toLowerCase()))
  const match = exact ?? (res.data.length === 1 ? res.data[0] : null)
  return match ? api.get<ApiProductDetails>(`/products/${match.id}`) : null
}

export default function ScannerScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const canWrite = hasRole(user?.role, WRITERS)
  const [permission, requestPermission] = useCameraPermissions()
  const [cameraOn, setCameraOn] = useState(false)
  const [code, setCode] = useState('')
  const [searching, setSearching] = useState(false)
  const [product, setProduct] = useState<ApiProductDetails | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const lastScan = useRef<{ code: string; at: number }>({ code: '', at: 0 })

  const search = useCallback(async (value: string) => {
    const term = value.trim()
    if (!term) return
    setSearching(true)
    setError('')
    setNotFound(false)
    try {
      const found = await findProduct(term)
      setProduct(found)
      setNotFound(!found)
    } catch (err) {
      setProduct(null)
      setError(errorMessage(err))
    } finally {
      setSearching(false)
    }
  }, [])

  // O leitor dispara várias vezes por segundo: ignora a mesma leitura por 2 s.
  function onScanned({ data }: { data: string }) {
    const now = Date.now()
    if (data === lastScan.current.code && now - lastScan.current.at < 2000) return
    lastScan.current = { code: data, at: now }
    setCode(data)
    setCameraOn(false)
    void search(data)
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

  return (
    <Screen>
      <Card>
        <View style={{ gap: space.md }}>
          <Input label="Código de barras, SKU ou código interno" value={code} onChangeText={setCode} autoCapitalize="none" autoCorrect={false} leftIcon="maximize"
            onSubmitEditing={() => search(code)} returnKeyType="search" placeholder="7891234510000 · EL-0042" />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="Buscar" icon="search" onPress={() => search(code)} loading={searching} style={{ flex: 1 }} />
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
      {error ? <Banner>{error}</Banner> : null}
      {notFound ? (
        <Card>
          <EmptyState icon="alert-circle" title="Produto não encontrado" description={`O código "${code}" não corresponde a nenhum produto cadastrado.`}
            action={hasRole(user?.role, ['admin', 'supervisor']) ? <Button title="Cadastrar produto" variant="outline" onPress={() => router.push('/produtos/form')} /> : undefined} />
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
              <KeyValue label="Endereços" value={product.warehouseAddresses.length ? product.warehouseAddresses.map(a => `${a.code} (${a.quantity ?? 0})`).join(', ') : '—'} />
              <KeyValue label="Lotes ativos" value={product.lots.length ? product.lots.map(l => l.lotNumber).join(', ') : '—'} />
            </View>
            <Button title="Ver detalhes do produto" icon="package" variant="outline" onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: product.id } })} />
            {canWrite ? (
              <View style={{ gap: space.sm }}>
                <AppText variant="overline" color="tertiary">Movimentar este produto</AppText>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button title="Entrada" icon="arrow-down-circle" size="sm" onPress={() => go('/entradas/nova')} style={{ flex: 1 }} />
                  <Button title="Saída" icon="arrow-up-circle" size="sm" onPress={() => go('/saidas/nova')} style={{ flex: 1 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button title="Transferir" icon="shuffle" size="sm" variant="outline" onPress={() => go('/movimento', 'transfer')} style={{ flex: 1 }} />
                  <Button title="Ajustar" icon="sliders" size="sm" variant="outline" onPress={() => go('/movimento', 'adjustment')} style={{ flex: 1 }} />
                </View>
              </View>
            ) : null}
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
