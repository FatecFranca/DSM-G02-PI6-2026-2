import { Feather } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { ColorValue } from 'react-native'
import { ComponentProps } from 'react'
import { useAlerts } from '@/lib/alerts'
import { useTheme } from '@/theme/ThemeProvider'

type FeatherName = ComponentProps<typeof Feather>['name']

const tab = (icon: FeatherName) => ({
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Feather name={icon} size={size} color={color as string} />,
})

export default function TabsLayout() {
  const { colors } = useTheme()
  const { unread } = useAlerts()

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgBase },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.bgBase, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bgSubtle },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', headerTitle: 'Dashboard', ...tab('home') }} />
      <Tabs.Screen name="produtos" options={{ title: 'Produtos', ...tab('package') }} />
      <Tabs.Screen name="movimentar" options={{ title: 'Movimentar', ...tab('repeat') }} />
      <Tabs.Screen
        name="alertas"
        options={{ title: 'Alertas', tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined, tabBarBadgeStyle: { backgroundColor: colors.danger }, ...tab('bell') }}
      />
      <Tabs.Screen name="mais" options={{ title: 'Mais', headerTitle: 'Mais opções', ...tab('menu') }} />
    </Tabs>
  )
}
