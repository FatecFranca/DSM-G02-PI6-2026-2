import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'
import { deleteUsers } from './helpers'

const PASSWORD = 'password'
const HASH = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

let adminToken: string
let supervisorToken: string
let operatorToken: string
let productId: string
let addressA: string
let addressB: string

async function login(email: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD })
  return res.body.token
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

beforeAll(async () => {
  for (const [email, role] of [
    ['test-flow-admin@example.com', 'admin'],
    ['test-flow-sup@example.com', 'supervisor'],
    ['test-flow-op@example.com', 'operator'],
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name: `Flow ${role}`, email, password: HASH, role, department: 'QA', status: 'active' },
    })
  }
  adminToken = await login('test-flow-admin@example.com')
  supervisorToken = await login('test-flow-sup@example.com')
  operatorToken = await login('test-flow-op@example.com')

  const category = await prisma.category.create({ data: { name: 'Flow Cat', slug: 'flow-cat' } })
  const brand = await prisma.brand.create({ data: { name: 'Flow Brand', slug: 'flow-brand' } })
  const supplier = await prisma.supplier.create({
    data: { name: 'Flow Sup', tradeName: 'Flow', cnpj: '55.555.555/0001-55', email: 'f@f.com', phone: '11999999999', contactName: 'Flo', category: 'x', city: 'SP', state: 'SP' },
  })
  const product = await prisma.product.create({
    data: {
      name: 'Flow Product', internalCode: 'FLOW-1', sku: 'FLOW-SKU', barcode: 'FLOW-BAR', unit: 'UN',
      purchasePrice: 10, salePrice: 20, minStock: 5, maxStock: 50, currentStock: 20,
      categoryId: category.id, brandId: brand.id, supplierId: supplier.id,
    },
  })
  productId = product.id
  const a = await prisma.warehouseAddress.create({ data: { code: 'FLOW-A', aisle: 'Z', street: '1', shelf: '1', level: 'A', position: '1', capacity: 100, status: 'occupied', productId, quantity: 20, occupied: 20 } })
  const b = await prisma.warehouseAddress.create({ data: { code: 'FLOW-B', aisle: 'Z', street: '1', shelf: '1', level: 'A', position: '2', capacity: 100 } })
  addressA = a.id
  addressB = b.id
})

afterAll(async () => {
  await prisma.movement.deleteMany({ where: { productId } })
  await prisma.lot.deleteMany({ where: { productId } })
  await prisma.warehouseAddress.deleteMany({ where: { code: { startsWith: 'FLOW-' } } })
  await prisma.product.deleteMany({ where: { sku: 'FLOW-SKU' } })
  await prisma.supplier.deleteMany({ where: { cnpj: '55.555.555/0001-55' } })
  await prisma.brand.deleteMany({ where: { slug: 'flow-brand' } })
  await prisma.category.deleteMany({ where: { slug: 'flow-cat' } })
  await deleteUsers({ where: { email: { startsWith: 'test-flow-' } } })
  await prisma.$disconnect()
})

const stock = async () => (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).currentStock

describe('movement stock rules', () => {
  it('entry into an address increases stock and the address quantity', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken)).send({ type: 'entry', productId, quantity: 5, toAddressId: addressA })
    expect(res.status).toBe(201)
    expect(await stock()).toBe(25)
    expect((await prisma.warehouseAddress.findUniqueOrThrow({ where: { id: addressA } })).quantity).toBe(25)
  })

  it('requires a destination address for stocked products', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken)).send({ type: 'entry', productId, quantity: 1 })
    expect(res.status).toBe(400)
    expect(await stock()).toBe(25)
  })

  it('transfer moves between addresses without changing total stock', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken))
      .send({ type: 'transfer', productId, quantity: 8, fromAddressId: addressA, toAddressId: addressB })
    expect(res.status).toBe(201)
    expect(await stock()).toBe(25)
    const [a, b] = await Promise.all([
      prisma.warehouseAddress.findUniqueOrThrow({ where: { id: addressA } }),
      prisma.warehouseAddress.findUniqueOrThrow({ where: { id: addressB } }),
    ])
    expect(a.quantity).toBe(17)
    expect(b.quantity).toBe(8)
    expect(b.status).toBe('occupied')
  })

  it('transfer requires both addresses', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken)).send({ type: 'transfer', productId, quantity: 1 })
    expect(res.status).toBe(422)
  })

  it('decreasing adjustment reduces stock', async () => {
    const res = await request(app).post('/api/movements').set(auth(supervisorToken))
      .send({ type: 'adjustment', adjustmentDirection: 'decrease', productId, quantity: 3, fromAddressId: addressA })
    expect(res.status).toBe(201)
    expect(await stock()).toBe(22)
  })

  it('rejects negative quantity on exit', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken)).send({ type: 'exit', productId, quantity: -2, fromAddressId: addressA })
    expect(res.status).toBe(422)
  })

  it('rejects an exit larger than the stock at the source address', async () => {
    const res = await request(app).post('/api/movements').set(auth(operatorToken)).send({ type: 'exit', productId, quantity: 500, fromAddressId: addressA })
    expect(res.status).toBe(400)
    expect(await stock()).toBe(22)
  })

  it('lists several types with a comma-separated filter', async () => {
    const res = await request(app).get('/api/movements?type=entry,adjustment&limit=50').set(auth(adminToken))
    expect(res.status).toBe(200)
    expect(res.body.data.every((m: { type: string }) => ['entry', 'adjustment'].includes(m.type))).toBe(true)
  })
})

describe('audit trail', () => {
  it('records create, update and delete with before/after values', async () => {
    const created = await request(app).post('/api/brands').set(auth(adminToken)).send({ name: 'Flow Audit Brand', slug: 'flow-audit-brand' })
    expect(created.status).toBe(201)
    const id = created.body.id as string
    await request(app).patch(`/api/brands/${id}`).set(auth(adminToken)).send({ name: 'Flow Audit Brand 2' })
    await request(app).delete(`/api/brands/${id}`).set(auth(adminToken))
    await new Promise((r) => setTimeout(r, 300))

    const logs = await prisma.auditLog.findMany({ where: { entity: 'Brand', entityId: id }, orderBy: { createdAt: 'asc' } })
    expect(logs.map((l) => l.action)).toEqual(['CREATE', 'UPDATE', 'DELETE'])
    expect((logs[1].oldValue as { name: string }).name).toBe('Flow Audit Brand')
    expect((logs[1].newValue as { name: string }).name).toBe('Flow Audit Brand 2')
    expect(logs[2].newValue).toBeNull()
  })

  it('never stores password hashes', async () => {
    await request(app).post('/api/users').set(auth(adminToken))
      .send({ name: 'Flow Tmp', email: 'test-flow-tmp@example.com', password: 'secret123', department: 'QA' })
    await new Promise((r) => setTimeout(r, 300))
    const log = await prisma.auditLog.findFirst({ where: { entity: 'User', entityName: 'Flow Tmp' } })
    expect(JSON.stringify(log?.newValue ?? {})).not.toContain('password')
  })

  it('restricts the audit endpoint to admin/supervisor', async () => {
    expect((await request(app).get('/api/audit').set(auth(operatorToken))).status).toBe(403)
    expect((await request(app).get('/api/audit').set(auth(supervisorToken))).status).toBe(200)
  })
})

describe('privilege rules', () => {
  it('ignores the role field on public registration', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Sneaky', email: 'test-flow-sneaky@example.com', password: 'secret123', department: 'QA', role: 'admin' })
    expect(res.status).toBe(201)
    expect(res.body.user.role).toBe('operator')
  })

  it('does not let a supervisor grant the admin role', async () => {
    const res = await request(app).post('/api/users').set(auth(supervisorToken))
      .send({ name: 'Nope', email: 'test-flow-nope@example.com', password: 'secret123', department: 'QA', role: 'admin' })
    expect(res.status).toBe(403)
  })

  it('does not let a supervisor edit an admin account', async () => {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'test-flow-admin@example.com' } })
    const res = await request(app).patch(`/api/users/${admin.id}`).set(auth(supervisorToken)).send({ department: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('lets an admin reset another user password', async () => {
    const op = await prisma.user.findUniqueOrThrow({ where: { email: 'test-flow-op@example.com' } })
    expect((await request(app).patch(`/api/users/${op.id}/password`).set(auth(adminToken)).send({ newPassword: 'brandnew1' })).status).toBe(204)
    expect((await request(app).post('/api/auth/login').send({ email: op.email, password: 'brandnew1' })).status).toBe(200)
    await request(app).patch(`/api/users/${op.id}/password`).set(auth(adminToken)).send({ newPassword: PASSWORD })
  })
})

describe('profile, settings, analytics and alerts', () => {
  it('lets a user update their own profile', async () => {
    const res = await request(app).patch('/api/auth/profile').set(auth(operatorToken)).send({ department: 'Logística QA' })
    expect(res.status).toBe(200)
    expect(res.body.department).toBe('Logística QA')
    expect(res.body.role).toBe('operator')
  })

  it('serves default settings and only lets admins change them', async () => {
    const get = await request(app).get('/api/settings').set(auth(operatorToken))
    expect(get.status).toBe(200)
    expect(get.body.preferences.expiryAlertDays).toBeGreaterThan(0)
    expect((await request(app).put('/api/settings').set(auth(operatorToken)).send({ preferences: { expiryAlertDays: 10 } })).status).toBe(403)

    const original = get.body.preferences.expiryAlertDays as number
    const put = await request(app).put('/api/settings').set(auth(adminToken)).send({ preferences: { expiryAlertDays: 45 } })
    expect(put.status).toBe(200)
    expect(put.body.preferences.expiryAlertDays).toBe(45)
    await request(app).put('/api/settings').set(auth(adminToken)).send({ preferences: { expiryAlertDays: original } })
  })

  it('returns the analytics overview', async () => {
    const res = await request(app).get('/api/analytics').set(auth(operatorToken))
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.demand)).toBe(true)
    expect(Array.isArray(res.body.matrix)).toBe(true)
    expect(Array.isArray(res.body.suggestions)).toBe(true)
  })

  it('tracks alert read state per user', async () => {
    await prisma.product.update({ where: { id: productId }, data: { currentStock: 0 } })
    const before = await request(app).get('/api/alerts').set(auth(operatorToken))
    expect(before.status).toBe(200)
    const key = `stock-out-${productId}`
    const alert = before.body.alerts.find((a: { id: string }) => a.id === key)
    expect(alert.read).toBe(false)

    expect((await request(app).patch(`/api/alerts/${key}/read`).set(auth(operatorToken))).status).toBe(200)
    const after = await request(app).get('/api/alerts').set(auth(operatorToken))
    expect(after.body.alerts.find((a: { id: string }) => a.id === key).read).toBe(true)
    const other = await request(app).get('/api/alerts').set(auth(adminToken))
    expect(other.body.alerts.find((a: { id: string }) => a.id === key).read).toBe(false)
  })

  it('derives lot status from the expiration date', async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    const lot = await prisma.lot.create({
      data: {
        lotNumber: 'FLOW-LOT', quantity: 3, manufacturingDate: new Date('2024-01-01'), expirationDate: new Date(Date.now() - 86_400_000),
        address: 'FLOW-A', status: 'valid', productId, supplierId: product.supplierId,
      },
    })
    const res = await request(app).get(`/api/lots/${lot.id}`).set(auth(operatorToken))
    expect(res.body.status).toBe('expired')
  })
})

describe('error handling', () => {
  it('turns unique violations into 409', async () => {
    const body = { name: 'Dup', tradeName: 'Dup', cnpj: '44.444.444/0001-44', email: 'd@d.com', city: 'SP', state: 'SP' }
    const first = await request(app).post('/api/customers').set(auth(adminToken)).send(body)
    expect(first.status).toBe(201)
    expect((await request(app).post('/api/customers').set(auth(adminToken)).send(body)).status).toBe(409)
    await request(app).delete(`/api/customers/${first.body.id}`).set(auth(adminToken))
  })
})
