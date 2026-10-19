'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Upload, Sparkles, ScanLine, Package, ImageIcon, X, Wand2 } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProductImage } from '@/components/products/ProductImage'
import { ApiError, api } from '@/lib/api'
import { IMAGE_ACCEPT, IMAGE_MAX_MB, validateImage } from '@/lib/image'
import { cn } from '@/lib/cn'

interface Candidate {
  id: string
  name: string
  internalCode: string
  sku: string
  currentStock: number
  categoryName: string
  imageUrl: string | null
  matchScore: number
}

interface Identification {
  identified: boolean
  confidence: number
  model: string
  suggestion: {
    name: string
    description: string
    keywords: string[]
    categoryName: string | null
    categoryId: string | null
    brandName: string | null
    brandId: string | null
  }
  candidates: Candidate[]
}

/** Monta o link do cadastro de produto já pré-preenchido com o que a IA sugeriu. */
function newProductHref(s: Identification['suggestion']) {
  const params = new URLSearchParams()
  if (s.name) params.set('name', s.name)
  if (s.description) params.set('description', s.description)
  if (s.categoryId) params.set('categoryId', s.categoryId)
  if (s.brandId) params.set('brandId', s.brandId)
  return `/dashboard/produtos/novo?${params.toString()}`
}

/** Identificação de produto por foto: o backend envia a imagem a um modelo de visão (OpenAI) e devolve sugestões. */
export default function IAPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<Identification | null>(null)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function accept(f: File | undefined) {
    if (!f) return
    const problem = validateImage(f)
    if (problem) return setError(problem)
    setError('')
    setResult(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clear() {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
  }

  async function analyze() {
    if (!file) return
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const form = new FormData()
      form.append('image', file)
      setResult(await api.upload<Identification>('/ai/identify-product', form))
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Falha ao analisar a imagem'
      setError(/not configured|rejected the API key/i.test(message)
        ? 'A identificação por IA não está disponível: a chave da OpenAI (OPENAI_API_KEY) não está configurada ou foi recusada no servidor.'
        : message)
    } finally {
      setAnalyzing(false)
    }
  }

  const confidenceVariant = !result ? 'default' : result.confidence >= 0.7 ? 'success' : result.confidence >= 0.4 ? 'warning' : 'danger'

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'Identificação de Produtos' }]} />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-[color:var(--text-primary)]">IA — Identificação de Produtos</h1>
          <Badge variant="brand" size="sm"><Sparkles className="w-3 h-3 mr-1" />Visão computacional</Badge>
        </div>
        <p className="text-sm text-[color:var(--text-tertiary)]">Envie uma foto: a IA sugere nome, categoria, marca e descrição e procura produtos parecidos já cadastrados</p>
      </div>

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
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">ou clique para selecionar — JPEG, PNG, WebP ou GIF até {IMAGE_MAX_MB} MB</p>
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
                  <Button size="sm" loading={analyzing} leftIcon={<Wand2 className="w-3.5 h-3.5" />} onClick={analyze}>{analyzing ? 'Analisando…' : result ? 'Analisar novamente' : 'Identificar com IA'}</Button>
                  <Link href="/dashboard/scanner"><Button size="sm" variant="outline" leftIcon={<ScanLine className="w-3.5 h-3.5" />}>Buscar por código no Scanner</Button></Link>
                </div>
              </div>
            )}
            <input ref={inputRef} type="file" accept={IMAGE_ACCEPT} className="hidden" onChange={e => { accept(e.target.files?.[0]); e.target.value = '' }} />
          </Card>
          {error && <Alert>{error}</Alert>}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle description={`Modelo: ${result.model}`}>{result.identified ? 'Produto identificado' : 'Não foi possível identificar'}</CardTitle>
                <Badge variant={confidenceVariant} size="sm">Confiança {Math.round(result.confidence * 100)}%</Badge>
              </CardHeader>
              {result.identified ? (
                <div className="space-y-4">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div><dt className="text-xs text-[color:var(--text-tertiary)]">Nome sugerido</dt><dd className="font-semibold text-[color:var(--text-primary)]">{result.suggestion.name}</dd></div>
                    <div><dt className="text-xs text-[color:var(--text-tertiary)]">Categoria</dt><dd className="font-medium">{result.suggestion.categoryName ?? '—'} {result.suggestion.categoryName && !result.suggestion.categoryId && <span className="text-xs text-[color:var(--warning)]">(não existe no catálogo)</span>}</dd></div>
                    <div><dt className="text-xs text-[color:var(--text-tertiary)]">Marca</dt><dd className="font-medium">{result.suggestion.brandName ?? '—'} {result.suggestion.brandName && !result.suggestion.brandId && <span className="text-xs text-[color:var(--warning)]">(não existe no catálogo)</span>}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs text-[color:var(--text-tertiary)]">Descrição</dt><dd>{result.suggestion.description || '—'}</dd></div>
                  </dl>
                  {result.suggestion.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">{result.suggestion.keywords.map(k => <Badge key={k} variant="default" size="sm">{k}</Badge>)}</div>
                  )}
                  <Link href={newProductHref(result.suggestion)}>
                    <Button size="sm" leftIcon={<Package className="w-3.5 h-3.5" />}>Cadastrar produto com estes dados</Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-[color:var(--text-secondary)]">A IA não reconheceu um produto nesta imagem. Tente uma foto mais próxima, com boa luz e fundo limpo, ou use o Scanner / cadastro manual.</p>
              )}
            </Card>
          )}

          {result && result.candidates.length > 0 && (
            <Card>
              <CardHeader><CardTitle description="Já cadastrados com nome parecido — confira antes de criar um novo">Produtos parecidos no catálogo</CardTitle></CardHeader>
              <ul className="divide-y divide-[color:var(--border)]">
                {result.candidates.map(c => (
                  <li key={c.id}>
                    <Link href={`/dashboard/produtos/${c.id}`} className="flex items-center gap-3 py-2.5 hover:bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)] px-2">
                      <ProductImage src={c.imageUrl} alt={c.name} className="w-10 h-10 rounded-[var(--radius-md)] flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">{c.name}</p>
                        <p className="text-xs text-[color:var(--text-tertiary)] font-mono">{c.internalCode} · {c.sku} · {c.categoryName}</p>
                      </div>
                      <span className="text-xs text-[color:var(--text-secondary)] whitespace-nowrap">{c.currentStock} em estoque</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Como funciona</CardTitle><Sparkles className="w-4 h-4 text-[color:var(--brand)]" /></CardHeader>
          <ol className="space-y-3">
            {['Envie uma foto do produto', 'A API envia a imagem a um modelo de visão (a chave fica só no servidor)', 'Você revisa nome, categoria, marca e descrição sugeridos', 'Cadastre com um clique: o formulário já vem pré-preenchido', 'Ou abra um produto parecido que já existe no catálogo'].map((t, i) => (
              <li key={t} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[color:var(--brand-subtle)] text-[color:var(--brand)] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-[color:var(--text-secondary)]">{t}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[11px] text-[color:var(--text-tertiary)]">A sugestão é um apoio: revise antes de salvar. Imagens são enviadas ao provedor de IA apenas para esta análise.</p>
        </Card>
      </div>
    </div>
  )
}
