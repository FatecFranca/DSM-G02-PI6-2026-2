'use client'
import { CheckCircle2, AlertTriangle, Loader2, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export type InventoryJobStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed'

export const isJobActive = (status?: InventoryJobStatus | null) => status === 'pending' || status === 'processing'

interface Props {
  jobStatus: InventoryJobStatus
  divergences: number
  adjustedItems: number
  failedItems: number
  jobError?: string | null
  canRetry: boolean
  retrying: boolean
  onRetry: () => void
}

/** Andamento do ajuste de estoque que o worker faz (via fila) depois que o inventário é concluído. */
export function InventoryJobBanner({ jobStatus, divergences, adjustedItems, failedItems, jobError, canRetry, retrying, onRetry }: Props) {
  const done = adjustedItems + failedItems
  const percent = divergences > 0 ? Math.min(100, Math.round((done / divergences) * 100)) : 100

  const config = {
    pending:    { Icon: Clock,         tone: 'info',    title: 'Na fila para ajustar o estoque', text: 'O inventário foi concluído e o ajuste está aguardando processamento.' },
    processing: { Icon: Loader2,       tone: 'info',    title: 'Ajustando o estoque…',           text: `${done} de ${divergences} divergência(s) processada(s).` },
    completed:  { Icon: CheckCircle2,  tone: 'success', title: 'Estoque ajustado',               text: divergences === 0 ? 'Nenhuma divergência para ajustar.' : `${adjustedItems} divergência(s) aplicada(s) ao estoque.` },
    partial:    { Icon: AlertTriangle, tone: 'warning', title: 'Ajuste concluído com pendências', text: `${adjustedItems} ajustado(s); ${failedItems} precisa(m) de ajuste manual (veja os itens).` },
    failed:     { Icon: AlertTriangle, tone: 'danger',  title: 'O ajuste de estoque falhou',     text: jobError || 'Não foi possível processar o ajuste.' },
  }[jobStatus]

  const toneClass = {
    info: 'border-[color:var(--info)]/40 bg-[color:var(--info-subtle)] text-[color:var(--info)]',
    success: 'border-[color:var(--success)]/40 bg-[color:var(--success-subtle)] text-[color:var(--success)]',
    warning: 'border-[color:var(--warning)]/40 bg-[color:var(--warning-subtle)] text-[color:var(--warning)]',
    danger: 'border-[color:var(--danger)]/40 bg-[color:var(--danger-subtle)] text-[color:var(--danger)]',
  }[config.tone]

  return (
    <div role="status" className={cn('mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5', toneClass)}>
      <config.Icon className={cn('h-4 w-4 flex-shrink-0', jobStatus === 'processing' && 'animate-spin')} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">{config.title}</p>
        <p className="text-xs text-[color:var(--text-secondary)]">{config.text}</p>
        {jobStatus === 'processing' && divergences > 0 && (
          <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[color:var(--bg-muted)]">
            <div className="h-full rounded-full bg-[color:var(--brand)] transition-all" style={{ width: `${percent}%` }} />
          </div>
        )}
        {jobStatus === 'partial' && jobError && <p className="text-[11px] text-[color:var(--text-tertiary)]">{jobError}</p>}
      </div>
      {canRetry && (jobStatus === 'failed' || jobStatus === 'partial') && (
        <Button size="xs" variant="outline" loading={retrying} leftIcon={<RefreshCw className="h-3 w-3" />} onClick={onRetry}>Reprocessar</Button>
      )}
    </div>
  )
}
