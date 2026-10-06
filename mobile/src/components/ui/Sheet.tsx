import { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme/ThemeProvider'
import { radius, space } from '@/theme/tokens'
import { Button } from './Button'
import { AppText } from './Text'

interface SheetProps {
  visible: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Altura máxima como fração da tela (padrão 0.85). */
  maxHeight?: number
}

/** Bottom sheet modal: usado por seletores, formulários rápidos e confirmações. */
export function Sheet({ visible, onClose, title, description, children, footer }: SheetProps) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { backgroundColor: colors.bgBase, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          {title ? (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText variant="subheading">{title}</AppText>
                {description ? <AppText variant="small" color="tertiary" style={{ marginTop: 2 }}>{description}</AppText> : null}
              </View>
              <Button icon="x" variant="ghost" size="sm" onPress={onClose} accessibilityLabel="Fechar" />
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.md }}>
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { maxHeight: '88%', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, borderWidth: 1 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingTop: space.md },
  footer: { flexDirection: 'row', gap: space.md, justifyContent: 'flex-end', paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: 1 },
})
