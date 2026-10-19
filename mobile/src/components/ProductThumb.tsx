import { useState } from 'react'
import { Image, View } from 'react-native'
import { Icon } from '@/components/ui'
import { useTheme } from '@/theme/ThemeProvider'

/** Foto do produto (URL assinada devolvida pela API) com ícone de reserva quando não há foto ou o link expirou. */
export function ProductThumb({ uri, size = 40, radius = 10 }: { uri?: string | null; size?: number; radius?: number }) {
  const { colors } = useTheme()
  const [failed, setFailed] = useState<string | null>(null)
  const show = !!uri && failed !== uri
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {show
        ? <Image source={{ uri: uri! }} accessibilityIgnoresInvertColors style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(uri!)} />
        : <Icon name="package" size={Math.round(size * 0.45)} color="tertiary" />}
    </View>
  )
}
