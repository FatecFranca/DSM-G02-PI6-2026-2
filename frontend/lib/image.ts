/** Regras de foto de produto, espelhando o backend (que valida de novo pelo conteúdo do arquivo). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const IMAGE_ACCEPT = IMAGE_TYPES.join(',')
export const IMAGE_MAX_MB = 5

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Formato não suportado. Use JPEG, PNG, WebP ou GIF.'
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) return `A foto deve ter no máximo ${IMAGE_MAX_MB} MB.`
  return null
}
