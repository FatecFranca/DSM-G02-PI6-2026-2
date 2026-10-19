'use client'
import { useState } from 'react'
import { Package } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ProductImageProps {
  src?: string | null
  alt: string
  /** Classes do quadro (tamanho, borda arredondada). */
  className?: string
  iconClassName?: string
}

/** Foto do produto com ícone de fallback (sem foto ou URL assinada expirada/quebrada). */
export function ProductImage({ src, alt, className, iconClassName }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = !!src && failedSrc !== src

  return (
    <div className={cn('bg-[color:var(--bg-muted)] flex items-center justify-center overflow-hidden', className)}>
      {showImage ? (
        // URL assinada de outro domínio (S3): <img> comum evita configurar domínios do next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className="w-full h-full object-cover" />
      ) : (
        <Package className={cn('text-[color:var(--text-tertiary)]', iconClassName ?? 'w-4 h-4')} />
      )}
    </div>
  )
}
