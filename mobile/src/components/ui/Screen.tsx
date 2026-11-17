import { ReactNode, Ref } from 'react'
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { space } from '@/theme/tokens'

interface ScreenProps {
  children: ReactNode
  /** Rodapé fixo (ex.: botão "Salvar"). */
  footer?: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  contentStyle?: StyleProp<ViewStyle>
  /** false para telas que cuidam da própria rolagem (FlatList, mapas). */
  scroll?: boolean
  /** Acesso ao ScrollView (ex.: voltar ao topo depois de escolher um item no fim da tela). */
  scrollRef?: Ref<ScrollView>
}

/** Fundo + rolagem + puxar-para-atualizar + rodapé fixo, padrão de toda tela do app. */
export function Screen({ children, footer, onRefresh, refreshing, contentStyle, scroll = true, scrollRef }: ScreenProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: footer ? space.lg : insets.bottom + space.xxl }, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  )
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.bgSubtle }]}>
      {body}
      {footer ? (
        <View style={[styles.footer, { backgroundColor: colors.bgBase, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, space.md) }]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: space.lg, gap: space.md },
  footer: { flexDirection: 'row', gap: space.md, padding: space.md, borderTopWidth: 1 },
})
