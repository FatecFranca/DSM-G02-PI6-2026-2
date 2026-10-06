import { forwardRef, ReactNode, useState } from 'react'
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native'
import { maskDate } from '@/lib/format'
import { useTheme } from '@/theme/ThemeProvider'
import { font, radius } from '@/theme/tokens'
import { Icon, IconName } from './Icon'
import { AppText } from './Text'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: IconName
  right?: ReactNode
  /** Campo de senha com botão de mostrar/ocultar. */
  password?: boolean
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, hint, leftIcon, right, password, multiline, ...props }, ref) {
  const { colors } = useTheme()
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.field}>
      {label ? <AppText variant="small" bold style={{ marginBottom: 6 }}>{label}</AppText> : null}
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          { backgroundColor: colors.bgBase, borderColor: error ? colors.danger : focused ? colors.brand : colors.border },
          props.editable === false && { opacity: 0.55 },
        ]}
      >
        {leftIcon ? <View style={styles.icon}><Icon name={leftIcon} size={16} color="tertiary" /></View> : null}
        <TextInput
          ref={ref}
          multiline={multiline}
          secureTextEntry={password && !visible}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          placeholderTextColor={colors.textTertiary}
          accessibilityLabel={label}
          onFocus={e => { setFocused(true); props.onFocus?.(e) }}
          onBlur={e => { setFocused(false); props.onBlur?.(e) }}
          style={[styles.input, { color: colors.text }, multiline && { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 }]}
          {...props}
        />
        {password ? (
          <Pressable onPress={() => setVisible(v => !v)} hitSlop={10} accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'} style={styles.icon}>
            <Icon name={visible ? 'eye-off' : 'eye'} size={16} color="tertiary" />
          </Pressable>
        ) : null}
        {right}
      </View>
      {error ? <AppText variant="caption" color="danger" style={{ marginTop: 4 }}>{error}</AppText> : null}
      {hint && !error ? <AppText variant="caption" color="tertiary" style={{ marginTop: 4 }}>{hint}</AppText> : null}
    </View>
  )
})

/** Campo de data DD/MM/AAAA com máscara. O valor continua em texto; use `brDateToIso` para enviar. */
export function DateField({ value, onChangeText, ...props }: Omit<InputProps, 'keyboardType' | 'maxLength'> & { value: string; onChangeText: (v: string) => void }) {
  return <Input {...props} value={value} onChangeText={t => onChangeText(maskDate(t))} keyboardType="number-pad" placeholder="DD/MM/AAAA" maxLength={10} leftIcon="calendar" />
}

const styles = StyleSheet.create({
  field: { alignSelf: 'stretch' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: radius.md, minHeight: 44, paddingHorizontal: 12 },
  multiline: { alignItems: 'flex-start' },
  input: { flex: 1, fontSize: font.md, paddingVertical: 10 },
  icon: { marginRight: 8 },
})
