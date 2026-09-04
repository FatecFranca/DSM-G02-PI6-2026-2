import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

let adminToken: string
let addressId: string

beforeAll(async () => {
  await prisma.$connect()

  await prisma.user.upsert({
    where: { email: 'test-admin-wh@example.com' },
    update: {},
    create: {
      name: 'Admin WH',
      email: 'test-admin-wh@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const login = await request(app).post('/api/auth/login').send({
    email: 'test-admin-wh@example.com',
    password: 'password',
  })
  adminToken = login.body.token
})

afterAll(async () => {
  if (addressId) {
    await prisma.warehouseAddress.deleteMany({ where: { code: 'JEST-TEST-01' } })
  }
  await prisma.user.deleteMany({ where: { email: 'test-admin-wh@example.com' } })
  await prisma.$disconnect()
})

describe('GET /api/warehouse/stats', () => {
  it('should return warehouse stats', async () => {
    const res = await request(app)
      .get('/api/warehouse/stats')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalPositions')
    expect(res.body).toHaveProperty('freePositions')
    expect(res.body).toHaveProperty('occupancyRate')
  })
})

describe('POST /api/warehouse', () => {
  it('should create a warehouse address', async () => {
    const res = await request(app)
      .post('/api/warehouse')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'JEST-TEST-01',
        aisle: 'Z',
        street: '99',
        shelf: '01',
        level: 'A',
        position: '01',
        capacity: 500,
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.code).toBe('JEST-TEST-01')
    expect(res.body.status).toBe('free')
    addressId = res.body.id
  })

  it('should return 409 for duplicate code', async () => {
    const res = await request(app)
      .post('/api/warehouse')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'JEST-TEST-01',
        aisle: 'Z',
        street: '99',
        shelf: '01',
        level: 'A',
        position: '02',
        capacity: 500,
      })

    expect(res.status).toBe(409)
  })

  it('should return 422 on missing required fields', async () => {
    const res = await request(app)
      .post('/api/warehouse')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INCOMPLETE' })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/warehouse', () => {
  it('should list addresses with pagination', async () => {
    const res = await request(app)
      .get('/api/warehouse')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/warehouse?status=free')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    res.body.data.forEach((a: { status: string }) => {
      expect(a.status).toBe('free')
    })
  })
})

describe('PATCH /api/warehouse/:id', () => {
  it('should update address status', async () => {
    const res = await request(app)
      .patch(`/api/warehouse/${addressId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'blocked' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('blocked')
  })
})

describe('DELETE /api/warehouse/:id', () => {
  it('should restore to free then delete', async () => {
    await request(app)
      .patch(`/api/warehouse/${addressId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'free' })

    const res = await request(app)
      .delete(`/api/warehouse/${addressId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
    addressId = ''
  })
})
