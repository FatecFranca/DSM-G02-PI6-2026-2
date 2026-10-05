'use client'
import React from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[color:var(--text-primary)]">{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        className={cn(
          'w-full px-3 py-2 rounded-[var(--radius-md)] border border-[color:var(--border)] bg-[color:var(--bg-base)] text-sm text-[color:var(--text-primary)]',
          'placeholder:text-[color:var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)] resize-none',
          error && 'border-[color:var(--danger)]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[color:var(--danger)]">{error}</p>}
    </div>
  )
})
