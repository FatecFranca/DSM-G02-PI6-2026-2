'use client'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useSidebar } from '@/hooks/useSidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-[color:var(--bg-subtle)]">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto animate-fade-in">
          <div className="max-w-[var(--content-max-width)] mx-auto px-6 lg:px-10 py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
