'use client'
import { cn } from '@/lib/cn'
import { ChevronDown } from 'lucide-react'
import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { label: string; value: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, className, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[color:var(--text-primary)]">{label}</label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full h-9 pl-3 pr-8 rounded-[var(--radius-md)] border border-[color:var(--border)]',
            'bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)]',
            'appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:border-[color:var(--brand)]',
            'transition-colors disabled:opacity-50',
            error && 'border-[color:var(--danger)]',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)] pointer-events-none" />
      </div>
      {error && <p className="text-xs text-[color:var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[color:var(--text-tertiary)]">{hint}</p>}
    </div>
  )
})
