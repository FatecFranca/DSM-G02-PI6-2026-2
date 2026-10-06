import { Feather } from '@expo/vector-icons'
import { ComponentProps } from 'react'
import { useTheme } from '@/theme/ThemeProvider'
import { Tone, toneColors } from '@/theme/tokens'

export type IconName = ComponentProps<typeof Feather>['name']

interface IconProps {
  name: IconName
  size?: number
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | Tone
}

export function Icon({ name, size = 18, color = 'secondary' }: IconProps) {
  const { colors } = useTheme()
  const resolved =
    color === 'primary' ? colors.text
    : color === 'secondary' ? colors.textSecondary
    : color === 'tertiary' ? colors.textTertiary
    : color === 'inverse' ? colors.textInverse
    : toneColors(colors, color).fg
  return <Feather name={name} size={size} color={resolved} />
}
