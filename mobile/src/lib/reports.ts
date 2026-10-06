import type { IconName } from '@/components/ui/Icon'
import { api, fetchAll } from './api'
import { formatCurrency, formatDate, formatDateTime, formatNumber } from './format'
import { MOVEMENT_META } from './movement'
import { LOT_STATUS_LABELS, STOCK_STATUS_LABELS } from './status'
import type {
  ApiAbcCurve, ApiAddress, ApiInventoryReport, ApiLotReport, ApiMovement, ApiMovementReport,
  ApiStockReport, ApiSupplierReport,
} from '@/types/api'

export type Cell = string | number | null | undefined

export interface ReportResult {
  title: string
  summary: { label: string; value: string }[]
  headers: string[]
  rows: Cell[][]
}

export interface Period {
  from?: string
  to?: string
}

export interface ReportDef {
  id: string
  icon: IconName
  label: string
  desc: string
  usesPeriod?: boolean
  load: (period: Period) => Promise<ReportResult>
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Cada relatório busca os dados na API e os achata em resumo + tabela (a mesma lista do web). */
export const REPORTS: ReportDef[] = [
  {
    id: 'stock', icon: 'package', label: 'Posição de estoque', desc: 'Estoque atual por produto, com valores',
    load: async () => {
      const r = await api.get<ApiStockReport>('/reports/stock')
      return {
        title: 'Posição de estoque',
        summary: [
          { label: 'Produtos ativos', value: formatNumber(r.summary.total) },
          { label: 'Sem estoque', value: formatNumber(r.summary.out) },
          { label: 'Crítico / Baixo', value: `${r.summary.critical} / ${r.summary.low}` },
          { label: 'Valor (custo)', value: formatCurrency(r.summary.totalStockValue) },
          { label: 'Valor (venda)', value: formatCurrency(r.summary.totalSaleValue) },
        ],
        headers: ['Código', 'Produto', 'Categoria', 'Estoque', 'Mín', 'Máx', 'Situação', 'Valor custo', 'Valor venda'],
        rows: r.products.map(p => [p.internalCode, p.name, p.category.name, p.currentStock, p.minStock, p.maxStock, STOCK_STATUS_LABELS[p.stockStatus], p.stockValue, p.saleValue]),
      }
    },
  },
  {
    id: 'entries', icon: 'arrow-down-circle', label: 'Entradas por período', desc: 'Todas as entradas registradas', usesPeriod: true,
    load: async p => {
      const list = await fetchAll<ApiMovement>('/movements', { type: 'entry', from: p.from, to: p.to })
      return {
        title: 'Entradas por período',
        summary: [
          { label: 'Entradas', value: formatNumber(list.length) },
          { label: 'Unidades', value: formatNumber(sum(list.map(m => m.quantity))) },
          { label: 'Valor total', value: formatCurrency(sum(list.map(m => m.totalValue))) },
        ],
        headers: ['Data', 'Produto', 'Código', 'Qtd', 'Custo unit.', 'Total', 'NF', 'Lote', 'Fornecedor', 'Operador'],
        rows: list.map(m => [formatDateTime(m.createdAt), m.product.name, m.product.internalCode, m.quantity, m.unitCost, m.totalValue, m.invoiceNumber, m.lotNumber, m.supplier?.name, m.user.name]),
      }
    },
  },
  {
    id: 'exits', icon: 'arrow-up-circle', label: 'Saídas por período', desc: 'Saídas e perdas registradas', usesPeriod: true,
    load: async p => {
      const list = await fetchAll<ApiMovement>('/movements', { type: 'exit,loss', from: p.from, to: p.to })
      return {
        title: 'Saídas por período',
        summary: [
          { label: 'Saídas', value: formatNumber(list.length) },
          { label: 'Unidades', value: formatNumber(sum(list.map(m => m.quantity))) },
          { label: 'Valor total', value: formatCurrency(sum(list.map(m => m.totalValue))) },
        ],
        headers: ['Data', 'Tipo', 'Produto', 'Código', 'Qtd', 'Valor unit.', 'Total', 'Cliente/Destino', 'Operador'],
        rows: list.map(m => [formatDateTime(m.createdAt), MOVEMENT_META[m.type].label, m.product.name, m.product.internalCode, m.quantity, m.unitCost, m.totalValue, m.customerName, m.user.name]),
      }
    },
  },
  {
    id: 'movements', icon: 'bar-chart-2', label: 'Movimentações', desc: 'Totais por tipo e produtos mais movimentados', usesPeriod: true,
    load: async p => {
      const r = await api.get<ApiMovementReport>('/reports/movements', { from: p.from, to: p.to })
      return {
        title: 'Movimentações',
        summary: [
          { label: 'Movimentações', value: formatNumber(r.totals.count) },
          { label: 'Unidades', value: formatNumber(r.totals.quantity) },
          { label: 'Valor', value: formatCurrency(r.totals.value) },
          ...r.byType.map(t => ({ label: MOVEMENT_META[t.type].label, value: formatNumber(t.count) })),
        ],
        headers: ['Código', 'Produto', 'Movimentações', 'Quantidade', 'Valor'],
        rows: r.topProducts.map(t => [t.product.internalCode, t.product.name, t.count, t.quantity, t.value]),
      }
    },
  },
  {
    id: 'lots', icon: 'layers', label: 'Validade de lotes', desc: 'Lotes vencidos, vencendo e em quarentena',
    load: async () => {
      const r = await api.get<ApiLotReport>('/reports/lots', { days: 90 })
      const all = [...r.expired, ...r.expiringSoon, ...r.quarantine]
      return {
        title: 'Validade de lotes (próximos 90 dias)',
        summary: [
          { label: 'Vencidos', value: formatNumber(r.summary.expired) },
          { label: 'Vencendo (90d)', value: formatNumber(r.summary.expiringSoon) },
          { label: 'Válidos', value: formatNumber(r.summary.valid) },
          { label: 'Quarentena', value: formatNumber(r.summary.quarantine) },
        ],
        headers: ['Lote', 'Produto', 'Qtd', 'Validade', 'Fornecedor', 'Endereço', 'Status'],
        rows: all.map(l => [l.lotNumber, l.product.name, l.quantity, formatDate(l.expirationDate), l.supplier?.name, l.address, LOT_STATUS_LABELS[l.status]]),
      }
    },
  },
  {
    id: 'abc', icon: 'pie-chart', label: 'Curva ABC', desc: 'Classificação por valor movimentado',
    load: async () => {
      const r = await api.get<ApiAbcCurve>('/reports/abc')
      const items = [...r.A, ...r.B, ...r.C]
      return {
        title: 'Curva ABC',
        summary: [
          { label: 'Valor movimentado', value: formatCurrency(r.summary.totalValue) },
          { label: 'Classe A', value: `${r.summary.A.count} itens` },
          { label: 'Classe B', value: `${r.summary.B.count} itens` },
          { label: 'Classe C', value: `${r.summary.C.count} itens` },
        ],
        headers: ['Classe', 'Código', 'Produto', 'Valor movimentado', '% acumulado'],
        rows: items.map(i => [i.class, i.product.internalCode, i.product.name, i.totalValue, `${i.accumulatedPercentage}%`]),
      }
    },
  },
  {
    id: 'inventory', icon: 'clipboard', label: 'Inventário', desc: 'Contagens e divergências',
    load: async () => {
      const r = await api.get<ApiInventoryReport>('/reports/inventory')
      return {
        title: 'Inventário',
        summary: [
          { label: 'Contagens', value: formatNumber(r.summary.total) },
          { label: 'Concluídas', value: formatNumber(r.summary.completed) },
          { label: 'Divergências', value: formatNumber(r.summary.totalDivergences) },
          { label: 'Acuracidade média', value: r.summary.avgAccuracy === null ? '—' : `${r.summary.avgAccuracy}%` },
        ],
        headers: ['Inventário', 'Tipo', 'Status', 'Início', 'Fim', 'Itens', 'Contados', 'Divergências', 'Responsável'],
        rows: r.counts.map(c => [c.name, c.type, c.status, formatDate(c.startDate), c.endDate ? formatDate(c.endDate) : '', c.totalItems, c.countedItems, c.divergences, c.responsible.name]),
      }
    },
  },
  {
    id: 'suppliers', icon: 'truck', label: 'Por fornecedor', desc: 'Compras e entradas por fornecedor', usesPeriod: true,
    load: async p => {
      const r = await api.get<ApiSupplierReport>('/reports/suppliers', { from: p.from, to: p.to })
      return {
        title: 'Compras por fornecedor',
        summary: [
          { label: 'Fornecedores', value: formatNumber(r.summary.totalSuppliers) },
          { label: 'Entradas', value: formatNumber(r.summary.totalEntries) },
          { label: 'Valor comprado', value: formatCurrency(r.summary.totalValue) },
        ],
        headers: ['Fornecedor', 'Entradas', 'Unidades', 'Valor'],
        rows: r.suppliers.map(s => [s.supplier.tradeName || s.supplier.name, s.entryCount, s.totalQuantity, s.totalValue]),
      }
    },
  },
  {
    id: 'warehouse', icon: 'map-pin', label: 'Ocupação do armazém', desc: 'Endereços, capacidade e ocupação',
    load: async () => {
      const list = await fetchAll<ApiAddress>('/warehouse')
      const occupied = list.filter(a => a.status === 'occupied').length
      return {
        title: 'Ocupação do armazém',
        summary: [
          { label: 'Posições', value: formatNumber(list.length) },
          { label: 'Ocupadas', value: formatNumber(occupied) },
          { label: 'Taxa de ocupação', value: list.length ? `${Math.round((occupied / list.length) * 100)}%` : '0%' },
        ],
        headers: ['Endereço', 'Status', 'Produto', 'Quantidade', 'Capacidade'],
        rows: list.map(a => [a.code, a.status, a.product?.name, a.quantity, a.capacity]),
      }
    },
  },
]
