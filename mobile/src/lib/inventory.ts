import type { IconName } from '@/components/ui/Icon'
import type { Tone } from '@/theme/tokens'
import type { InventoryStatus } from '@/types/api'

export const INVENTORY_STATUS: Record<InventoryStatus, { label: string; tone: Tone; icon: IconName }> = {
  planned: { label: 'Planejado', tone: 'neutral', icon: 'clock' },
  in_progress: { label: 'Em andamento', tone: 'warning', icon: 'play' },
  review: { label: 'Em revisão', tone: 'info', icon: 'alert-triangle' },
  completed: { label: 'Concluído', tone: 'success', icon: 'check-circle' },
}

export const INVENTORY_TYPES = { full: 'Completo', partial: 'Parcial', cyclic: 'Cíclico' }
