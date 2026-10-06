import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { AppText, Avatar, Button, Card, ListRow, Screen, SectionTitle } from '@/components/ui'
import { useAlerts } from '@/lib/alerts'
import { useAuth } from '@/lib/auth'
import { MENU } from '@/lib/nav'
import { ROLE_LABELS } from '@/lib/permissions'
import { space } from '@/theme/tokens'

export default function MaisScreen() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { unread } = useAlerts()
  if (!user) return null

  return (
    <Screen>
      <Card onPress={() => router.push('/configuracoes')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={user.name} size={48} />
          <View style={{ flex: 1 }}>
            <AppText bold>{user.name}</AppText>
            <AppText variant="small" color="tertiary">{user.email}</AppText>
            <AppText variant="caption" color="brand" bold>{ROLE_LABELS[user.role]} · {user.department}</AppText>
          </View>
        </View>
      </Card>

      {MENU.map(group => {
        const items = group.items.filter(i => !i.roles || i.roles.includes(user.role))
        if (items.length === 0) return null
        return (
          <View key={group.label} style={{ gap: space.sm }}>
            <SectionTitle>{group.label}</SectionTitle>
            {items.map(item => (
              <ListRow key={item.href} icon={item.icon} tone="brand" title={item.label} subtitle={item.desc} chevron onPress={() => router.push(item.href as never)} />
            ))}
          </View>
        )
      })}
      {unread > 0 ? <AppText variant="caption" color="tertiary" align="center">{unread} alerta(s) não lido(s)</AppText> : null}
      <Button title="Sair da conta" icon="log-out" variant="outline" onPress={logout} />
    </Screen>
  )
}
