export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

export const formatNumber = (value: number | string) => new Intl.NumberFormat('pt-BR').format(Number(value) || 0)

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function relativeTime(date: string | Date): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d atrás` : formatDate(date)
}

export function slugify(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export const initials = (name: string) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

/** "DD/MM/AAAA" digitado -> ISO (UTC, meia-noite). Retorna null se a data for inválida. */
export function brDateToIso(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!m) return null
  const [, d, mo, y] = m
  const date = new Date(`${y}-${mo}-${d}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d) ? null : date.toISOString()
}

/** Máscara de digitação DD/MM/AAAA. */
export function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
}

export function maskCnpj(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 14)
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

export const parseDecimal = (v: string) => Number(v.replace(/\./g, '').replace(',', '.')) || 0
