'use client'
import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-0 border-b border-[color:var(--border)]', className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            'focus:outline-none',
            active === tab.id
              ? 'border-[color:var(--brand)] text-[color:var(--brand)]'
              : 'border-transparent text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]',
          )}
        >
          {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
          {tab.label}
          {tab.badge !== undefined && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
              active === tab.id
                ? 'bg-[color:var(--brand-subtle)] text-[color:var(--brand)]'
                : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]',
            )}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
