import { api } from '@/lib/api'
import type { Paginated } from '@/types/api'

/** Walks every page of a paginated endpoint (the API caps `limit` at 100). */
export async function fetchAll<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = []
  let page = 1
  let totalPages = 1
  do {
    const res = await api.get<Paginated<T>>(path, { ...params, page, limit: 100 })
    out.push(...res.data)
    totalPages = res.totalPages
    page++
  } while (page <= totalPages)
  return out
}
