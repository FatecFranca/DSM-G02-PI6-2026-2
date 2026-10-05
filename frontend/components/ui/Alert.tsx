import { cn } from '@/lib/cn'

interface AlertProps {
  children: React.ReactNode
  variant?: 'danger' | 'success' | 'info' | 'warning'
  className?: string
}

const styles = {
  danger: 'text-[color:var(--danger)] bg-[color:var(--danger-subtle)] border-[color:var(--danger)]/30',
  success: 'text-[color:var(--success)] bg-[color:var(--success-subtle)] border-[color:var(--success)]/30',
  info: 'text-[color:var(--info)] bg-[color:var(--info-subtle)] border-[color:var(--info)]/30',
  warning: 'text-[color:var(--warning)] bg-[color:var(--warning-subtle)] border-[color:var(--warning)]/30',
}

export function Alert({ children, variant = 'danger', className }: AlertProps) {
  return (
    <p role={variant === 'danger' ? 'alert' : 'status'} className={cn('text-sm border rounded-[var(--radius-md)] px-3 py-2', styles[variant], className)}>
      {children}
    </p>
  )
}
