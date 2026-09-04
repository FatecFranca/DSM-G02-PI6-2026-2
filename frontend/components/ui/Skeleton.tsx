import { cn } from '@/lib/cn'

interface SkeletonProps {
  className?: string
  lines?: number
  height?: string
}

export function Skeleton({ className, height }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', className)}
      style={height ? { height } : undefined}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[color:var(--border)]">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  )
}
