import { cn } from '@/lib/cn'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  iconColor?: string
  trend?: number
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variantMap = {
  default: { icon: 'bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)]', border: '' },
  success: { icon: 'bg-[color:var(--success-subtle)] text-[color:var(--success)]', border: 'border-l-2 border-l-[color:var(--success)]' },
  warning: { icon: 'bg-[color:var(--warning-subtle)] text-[color:var(--warning)]', border: 'border-l-2 border-l-[color:var(--warning)]' },
  danger:  { icon: 'bg-[color:var(--danger-subtle)] text-[color:var(--danger)]', border: 'border-l-2 border-l-[color:var(--danger)]' },
  info:    { icon: 'bg-[color:var(--info-subtle)] text-[color:var(--info)]', border: 'border-l-2 border-l-[color:var(--info)]' },
}

export function StatCard({ label, value, sub, icon, trend, variant = 'default', className }: StatCardProps) {
  const v = variantMap[variant]
  const trendPositive = trend !== undefined && trend >= 0

  return (
    <div className={cn(
      'bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5',
      'shadow-[var(--shadow-sm)] hover:border-[color:var(--border-strong)] transition-colors',
      v.border,
      className,
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wide">{label}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', v.icon)}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[color:var(--text-primary)] mb-1 leading-none">{value}</p>
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <span className={cn(
            'flex items-center gap-0.5 text-xs font-semibold',
            trendPositive ? 'text-[color:var(--success)]' : 'text-[color:var(--danger)]',
          )}>
            {trendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <p className="text-xs text-[color:var(--text-tertiary)]">{sub}</p>}
      </div>
    </div>
  )
}
