import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, loadStoredSession, setToken, setUnauthorizedHandler } from './api'
import type { User } from '@/types/user'

interface AuthContextValue {
  user: User | null
  /** true enquanto lê o token salvo e valida o perfil na abertura do app. */
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    await setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => { void logout() })
    let active = true
    ;(async () => {
      const token = await loadStoredSession()
      if (token) {
        try {
          const profile = await api.get<User>('/auth/profile')
          if (active) setUser(profile)
        } catch {
          // token inválido/expirado, ou API fora do ar: volta para o login
          await setToken(null)
        }
      }
      if (active) setLoading(false)
    })()
    return () => { active = false; setUnauthorizedHandler(null) }
  }, [logout])

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ user: User; token: string }>('/auth/login', { email: email.trim(), password })
    await setToken(result.token)
    setUser(result.user)
  }, [])

  const refresh = useCallback(async () => {
    setUser(await api.get<User>('/auth/profile'))
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
