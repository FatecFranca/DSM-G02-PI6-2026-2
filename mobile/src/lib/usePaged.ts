import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from './api'

type Params = Record<string, string | number | boolean | undefined | null>

interface Page<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}

export interface PagedState<T> {
  items: T[]
  total: number
  loading: boolean
  loadingMore: boolean
  refreshing: boolean
  error: string
  hasMore: boolean
  loadMore: () => void
  reload: () => Promise<void>
  refresh: () => Promise<void>
}

/** Lista paginada com rolagem infinita: recarrega do zero quando `path`/`params` mudam. */
export function usePaged<T>(path: string, params: Params = {}, pageSize = 20): PagedState<T> {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const key = JSON.stringify(params)
  const requestId = useRef(0)

  const fetchPage = useCallback(async (target: number, mode: 'reset' | 'more' | 'refresh') => {
    const id = ++requestId.current
    if (mode === 'more') setLoadingMore(true)
    else if (mode === 'refresh') setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const res = await api.get<Page<T>>(path, { ...(JSON.parse(key) as Params), page: target, limit: pageSize })
      if (id !== requestId.current) return
      setItems(prev => (mode === 'more' ? [...prev, ...res.data] : res.data))
      setTotal(res.total)
      setPage(res.page)
      setTotalPages(res.totalPages)
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err, 'Falha ao carregar dados'))
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
        setRefreshing(false)
      }
    }
  }, [path, key, pageSize])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPage(1, 'reset')
  }, [fetchPage])

  const hasMore = page < totalPages
  const loadMore = useCallback(() => {
    if (hasMore && !loading && !loadingMore) void fetchPage(page + 1, 'more')
  }, [hasMore, loading, loadingMore, page, fetchPage])

  return {
    items, total, loading, loadingMore, refreshing, error, hasMore, loadMore,
    reload: () => fetchPage(1, 'reset'),
    refresh: () => fetchPage(1, 'refresh'),
  }
}
