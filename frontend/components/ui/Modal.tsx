'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  footer?: React.ReactNode
}

const sizes = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-7xl',
}

export function Modal({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[color:var(--bg-overlay)] backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={cn(
        'relative w-full bg-[color:var(--bg-base)] rounded-[var(--radius-xl)]',
        'shadow-[var(--shadow-xl)] border border-[color:var(--border)]',
        'animate-scale-in flex flex-col max-h-[90vh]',
        sizes[size],
      )}>
        {(title || description) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-[color:var(--border)]">
            <div>
              {title && <h2 className="text-base font-semibold text-[color:var(--text-primary)]">{title}</h2>}
              {description && <p className="text-sm text-[color:var(--text-secondary)] mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1.5 rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="p-6 pt-4 border-t border-[color:var(--border)] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
