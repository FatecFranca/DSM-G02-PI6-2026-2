import { View } from 'react-native'
import { AppText, Badge, Card, Icon } from '@/components/ui'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import { MOVEMENT_META, movementSign } from '@/lib/movement'
import { EXIT_REASON_LABELS } from '@/lib/status'
import { useTheme } from '@/theme/ThemeProvider'
import { toneColors } from '@/theme/tokens'
import type { ApiMovement } from '@/types/api'

export function MovementRow({ m, onPress }: { m: ApiMovement; onPress?: () => void }) {
  const { colors } = useTheme()
  const meta = MOVEMENT_META[m.type]
  const c = toneColors(colors, meta.tone)
  const sign = movementSign(m)
  const details = [
    m.invoiceNumber,
    m.lotNumber ? `lote ${m.lotNumber}` : null,
    m.fromAddress && m.toAddress ? `${m.fromAddress.code} → ${m.toAddress.code}` : m.toAddress ? `→ ${m.toAddress.code}` : m.fromAddress ? `${m.fromAddress.code} →` : null,
    m.supplier?.name,
    m.customerName ? `→ ${m.customerName}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={meta.icon} size={17} color={meta.tone} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <AppText bold numberOfLines={2}>{m.product.name}</AppText>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label={meta.label} tone={meta.tone} />
            {m.exitReason ? <Badge label={EXIT_REASON_LABELS[m.exitReason] ?? m.exitReason} /> : null}
            <AppText variant="mono" color="tertiary">{m.product.internalCode}</AppText>
          </View>
          {details ? <AppText variant="caption" color="tertiary" numberOfLines={2}>{details}</AppText> : null}
          {m.notes ? <AppText variant="caption" color="secondary" numberOfLines={2}>“{m.notes}”</AppText> : null}
          <AppText variant="caption" color="tertiary">{m.user.name} · {formatDateTime(m.createdAt)}</AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText bold color={sign === '+' ? 'success' : sign === '−' ? 'danger' : 'primary'} style={{ fontSize: 16 }}>{sign}{formatNumber(Math.abs(m.quantity))}</AppText>
          <AppText variant="caption" color="secondary">{formatCurrency(m.totalValue)}</AppText>
        </View>
      </View>
    </Card>
  )
}
