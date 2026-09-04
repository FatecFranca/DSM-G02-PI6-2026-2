import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

let adminToken: string
let categoryId: string
let brandId: string
let supplierId: string
let productId: string

beforeAll(async () => {
  await prisma.$connect()

  const adminUser = await prisma.user.upsert({
    where: { email: 'test-admin-product@example.com' },
    update: {},
    create: {
      name: 'Admin Product Test',
      email: 'test-admin-product@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'test-admin-product@example.com',
    password: 'password',
  })
  adminToken = loginRes.body.token

  const category = await prisma.category.create({
    data: { name: 'Test Category Jest', slug: 'test-cat-jest', color: '#000000' },
  })
  categoryId = category.id

  const brand = await prisma.brand.create({
    data: { name: 'Test Brand Jest', slug: 'test-brand-jest' },
  })
  brandId = brand.id

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Test Supplier Jest',
      tradeName: 'TS Jest',
      cnpj: '12.345.678/0001-99',
      email: 'supplier@test.com',
      phone: '11999999999',
      contactName: 'Contact',
      category: 'Electronics',
      city: 'São Paulo',
      state: 'SP',
    },
  })
  supplierId = supplier.id
})

afterAll(async () => {
  await prisma.product.deleteMany({ where: { sku: { contains: 'JEST' } } })
  await prisma.supplier.deleteMany({ where: { cnpj: '12.345.678/0001-99' } })
  await prisma.brand.deleteMany({ where: { slug: 'test-brand-jest' } })
  await prisma.category.deleteMany({ where: { slug: 'test-cat-jest' } })
  await prisma.user.deleteMany({ where: { email: 'test-admin-product@example.com' } })
  await prisma.$disconnect()
})

describe('POST /api/products', () => {
  it('should create a product', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Product Jest',
        internalCode: 'JEST-001',
        sku: 'JEST-SKU-001',
        barcode: 'JEST1234567890',
        categoryId,
        brandId,
        supplierId,
        unit: 'UN',
        purchasePrice: 10,
        salePrice: 15,
        minStock: 5,
        maxStock: 100,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.name).toBe('Test Product Jest')
    expect(res.body).toHaveProperty('stockStatus', 'out')
    productId = res.body.id
  })

  it('should return 409 when SKU is duplicated', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Product',
        internalCode: 'JEST-002',
        sku: 'JEST-SKU-001',
        barcode: 'JEST9999999999',
        categoryId,
        brandId,
        supplierId,
        unit: 'UN',
        purchasePrice: 10,
        salePrice: 15,
      })

    expect(res.status).toBe(409)
  })

  it('should return 422 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Incomplete' })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/products', () => {
  it('should list products with pagination', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(res.body).toHaveProperty('page')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should filter by search term', async () => {
    const res = await request(app)
      .get('/api/products?search=Test Product Jest')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('GET /api/products/:id', () => {
  it('should get product by ID', async () => {
    const res = await request(app)
      .get(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(productId)
  })

  it('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .get('/api/products/clnon-existent-id')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/products/:id', () => {
  it('should update product name', async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Jest Product' })

    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Updated Jest Product')
  })
})
