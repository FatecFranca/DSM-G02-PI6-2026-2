import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

let adminToken: string
let createdUserId: string

beforeAll(async () => {
  await prisma.$connect()

  await prisma.user.upsert({
    where: { email: 'test-admin-user@example.com' },
    update: {},
    create: {
      name: 'Admin User Test',
      email: 'test-admin-user@example.com',
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })

  const login = await request(app).post('/api/auth/login').send({
    email: 'test-admin-user@example.com',
    password: 'password',
  })
  adminToken = login.body.token
})

afterAll(async () => {
  if (createdUserId) {
    await prisma.user.deleteMany({ where: { id: createdUserId } })
  }
  await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } })
  await prisma.$disconnect()
})

describe('GET /api/users', () => {
  it('should list users with pagination', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('total')
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(401)
  })

  it('should search by name', async () => {
    const res = await request(app)
      .get('/api/users?search=Admin')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBeGreaterThanOrEqual(1)
  })
})

describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Operator',
        email: 'test-operator-new@example.com',
        password: 'password123',
        role: 'operator',
        department: 'Logística',
      })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body.role).toBe('operator')
    expect(res.body).not.toHaveProperty('password')
    createdUserId = res.body.id
  })

  it('should return 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Duplicate',
        email: 'test-operator-new@example.com',
        password: 'password123',
        department: 'TI',
      })

    expect(res.status).toBe(409)
  })

  it('should return 422 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test', email: 'not-valid', password: 'password123', department: 'TI' })

    expect(res.status).toBe(422)
  })
})

describe('GET /api/users/:id', () => {
  it('should get user by ID', async () => {
    const res = await request(app)
      .get(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(createdUserId)
    expect(res.body).not.toHaveProperty('password')
  })

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .get('/api/users/clnon-existent000000000000')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/users/:id', () => {
  it('should update user department', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ department: 'Armazém' })

    expect(res.status).toBe(200)
    expect(res.body.department).toBe('Armazém')
  })
})

describe('PATCH /api/users/:id/status', () => {
  it('should update user status to inactive', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('inactive')
  })

  it('should return 422 for invalid status', async () => {
    const res = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'unknown' })

    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/users/:id', () => {
  it('should delete a user', async () => {
    const res = await request(app)
      .delete(`/api/users/${createdUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(204)
    createdUserId = ''
  })
})

describe('GET /api/auth/profile', () => {
  it('should return the full profile of the logged-in user', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('email', 'test-admin-user@example.com')
    expect(res.body).not.toHaveProperty('password')
    expect(res.body).toHaveProperty('department')
  })
})

describe('PATCH /api/auth/password', () => {
  it('should change password successfully', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'password', newPassword: 'newpassword123' })

    expect(res.status).toBe(204)

    // restore original password for subsequent tests
    await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'newpassword123', newPassword: 'password' })
  })

  it('should return 401 with wrong current password', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ currentPassword: 'wrongpassword', newPassword: 'newone123' })

    expect(res.status).toBe(401)
  })
})
