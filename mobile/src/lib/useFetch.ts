import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from './api'

type Params = Record<string, string | number | boolean | undefined | null>

export interface FetchState<T> {
  data: T | null
  loading: boolean
  /** true só durante o "puxar para atualizar" (não troca a tela por skeleton). */
  refreshing: boolean
  error: string
  reload: () => Promise<void>
  refresh: () => Promise<void>
}

/** Carrega `path` e recarrega quando path/params mudam. `null` pausa a requisição. */
export function useFetch<T>(path: string | null, params?: Params): FetchState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(path !== null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const key = JSON.stringify(params ?? {})
  const requestId = useRef(0)

  const load = useCallback(async (silent: boolean) => {
    if (path === null) return
    const id = ++requestId.current
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const result = await api.get<T>(path, JSON.parse(key) as Params)
      if (id === requestId.current) setData(result)
    } catch (err) {
      if (id === requestId.current) setError(errorMessage(err, 'Falha ao carregar dados'))
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [path, key])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false)
  }, [load])

  return { data, loading, refreshing, error, reload: () => load(false), refresh: () => load(true) }
}

/** Debounce simples para campos de busca. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
