import { Platform } from 'react-native'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'

/** Gera um CSV (UTF‑8 com BOM, separador `;`, abre no Excel) e abre a folha de compartilhamento. */
export async function shareCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): Promise<void> {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const content = '﻿' + [headers, ...rows].map(r => r.map(escape).join(';')).join('\n')

  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return
  }

  const file = new File(Paths.cache, filename)
  if (file.exists) file.delete()
  file.create()
  file.write(content)
  if (!(await Sharing.isAvailableAsync())) throw new Error('Compartilhamento indisponível neste dispositivo.')
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' })
}
