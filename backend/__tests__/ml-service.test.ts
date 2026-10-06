import { baselineForecast, forecastDemand, getModelInfo, resetModelInfoCache } from '../src/services/ml.service'

const asOf = '2026-03-31'
const history = (qty: number, days: number) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(`${asOf}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i)
    return { date: d.toISOString().slice(0, 10), quantity: qty }
  })

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
  delete process.env.ML_SERVICE_URL
  resetModelInfoCache()
})

describe('baseline forecast', () => {
  it('repeats the 28-day mean with a ±50% band', () => {
    const [f] = baselineForecast([{ id: 'a', history: history(4, 40) }], asOf, 7)
    expect(f.method).toBe('baseline')
    expect(f.daily).toHaveLength(7)
    expect(f.daily[0].date).toBe('2026-04-01')
    expect(f.daily[0].mean).toBeCloseTo(4)
    expect(f.daily[0].low).toBeCloseTo(2)
    expect(f.daily[0].high).toBeCloseTo(6)
  })

  it('treats days without movements as zero', () => {
    const [f] = baselineForecast([{ id: 'a', history: history(28, 1) }], asOf, 1)
    expect(f.daily[0].mean).toBeCloseTo(1) // 28 units over 28 days
  })
})

describe('forecastDemand', () => {
  it('falls back to the baseline when ML_SERVICE_URL is not set', async () => {
    const result = await forecastDemand([{ id: 'a', history: history(2, 30) }], asOf, 14)
    expect(result.model.source).toBe('baseline')
    expect(result.model.reason).toMatch(/ML_SERVICE_URL/)
    expect(result.forecasts.get('a')?.daily).toHaveLength(14)
  })

  it('uses the ML service response and its model metadata', async () => {
    process.env.ML_SERVICE_URL = 'http://ml.test'
    const calls: string[] = []
    global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${String(url)}`)
      if (String(url).endsWith('/model')) {
        return new Response(JSON.stringify({
          package_version: '1.0.0', trained_on: 'Kaggle',
          backtest: {
            modelo_gbm: { rmsle: 0.45, wape: 0.15, vies_pct: 1.9 },
            media_mesmo_dia_8sem: { rmsle: 0.47, wape: 0.154, vies_pct: 2.1 },
            cobertura_intervalo: 0.81, horizonte_dias: 14, origens_teste: ['2017-07-03'],
          },
        }))
      }
      const body = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({
        forecasts: body.series.map((s: { id: string }) => ({
          id: s.id, method: 'gbm', historyDays: 30,
          daily: [{ date: '2026-04-01', mean: 3, low: 1, high: 5 }],
        })),
      }))
    }) as typeof fetch

    const result = await forecastDemand([{ id: 'a', history: history(2, 30) }], asOf, 1)
    expect(result.model.source).toBe('ml')
    expect(result.model.backtest?.model.rmsle).toBe(0.45)
    expect(result.model.backtest?.baselineName).toBe('media_mesmo_dia_8sem')
    expect(result.forecasts.get('a')?.method).toBe('gbm')
    expect(calls).toContain('POST http://ml.test/forecast')
  })

  it('falls back with the reason when the ML service fails', async () => {
    process.env.ML_SERVICE_URL = 'http://ml.test'
    global.fetch = jest.fn(async () => new Response('modelo não treinado', { status: 503 })) as typeof fetch
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const result = await forecastDemand([{ id: 'a', history: history(2, 30) }], asOf, 3)
    expect(result.model.source).toBe('baseline')
    expect(result.model.reason).toMatch(/503/)
    expect(result.forecasts.get('a')?.method).toBe('baseline')
    warn.mockRestore()
  })

  it('never throws from getModelInfo when the service is down', async () => {
    process.env.ML_SERVICE_URL = 'http://ml.test'
    global.fetch = jest.fn(async () => { throw new Error('connect ECONNREFUSED') }) as typeof fetch
    const info = await getModelInfo()
    expect(info.source).toBe('baseline')
    expect(info.reason).toMatch(/ECONNREFUSED/)
  })
})
