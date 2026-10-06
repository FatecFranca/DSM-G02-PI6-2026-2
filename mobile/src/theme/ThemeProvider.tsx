import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { getItem, setItem } from '@/lib/storage'
import { dark, light, Palette } from './tokens'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  colors: Palette
  isDark: boolean
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const KEY = 'stockiq_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    void getItem(KEY).then(stored => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setModeState(stored)
    })
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    void setItem(KEY, next)
  }, [])

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === 'system' ? system === 'dark' : mode === 'dark'
    return { colors: isDark ? dark : light, isDark, mode, setMode }
  }, [mode, system, setMode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
