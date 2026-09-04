'use client'
import { useState } from 'react'
import { Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle, Play } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { mockInventories } from '@/mocks/movements'
import { formatDate, formatNumber } from '@/lib/utils'
import { cn } from '@/lib/cn'

const STATUS_CONFIG = {
  planned:     { label: 'Planejado',     variant: 'default' as const,  icon: Clock,         color: 'text-[color:var(--text-tertiary)]', bg: 'bg-[color:var(--bg-muted)]' },
  in_progress: { label: 'Em Andamento',  variant: 'warning' as const,  icon: Play,          color: 'text-[color:var(--warning)]',       bg: 'bg-[color:var(--warning-subtle)]' },
  review:      { label: 'Em Revisão',    variant: 'info' as const,     icon: AlertTriangle, color: 'text-[color:var(--info)]',          bg: 'bg-[color:var(--info-subtle)]' },
  completed:   { label: 'Concluído',     variant: 'success' as const,  icon: CheckCircle2,  color: 'text-[color:var(--success)]',       bg: 'bg-[color:var(--success-subtle)]' },
}

const TYPE_LABELS = { full: 'Completo', partial: 'Parcial', cyclic: 'Cíclico' }

export default function InventarioPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'WMS' }, { label: 'Inventário' }]} />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Inventário</h1>
          <p className="text-sm text-[color:var(--text-tertiary)] mt-0.5">Contagem e controle de divergências de estoque</p>
        </div>
        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowModal(true)}>Novo Inventário</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(Object.entries(STATUS_CONFIG) as [string, typeof STATUS_CONFIG['planned']][]).map(([k, v]) => {
          const count = mockInventories.filter(i => i.status === k).length
          const Icon = v.icon
          return (
            <div key={k} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center', v.bg)}>
                <Icon className={cn('w-4 h-4', v.color)} />
              </div>
              <div>
                <p className="text-xs text-[color:var(--text-tertiary)]">{v.label}</p>
                <p className="text-xl font-bold text-[color:var(--text-primary)]">{count}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inventories list */}
      <div className="space-y-3">
        {mockInventories.map(inv => {
          const cfg = STATUS_CONFIG[inv.status]
          const Icon = cfg.icon
          const progress = inv.totalItems > 0 ? Math.round((inv.countedItems / inv.totalItems) * 100) : 0
          return (
            <div key={inv.id} className="bg-[color:var(--bg-base)] border border-[color:var(--border)] rounded-[var(--radius-lg)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={cn('w-10 h-10 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <Icon className={cn('w-5 h-5', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">{inv.name}</h3>
                      <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      <Badge variant="default" size="sm">{TYPE_LABELS[inv.type]}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[color:var(--text-tertiary)] flex-wrap">
                      <span>Responsável: <strong className="text-[color:var(--text-primary)]">{inv.responsibleName}</strong></span>
                      <span>Início: {formatDate(inv.startDate)}</span>
                      {inv.endDate && <span>Fim: {formatDate(inv.endDate)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {inv.status === 'in_progress' && (
                    <Button size="xs" variant="outline">Continuar contagem</Button>
                  )}
                  {inv.status === 'planned' && (
                    <Button size="xs">Iniciar</Button>
                  )}
                  {inv.status === 'completed' && (
                    <Button size="xs" variant="ghost">Ver relatório</Button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Total de itens</p>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{formatNumber(inv.totalItems)}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Contados</p>
                  <p className="text-sm font-bold text-[color:var(--text-primary)]">{formatNumber(inv.countedItems)}</p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Divergências</p>
                  <p className={cn('text-sm font-bold', inv.divergences > 0 ? 'text-[color:var(--danger)]' : 'text-[color:var(--success)]')}>
                    {inv.divergences}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)]">Acuracidade</p>
                  <p className={cn('text-sm font-bold', inv.status === 'completed' ? (inv.divergences === 0 ? 'text-[color:var(--success)]' : 'text-[color:var(--warning)]') : 'text-[color:var(--text-tertiary)]')}>
                    {inv.status === 'completed' && inv.totalItems > 0 ? `${(((inv.totalItems - inv.divergences) / inv.totalItems) * 100).toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Progresso: {progress}%</p>
                  <div className="h-2 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', inv.status === 'completed' ? 'bg-[color:var(--success)]' : 'bg-[color:var(--brand)]')}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Novo Inventário"
        description="Configure as opções do inventário"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => setShowModal(false)}>Criar Inventário</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nome do inventário *" placeholder="Ex: Inventário Geral Julho 2026" />
          <Select label="Tipo" options={[
            { value: 'full', label: 'Completo — todos os produtos' },
            { value: 'partial', label: 'Parcial — categorias selecionadas' },
            { value: 'cyclic', label: 'Cíclico — rotativo por endereço' },
          ]} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data de início" type="date" />
            <Input label="Responsável" placeholder="Nome do responsável" />
          </div>
          <Input label="Observações" placeholder="Instrução para a equipe de contagem…" />
        </div>
      </Modal>
    </div>
  )
}
