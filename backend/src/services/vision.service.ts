import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { detectImageType, resolveImageUrl } from './storage.service'

/**
 * Identificação de produto por foto (visão computacional via OpenAI).
 *
 * Fluxo: a imagem enviada vai para o modelo de visão, que devolve nome, categoria, marca, descrição e palavras-chave
 * em JSON; a API então (1) casa categoria/marca com as do catálogo e (2) procura produtos parecidos já cadastrados.
 * A chave (`OPENAI_API_KEY`) só existe no servidor: o navegador nunca a recebe, e ela não é registrada em log.
 */

const DEFAULT_MODEL = 'gpt-4o-mini'
const TIMEOUT_MS = 30_000

export const visionResultSchema = z.object({
  identificado: z.boolean().default(true),
  nome: z.string().default(''),
  categoria: z.string().default(''),
  marca: z.string().nullable().default(null),
  descricao: z.string().default(''),
  palavrasChave: z.array(z.string()).default([]),
  // Alguns modelos devolvem 0–100 em vez de 0–1.
  confianca: z.number().default(0).transform((value) => Math.min(1, Math.max(0, value > 1 ? value / 100 : value))),
})
export type VisionResult = z.infer<typeof visionResultSchema>

const STOPWORDS = new Set(['para', 'com', 'sem', 'por', 'uma', 'uns', 'das', 'dos', 'the', 'and', 'tipo', 'produto', 'item'])

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function extractKeywords(result: Pick<VisionResult, 'nome' | 'palavrasChave'>): string[] {
  const words = [result.nome, ...result.palavrasChave]
    .flatMap((text) => norm(text).split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
  return [...new Set(words)].slice(0, 12)
}

function buildPrompt(categories: string[], brands: string[]) {
  const system = 'Você identifica produtos de almoxarifado e varejo a partir de uma foto, para pré-preencher um cadastro de estoque. '
    + 'Responda SOMENTE com um objeto JSON. Se não conseguir identificar um produto na imagem, use "identificado": false.'
  const user = [
    'Analise a imagem e devolva JSON com exatamente estas chaves:',
    '{"identificado": boolean, "nome": string (nome comercial curto em português), "categoria": string, "marca": string|null,',
    ' "descricao": string (1–2 frases com características visíveis), "palavrasChave": string[] (3 a 6 termos de busca), "confianca": number entre 0 e 1}.',
    categories.length ? `Para "categoria", escolha UMA destas (ou a mais próxima): ${categories.join('; ')}.` : '',
    brands.length ? `Para "marca", use uma destas quando for o caso: ${brands.join('; ')}; senão a marca visível na embalagem, ou null.` : '',
    'Não invente marca nem especificações que não estejam visíveis.',
  ].filter(Boolean).join('\n')
  return { system, user }
}

async function callOpenAI(image: Buffer, mime: string, categories: string[], brands: string[]): Promise<{ raw: unknown; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) throw new AppError('AI vision not configured: set OPENAI_API_KEY', 503)

  const model = process.env.OPENAI_VISION_MODEL?.trim() || DEFAULT_MODEL
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const { system, user } = buildPrompt(categories, brands)
  // Modelos mais novos (gpt-5, o-series) usam max_completion_tokens e não aceitam temperature.
  const modern = /^(gpt-5|o\d)/.test(model)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        ...(modern ? { max_completion_tokens: 800 } : { max_tokens: 500, temperature: 0.2 }),
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text', text: user },
              { type: 'image_url', image_url: { url: `data:${mime};base64,${image.toString('base64')}`, detail: 'low' } },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new AppError('AI vision timed out; try again', 504)
    throw new AppError('AI vision provider unreachable', 502)
  } finally {
    clearTimeout(timer)
  }

  if (response.status === 401 || response.status === 403) {
    throw new AppError('OpenAI rejected the API key; check OPENAI_API_KEY', 503)
  }
  if (response.status === 429) throw new AppError('AI provider rate limit or quota reached; try again later', 429)
  if (!response.ok) throw new AppError(`AI vision provider error (${response.status})`, 502)

  const payload = await response.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null
  const content = payload?.choices?.[0]?.message?.content
  if (!content) throw new AppError('AI vision returned an empty answer', 502)
  try {
    return { raw: JSON.parse(content), model }
  } catch {
    throw new AppError('AI vision returned an unreadable answer', 502)
  }
}

export async function identifyProduct(image: Buffer) {
  const type = detectImageType(image)
  if (!type) throw new AppError('File is not a valid image (use JPEG, PNG, WebP or GIF)', 415)

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 60 }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 60 }),
  ])

  const { raw, model } = await callOpenAI(image, type.mime, categories.map((c) => c.name), brands.map((b) => b.name))
  const parsed = visionResultSchema.safeParse(raw)
  if (!parsed.success) throw new AppError('AI vision returned an unexpected answer', 502)
  const result = parsed.data

  const identified = result.identificado && result.nome.trim().length > 0
  const matchByName = <T extends { name: string }>(list: T[], wanted: string | null): T | undefined => {
    if (!wanted) return undefined
    const target = norm(wanted)
    return list.find((item) => norm(item.name) === target) ?? list.find((item) => norm(item.name).includes(target) || target.includes(norm(item.name)))
  }
  const category = matchByName(categories, result.categoria)
  const brand = matchByName(brands, result.marca)

  // Produtos parecidos já cadastrados (para evitar duplicar o cadastro).
  const keywords = identified ? extractKeywords(result) : []
  let candidates: Awaited<ReturnType<typeof findCandidates>> = []
  if (keywords.length > 0) candidates = await findCandidates(keywords)

  return {
    identified,
    confidence: result.confianca,
    model,
    suggestion: {
      name: result.nome.trim(),
      description: result.descricao.trim(),
      keywords: result.palavrasChave,
      categoryName: result.categoria || null,
      categoryId: category?.id ?? null,
      brandName: result.marca,
      brandId: brand?.id ?? null,
    },
    candidates,
  }
}

async function findCandidates(keywords: string[]) {
  const rows = await prisma.product.findMany({
    where: { OR: keywords.map((word) => ({ name: { contains: word, mode: 'insensitive' as const } })) },
    select: { id: true, name: true, internalCode: true, sku: true, currentStock: true, imageUrl: true, imageKey: true, category: { select: { name: true } } },
    take: 60,
  })
  const scored = rows
    .map((row) => ({ row, score: keywords.filter((word) => norm(row.name).includes(word)).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
    .slice(0, 5)
  return Promise.all(scored.map(async ({ row, score }) => ({
    id: row.id,
    name: row.name,
    internalCode: row.internalCode,
    sku: row.sku,
    currentStock: row.currentStock,
    categoryName: row.category.name,
    imageUrl: await resolveImageUrl(row.imageKey, row.imageUrl),
    matchScore: score,
  })))
}
