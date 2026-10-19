import { predictSchema } from '../src/schemas/simulation.schema'
import { getModelInfo, getStatus, predict } from '../src/services/simulation.service'

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

let fetchMock: jest.SpyInstance

beforeEach(() => {
  delete process.env.SALES_MODEL_URL
  delete process.env.SALES_MODEL_TIMEOUT_MS
  fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => json({}))
})
afterEach(() => jest.restoreAllMocks())

describe('simulation service', () => {
  it('encaminha a previsão ao serviço Python (URL padrão) e devolve o resultado', async () => {
    fetchMock.mockImplementation(() => json({ predictions: [{ rfe_rf: 2095.61 }] }))
    const input = predictSchema.parse({ scenarios: [{ store: 1, family: 'GROCERY I', date: '2017-08-20' }] })
    const result = await predict(input)

    expect(result).toEqual({ predictions: [{ rfe_rf: 2095.61 }] })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:8100/predict')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string).scenarios[0]).toMatchObject({ store: 1, family: 'GROCERY I', onpromotion: 0 })
  })

  it('respeita SALES_MODEL_URL', async () => {
    process.env.SALES_MODEL_URL = 'http://ml.interno:9000/'
    await getModelInfo()
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe('http://ml.interno:9000/model')
  })

  it('serviço fora do ar vira 503 com instrução; timeout vira 504', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    await expect(getModelInfo()).rejects.toMatchObject({ statusCode: 503, message: expect.stringContaining('ml:service') })
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(getModelInfo()).rejects.toMatchObject({ statusCode: 504 })
  })

  it('repassa 503 (treinando) e 422 (cenário inválido) com a mensagem do serviço; outros erros viram 502', async () => {
    fetchMock.mockImplementationOnce(() => json({ detail: 'Treinando os modelos…' }, 503))
    await expect(getModelInfo()).rejects.toMatchObject({ statusCode: 503, message: 'Treinando os modelos…' })
    fetchMock.mockImplementationOnce(() => json({ detail: 'Cenário 0: loja 9 fora do treino' }, 422))
    await expect(getModelInfo()).rejects.toMatchObject({ statusCode: 422, message: expect.stringContaining('loja 9') })
    fetchMock.mockImplementationOnce(() => json({}, 500))
    await expect(getModelInfo()).rejects.toMatchObject({ statusCode: 502 })
  })

  it('getStatus nunca lança: reporta offline quando o serviço não responde', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    expect(await getStatus()).toMatchObject({ available: false, status: 'offline', trainedAt: null })
    fetchMock.mockImplementationOnce(() => json({ status: 'training', ready: false, message: 'Treinando', trainedAt: null }))
    expect(await getStatus()).toEqual({ available: false, status: 'training', message: 'Treinando', trainedAt: null })
    fetchMock.mockImplementationOnce(() => json({ status: 'ready', ready: true, message: 'Modelos prontos', trainedAt: '2026-10-19T16:28:54Z' }))
    expect(await getStatus()).toMatchObject({ available: true, status: 'ready' })
  })
})

describe('predictSchema', () => {
  const ok = { store: 1, family: 'GROCERY I', date: '2017-08-20' }
  it('aceita cenário mínimo e preenche onpromotion=0', () => {
    expect(predictSchema.parse({ scenarios: [ok] }).scenarios[0].onpromotion).toBe(0)
  })
  it('recusa data fora do formato, quantidade negativa, lista vazia e lote grande demais', () => {
    expect(() => predictSchema.parse({ scenarios: [{ ...ok, date: '20/08/2017' }] })).toThrow()
    expect(() => predictSchema.parse({ scenarios: [{ ...ok, onpromotion: -1 }] })).toThrow()
    expect(() => predictSchema.parse({ scenarios: [] })).toThrow()
    expect(() => predictSchema.parse({ scenarios: Array.from({ length: 401 }, () => ok) })).toThrow()
  })
})
