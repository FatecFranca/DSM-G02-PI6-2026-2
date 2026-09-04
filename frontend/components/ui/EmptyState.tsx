import { cn } from '@/lib/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="w-14 h-14 rounded-[var(--radius-xl)] bg-[color:var(--bg-muted)] flex items-center justify-center mb-4 text-[color:var(--text-tertiary)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[color:var(--text-primary)] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[color:var(--text-tertiary)] max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  )
}
