import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

let adminToken: string
let productId: string

beforeAll(async () => {
  await prisma.$connect()

  await prisma.user.upsert({
    where: { email: 'test-admin-mvt@example.com' },
    update: {},
    create: {
      name: 'Admin MVT',
      email: 'test-admin-mvt@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'test-admin-mvt@example.com',
    password: 'password',
  })
  adminToken = loginRes.body.token

  const cat = await prisma.category.create({
    data: { name: 'MVT Cat', slug: 'mvt-cat', color: '#111111' },
  })
  const brand = await prisma.brand.create({ data: { name: 'MVT Brand', slug: 'mvt-brand' } })
  const supplier = await prisma.supplier.create({
    data: {
      name: 'MVT Supplier',
      tradeName: 'MVT',
      cnpj: '98.765.432/0001-10',
      email: 'mvt@test.com',
      phone: '11888888888',
      contactName: 'MVT Contact',
      category: 'General',
      city: 'SP',
      state: 'SP',
    },
  })

  const product = await prisma.product.create({
    data: {
      name: 'MVT Product',
      internalCode: 'MVT-001',
      sku: 'MVT-SKU-001',
      barcode: 'MVT1234567890',
      unit: 'UN',
      purchasePrice: 10,
      salePrice: 15,
      minStock: 5,
      maxStock: 100,
      currentStock: 10,
      categoryId: cat.id,
      brandId: brand.id,
      supplierId: supplier.id,
    },
  })
  productId = product.id
})

afterAll(async () => {
  await prisma.movement.deleteMany({ where: { product: { sku: 'MVT-SKU-001' } } })
  await prisma.product.deleteMany({ where: { sku: 'MVT-SKU-001' } })
  await prisma.supplier.deleteMany({ where: { cnpj: '98.765.432/0001-10' } })
  await prisma.brand.deleteMany({ where: { slug: 'mvt-brand' } })
  await prisma.category.deleteMany({ where: { slug: 'mvt-cat' } })
  await prisma.user.deleteMany({ where: { email: 'test-admin-mvt@example.com' } })
  await prisma.$disconnect()
})

describe('POST /api/movements', () => {
  it('should register an entry movement and update stock', async () => {
    const before = await prisma.product.findUnique({ where: { id: productId } })

    const res = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'entry',
        productId,
        quantity: 20,
        unitCost: 10,
        notes: 'Test entry',
      })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('entry')
    expect(res.body.quantity).toBe(20)
    expect(res.body.totalValue).toBe(200)

    const after = await prisma.product.findUnique({ where: { id: productId } })
    expect(after!.currentStock).toBe(before!.currentStock + 20)
  })

  it('should return 400 on exit with insufficient stock', async () => {
    const product = await prisma.product.findUnique({ where: { id: productId } })

    const res = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'exit',
        productId,
        quantity: product!.currentStock + 9999,
        unitCost: 15,
        exitReason: 'sale',
      })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/insufficient stock/i)
  })

  it('should return 422 on missing type', async () => {
    const res = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ productId, quantity: 5 })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/movements', () => {
  it('should list movements with pagination', async () => {
    const res = await request(app)
      .get('/api/movements')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should filter by type', async () => {
    const res = await request(app)
      .get('/api/movements?type=entry')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    res.body.data.forEach((m: { type: string }) => {
      expect(m.type).toBe('entry')
    })
  })
})
