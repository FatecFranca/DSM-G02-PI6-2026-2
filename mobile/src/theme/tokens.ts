/** Design tokens espelhando frontend/app/globals.css (mesmas cores, raios e escala). */

export interface Palette {
  bgBase: string
  bgSubtle: string
  bgMuted: string
  overlay: string
  border: string
  borderStrong: string
  text: string
  textSecondary: string
  textTertiary: string
  textInverse: string
  brand: string
  brandHover: string
  brandSubtle: string
  brandMuted: string
  success: string
  successSubtle: string
  successMuted: string
  warning: string
  warningSubtle: string
  warningMuted: string
  danger: string
  dangerSubtle: string
  dangerMuted: string
  info: string
  infoSubtle: string
  infoMuted: string
}

export const light: Palette = {
  bgBase: '#ffffff',
  bgSubtle: '#fafafa',
  bgMuted: '#f2f2f4',
  overlay: 'rgba(0,0,0,0.35)',
  border: '#e9e9ec',
  borderStrong: '#dcdce0',
  text: '#1d1d1f',
  textSecondary: '#6e6e73',
  textTertiary: '#a1a1a6',
  textInverse: '#ffffff',
  brand: '#2563eb',
  brandHover: '#1d4ed8',
  brandSubtle: '#eff6ff',
  brandMuted: '#bfdbfe',
  success: '#16a34a',
  successSubtle: '#f0fdf4',
  successMuted: '#bbf7d0',
  warning: '#d97706',
  warningSubtle: '#fffbeb',
  warningMuted: '#fde68a',
  danger: '#dc2626',
  dangerSubtle: '#fef2f2',
  dangerMuted: '#fecaca',
  info: '#0891b2',
  infoSubtle: '#ecfeff',
  infoMuted: '#a5f3fc',
}

export const dark: Palette = {
  ...light,
  bgBase: '#1c1c1e',
  bgSubtle: '#151517',
  bgMuted: '#2c2c2e',
  overlay: 'rgba(0,0,0,0.6)',
  border: '#2c2c2e',
  borderStrong: '#3a3a3d',
  text: '#f5f5f7',
  textSecondary: '#a1a1a6',
  textTertiary: '#6e6e73',
  brandSubtle: '#172554',
  brandMuted: '#1d3a8a',
  successSubtle: '#052e16',
  successMuted: '#14532d',
  warningSubtle: '#1c1100',
  warningMuted: '#713f12',
  dangerSubtle: '#1c0a0a',
  dangerMuted: '#7f1d1d',
  infoSubtle: '#0c1a1e',
  infoMuted: '#155e75',
}

export const radius = { sm: 6, md: 8, lg: 12, xl: 16, xxl: 20, full: 9999 } as const
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const
export const font = { xs: 11, sm: 12, base: 14, md: 15, lg: 17, xl: 20, xxl: 26 } as const

export type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Cores de primeiro plano / fundo / borda para cada "tom" semântico. */
export function toneColors(p: Palette, tone: Tone) {
  switch (tone) {
    case 'brand': return { fg: p.brand, bg: p.brandSubtle, border: p.brandMuted }
    case 'success': return { fg: p.success, bg: p.successSubtle, border: p.successMuted }
    case 'warning': return { fg: p.warning, bg: p.warningSubtle, border: p.warningMuted }
    case 'danger': return { fg: p.danger, bg: p.dangerSubtle, border: p.dangerMuted }
    case 'info': return { fg: p.info, bg: p.infoSubtle, border: p.infoMuted }
    default: return { fg: p.textSecondary, bg: p.bgMuted, border: p.border }
  }
}
