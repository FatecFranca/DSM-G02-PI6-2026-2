import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { AppText, Badge, Banner, Button, Card, CardHeader, Icon, Screen } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'

/**
 * Identificação de produtos por foto.
 * Igual ao web: o modelo de visão ainda não está integrado ao backend, então a tela apenas recebe e
 * mostra a imagem e aponta as alternativas que funcionam — sem inventar resultados de reconhecimento.
 */
export default function IaScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [uri, setUri] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function pick(source: 'camera' | 'library') {
    setError('')
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) return setError('Permissão negada. Ative o acesso nas configurações do aparelho.')
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (!result.canceled) setUri(result.assets[0].uri)
  }

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <AppText variant="heading">Identificação por foto</AppText>
          <Badge label="Em desenvolvimento" tone="warning" />
        </View>
        <AppText color="tertiary">Reconhecimento de produtos por visão computacional</AppText>
      </View>

      <Banner tone="info">O modelo de visão ainda não está integrado ao backend, então nenhuma identificação automática é feita. Você pode enviar a imagem para conferência visual e usar o Scanner ou o cadastro manual.</Banner>
      {error ? <Banner>{error}</Banner> : null}

      <Card>
        {uri ? (
          <View style={{ gap: space.md }}>
            <Image source={{ uri }} style={[styles.image, { backgroundColor: colors.bgMuted }]} resizeMode="contain" accessibilityLabel="Pré-visualização do produto" />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Buscar por código" icon="maximize" variant="outline" onPress={() => router.push('/scanner')} style={{ flex: 1 }} />
              <Button title="Cadastrar" icon="plus" onPress={() => router.push('/produtos/form')} style={{ flex: 1 }} />
            </View>
            <Button title="Remover imagem" variant="ghost" icon="x" onPress={() => setUri(null)} />
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

      <Card>
        <CardHeader title="Como vai funcionar" right={<Icon name="cpu" size={16} color="brand" />} />
        {['Envie uma foto do produto', 'O modelo reconhece nome, categoria e marca', 'Você revisa as sugestões', 'O cadastro é pré-preenchido com um toque'].map((t, i) => (
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
