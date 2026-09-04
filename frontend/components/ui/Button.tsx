'use client'
import { cn } from '@/lib/cn'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary:   'bg-[color:var(--brand)] hover:bg-[color:var(--brand-hover)] text-white shadow-[var(--shadow-sm)]',
  secondary: 'bg-[color:var(--bg-muted)] hover:bg-[color:var(--border)] text-[color:var(--text-primary)]',
  ghost:     'hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]',
  danger:    'bg-[color:var(--danger)] hover:opacity-90 text-white shadow-[var(--shadow-sm)]',
  outline:   'border border-[color:var(--border)] bg-[color:var(--bg-base)] hover:bg-[color:var(--bg-subtle)] hover:border-[color:var(--border-strong)] text-[color:var(--text-primary)] shadow-[var(--shadow-sm)]',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-base gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)]',
        'transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand)] focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  )
}
