import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: 'test-jest' } } })
  await prisma.$disconnect()
})

describe('POST /api/auth/register', () => {
  it('should register a user and return token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test-jest-register@example.com',
      password: 'password123',
      department: 'TI',
    })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).toMatchObject({
      email: 'test-jest-register@example.com',
      role: 'operator',
    })
  })

  it('should return 409 when email already in use', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: 'test-jest-dup@example.com',
      password: 'password123',
      department: 'TI',
    })

    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup 2',
      email: 'test-jest-dup@example.com',
      password: 'password123',
      department: 'TI',
    })

    expect(res.status).toBe(409)
  })

  it('should return 422 when email is invalid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'not-an-email',
      password: 'password123',
      department: 'TI',
    })
    expect(res.status).toBe(422)
    expect(res.body).toHaveProperty('errors')
  })

  it('should return 422 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test',
      email: 'valid@example.com',
      password: '123',
      department: 'TI',
    })
    expect(res.status).toBe(422)
  })
})

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'test-jest-login@example.com',
      password: 'password123',
      department: 'TI',
    })
  })

  it('should login and return token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test-jest-login@example.com',
      password: 'password123',
    })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('should return 401 with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test-jest-login@example.com',
      password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })

  it('should return 401 with non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'password123',
    })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  let token: string

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test-jest-login@example.com',
      password: 'password123',
    })
    token = res.body.token
  })

  it('should return current user info', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user).toHaveProperty('email', 'test-jest-login@example.com')
  })

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})
