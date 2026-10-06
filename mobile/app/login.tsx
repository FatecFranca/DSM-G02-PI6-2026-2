import { Redirect } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppText, Banner, Button, Icon, Input, Loading } from '@/components/ui'
import { defaultApiUrl, errorMessage, getApiUrl, setApiUrl } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'

const DEMO_USERS = [
  { label: 'Administrador', email: 'admin@stockiq.com' },
  { label: 'Supervisor', email: 'supervisor@stockiq.com' },
  { label: 'Operador', email: 'operador@stockiq.com' },
  { label: 'Visualizador', email: 'visualizador@stockiq.com' },
]

const FEATURES = [
  { icon: 'shield' as const, title: 'WMS completo', desc: 'Endereço, lote, validade e inventário' },
  { icon: 'cpu' as const, title: 'Previsão de demanda', desc: 'Sugestões de compra com machine learning' },
  { icon: 'bar-chart-2' as const, title: 'Analytics', desc: 'Curva ABC, giro e relatórios' },
]

export default function LoginScreen() {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('admin@stockiq.com')
  const [password, setPassword] = useState('Senha@123')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showServer, setShowServer] = useState(false)
  const [server, setServer] = useState(getApiUrl())

  if (loading) return <Loading label="Abrindo…" />
  if (user) return <Redirect href="/" />

  async function submit() {
    if (!email.trim() || !password) return setError('Informe e-mail e senha.')
    setBusy(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar'))
    } finally {
      setBusy(false)
    }
  }

  async function saveServer() {
    await setApiUrl(server)
    setServer(getApiUrl())
    setError('')
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.bgSubtle }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xxl, paddingBottom: insets.bottom + space.xxl }]}
    >
      <View style={styles.brand}>
        <View style={[styles.logo, { backgroundColor: colors.brand }]}>
          <Icon name="box" size={26} color="inverse" />
        </View>
        <AppText variant="title">StockIQ</AppText>
        <AppText color="secondary">WMS · ERP Lite</AppText>
      </View>

      <View style={styles.form}>
        <View>
          <AppText variant="heading">Bem-vindo de volta</AppText>
          <AppText color="secondary" style={{ marginTop: 2 }}>Acesse sua conta para continuar</AppText>
        </View>

        {error ? <Banner>{error}</Banner> : null}

        <Input label="E-mail corporativo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" leftIcon="mail" placeholder="seu@empresa.com.br" />
        <Input label="Senha" value={password} onChangeText={setPassword} password autoComplete="password" leftIcon="lock" placeholder="Sua senha" onSubmitEditing={submit} returnKeyType="go" />
        <Button title={busy ? 'Entrando…' : 'Entrar'} onPress={submit} loading={busy} size="lg" full />

        <View style={[styles.demo, { backgroundColor: colors.brandSubtle, borderColor: colors.brandMuted }]}>
          <AppText variant="small" bold color="brand">Acesso de demonstração — senha Senha@123</AppText>
          <View style={styles.demoGrid}>
            {DEMO_USERS.map(u => (
              <Pressable
                key={u.email}
                onPress={() => { setEmail(u.email); setPassword('Senha@123') }}
                style={[styles.demoItem, { backgroundColor: colors.bgBase, borderColor: email === u.email ? colors.brand : colors.border }]}
              >
                <AppText variant="small" bold>{u.label}</AppText>
                <AppText variant="caption" color="tertiary" numberOfLines={1}>{u.email}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable onPress={() => setShowServer(v => !v)} style={styles.serverToggle} accessibilityRole="button">
          <Icon name="server" size={14} color="tertiary" />
          <AppText variant="small" color="tertiary">Servidor da API</AppText>
          <Icon name={showServer ? 'chevron-up' : 'chevron-down'} size={14} color="tertiary" />
        </Pressable>
        {showServer ? (
          <View style={{ gap: space.sm }}>
            <Input value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" hint="Ex.: http://192.168.0.10:3001/api — o celular precisa estar na mesma rede do servidor." />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Salvar endereço" variant="outline" size="sm" onPress={saveServer} />
              <Button title="Restaurar padrão" variant="ghost" size="sm" onPress={async () => { await setApiUrl(null); setServer(defaultApiUrl()) }} />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.features}>
        {FEATURES.map(f => (
          <View key={f.title} style={styles.feature}>
            <View style={[styles.featureIcon, { backgroundColor: colors.brandSubtle }]}><Icon name={f.icon} size={16} color="brand" /></View>
            <View style={{ flex: 1 }}>
              <AppText variant="small" bold>{f.title}</AppText>
              <AppText variant="caption" color="tertiary">{f.desc}</AppText>
            </View>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="tertiary" align="center">© 2026 StockIQ · FATEC Franca</AppText>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, gap: space.xl, maxWidth: 520, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: 4 },
  logo: { width: 56, height: 56, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  form: { gap: space.lg },
  demo: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  demoItem: { flexBasis: '48%', flexGrow: 1, borderWidth: 1, borderRadius: radius.md, padding: space.sm },
  serverToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  features: { gap: space.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  featureIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
})
