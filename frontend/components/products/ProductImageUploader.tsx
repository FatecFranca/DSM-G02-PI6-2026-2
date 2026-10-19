'use client'
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProductImage } from '@/components/products/ProductImage'
import { cn } from '@/lib/cn'
import { IMAGE_ACCEPT, IMAGE_MAX_MB, validateImage } from '@/lib/image'

interface Props {
  /** Foto já salva no produto (URL assinada devolvida pela API). */
  currentUrl?: string | null
  /** Arquivo escolhido, ainda não enviado (o envio acontece ao salvar o produto). */
  file: File | null
  /** Marcado para remover a foto atual ao salvar. */
  removed: boolean
  disabled?: boolean
  onSelect: (file: File | null) => void
  onRemove: (removed: boolean) => void
}

export function ProductImageUploader({ currentUrl, file, removed, disabled, onSelect, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)
  const [problem, setProblem] = useState('')
  const [dragging, setDragging] = useState(false)

  // Pré-visualização local do arquivo escolhido. O object URL é liberado ao trocar/descartar e ao desmontar.
  function updatePreview(next: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = next ? URL.createObjectURL(next) : null
    setPreview(previewRef.current)
  }
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  function choose(selected: File | undefined) {
    if (!selected) return
    const error = validateImage(selected)
    setProblem(error ?? '')
    if (error) return
    updatePreview(selected)
    onRemove(false)
    onSelect(selected)
  }

  const shown = preview ?? (removed ? null : currentUrl)
  const hasPhoto = !!file || (!!currentUrl && !removed)

  return (
    <Card>
      <CardHeader><CardTitle description={`JPEG, PNG, WebP ou GIF · até ${IMAGE_MAX_MB} MB`}>Foto do Produto</CardTitle></CardHeader>

      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) choose(e.dataTransfer.files[0])
        }}
        className={cn(
          'rounded-[var(--radius-lg)] border-2 border-dashed p-3 transition-colors',
          dragging ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)]' : 'border-[color:var(--border)]',
        )}
      >
        <ProductImage
          src={shown}
          alt="Pré-visualização da foto do produto"
          className="w-full aspect-square rounded-[var(--radius-md)]"
          iconClassName="w-10 h-10"
        />
        <p className="mt-2 text-center text-xs text-[color:var(--text-tertiary)]">
          {file ? file.name : hasPhoto ? 'Foto atual' : 'Arraste uma imagem aqui ou escolha um arquivo'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        data-testid="product-image-input"
        onChange={e => {
          choose(e.target.files?.[0])
          e.target.value = '' // permite escolher o mesmo arquivo de novo
        }}
      />

      {problem && <p role="alert" className="mt-2 text-xs text-[color:var(--danger)]">{problem}</p>}

      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={disabled} leftIcon={<ImagePlus className="w-3.5 h-3.5" />} onClick={() => inputRef.current?.click()}>
          {hasPhoto ? 'Trocar foto' : 'Escolher foto'}
        </Button>
        {(file || hasPhoto) && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => {
              setProblem('')
              if (file) { updatePreview(null); onSelect(null) }   // descarta a escolha e volta à foto salva
              else onRemove(true)             // marca a foto salva para remoção
            }}
          >
            {file ? 'Descartar' : 'Remover'}
          </Button>
        )}
      </div>
      {removed && !file && currentUrl && (
        <p className="mt-2 text-xs text-[color:var(--text-tertiary)]">
          A foto será removida ao salvar. <button type="button" className="underline text-[color:var(--brand)]" onClick={() => onRemove(false)}>Desfazer</button>
        </p>
      )}
    </Card>
  )
}
