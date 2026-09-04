'use client'
import { useState } from 'react'
import { Upload, Sparkles, Package, Tag, Award, Barcode, CheckCircle2, Clock, ImageIcon, X } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'done'

const HISTORY = [
  { id: 'h1', image: null, product: 'Cabo HDMI 2.0 2m', category: 'Eletrônicos', confidence: 94, time: '14:32', status: 'registered' },
  { id: 'h2', image: null, product: 'Luva de Nitrilo Tam. M', category: 'EPI', confidence: 87, time: '13:15', status: 'pending' },
  { id: 'h3', image: null, product: 'Parafuso Flangeado M6', category: 'Ferramentas', confidence: 72, time: '11:48', status: 'discarded' },
]

const STATUS_CFG = {
  registered: { label: 'Cadastrado', variant: 'success' as const },
  pending:    { label: 'Pendente',   variant: 'warning' as const },
  discarded:  { label: 'Descartado', variant: 'default' as const },
}

export default function IAPage() {
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [dragOver, setDragOver] = useState(false)

  const simulate = async () => {
    setStatus('uploading')
    await new Promise(r => setTimeout(r, 800))
    setStatus('analyzing')
    await new Promise(r => setTimeout(r, 1800))
    setStatus('done')
  }

  const reset = () => setStatus('idle')

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: 'IA' }, { label: 'Identificação de Produtos' }]} />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-[color:var(--text-primary)]">IA — Identificação de Produtos</h1>
            <Badge variant="brand" size="sm"><Sparkles className="w-3 h-3 mr-1" />Beta</Badge>
          </div>
          <p className="text-sm text-[color:var(--text-tertiary)]">Envie uma foto e a IA identificará automaticamente o produto</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Upload + Result */}
        <div className="xl:col-span-2 space-y-5">
          {/* Upload area */}
          {status === 'idle' && (
            <Card>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); simulate() }}
                className={cn(
                  'border-2 border-dashed rounded-[var(--radius-xl)] p-12 flex flex-col items-center gap-4 transition-all cursor-pointer',
                  dragOver ? 'border-[color:var(--brand)] bg-[color:var(--brand-subtle)]' : 'border-[color:var(--border)] hover:border-[color:var(--brand-muted)] hover:bg-[color:var(--bg-subtle)]'
                )}
                onClick={simulate}
              >
                <div className={cn('w-16 h-16 rounded-[var(--radius-2xl)] flex items-center justify-center transition-colors', dragOver ? 'bg-[color:var(--brand)] text-white' : 'bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)]')}>
                  <Upload className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">Arraste e solte a imagem aqui</p>
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">ou clique para selecionar — PNG, JPG, WebP até 10MB</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" leftIcon={<ImageIcon className="w-3.5 h-3.5" />} onClick={e => { e.stopPropagation(); simulate() }}>Selecionar Imagem</Button>
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); simulate() }}>Usar Câmera</Button>
                </div>
                <p className="text-xs text-[color:var(--text-tertiary)]">Clique em "Selecionar Imagem" para simular uma análise de demonstração</p>
              </div>
            </Card>
          )}

          {/* Loading states */}
          {(status === 'uploading' || status === 'analyzing') && (
            <Card>
              <div className="flex flex-col items-center py-10 gap-5">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 rounded-full border-4 border-[color:var(--bg-muted)] absolute" />
                  <div className="w-20 h-20 rounded-full border-4 border-t-[color:var(--brand)] animate-spin absolute" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-[color:var(--brand)]" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">
                    {status === 'uploading' ? 'Enviando imagem…' : 'Analisando com IA…'}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)] mt-1">
                    {status === 'uploading' ? 'Preparando para análise' : 'Reconhecendo padrões visuais, textos e características do produto'}
                  </p>
                </div>
                <div className="w-48 h-1.5 bg-[color:var(--bg-muted)] rounded-full overflow-hidden">
                  <div className={cn('h-full bg-[color:var(--brand)] rounded-full transition-all duration-700', status === 'uploading' ? 'w-1/3' : 'w-5/6')} />
                </div>
              </div>
            </Card>
          )}

          {/* Result */}
          {status === 'done' && (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <CardHeader>
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[color:var(--success)]" />
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">Análise concluída</p>
                    </div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Confiança geral da análise</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[color:var(--success)]">94%</p>
                      <p className="text-xs text-[color:var(--text-tertiary)]">confiança</p>
                    </div>
                    <button onClick={reset} className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[color:var(--bg-muted)] text-[color:var(--text-tertiary)] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Package, label: 'Nome provável', value: 'Cabo HDMI 2.0 Ultra HD 4K 2m', confidence: 94 },
                    { icon: Tag, label: 'Categoria', value: 'Eletrônicos / Cabos', confidence: 98 },
                    { icon: Award, label: 'Marca (estimada)', value: 'Possivelmente Nexus Pro ou HDMI Co.', confidence: 71 },
                    { icon: Barcode, label: 'Código sugerido', value: 'CAB-HDMI-4K-2M', confidence: 85 },
                  ].map(f => {
                    const Icon = f.icon
                    return (
                      <div key={f.label} className="p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className="w-3.5 h-3.5 text-[color:var(--text-tertiary)]" />
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-tertiary)]">{f.label}</p>
                          <span className={cn('text-[10px] font-bold ml-auto', f.confidence >= 90 ? 'text-[color:var(--success)]' : f.confidence >= 70 ? 'text-[color:var(--warning)]' : 'text-[color:var(--danger)]')}>
                            {f.confidence}%
                          </span>
                        </div>
                        <p className="text-sm font-medium text-[color:var(--text-primary)]">{f.value}</p>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle description="Dados estimados pela visão computacional">Atributos Físicos</CardTitle>
                </CardHeader>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Peso estimado', value: '~180g' },
                    { label: 'Comprimento', value: '~200cm' },
                    { label: 'Espessura cabo', value: '~6mm' },
                  ].map(a => (
                    <div key={a.label} className="text-center p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                      <p className="text-xs text-[color:var(--text-tertiary)]">{a.label}</p>
                      <p className="text-sm font-bold text-[color:var(--text-primary)] mt-0.5">{a.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Descrição Sugerida</CardTitle>
                  <Badge variant="brand" size="sm">Gerada por IA</Badge>
                </CardHeader>
                <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
                  Cabo HDMI 2.0 de alta velocidade com suporte a resolução 4K Ultra HD (3840×2160) a 60Hz. Conta com blindagem dupla para redução de interferência eletromagnética e conectores banhados a ouro para maior durabilidade e transmissão de sinal.
                </p>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" leftIcon={<Package className="w-3.5 h-3.5" />}>Cadastrar Produto</Button>
                  <Button size="sm" variant="outline" onClick={reset}>Analisar Nova Imagem</Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle description="Últimas análises">Histórico</CardTitle>
              <Clock className="w-4 h-4 text-[color:var(--text-tertiary)]" />
            </CardHeader>
            <div className="space-y-3">
              {HISTORY.map(h => {
                const cfg = STATUS_CFG[h.status as keyof typeof STATUS_CFG]
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 bg-[color:var(--bg-subtle)] rounded-[var(--radius-md)]">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[color:var(--bg-muted)] flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-[color:var(--text-tertiary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[color:var(--text-primary)] truncate">{h.product}</p>
                      <p className="text-[10px] text-[color:var(--text-tertiary)]">{h.category} · {h.confidence}% conf.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                        <span className="text-[10px] text-[color:var(--text-tertiary)]">{h.time}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como funciona</CardTitle>
              <Sparkles className="w-4 h-4 text-[color:var(--brand)]" />
            </CardHeader>
            <ol className="space-y-3">
              {[
                { step: '1', text: 'Envie uma foto do produto' },
                { step: '2', text: 'A IA processa a imagem com visão computacional' },
                { step: '3', text: 'Receba sugestões de nome, categoria e atributos' },
                { step: '4', text: 'Confirme e cadastre o produto com um clique' },
              ].map(s => (
                <li key={s.step} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-[color:var(--brand-subtle)] text-[color:var(--brand)] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.step}</span>
                  <p className="text-xs text-[color:var(--text-secondary)]">{s.text}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
