'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, getToken, setToken } from '@/lib/api'
import type { User } from '@/types/user'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  /** Re-reads the profile from the API (after editing it). */
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      queueMicrotask(() => setLoading(false))
      return
    }
    api.get<User>('/auth/profile')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const result = await api.post<{ user: User; token: string }>('/auth/login', { email, password })
    setToken(result.token)
    setUser(result.user)
  }

  async function refresh() {
    setUser(await api.get<User>('/auth/profile'))
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
