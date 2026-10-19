import { View } from 'react-native'
import { AppText, Banner, ProgressBar } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import { INVENTORY_JOB } from '@/lib/inventory'
import { space } from '@/theme/tokens'
import type { ApiInventoryCount } from '@/types/api'

/** Andamento do ajuste de estoque que o servidor faz por fila depois de concluir o inventário. */
export function InventoryJobNotice({ inv, onRetry }: { inv: ApiInventoryCount; onRetry?: () => void }) {
  if (!inv.jobStatus) return null
  const meta = INVENTORY_JOB[inv.jobStatus]
  const adjusted = inv.adjustedItems ?? 0
  const failed = inv.failedItems ?? 0
  const done = adjusted + failed
  const percent = inv.divergences > 0 ? Math.min(100, Math.round((done / inv.divergences) * 100)) : 100

  const detail = {
    pending: 'O inventário foi concluído e o ajuste aguarda processamento.',
    processing: `${formatNumber(done)} de ${formatNumber(inv.divergences)} divergência(s) processada(s).`,
    completed: inv.divergences === 0 ? 'Nenhuma divergência para ajustar.' : `${formatNumber(adjusted)} divergência(s) aplicada(s) ao estoque.`,
    partial: `${formatNumber(adjusted)} ajustado(s); ${formatNumber(failed)} precisa(m) de ajuste manual (veja os itens).`,
    failed: inv.jobError || 'Não foi possível processar o ajuste.',
  }[inv.jobStatus]

  return (
    <Banner tone={meta.tone} onRetry={inv.jobStatus === 'failed' || inv.jobStatus === 'partial' ? onRetry : undefined}>
      <View style={{ gap: space.xs }}>
        <AppText variant="small" bold>{meta.label}</AppText>
        <AppText variant="caption">{detail}</AppText>
        {inv.jobStatus === 'processing' && inv.divergences > 0 ? <ProgressBar value={percent} tone="info" height={6} /> : null}
      </View>
    </Banner>
  )
}
