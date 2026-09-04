import { cn } from '@/lib/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
  hover?: boolean
}

export function Card({ children, className, padding = true, hover = false }: CardProps) {
  return (
    <div className={cn(
      'bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)]',
      'shadow-[var(--shadow-sm)]',
      padding && 'p-5',
      hover && 'transition-colors hover:border-[color:var(--border-strong)] cursor-pointer',
      className,
    )}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  description?: string
  className?: string
}
export function CardTitle({ children, description, className }: CardTitleProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{children}</h3>
      {description && <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{description}</p>}
    </div>
  )
}
