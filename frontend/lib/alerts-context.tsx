'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { api } from '@/lib/api'
import type { ApiAlert, ApiAlerts } from '@/types/api'

interface AlertsContextValue {
  alerts: ApiAlert[]
  unread: number
  loading: boolean
  reload: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined)
const REFRESH_MS = 60_000

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<ApiAlert[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      const res = await api.get<ApiAlerts>('/alerts')
      setAlerts(res.alerts)
    } catch {
      // keep the previous list; the bell is non-critical UI
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    const timer = setInterval(reload, REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  const markRead = useCallback(async (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, read: true } : a)))
    await api.patch(`/alerts/${id}/read`).catch(reload)
  }, [reload])

  const markAllRead = useCallback(async () => {
    const keys = alerts.filter(a => !a.read).map(a => a.id)
    if (keys.length === 0) return
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
    await api.patch('/alerts/read-all', { alertKeys: keys }).catch(reload)
  }, [alerts, reload])

  const value = useMemo(
    () => ({ alerts, unread: alerts.filter(a => !a.read).length, loading, reload, markRead, markAllRead }),
    [alerts, loading, reload, markRead, markAllRead],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlerts must be used within AlertsProvider')
  return ctx
}
