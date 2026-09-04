'use client'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'secondary'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default:   'bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)]',
  secondary: 'bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)]',
  success:   'bg-[color:var(--success-subtle)] text-[color:var(--success)]',
  warning:   'bg-[color:var(--warning-subtle)] text-[color:var(--warning)]',
  danger:    'bg-[color:var(--danger-subtle)] text-[color:var(--danger)]',
  info:      'bg-[color:var(--info-subtle)] text-[color:var(--info)]',
  brand:     'bg-[color:var(--brand-subtle)] text-[color:var(--brand)]',
}

const dotColors: Record<BadgeVariant, string> = {
  default:   'bg-[color:var(--text-tertiary)]',
  secondary: 'bg-[color:var(--text-tertiary)]',
  success:   'bg-[color:var(--success)]',
  warning:   'bg-[color:var(--warning)]',
  danger:    'bg-[color:var(--danger)]',
  info:      'bg-[color:var(--info)]',
  brand:     'bg-[color:var(--brand)]',
}

export function Badge({ children, variant = 'default', size = 'md', dot = false, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full border-0',
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      variantStyles[variant],
      className,
    )}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
