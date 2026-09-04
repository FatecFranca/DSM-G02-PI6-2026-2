'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPage: (p: number) => void
  className?: string
}

export function Pagination({ page, totalPages, total, perPage, onPage, className }: PaginationProps) {
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (page <= 3) return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  })

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <p className="text-xs text-[color:var(--text-tertiary)]">
        Exibindo <span className="font-medium text-[color:var(--text-primary)]">{from}–{to}</span> de <span className="font-medium text-[color:var(--text-primary)]">{total}</span> registros
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed text-[color:var(--text-secondary)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-sm transition-colors',
              p === page
                ? 'bg-[color:var(--brand)] text-white font-semibold'
                : 'hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)]',
            )}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] disabled:opacity-40 disabled:cursor-not-allowed text-[color:var(--text-secondary)] transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
