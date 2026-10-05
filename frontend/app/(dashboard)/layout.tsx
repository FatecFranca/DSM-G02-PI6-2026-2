'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/lib/auth-context'
import { hasRole, STAFF } from '@/lib/permissions'

/** Pages that the API only serves to admins and supervisors. */
const STAFF_ONLY = ['/dashboard/usuarios', '/dashboard/auditoria']

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading || !user) return null

  const blocked = STAFF_ONLY.some(p => pathname.startsWith(p)) && !hasRole(user.role, STAFF)

  return (
    <AppShell>
      {blocked ? <Alert>Você não tem permissão para acessar esta página.</Alert> : children}
    </AppShell>
  )
}
