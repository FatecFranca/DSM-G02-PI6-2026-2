'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Bell, Sun, Moon, Menu, HelpCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Avatar } from '@/components/ui/Avatar'
import { currentUser } from '@/mocks/users'
import { alerts } from '@/mocks/dashboard'
import { useTheme } from '@/hooks/useTheme'
import { NAV_GROUPS } from '@/constants/navigation'

const ICON_STROKE = 1.75

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)

function currentPageLabel(pathname: string) {
  const exact = ALL_ITEMS.find(i => i.href === pathname)
  if (exact) return exact.label
  const partial = ALL_ITEMS
    .filter(i => i.href !== '/dashboard' && pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]
  if (partial) return partial.label
  return 'Dashboard'
}

interface TopbarProps {
  onMobileMenuOpen: () => void
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { theme, toggle: toggleTheme } = useTheme()
  const pathname = usePathname()
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  const unread = alerts.filter(a => !a.read).length
  const pageLabel = currentPageLabel(pathname)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(v => !v)
      }
      if (e.key === 'Escape') setShowSearch(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  return (
    <header className="h-[var(--topbar-height)] bg-[color:var(--bg-base)] border-b border-[color:var(--border)] flex items-center gap-3 px-4 flex-shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] transition-colors flex-shrink-0"
      >
        <Menu strokeWidth={ICON_STROKE} className="w-4 h-4" />
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px] min-w-0">
        <span className="text-[color:var(--text-tertiary)] truncate hidden sm:inline">Workspace</span>
        <ChevronRight strokeWidth={ICON_STROKE} className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] hidden sm:block flex-shrink-0" />
        <span className="font-medium text-[color:var(--text-primary)] truncate">{pageLabel}</span>
      </div>

      <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
        {/* Search trigger */}
        <div className="relative">
          <button
            onClick={() => setShowSearch(v => !v)}
            className={cn(
              'flex items-center gap-2 h-7 pl-2.5 pr-1.5 rounded-[var(--radius-md)] border border-[color:var(--border)]',
              'bg-[color:var(--bg-subtle)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] transition-colors',
            )}
          >
            <Search strokeWidth={ICON_STROKE} className="w-3.5 h-3.5" />
            <span className="text-xs hidden md:inline">Pesquisar</span>
            <kbd className="hidden md:inline text-[10px] font-medium bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded px-1.5 py-0.5 text-[color:var(--text-tertiary)]">⌘K</kbd>
          </button>

          {showSearch && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSearch(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-2 z-40 animate-fade-in">
                <div className="relative mb-1">
                  <Search strokeWidth={ICON_STROKE} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar produtos, pedidos, fornecedores…"
                    className="w-full h-8 pl-8 pr-2 rounded-[var(--radius-sm)] bg-[color:var(--bg-subtle)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:outline-none"
                  />
                </div>
                {search && (
                  <div className="border-t border-[color:var(--border)] pt-1 mt-1">
                    {['Cabo HDMI 2.0 2m', 'Cabide de Parede', 'Cabo PP 2×2.5mm²'].filter(p => p.toLowerCase().includes(search.toLowerCase())).map(p => (
                      <button key={p} className="w-full text-left px-2 py-1.5 text-sm hover:bg-[color:var(--bg-subtle)] rounded-[var(--radius-sm)] text-[color:var(--text-primary)]">{p}</button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Help */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] transition-colors"
          title="Ajuda"
        >
          <HelpCircle strokeWidth={ICON_STROKE} className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] transition-colors relative"
            title="Notificações"
          >
            <Bell strokeWidth={ICON_STROKE} className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[color:var(--danger)] animate-pulse-dot" />
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-40 animate-fade-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border)]">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Notificações</p>
                  <span className="text-xs bg-[color:var(--danger)] text-white px-1.5 py-0.5 rounded-full font-semibold">{unread}</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {alerts.map(alert => (
                    <div key={alert.id} className={cn(
                      'flex gap-3 px-4 py-3 border-b border-[color:var(--border)] last:border-0 hover:bg-[color:var(--bg-subtle)] cursor-pointer transition-colors',
                      !alert.read && 'bg-[color:var(--brand-subtle)]',
                    )}>
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        alert.type === 'critical' ? 'bg-[color:var(--danger)]'
                        : alert.type === 'warning' ? 'bg-[color:var(--warning)]'
                        : 'bg-[color:var(--info)]'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[color:var(--text-primary)] leading-tight">{alert.title}</p>
                        <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{alert.time} atrás</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/dashboard/alertas">
                  <div className="px-4 py-2.5 text-center text-sm text-[color:var(--brand)] font-medium hover:bg-[color:var(--bg-subtle)] cursor-pointer transition-colors">
                    Ver todos os alertas →
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-secondary)] transition-colors"
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        >
          {theme === 'light' ? <Moon strokeWidth={ICON_STROKE} className="w-4 h-4" /> : <Sun strokeWidth={ICON_STROKE} className="w-4 h-4" />}
        </button>

        {/* Avatar (opens account/profile page) */}
        <Link href="/dashboard/configuracoes" className="ml-1">
          <Avatar name={currentUser.name} size="xs" />
        </Link>
      </div>
    </header>
  )
}
