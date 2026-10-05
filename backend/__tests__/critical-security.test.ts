import express from 'express'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { prisma } from '../src/prisma/client'
import { validate } from '../src/middleware/validate.middleware'
import { updateUserSchema } from '../src/schemas/user.schema'
import { updateProductSchema } from '../src/schemas/product.schema'
import { registerSchema } from '../src/schemas/auth.schema'
import { authenticate, authorize } from '../src/middleware/auth.middleware'
import movementRoutes from '../src/routes/movement.routes'
import userRoutes from '../src/routes/user.routes'

jest.mock('../src/prisma/client', () => ({
  prisma: { user: { findUnique: jest.fn() } },
}))

const previousJwtSecret = process.env.JWT_SECRET
const jwtSecret = 'critical-security-test-secret'
process.env.JWT_SECRET = jwtSecret

const app = express()
app.use(express.json())
app.use('/api/users', userRoutes)
app.use('/api/movements', movementRoutes)
app.get('/admin-check', authenticate, authorize('admin'), (_req, res) => {
  res.sendStatus(204)
})
app.patch('/validation/product', validate(updateProductSchema), (req, res) => {
  res.json(req.body)
})
app.patch('/validation/user', validate(updateUserSchema), (req, res) => {
  res.json(req.body)
})
app.post('/validation/register', validate(registerSchema), (req, res) => {
  res.json(req.body)
})

function tokenFor(role: string): string {
  return jwt.sign({ sub: 'test-user-id', email: 'test@example.com', role }, jwtSecret)
}

const mockActiveUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'supervisor',
  status: 'active',
}

beforeEach(() => {
  jest.mocked(prisma.user.findUnique).mockResolvedValue(mockActiveUser as never)
})

afterAll(() => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET
  } else {
    process.env.JWT_SECRET = previousJwtSecret
  }
})

describe('critical authorization and validation', () => {
  it('does not accept a role from public registration data', async () => {
    const res = await request(app)
      .post('/validation/register')
      .send({
        name: 'Attempted admin',
        email: 'attempted-admin@example.com',
        password: 'password123',
        role: 'admin',
        department: 'TI',
      })

    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('role')
  })

  it('uses parsed product data and strips protected stock fields', async () => {
    const res = await request(app)
      .patch('/validation/product')
      .send({ name: 'Updated product', currentStock: 999 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ name: 'Updated product' })
  })

  it('strips password from user updates', async () => {
    const res = await request(app)
      .patch('/validation/user')
      .send({ name: 'Updated user', password: 'attacker-password' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ name: 'Updated user' })
  })

  it('prevents a supervisor from creating an administrator', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${tokenFor('supervisor')}`)
      .send({
        name: 'Attempted admin',
        email: 'attempted-admin@example.com',
        password: 'password123',
        role: 'admin',
        department: 'TI',
      })

    expect(res.status).toBe(403)
  })

  it('prevents a supervisor from changing a user role', async () => {
    const res = await request(app)
      .patch('/api/users/user-id')
      .set('Authorization', `Bearer ${tokenFor('supervisor')}`)
      .send({ role: 'admin' })

    expect(res.status).toBe(403)
  })

  it('prevents viewers from creating stock movements', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'viewer',
      status: 'active',
    } as never)

    const res = await request(app)
      .post('/api/movements')
      .set('Authorization', `Bearer ${tokenFor('viewer')}`)
      .send({})

    expect(res.status).toBe(403)
  })

  it('rejects tokens after the account role changes', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'supervisor',
      status: 'active',
    } as never)

    const res = await request(app)
      .get('/admin-check')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)

    expect(res.status).toBe(401)
  })

  it('accepts a fresh token with the updated role', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      status: 'active',
    } as never)

    const res = await request(app)
      .get('/admin-check')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)

    expect(res.status).toBe(204)
  })

  it('rejects tokens for inactive accounts', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      status: 'inactive',
    } as never)

    const res = await request(app)
      .get('/admin-check')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)

    expect(res.status).toBe(401)
  })

  it('rejects tokens when the account no longer exists', async () => {
    jest.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const res = await request(app)
      .get('/admin-check')
      .set('Authorization', `Bearer ${tokenFor('admin')}`)

    expect(res.status).toBe(401)
  })
})
