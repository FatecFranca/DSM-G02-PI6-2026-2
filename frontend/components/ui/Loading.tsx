import { Skeleton } from './Skeleton'

/** Generic page placeholder shown while the first request is in flight. */
export function PageLoading({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-md)]" />
      ))}
    </div>
  )
}
