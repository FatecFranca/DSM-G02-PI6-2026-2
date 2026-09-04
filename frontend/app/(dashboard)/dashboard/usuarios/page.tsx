'use client'
import { useState } from 'react'
import { Plus, Search, Edit, Shield, UserCog } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { mockUsers } from '@/mocks/users'
import { USER_ROLE_LABELS } from '@/constants/status'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/cn'

const ROLE_VARIANT: Record<string, 'danger'|'warning'|'info'|'default'> = {
  admin: 'danger', supervisor: 'warning', operator: 'info', viewer: 'default',
}

const ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))

export default function UsuariosPage() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const filtered = mockUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'Administração' }, { label: 'Usuários' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Usuários</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">{mockUsers.length} usuários cadastrados</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowModal(true)}>Novo Usuário</Button>
      </div>

      <div className="max-w-md">
        <Input placeholder="Buscar por nome, e-mail, setor…" value={search} onChange={e => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(user => (
          <div key={user.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} size="md" />
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{user.name}</p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">{user.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[color:var(--text-secondary)] mb-4">
              <p className="truncate">{user.email}</p>
              {user.lastLogin && (
                <p className="text-[color:var(--text-tertiary)]">Último acesso: {formatDateTime(user.lastLogin)}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[color:var(--border)]">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                <Badge variant={ROLE_VARIANT[user.role] ?? 'default'} size="sm">
                  {USER_ROLE_LABELS[user.role] ?? user.role}
                </Badge>
              </div>
              <Badge variant={user.status === 'active' ? 'success' : 'default'} dot size="sm">
                {user.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Usuário"
        description="Crie um novo acesso ao sistema"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => setShowModal(false)}>Criar Usuário</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Nome completo *" placeholder="Nome do usuário" />
            </div>
            <div className="col-span-2">
              <Input label="E-mail corporativo *" type="email" placeholder="usuario@empresa.com.br" />
            </div>
            <Select label="Perfil de acesso *" options={ROLE_OPTIONS} placeholder="Selecione o perfil" />
            <Input label="Departamento" placeholder="Ex: Logística" />
          </div>
          <div className="p-4 rounded-[var(--radius-lg)] bg-[color:var(--info-subtle)] border border-[color:var(--info-muted)]">
            <p className="text-xs font-semibold text-[color:var(--info)] mb-1">Senha de primeiro acesso</p>
            <p className="text-xs text-[color:var(--text-secondary)]">Uma senha temporária será enviada ao e-mail do usuário.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
