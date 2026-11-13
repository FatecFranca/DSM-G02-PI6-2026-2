import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'
import { deleteUsers } from './helpers'

const EMAIL = 'test-admin-conc@example.com'
let token: string
let productId: string

beforeAll(async () => {
  await prisma.$connect()
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      name: 'Admin Conc',
      email: EMAIL,
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })
  token = (await request(app).post('/api/auth/login').send({ email: EMAIL, password: 'password' })).body.token

  const cat = await prisma.category.create({ data: { name: 'Conc Cat', slug: 'conc-cat', color: '#111111' } })
  const brand = await prisma.brand.create({ data: { name: 'Conc Brand', slug: 'conc-brand' } })
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Conc Supplier', tradeName: 'Conc', cnpj: '11.222.333/0001-44', email: 'conc@test.com',
      phone: '11777777777', contactName: 'Conc', category: 'General', city: 'SP', state: 'SP',
    },
  })
  productId = (
    await prisma.product.create({
      data: {
        name: 'Conc Product', internalCode: 'CONC-001', sku: 'CONC-SKU-001', barcode: 'CONC1234567890',
        unit: 'UN', purchasePrice: 10, salePrice: 15, minStock: 1, maxStock: 100, currentStock: 10,
        categoryId: cat.id, brandId: brand.id, supplierId: supplier.id,
      },
    })
  ).id
})

afterAll(async () => {
  await prisma.movement.deleteMany({ where: { product: { sku: 'CONC-SKU-001' } } })
  await prisma.product.deleteMany({ where: { sku: 'CONC-SKU-001' } })
  await prisma.supplier.deleteMany({ where: { cnpj: '11.222.333/0001-44' } })
  await prisma.brand.deleteMany({ where: { slug: 'conc-brand' } })
  await prisma.category.deleteMany({ where: { slug: 'conc-cat' } })
  await deleteUsers({ where: { email: EMAIL } })
  await prisma.$disconnect()
})

describe('saídas simultâneas', () => {
  it('aceita apenas uma de duas saídas de 8 unidades sobre saldo 10', async () => {
    const exit = () =>
      request(app).post('/api/movements').set('Authorization', `Bearer ${token}`).send({ type: 'exit', productId, quantity: 8 })

    const results = await Promise.all([exit(), exit()])
    const statuses = results.map((r) => r.status).sort()

    expect(statuses).toEqual([201, 400])
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(product.currentStock).toBe(2)
    expect(await prisma.movement.count({ where: { productId, type: 'exit' } })).toBe(1)
  })
})
