'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Bell, Package, Tag, Award, Truck, Users,
  ArrowDownToLine, ArrowUpFromLine, History, Layers, MapPin,
  ClipboardList, ScanLine, Sparkles, BrainCircuit, FileBarChart,
  UserCog, ShieldCheck, Settings, ChevronLeft, ChevronRight,
  Boxes, X, Search, ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { NavGroup } from '@/constants/navigation'
import { NAV_GROUPS } from '@/constants/navigation'
import { Avatar } from '@/components/ui/Avatar'
import { currentUser } from '@/mocks/users'

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, Bell, Package, Tag, Award, Truck, Users,
  ArrowDownToLine, ArrowUpFromLine, History, Layers, MapPin,
  ClipboardList, ScanLine, Sparkles, BrainCircuit, FileBarChart,
  UserCog, ShieldCheck, Settings,
}

const ICON_STROKE = 1.75

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavItem({ item, collapsed, pathname }: {
  item: NavGroup['items'][0]
  collapsed: boolean
  pathname: string
}) {
  const Icon = ICONS[item.icon] ?? Package
  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-[7px] rounded-[var(--radius-md)] text-[13px] font-medium transition-colors duration-150 group relative',
        active
          ? 'bg-[color:var(--sidebar-active-bg)] text-[color:var(--sidebar-text-active)]'
          : 'text-[color:var(--sidebar-text)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text-active)]',
        collapsed && 'justify-center px-2',
      )}
    >
      <Icon strokeWidth={ICON_STROKE} className="w-[17px] h-[17px] flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.label}</span>
          {item.badge !== undefined && (
            <span className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
              active ? 'bg-[color:var(--bg-base)] text-[color:var(--text-primary)]' : 'bg-[color:var(--danger)] text-white',
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
      {collapsed && item.badge !== undefined && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[color:var(--danger)]" />
      )}
    </Link>
  )
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return NAV_GROUPS
    return NAV_GROUPS
      .map(group => ({ ...group, items: group.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(group => group.items.length > 0)
  }, [query])

  const mainGroups = filteredGroups.filter(g => g.label !== 'Administração')
  const adminGroup = filteredGroups.find(g => g.label === 'Administração')

  const content = (
    <div className="flex flex-col h-full">
      {/* Header: logo + name + collapse control */}
      <div className={cn(
        'flex items-center h-14 flex-shrink-0',
        collapsed ? 'justify-center px-2' : 'px-3.5 gap-2.5',
      )}>
        <div className="w-8 h-8 rounded-full bg-[color:var(--brand)] flex items-center justify-center flex-shrink-0">
          <Boxes strokeWidth={ICON_STROKE} className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[color:var(--sidebar-text-active)] leading-none truncate">StockIQ</p>
            <p className="text-[11px] text-[color:var(--sidebar-text)] mt-1 truncate">WMS · ERP Lite</p>
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            title="Recolher"
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--sidebar-text)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text-active)] transition-colors flex-shrink-0"
          >
            <ChevronsUpDown strokeWidth={ICON_STROKE} className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden text-[color:var(--sidebar-text)] hover:text-[color:var(--sidebar-text-active)] p-1"
        >
          <X strokeWidth={ICON_STROKE} className="w-4 h-4" />
        </button>
      </div>

      {collapsed && (
        <div className="hidden lg:flex justify-center pb-2">
          <button
            onClick={onToggle}
            title="Expandir"
            className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--sidebar-text)] hover:bg-[color:var(--sidebar-hover)] hover:text-[color:var(--sidebar-text-active)] transition-colors"
          >
            <ChevronRight strokeWidth={ICON_STROKE} className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className="relative">
            <Search strokeWidth={ICON_STROKE} className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[color:var(--sidebar-text)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar…"
              className={cn(
                'w-full h-7 pl-8 pr-2 rounded-[var(--radius-md)] border border-[color:var(--sidebar-border)]',
                'bg-[color:var(--bg-base)] text-[12.5px] text-[color:var(--sidebar-text-active)] placeholder:text-[color:var(--sidebar-text)]',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/30 focus:border-[color:var(--brand)] transition-all',
              )}
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-5 min-h-0">
        {mainGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--sidebar-text)]/70 px-2.5 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
              ))}
            </div>
          </div>
        ))}
        {mainGroups.length === 0 && !collapsed && (
          <p className="text-xs text-[color:var(--sidebar-text)] px-2.5">Nada encontrado.</p>
        )}
      </nav>

      {/* Pinned bottom: admin group + profile */}
      <div className="flex-shrink-0 border-t border-[color:var(--sidebar-border)] p-2 space-y-2">
        {adminGroup && (
          <div className="space-y-0.5">
            {adminGroup.items.map(item => (
              <NavItem key={item.href} item={item} collapsed={collapsed} pathname={pathname} />
            ))}
          </div>
        )}

        <button
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[color:var(--sidebar-hover)] transition-colors',
            collapsed && 'justify-center px-0',
          )}
          title={collapsed ? currentUser.name : undefined}
        >
          <Avatar name={currentUser.name} size="sm" />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[12.5px] font-semibold text-[color:var(--sidebar-text-active)] leading-none truncate">{currentUser.name}</p>
                <p className="text-[11px] text-[color:var(--sidebar-text)] mt-1 truncate">{currentUser.role === 'admin' ? 'Administrador' : currentUser.role}</p>
              </div>
              <ChevronLeft strokeWidth={ICON_STROKE} className="w-3.5 h-3.5 text-[color:var(--sidebar-text)] rotate-[-90deg] flex-shrink-0" />
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 h-full bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)]',
          'transition-[width] duration-200 overflow-hidden',
          collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
        )}
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="relative w-[var(--sidebar-width)] bg-[color:var(--sidebar-bg)] border-r border-[color:var(--sidebar-border)] flex flex-col h-full shadow-[var(--shadow-xl)] animate-slide-right">
            {content}
          </aside>
        </div>
      )}
    </>
  )
}
