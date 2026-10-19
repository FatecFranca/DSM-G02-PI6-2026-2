import fs from 'fs'
import os from 'os'
import path from 'path'
import express from 'express'
import request from 'supertest'

// Prisma simulado: estes testes verificam a ordem das operações entre banco e storage, sem banco real.
const findUnique = jest.fn()
const update = jest.fn()
jest.mock('../src/prisma/client', () => ({
  prisma: { product: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a) } },
}))

import { errorHandler } from '../src/middleware/error.middleware'
import { uploadImage } from '../src/middleware/upload.middleware'
import fileRoutes from '../src/routes/file.routes'
import * as productService from '../src/services/product.service'
import * as storage from '../src/services/storage.service'

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 2)])

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  name: 'Produto',
  purchasePrice: 1,
  salePrice: 2,
  currentStock: 10,
  minStock: 1,
  imageUrl: null,
  imageKey: null,
  category: { id: 'c', name: 'C' },
  brand: { id: 'b', name: 'B' },
  supplier: { id: 's', name: 'S' },
  ...overrides,
})

let dir: string

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'product-image-'))
  process.env.STORAGE_DRIVER = 'local'
  process.env.STORAGE_LOCAL_DIR = dir
  process.env.STORAGE_SIGNING_SECRET = 'segredo-de-teste'
  process.env.STORAGE_KEY_PREFIX = 'stockiq/'
  process.env.STORAGE_URL_TTL_SECONDS = '3600'
  process.env.STORAGE_MAX_IMAGE_MB = '1'
  process.env.API_PUBLIC_URL = 'http://api.test'
  storage.resetStorageForTests()
  findUnique.mockReset()
  update.mockReset()
})

afterEach(() => {
  jest.restoreAllMocks()
  fs.rmSync(dir, { recursive: true, force: true })
})

const filesOnDisk = () => storage.listObjects(storage.productImagePrefix())

describe('productService.setImage', () => {
  it('sobe a foto, grava a chave no banco, devolve URL assinada e não vaza a chave', async () => {
    findUnique.mockResolvedValue({ imageKey: null })
    update.mockImplementation(async ({ data }) => productRow({ imageKey: data.imageKey }))

    const result = await productService.setImage('p1', JPEG)

    const saved = await filesOnDisk()
    expect(saved).toHaveLength(1)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { imageKey: saved[0].key, imageUrl: null } }))
    expect(saved[0].key).toMatch(/^stockiq\/products\/p1\/.+\.jpg$/)
    expect(result.imageUrl).toContain('/api/files/stockiq/products/p1/')
    expect(result).not.toHaveProperty('imageKey')
  })

  it('apaga a foto antiga só depois de gravar a nova', async () => {
    const oldKey = 'stockiq/products/p1/antiga.png'
    await storage.putObject(oldKey, PNG, 'image/png')
    findUnique.mockResolvedValue({ imageKey: oldKey })
    update.mockImplementation(async ({ data }) => productRow({ imageKey: data.imageKey }))

    await productService.setImage('p1', JPEG)

    const keys = (await filesOnDisk()).map((o) => o.key)
    expect(keys).toHaveLength(1)
    expect(keys).not.toContain(oldKey)
  })

  it('se o banco falhar, remove o objeto novo e mantém o antigo', async () => {
    const oldKey = 'stockiq/products/p1/antiga.png'
    await storage.putObject(oldKey, PNG, 'image/png')
    findUnique.mockResolvedValue({ imageKey: oldKey })
    update.mockRejectedValue(new Error('banco fora do ar'))

    await expect(productService.setImage('p1', JPEG)).rejects.toThrow('banco fora do ar')
    expect((await filesOnDisk()).map((o) => o.key)).toEqual([oldKey])
  })

  it('404 se o produto não existe e 415 se o arquivo não é imagem (sem subir nada)', async () => {
    findUnique.mockResolvedValueOnce(null)
    await expect(productService.setImage('nao-existe', JPEG)).rejects.toMatchObject({ statusCode: 404 })

    findUnique.mockResolvedValueOnce({ imageKey: null })
    await expect(productService.setImage('p1', Buffer.from('<svg onload="alert(1)"/>'))).rejects.toMatchObject({ statusCode: 415 })
    expect(await filesOnDisk()).toHaveLength(0)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('productService.removeImage', () => {
  it('limpa a chave no banco e apaga o objeto', async () => {
    const key = 'stockiq/products/p1/a.jpg'
    await storage.putObject(key, JPEG, 'image/jpeg')
    findUnique.mockResolvedValue({ imageKey: key })
    update.mockResolvedValue(productRow())

    const result = await productService.removeImage('p1')
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { imageKey: null, imageUrl: null } }))
    expect(result.imageUrl).toBeNull()
    expect(await filesOnDisk()).toHaveLength(0)
  })
})

describe('upload HTTP (multer + validações)', () => {
  const app = express()
  app.post('/up', uploadImage, (req, res) => res.json({ size: req.file?.size, name: req.file?.originalname }))
  app.use('/api/files', fileRoutes)
  app.use(errorHandler)

  it('aceita uma imagem no campo "image"', async () => {
    const res = await request(app).post('/up').attach('image', JPEG, { filename: 'foto.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(200)
    expect(res.body.size).toBe(JPEG.length)
  })

  it('400 quando não envia arquivo', async () => {
    const res = await request(app).post('/up').field('x', '1')
    expect(res.status).toBe(400)
  })

  it('400 quando o arquivo vem em outro campo', async () => {
    const res = await request(app).post('/up').attach('foto', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(400)
    expect(res.body.message).toContain('"image"')
  })

  it('415 para tipo declarado que não é imagem aceita', async () => {
    const svg = await request(app).post('/up').attach('image', Buffer.from('<svg/>'), { filename: 'a.svg', contentType: 'image/svg+xml' })
    const pdf = await request(app).post('/up').attach('image', Buffer.from('%PDF-1.4'), { filename: 'a.pdf', contentType: 'application/pdf' })
    expect(svg.status).toBe(415)
    expect(pdf.status).toBe(415)
  })

  it('413 acima do limite configurado', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(1024 * 1024 + 10, 7)])
    const res = await request(app).post('/up').attach('image', big, { filename: 'grande.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(413)
    expect(res.body.message).toContain('1 MB')
  })

  it('serve o arquivo local só com a URL assinada válida', async () => {
    const key = 'stockiq/products/p1/x.jpg'
    await storage.putObject(key, JPEG, 'image/jpeg')
    const url = new URL(await storage.getObjectUrl(key))
    const target = `${url.pathname}${url.search}`

    const ok = await request(app).get(target)
    expect(ok.status).toBe(200)
    expect(ok.headers['content-type']).toBe('image/jpeg')
    expect(ok.headers['cross-origin-resource-policy']).toBe('cross-origin')
    expect(Buffer.compare(ok.body, JPEG)).toBe(0)

    expect((await request(app).get(`${url.pathname}`)).status).toBe(403)
    expect((await request(app).get(`${target}0`)).status).toBe(403)
    const other = await request(app).get(`/api/files/stockiq/products/p1/outra.jpg${url.search}`)
    expect(other.status).toBe(403)
  })

  it('404 no driver s3 e nunca lê fora da pasta', async () => {
    process.env.STORAGE_DRIVER = 's3'
    expect((await request(app).get('/api/files/stockiq/products/p1/x.jpg?exp=1&sig=a')).status).toBe(404)
    process.env.STORAGE_DRIVER = 'local'
    expect((await request(app).get('/api/files/..%2F..%2Fetc%2Fpasswd?exp=9999999999&sig=a')).status).toBe(403)
  })
})
