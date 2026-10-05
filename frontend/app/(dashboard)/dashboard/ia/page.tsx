'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, Sparkles, ScanLine, Package, ImageIcon, X, Info } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Product identification by photo.
 * The vision model is not integrated yet (see docs/ARCHITECTURE.md), so this page only
 * accepts and previews the image and points to the working alternatives — it does not
 * fabricate recognition results.
 */
export default function IAPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function accept(f: File | undefined) {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) return setError('Formato não suportado. Use PNG, JPG ou WebP.')
    if (f.size > MAX_BYTES) return setError('A imagem excede 10MB.')
    setError('')
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clear() {
    setFile(null)
    setPreview(null)
  }

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'Identificação de Produtos' }]} />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">IA — Identificação de Produtos</h1>
          <Badge variant="warning" size="sm"><Sparkles className="w-3 h-3 mr-1" />Em desenvolvimento</Badge>
        </div>
        <p className="text-sm text-[color:var(--text-tertiary)]">Reconhecimento de produtos por foto (visão computacional)</p>
      </div>

      <Alert variant="info">
        <span className="inline-flex items-start gap-2"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          O modelo de visão computacional ainda não está integrado ao backend, por isso nenhuma identificação automática é feita. Você já pode enviar a imagem para conferência visual e usar o Scanner ou o cadastro manual.
        </span>
      </Alert>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <Card>
            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); accept(e.dataTransfer.files[0]) }}
                onClick={() => inputRef.current?.click()}
                className={cn('border-2 border-dashed rounded-[var(--radius-xl)] p-12 flex flex-col items-center gap-4 transition-all cursor-pointer',
                  dragOver ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)]' : 'border-[color:var(--border)] hover:border-[color:var(--brand-muted)] hover:bg-[color:var(--bg-subtle)]')}
              >
                <div className={cn('w-16 h-16 rounded-[var(--radius-2xl)] flex items-center justify-center transition-colors', dragOver ? 'bg-[color:var(--brand)] text-white' : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]')}>
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Arraste e solte a imagem aqui</p>
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">ou clique para selecionar — PNG, JPG, WebP até 10MB</p>
                </div>
                <Button size="sm" leftIcon={<ImageIcon className="w-3.5 h-3.5" />} onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>Selecionar Imagem</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{file.name}</p>
                    <p className="text-xs text-[color:var(--text-tertiary)]">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button onClick={clear} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]" aria-label="Remover imagem"><X className="w-4 h-4" /></button>
                </div>
                {preview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Pré-visualização do produto" className="max-h-80 mx-auto rounded-[var(--radius-lg)] border border-[color:var(--border)]" />
                )}
                <div className="flex flex-wrap gap-2 justify-center">
                  <Link href="/dashboard/scanner"><Button size="sm" variant="outline" leftIcon={<ScanLine className="w-3.5 h-3.5" />}>Buscar por código no Scanner</Button></Link>
                  <Link href="/dashboard/produtos/novo"><Button size="sm" leftIcon={<Package className="w-3.5 h-3.5" />}>Cadastrar produto manualmente</Button></Link>
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} className="hidden" onChange={e => { accept(e.target.files?.[0]); e.target.value = '' }} />
          </Card>
          {error && <Alert>{error}</Alert>}
        </div>

        <Card>
          <CardHeader><CardTitle>Como vai funcionar</CardTitle><Sparkles className="w-4 h-4 text-[color:var(--brand)]" /></CardHeader>
          <ol className="space-y-3">
            {['Envie uma foto do produto', 'O modelo de visão reconhece nome, categoria e marca', 'Você revisa as sugestões', 'O cadastro é pré-preenchido com um clique'].map((t, i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[color:var(--brand-subtle)] text-[color:var(--brand)] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-[color:var(--text-secondary)]">{t}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}
