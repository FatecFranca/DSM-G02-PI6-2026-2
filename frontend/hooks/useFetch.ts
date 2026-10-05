'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'

type Params = Record<string, string | number | boolean | undefined | null>

interface FetchState<T> {
  data: T | null
  loading: boolean
  error: string
  reload: () => Promise<void>
}

/**
 * Loads `path` from the API and re-fetches when the path or params change.
 * Pass `null` as path to skip the request (e.g. while a dependency is not ready).
 */
export function useFetch<T>(path: string | null, params?: Params): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [error, setError] = useState('')
  const paramsKey = JSON.stringify(params ?? {})
  const requestId = useRef(0)

  const load = useCallback(async () => {
    if (path === null) return
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      const result = await api.get<T>(path, JSON.parse(paramsKey) as Params)
      if (id === requestId.current) setData(result)
    } catch (err) {
      if (id === requestId.current) setError(err instanceof ApiError ? err.message : 'Falha ao carregar dados')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [path, paramsKey])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  return { data, loading, error, reload: load }
}

export function errorMessage(err: unknown, fallback = 'Não foi possível concluir a operação'): string {
  return err instanceof ApiError ? err.message : fallback
}
