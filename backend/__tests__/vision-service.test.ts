const prismaMock = {
  category: { findMany: jest.fn() },
  brand: { findMany: jest.fn() },
  product: { findMany: jest.fn() },
}
jest.mock('../src/prisma/client', () => ({ prisma: prismaMock }))

import { extractKeywords, identifyProduct } from '../src/services/vision.service'

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)])
const KEY = 'sk-test-chave-super-secreta-123'

const answer = (content: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(status === 200 ? { choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] } : { error: { message: 'x' } }), { status }))

const GOOD = {
  identificado: true, nome: 'Capacete de segurança amarelo', categoria: 'EPI', marca: '3M',
  descricao: 'Capacete de obra na cor amarela.', palavrasChave: ['capacete', 'EPI', 'obra'], confianca: 0.86,
}

let fetchMock: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  process.env.OPENAI_API_KEY = KEY
  delete process.env.OPENAI_VISION_MODEL
  delete process.env.OPENAI_BASE_URL
  prismaMock.category.findMany.mockResolvedValue([{ id: 'c1', name: 'EPI' }, { id: 'c2', name: 'Eletrônicos' }])
  prismaMock.brand.findMany.mockResolvedValue([{ id: 'b1', name: '3M' }, { id: 'b2', name: 'Samsung' }])
  prismaMock.product.findMany.mockResolvedValue([])
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => answer(GOOD))
})
afterEach(() => jest.restoreAllMocks())

describe('identifyProduct', () => {
  it('sem OPENAI_API_KEY responde 503 e não chama o provedor', async () => {
    delete process.env.OPENAI_API_KEY
    await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 503, message: expect.stringContaining('OPENAI_API_KEY') })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('recusa arquivo que não é imagem (415) sem chamar o provedor', async () => {
    await expect(identifyProduct(Buffer.from('<svg onload="x"/>'))).rejects.toMatchObject({ statusCode: 415 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('envia a imagem em data URL, com a chave no cabeçalho e o catálogo no prompt', async () => {
    await identifyProduct(JPEG)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`)
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('gpt-4o-mini')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(body.max_tokens).toBe(500)
    const parts = body.messages[1].content
    expect(parts[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/)
    expect(parts[0].text).toContain('EPI; Eletrônicos')
    expect(parts[0].text).toContain('3M; Samsung')
  })

  it('casa categoria e marca com as do catálogo e não vaza a chave na resposta', async () => {
    const result = await identifyProduct(JPEG)
    expect(result).toMatchObject({
      identified: true, confidence: 0.86, model: 'gpt-4o-mini',
      suggestion: { name: 'Capacete de segurança amarelo', categoryId: 'c1', categoryName: 'EPI', brandId: 'b1', brandName: '3M' },
    })
    expect(JSON.stringify(result)).not.toContain(KEY)
  })

  it('casa categoria/marca ignorando acento e maiúsculas, e devolve null quando não há correspondência', async () => {
    fetchMock.mockImplementation(() => answer({ ...GOOD, categoria: 'eletronicos', marca: 'Marca Desconhecida' }))
    const result = await identifyProduct(JPEG)
    expect(result.suggestion).toMatchObject({ categoryId: 'c2', brandId: null, brandName: 'Marca Desconhecida' })
  })

  it('normaliza confiança em escala 0–100', async () => {
    fetchMock.mockImplementation(() => answer({ ...GOOD, confianca: 85 }))
    expect((await identifyProduct(JPEG)).confidence).toBe(0.85)
  })

  it('lista produtos parecidos do catálogo, ordenados por relevância (máx. 5) e com URL da foto', async () => {
    prismaMock.product.findMany.mockResolvedValue(
      ['Capacete Amarelo CA 31469', 'Capacete de segurança amarelo 3M', 'Luva de couro', 'Capacete branco', 'Capacete azul', 'Capacete verde', 'Capacete preto'].map((name, i) => ({
        id: `p${i}`, name, internalCode: `EP-${i}`, sku: `SKU-${i}`, currentStock: 10, imageUrl: i === 0 ? 'https://exemplo.com/a.jpg' : null, imageKey: null, category: { name: 'EPI' },
      })),
    )
    const { candidates } = await identifyProduct(JPEG)
    expect(candidates).toHaveLength(5)
    expect(candidates[0].name).toBe('Capacete de segurança amarelo 3M') // casa mais palavras
    expect(candidates.every((c) => c.matchScore > 0)).toBe(true)
    expect(candidates.find((c) => c.name === 'Luva de couro')).toBeUndefined()
    expect(candidates.find((c) => c.id === 'p0')?.imageUrl).toBe('https://exemplo.com/a.jpg')
    const where = prismaMock.product.findMany.mock.calls[0][0].where
    expect(where.OR[0].name).toMatchObject({ mode: 'insensitive' })
  })

  it('quando o modelo não identifica nada, não busca candidatos', async () => {
    fetchMock.mockImplementation(() => answer({ identificado: false, nome: '', categoria: '', marca: null, descricao: '', palavrasChave: [], confianca: 0.1 }))
    const result = await identifyProduct(JPEG)
    expect(result.identified).toBe(false)
    expect(result.candidates).toEqual([])
    expect(prismaMock.product.findMany).not.toHaveBeenCalled()
  })

  it('mapeia erros do provedor sem expor detalhes: 401→503, 429→429, 500→502', async () => {
    fetchMock.mockImplementation(() => answer('', 401))
    const e401 = await identifyProduct(JPEG).catch((e) => e)
    expect(e401).toMatchObject({ statusCode: 503 })
    expect(e401.message).not.toContain(KEY)

    fetchMock.mockImplementation(() => answer('', 429))
    await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 429 })

    fetchMock.mockImplementation(() => answer('', 500))
    await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('resposta vazia, ilegível ou com formato inesperado vira 502', async () => {
    for (const content of ['', 'isto não é json', '[]']) {
      fetchMock.mockImplementation(() => answer(content))
      await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 502 })
    }
  })

  it('timeout vira 504 e falha de rede vira 502', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 504 })
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(identifyProduct(JPEG)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('usa OPENAI_VISION_MODEL e OPENAI_BASE_URL; modelos novos usam max_completion_tokens sem temperature', async () => {
    process.env.OPENAI_VISION_MODEL = 'gpt-5-mini'
    process.env.OPENAI_BASE_URL = 'http://localhost:9999/v1/'
    await identifyProduct(JPEG)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:9999/v1/chat/completions')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('gpt-5-mini')
    expect(body.max_completion_tokens).toBe(800)
    expect(body).not.toHaveProperty('temperature')
    expect(body).not.toHaveProperty('max_tokens')
  })
})

describe('extractKeywords', () => {
  it('remove acentos, palavras curtas e genéricas, e duplicadas', () => {
    expect(extractKeywords({ nome: 'Capacete de Segurança Amarelo', palavrasChave: ['capacete', 'EPI', 'para obra'] }))
      .toEqual(['capacete', 'seguranca', 'amarelo', 'epi', 'obra'])
  })
})
