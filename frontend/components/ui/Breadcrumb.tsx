import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)} aria-label="Breadcrumb">
      <Link href="/dashboard" className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
          {item.href && i < items.length - 1 ? (
            <Link href={item.href} className="text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-[color:var(--text-primary)] font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
