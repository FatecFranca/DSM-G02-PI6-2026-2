import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

let adminToken: string
let categoryId: string

beforeAll(async () => {
  await prisma.$connect()

  await prisma.user.upsert({
    where: { email: 'test-admin-cat@example.com' },
    update: {},
    create: {
      name: 'Admin Cat',
      email: 'test-admin-cat@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const login = await request(app).post('/api/auth/login').send({
    email: 'test-admin-cat@example.com',
    password: 'password',
  })
  adminToken = login.body.token
})

afterAll(async () => {
  await prisma.category.deleteMany({ where: { slug: { startsWith: 'jest-cat' } } })
  await prisma.user.deleteMany({ where: { email: 'test-admin-cat@example.com' } })
  await prisma.$disconnect()
})

describe('GET /api/categories', () => {
  it('should list categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('POST /api/categories', () => {
  it('should create a category', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Jest Category', slug: 'jest-cat-01', color: '#ff0000' })

    expect(res.status).toBe(201)
    expect(res.body.slug).toBe('jest-cat-01')
    categoryId = res.body.id
  })

  it('should return 409 for duplicate slug', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dup', slug: 'jest-cat-01' })

    expect(res.status).toBe(409)
  })

  it('should return 422 for invalid slug format', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Slug', slug: 'Has Spaces!' })

    expect(res.status).toBe(422)
  })

  it('should return 422 for invalid hex color', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Color', slug: 'jest-cat-02', color: 'red' })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/categories/:id', () => {
  it('should return category by ID', async () => {
    const res = await request(app)
      .get(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(categoryId)
    expect(res.body).toHaveProperty('_count')
  })

  it('should return 404 for non-existent category', async () => {
    const res = await request(app)
      .get('/api/categories/clnon-existent000000000000')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/categories/:id', () => {
  it('should update category color', async () => {
    const res = await request(app)
      .patch(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#00ff00' })

    expect(res.status).toBe(200)
    expect(res.body.color).toBe('#00ff00')
  })
})

describe('DELETE /api/categories/:id', () => {
  it('should delete category without products', async () => {
    const res = await request(app)
      .delete(`/api/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
  })
})
