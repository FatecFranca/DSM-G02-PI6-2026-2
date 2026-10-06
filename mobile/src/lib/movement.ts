import type { IconName } from '@/components/ui/Icon'
import type { Tone } from '@/theme/tokens'
import type { ApiMovement, MovementType } from '@/types/api'

export const MOVEMENT_META: Record<MovementType, { label: string; icon: IconName; tone: Tone }> = {
  entry: { label: 'Entrada', icon: 'arrow-down-circle', tone: 'success' },
  exit: { label: 'Saída', icon: 'arrow-up-circle', tone: 'info' },
  transfer: { label: 'Transferência', icon: 'shuffle', tone: 'warning' },
  loss: { label: 'Perda', icon: 'alert-triangle', tone: 'danger' },
  adjustment: { label: 'Ajuste', icon: 'sliders', tone: 'neutral' },
  inventory: { label: 'Inventário', icon: 'clipboard', tone: 'brand' },
}

/** Sinal visual da quantidade: +entrada, −saída/perda, e ajustes conforme o sentido. */
export function movementSign(m: Pick<ApiMovement, 'type' | 'quantity'>): '+' | '−' | '' {
  if (m.type === 'entry') return '+'
  if (m.type === 'exit' || m.type === 'loss') return '−'
  if ((m.type === 'adjustment' || m.type === 'inventory') && m.quantity !== 0) return m.quantity < 0 ? '−' : '+'
  return ''
}

export const STOCK_TONE: Record<string, Tone> = { ok: 'success', low: 'warning', critical: 'danger', out: 'danger' }
