'use client'
import { useState, useEffect } from 'react'

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = localStorage.getItem('sidebar-collapsed')
      if (stored) setCollapsed(stored === 'true')
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const toggle = () => {
    setCollapsed(v => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })
  }

  return { collapsed, toggle, mobileOpen, setMobileOpen }
}
