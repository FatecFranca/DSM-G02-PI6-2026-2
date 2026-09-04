'use client'
import { cn } from '@/lib/cn'
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, className, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[color:var(--text-primary)]">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)] pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 rounded-[var(--radius-md)] border border-[color:var(--border)]',
            'bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)]',
            'placeholder:text-[color:var(--text-tertiary)]',
            'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] focus:ring-offset-0 focus:border-[color:var(--brand)]',
            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            leftIcon ? 'pl-9' : 'pl-3',
            rightIcon ? 'pr-9' : 'pr-3',
            error && 'border-[color:var(--danger)] focus:ring-[color:var(--danger)]',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-tertiary)]">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-[color:var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[color:var(--text-tertiary)]">{hint}</p>}
    </div>
  )
})
