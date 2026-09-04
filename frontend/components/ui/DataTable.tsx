'use client'
import { cn } from '@/lib/cn'
import { ChevronUp, ChevronDown } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  width?: string
  sortable?: boolean
  render?: (row: T, i: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  className?: string
  emptyMessage?: string
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  className,
  emptyMessage = 'Nenhum resultado encontrado.',
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--border)]">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wide whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-[color:var(--text-primary)] transition-colors',
                  col.width,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className="w-3.5 h-3.5" />
                      : <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-[color:var(--text-tertiary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-[color:var(--border)] last:border-0',
                  'hover:bg-[color:var(--bg-subtle)] transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-[color:var(--text-primary)]">
                    {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
