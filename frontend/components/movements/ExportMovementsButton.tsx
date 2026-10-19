'use client'
import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MOVEMENT_TYPE_LABELS } from '@/constants/status'
import { downloadCsv } from '@/lib/csv'
import { fetchAll } from '@/lib/fetch-all'
import { formatNumber } from '@/lib/utils'
import type { MovementRecord } from '@/types/movement'

interface Props {
  /** Nome do arquivo baixado (ex.: entradas.csv). */
  filename: string
  /** Filtros atuais da tela: o CSV traz TODOS os registros que casam, não só a página exibida. */
  params: Record<string, string | number | undefined>
}

const HEADERS = ['Data', 'Tipo', 'Código', 'Produto', 'Quantidade', 'Custo unitário', 'Valor total', 'Nota fiscal', 'Lote', 'Validade', 'Motivo', 'Fornecedor / Cliente', 'Origem', 'Destino', 'Usuário', 'Observações']

/** Exporta as movimentações (com os filtros da tela) em CSV UTF-8, abrindo corretamente no Excel. */
export function ExportMovementsButton({ filename, params }: Props) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setExporting(true)
    setError('')
    try {
      const rows = await fetchAll<MovementRecord>('/movements', params)
      if (rows.length === 0) {
        setError('Nada para exportar com os filtros atuais.')
        return
      }
      downloadCsv(filename, HEADERS, rows.map((m) => [
        new Date(m.createdAt).toLocaleString('pt-BR'),
        MOVEMENT_TYPE_LABELS[m.type] ?? m.type,
        m.product.internalCode,
        m.product.name,
        m.quantity,
        formatNumber(m.unitCost),
        formatNumber(m.totalValue),
        m.invoiceNumber,
        m.lotNumber,
        m.expirationDate ? new Date(m.expirationDate).toLocaleDateString('pt-BR') : '',
        m.exitReason,
        m.supplier?.name ?? m.customerName,
        m.fromAddress?.code,
        m.toAddress?.code,
        m.user.name,
        m.notes,
      ]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao exportar')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-[color:var(--danger)]">{error}</span>}
      <Button variant="outline" size="sm" loading={exporting} leftIcon={<Download className="h-3.5 w-3.5" />} onClick={run}>Exportar</Button>
    </div>
  )
}
