import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'
import { resetModelInfoCache } from '../src/services/ml.service'
import { deleteUsers } from './helpers'

const HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
const originalFetch = global.fetch
let token: string
let productId: string
let userId: string
let receivedSeries: { id: string; history: { date: string; quantity: number }[] }[] = []

function mockMl(dailyMean: number) {
  process.env.ML_SERVICE_URL = 'http://ml.test'
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith('/model')) {
      return new Response(JSON.stringify({ package_version: '1.0.0', trained_on: 'Kaggle', backtest: { modelo_gbm: { rmsle: 0.4, wape: 0.1, vies_pct: 0 }, media_mesmo_dia_8sem: { rmsle: 0.5, wape: 0.2, vies_pct: 0 }, cobertura_intervalo: 0.8 } }))
    }
    const body = JSON.parse(String(init?.body))
    receivedSeries = body.series
    return new Response(JSON.stringify({
      forecasts: body.series.map((s: { id: string }) => ({
        id: s.id, method: 'gbm', historyDays: 60,
        daily: Array.from({ length: body.horizon }, (_, i) => ({ date: `2030-01-${String(i + 1).padStart(2, '0')}`, mean: dailyMean, low: dailyMean * 0.7, high: dailyMean * 1.4 })),
      })),
    }))
  }) as typeof fetch
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { name: 'ML Tester', email: 'test-ml@example.com', password: HASH, role: 'supervisor', department: 'QA', status: 'active' } })
  userId = user.id
  const res = await request(app).post('/api/auth/login').send({ email: 'test-ml@example.com', password: 'password' })
  token = res.body.token

  const category = await prisma.category.create({ data: { name: 'ML Cat', slug: 'ml-cat' } })
  const brand = await prisma.brand.create({ data: { name: 'ML Brand', slug: 'ml-brand' } })
  const supplier = await prisma.supplier.create({ data: { name: 'ML Sup', tradeName: 'ML', cnpj: '66.666.666/0001-66', email: 'm@m.com', phone: '11999999999', contactName: 'Mel', category: 'x', city: 'SP', state: 'SP' } })
  const product = await prisma.product.create({
    data: { name: 'ML Product', internalCode: 'ML-1', sku: 'ML-SKU', barcode: 'ML-BAR', unit: 'UN', purchasePrice: 10, salePrice: 20, minStock: 5, maxStock: 100, currentStock: 12, categoryId: category.id, brandId: brand.id, supplierId: supplier.id },
  })
  productId = product.id
  // 20 days of exits, 2 units/day (yesterday and before; today is excluded from the history).
  const rows = Array.from({ length: 20 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (i + 1))
    d.setHours(11, 0, 0, 0)
    return { type: 'exit' as const, quantity: 2, unitCost: 20, totalValue: 40, productId, userId, createdAt: d }
  })
  await prisma.movement.createMany({ data: rows })
})

afterAll(async () => {
  global.fetch = originalFetch
  delete process.env.ML_SERVICE_URL
  await prisma.movement.deleteMany({ where: { productId } })
  await prisma.product.deleteMany({ where: { sku: 'ML-SKU' } })
  await prisma.supplier.deleteMany({ where: { cnpj: '66.666.666/0001-66' } })
  await prisma.brand.deleteMany({ where: { slug: 'ml-brand' } })
  await prisma.category.deleteMany({ where: { slug: 'ml-cat' } })
  await deleteUsers({ where: { email: 'test-ml@example.com' } })
  await prisma.$disconnect()
})

beforeEach(() => {
  resetModelInfoCache()
  receivedSeries = []
})

describe('analytics with the ML service', () => {
  it('sends daily exit history per product and reports the model', async () => {
    mockMl(3)
    const res = await request(app).get('/api/analytics').set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    expect(res.body.model.source).toBe('ml')
    expect(res.body.model.backtest.model.rmsle).toBe(0.4)

    const sent = receivedSeries.find((s) => s.id === productId)
    expect(sent?.history).toHaveLength(20)
    expect(sent?.history.every((h) => h.quantity === 2)).toBe(true)
  })

  it('builds the weekly forecast and a purchase suggestion from the ML numbers', async () => {
    mockMl(3) // 3/day → 12 in stock lasts 4 days, shorter than the 7-day lead time
    const res = await request(app).get('/api/analytics').set({ Authorization: `Bearer ${token}` })
    const future = res.body.demand.filter((d: { real: number | null }) => d.real === null)
    expect(future).toHaveLength(4)
    expect(future.length && future[0].forecast).toBeGreaterThan(0)
    expect(future[0].high).toBeGreaterThanOrEqual(future[0].forecast)

    const suggestion = res.body.suggestions.find((s: { productId: string }) => s.productId === productId)
    expect(suggestion).toBeDefined()
    expect(suggestion.urgency).toBe('Urgente')
    expect(suggestion.method).toBe('gbm')
    expect(suggestion.daysOfCover).toBe(4)
    expect(suggestion.forecast7).toBe(21)
    // 28d × 3 = 84; safety = √(7 × 1.2²) = 3.17 → 4; 84 + 4 − 12 in stock = 76
    expect(suggestion.safetyStock).toBe(4)
    expect(suggestion.quantity).toBe(76)
  })

  it('does not suggest a purchase when the forecast is far below the stock', async () => {
    mockMl(0.1)
    const res = await request(app).get('/api/analytics').set({ Authorization: `Bearer ${token}` })
    expect(res.body.suggestions.find((s: { productId: string }) => s.productId === productId)).toBeUndefined()
  })

  it('keeps working (baseline) when the ML service is down', async () => {
    process.env.ML_SERVICE_URL = 'http://ml.test'
    global.fetch = jest.fn(async () => { throw new Error('connect ECONNREFUSED') }) as typeof fetch
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const res = await request(app).get('/api/analytics').set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(200)
    expect(res.body.model.source).toBe('baseline')
    expect(res.body.model.reason).toMatch(/ECONNREFUSED/)
    warn.mockRestore()
  })
})
