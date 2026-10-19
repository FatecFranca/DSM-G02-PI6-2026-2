import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { ProductThumb } from '@/components/ProductThumb'
import { AppText, Badge, Banner, Button, Card, CardHeader, Icon, Screen } from '@/components/ui'
import { api, errorMessage } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'

interface Identification {
  identified: boolean
  confidence: number
  model: string
  suggestion: { name: string; description: string; keywords: string[]; categoryName: string | null; categoryId: string | null; brandName: string | null; brandId: string | null }
  candidates: { id: string; name: string; internalCode: string; sku: string; currentStock: number; categoryName: string; imageUrl: string | null }[]
}

/**
 * Identificação de produtos por foto: a API envia a imagem a um modelo de visão (a chave fica só no servidor)
 * e devolve nome, categoria, marca e descrição sugeridos, além de produtos parecidos já cadastrados.
 */
export default function IaScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [uri, setUri] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<Identification | null>(null)
  const [error, setError] = useState('')

  async function pick(source: 'camera' | 'library') {
    setError('')
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return setError('Permissão negada. Ative o acesso nas configurações do aparelho.')
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!picked.canceled) {
      setUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  async function analyze() {
    if (!uri) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const form = new FormData()
      // React Native aceita { uri, name, type } como arquivo no FormData.
      form.append('image', { uri, name: 'produto.jpg', type: 'image/jpeg' } as unknown as Blob)
      setResult(await api.upload<Identification>('/ai/identify-product', form))
    } catch (err) {
      const message = errorMessage(err, 'Falha ao analisar a imagem')
      setError(/not configured|rejected the API key/i.test(message) ? 'A identificação por IA não está disponível: a chave da OpenAI não está configurada no servidor.' : message)
    } finally {
      setAnalyzing(false)
    }
  }

  function register() {
    const s = result?.suggestion
    router.push({ pathname: '/produtos/form', params: { ...(s?.name ? { name: s.name } : {}), ...(s?.description ? { description: s.description } : {}), ...(s?.categoryId ? { categoryId: s.categoryId } : {}), ...(s?.brandId ? { brandId: s.brandId } : {}) } })
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="heading">Identificação por foto</AppText>
          <Badge label="Visão computacional" tone="brand" />
        </View>
        <AppText color="tertiary">A IA sugere nome, categoria e marca e procura produtos parecidos no catálogo</AppText>
      </View>

      {error ? <Banner>{error}</Banner> : null}

      <Card>
        {uri ? (
          <View style={{ gap: space.md }}>
            <Image source={{ uri }} style={[styles.image, { backgroundColor: colors.bgMuted }]} resizeMode="contain" accessibilityLabel="Pré-visualização do produto" />
            <Button title={analyzing ? 'Analisando…' : result ? 'Analisar novamente' : 'Identificar com IA'} icon="cpu" onPress={analyze} loading={analyzing} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Buscar por código" icon="maximize" variant="outline" onPress={() => router.push('/scanner')} style={{ flex: 1 }} />
              <Button title="Remover" variant="ghost" icon="x" onPress={() => { setUri(null); setResult(null) }} style={{ flex: 1 }} />
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.lg }}>
            <View style={[styles.drop, { backgroundColor: colors.bgMuted }]}><Icon name="image" size={32} color="tertiary" /></View>
            <AppText bold>Envie uma foto do produto</AppText>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Tirar foto" icon="camera" onPress={() => pick('camera')} />
              <Button title="Galeria" icon="image" variant="outline" onPress={() => pick('library')} />
            </View>
          </View>
        )}
      </Card>

      {result ? (
        <Card>
          <CardHeader title={result.identified ? 'Produto identificado' : 'Não foi possível identificar'} description={`Confiança ${Math.round(result.confidence * 100)}%`} />
          {result.identified ? (
            <View style={{ gap: space.sm }}>
              <AppText bold>{result.suggestion.name}</AppText>
              <AppText variant="small" color="secondary">Categoria: {result.suggestion.categoryName ?? '—'}{result.suggestion.categoryName && !result.suggestion.categoryId ? ' (não existe no catálogo)' : ''}</AppText>
              <AppText variant="small" color="secondary">Marca: {result.suggestion.brandName ?? '—'}{result.suggestion.brandName && !result.suggestion.brandId ? ' (não existe no catálogo)' : ''}</AppText>
              {result.suggestion.description ? <AppText variant="small" color="tertiary">{result.suggestion.description}</AppText> : null}
              <Button title="Cadastrar com estes dados" icon="plus" onPress={register} />
            </View>
          ) : (
            <AppText color="secondary">Tente uma foto mais próxima, com boa luz e fundo limpo, ou use o Scanner / cadastro manual.</AppText>
          )}
        </Card>
      ) : null}

      {result && result.candidates.length > 0 ? (
        <Card>
          <CardHeader title="Produtos parecidos no catálogo" description="Confira antes de criar um novo" />
          {result.candidates.map(c => (
            <View key={c.id} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: 6 }}>
              <ProductThumb uri={c.imageUrl} size={40} />
              <View style={{ flex: 1 }}>
                <AppText bold numberOfLines={1} onPress={() => router.push({ pathname: '/produtos/[id]', params: { id: c.id } })}>{c.name}</AppText>
                <AppText variant="mono" color="tertiary" numberOfLines={1}>{c.internalCode} · {c.categoryName}</AppText>
              </View>
              <AppText variant="caption" color="secondary">{formatNumber(c.currentStock)} un</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Como funciona" right={<Icon name="cpu" size={16} color="brand" />} />
        {['Envie uma foto do produto', 'A API envia a imagem a um modelo de visão', 'Você revisa as sugestões', 'O cadastro é pré-preenchido com um toque'].map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 5 }}>
            <View style={[styles.step, { backgroundColor: colors.brandSubtle }]}><AppText variant="caption" bold color="brand">{i + 1}</AppText></View>
            <AppText variant="small" color="secondary" style={{ flex: 1 }}>{t}</AppText>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 260, borderRadius: radius.lg },
  drop: { width: 72, height: 72, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center' },
  step: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
})
