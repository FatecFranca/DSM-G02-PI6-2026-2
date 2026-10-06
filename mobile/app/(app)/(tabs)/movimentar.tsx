import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { MovementRow } from '@/components/MovementRow'
import { AppText, Button, Card, Icon, Screen, SectionTitle, SkeletonList } from '@/components/ui'
import type { IconName } from '@/components/ui/Icon'
import { useAuth } from '@/lib/auth'
import { hasRole, WRITERS } from '@/lib/permissions'
import { useFetch } from '@/lib/useFetch'
import { useTheme } from '@/theme/ThemeProvider'
import { space, Tone, toneColors } from '@/theme/tokens'
import type { ApiMovement, Paginated } from '@/types/api'

interface Tile { label: string; icon: IconName; tone: Tone; href: string; write?: boolean }

const TILES: Tile[] = [
  { label: 'Nova entrada', icon: 'arrow-down-circle', tone: 'success', href: '/entradas/nova', write: true },
  { label: 'Nova saída', icon: 'arrow-up-circle', tone: 'info', href: '/saidas/nova', write: true },
  { label: 'Transferir', icon: 'shuffle', tone: 'warning', href: '/movimento?kind=transfer', write: true },
  { label: 'Ajustar estoque', icon: 'sliders', tone: 'neutral', href: '/movimento?kind=adjustment', write: true },
  { label: 'Scanner', icon: 'maximize', tone: 'brand', href: '/scanner' },
  { label: 'Inventário', icon: 'clipboard', tone: 'brand', href: '/inventario' },
  { label: 'Endereços', icon: 'map-pin', tone: 'info', href: '/enderecos' },
  { label: 'Lotes', icon: 'layers', tone: 'warning', href: '/lotes' },
]

export default function MovimentarScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const recent = useFetch<Paginated<ApiMovement>>('/movements', { limit: 5 })
  const canWrite = hasRole(user?.role, WRITERS)
  const tiles = TILES.filter(t => !t.write || canWrite)

  return (
    <Screen onRefresh={recent.refresh} refreshing={recent.refreshing}>
      <View style={styles.grid}>
        {tiles.map(t => {
          const c = toneColors(colors, t.tone)
          return (
            <Card key={t.label} onPress={() => router.push(t.href as never)} style={styles.tile}>
              <View style={[styles.icon, { backgroundColor: c.bg }]}><Icon name={t.icon} size={22} color={t.tone} /></View>
              <AppText bold>{t.label}</AppText>
            </Card>
          )
        })}
      </View>

      <SectionTitle right={<Button title="Ver histórico" variant="ghost" size="sm" onPress={() => router.push('/movimentacoes')} />}>Últimas movimentações</SectionTitle>
      {recent.loading ? <SkeletonList rows={3} /> : (
        <View style={{ gap: space.sm }}>
          {recent.data?.data.map(m => <MovementRow key={m.id} m={m} />)}
          {recent.data?.data.length === 0 ? <AppText color="tertiary">Nenhuma movimentação ainda.</AppText> : null}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { flexBasis: '47%', flexGrow: 1, gap: space.md },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
