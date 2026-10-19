import type { IconName } from '@/components/ui/Icon'
import type { Tone } from '@/theme/tokens'
import type { InventoryJobStatus, InventoryStatus } from '@/types/api'

export const INVENTORY_STATUS: Record<InventoryStatus, { label: string; tone: Tone; icon: IconName }> = {
  planned: { label: 'Planejado', tone: 'neutral', icon: 'clock' },
  in_progress: { label: 'Em andamento', tone: 'warning', icon: 'play' },
  review: { label: 'Em revisão', tone: 'info', icon: 'alert-triangle' },
  completed: { label: 'Concluído', tone: 'success', icon: 'check-circle' },
}

export const INVENTORY_TYPES = { full: 'Completo', partial: 'Parcial', cyclic: 'Cíclico' }

/** Situação do ajuste de estoque feito de forma assíncrona (fila) depois de concluir o inventário. */
export const INVENTORY_JOB: Record<InventoryJobStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Na fila para ajustar o estoque', tone: 'info' },
  processing: { label: 'Ajustando o estoque…', tone: 'info' },
  completed: { label: 'Estoque ajustado', tone: 'success' },
  partial: { label: 'Ajuste concluído com pendências', tone: 'warning' },
  failed: { label: 'O ajuste de estoque falhou', tone: 'danger' },
}

export const isJobActive = (status?: InventoryJobStatus | null) => status === 'pending' || status === 'processing'
