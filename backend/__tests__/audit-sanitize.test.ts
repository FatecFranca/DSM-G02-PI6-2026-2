jest.mock('../src/prisma/client', () => ({ prisma: {} }))
import { sanitize } from '../src/middleware/audit.middleware'

describe('audit sanitize', () => {
  it('remove senha e URLs assinadas, mantém URL externa comum', () => {
    expect(sanitize({ name: 'A', password: 'x' })).toEqual({ name: 'A' })
    expect(sanitize({ id: '1', imageUrl: 'https://b.s3.us-east-2.amazonaws.com/k.jpg?X-Amz-Signature=abc&X-Amz-Expires=3600' })).toEqual({ id: '1' })
    expect(sanitize({ id: '1', imageUrl: 'http://api/api/files/stockiq/p/a.jpg?exp=1&sig=abc' })).toEqual({ id: '1' })
    expect(sanitize({ id: '1', imageUrl: 'https://cdn.exemplo.com/foto.jpg' })).toEqual({ id: '1', imageUrl: 'https://cdn.exemplo.com/foto.jpg' })
  })
})
