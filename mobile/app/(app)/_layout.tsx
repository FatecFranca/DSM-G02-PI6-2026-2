import { Redirect, Stack } from 'expo-router'
import { Loading } from '@/components/ui'
import { AlertsProvider } from '@/lib/alerts'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/theme/ThemeProvider'

/** Telas empilhadas por cima das abas. A chave é o caminho do arquivo em app/(app). */
const TITLES: Record<string, string> = {
  'produtos/[id]': 'Produto',
  'produtos/form': 'Produto',
  movimento: 'Movimentação',
  categorias: 'Categorias',
  marcas: 'Marcas',
  fornecedores: 'Fornecedores',
  clientes: 'Clientes',
  entradas: 'Entradas',
  'entradas/nova': 'Nova entrada',
  saidas: 'Saídas',
  'saidas/nova': 'Nova saída',
  movimentacoes: 'Histórico',
  lotes: 'Lotes',
  enderecos: 'Endereços',
  inventario: 'Inventário',
  'inventario/novo': 'Novo inventário',
  'inventario/[id]': 'Contagem',
  scanner: 'Scanner',
  ia: 'IA — Produtos',
  'ia-analitica': 'IA Analítica',
  relatorios: 'Relatórios',
  usuarios: 'Usuários',
  auditoria: 'Auditoria',
  configuracoes: 'Configurações',
}

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { colors } = useTheme()

  if (loading) return <Loading label="Abrindo…" />
  if (!user) return <Redirect href="/login" />

  return (
    <AlertsProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bgSubtle },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {Object.entries(TITLES).map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={{ title }} />
        ))}
      </Stack>
    </AlertsProvider>
  )
}
