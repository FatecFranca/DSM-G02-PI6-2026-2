import { ReactNode } from 'react'
import { Banner, Screen } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import type { UserRole } from '@/types/user'

/** Bloqueia telas que a API só serve a certos perfis (evita um 403 cru na cara do usuário). */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user } = useAuth()
  if (user && roles.includes(user.role)) return <>{children}</>
  return (
    <Screen>
      <Banner tone="warning">Você não tem permissão para acessar esta tela.</Banner>
    </Screen>
  )
}
