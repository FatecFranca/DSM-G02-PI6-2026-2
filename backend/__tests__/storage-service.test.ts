import fs from 'fs'
import os from 'os'
import path from 'path'
import { S3Client } from '@aws-sdk/client-s3'
import { AppError } from '../src/middleware/error.middleware'
import * as storage from '../src/services/storage.service'

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1')
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 ')])

let dir: string

function useLocal() {
  process.env.STORAGE_DRIVER = 'local'
  process.env.STORAGE_LOCAL_DIR = dir
  process.env.STORAGE_SIGNING_SECRET = 'segredo-de-teste'
  process.env.STORAGE_KEY_PREFIX = 'stockiq/'
  process.env.STORAGE_URL_TTL_SECONDS = '3600'
  process.env.API_PUBLIC_URL = 'http://api.test'
}

function useS3() {
  process.env.STORAGE_DRIVER = 's3'
  process.env.S3_BUCKET = 'bucket-teste'
  process.env.S3_REGION = 'us-east-2'
  process.env.S3_ACCESS_KEY_ID = 'AKIATESTE'
  process.env.S3_SECRET_ACCESS_KEY = 'segredo'
  process.env.STORAGE_KEY_PREFIX = 'stockiq/'
  process.env.STORAGE_URL_TTL_SECONDS = '900'
  delete process.env.S3_ENDPOINT
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-test-'))
  storage.resetStorageForTests()
})

afterEach(() => {
  jest.restoreAllMocks()
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('detectImageType', () => {
  it('reconhece JPEG, PNG, GIF e WebP pelo conteúdo', () => {
    expect(storage.detectImageType(JPEG)).toEqual({ mime: 'image/jpeg', ext: 'jpg' })
    expect(storage.detectImageType(PNG)).toEqual({ mime: 'image/png', ext: 'png' })
    expect(storage.detectImageType(GIF)).toEqual({ mime: 'image/gif', ext: 'gif' })
    expect(storage.detectImageType(WEBP)).toEqual({ mime: 'image/webp', ext: 'webp' })
  })

  it('recusa SVG, HTML, texto e arquivos vazios ou curtos', () => {
    expect(storage.detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(storage.detectImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull()
    expect(storage.detectImageType(Buffer.from('MZ\x90\x00 executavel'))).toBeNull()
    expect(storage.detectImageType(Buffer.alloc(0))).toBeNull()
    expect(storage.detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull()
  })
})

describe('chaves', () => {
  it('gera chaves únicas dentro do prefixo e do produto', () => {
    useLocal()
    const a = storage.buildProductImageKey('prod1', 'jpg')
    const b = storage.buildProductImageKey('prod1', 'jpg')
    expect(a).toMatch(/^stockiq\/products\/prod1\/[0-9a-f-]{36}\.jpg$/)
    expect(a).not.toBe(b)
  })

  it('rejeita chaves fora do prefixo ou com path traversal', async () => {
    useLocal()
    await expect(storage.deleteObject('outro/arquivo.jpg')).rejects.toMatchObject({ statusCode: 400 })
    await expect(storage.deleteObject('stockiq/../../etc/passwd')).rejects.toBeInstanceOf(AppError)
    await expect(storage.getObjectUrl('stockiq/products/..\\x.jpg')).rejects.toBeInstanceOf(AppError)
  })
})

describe('driver local', () => {
  it('grava, assina a URL, lê e apaga', async () => {
    useLocal()
    const key = storage.buildProductImageKey('p1', 'png')
    await storage.putObject(key, PNG, 'image/png')
    expect(fs.existsSync(path.join(dir, key))).toBe(true)

    const url = new URL(await storage.getObjectUrl(key))
    expect(url.origin).toBe('http://api.test')
    expect(decodeURIComponent(url.pathname)).toBe(`/api/files/${key}`)
    const exp = Number(url.searchParams.get('exp'))
    const sig = url.searchParams.get('sig') as string
    expect(storage.verifyLocalSignature(key, exp, sig)).toBe(true)

    const file = await storage.readLocalObject(key)
    expect(file?.contentType).toBe('image/png')
    expect(file?.body.equals(PNG)).toBe(true)

    await storage.deleteObject(key)
    expect(await storage.readLocalObject(key)).toBeNull()
  })

  it('rejeita assinatura adulterada, de outra chave ou expirada', async () => {
    useLocal()
    const key = storage.buildProductImageKey('p1', 'png')
    const exp = Math.floor(Date.now() / 1000) + 60
    const url = new URL(await storage.getObjectUrl(key))
    const sig = url.searchParams.get('sig') as string
    const realExp = Number(url.searchParams.get('exp'))

    expect(storage.verifyLocalSignature(key, realExp, sig.replace(/.$/, sig.endsWith('0') ? '1' : '0'))).toBe(false)
    expect(storage.verifyLocalSignature(`${key}x`, realExp, sig)).toBe(false)
    expect(storage.verifyLocalSignature(key, realExp + 1, sig)).toBe(false)
    expect(storage.verifyLocalSignature(key, exp, 'curta')).toBe(false)

    jest.spyOn(Date, 'now').mockReturnValue((realExp + 10) * 1000)
    expect(storage.verifyLocalSignature(key, realExp, sig)).toBe(false)
  })

  it('exige STORAGE_SIGNING_SECRET', async () => {
    useLocal()
    process.env.STORAGE_SIGNING_SECRET = ''
    await expect(storage.putObject(storage.buildProductImageKey('p', 'jpg'), JPEG, 'image/jpeg')).rejects.toMatchObject({ statusCode: 503 })
  })

  it('lista objetos do prefixo', async () => {
    useLocal()
    const key = storage.buildProductImageKey('p9', 'jpg')
    await storage.putObject(key, JPEG, 'image/jpeg')
    const listed = await storage.listObjects(storage.productImagePrefix())
    expect(listed.map((o) => o.key)).toEqual([key])
  })
})

describe('driver S3', () => {
  it('envia o objeto com tipo, cache e chave corretos', async () => {
    useS3()
    const send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
    const key = storage.buildProductImageKey('p1', 'jpg')
    await storage.putObject(key, JPEG, 'image/jpeg')

    const command = send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }
    expect(command.input).toMatchObject({ Bucket: 'bucket-teste', Key: key, ContentType: 'image/jpeg', Body: JPEG })
    expect(String(command.input.CacheControl)).toContain('max-age')
  })

  it('apaga o objeto', async () => {
    useS3()
    const send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
    await storage.deleteObject('stockiq/products/p1/a.jpg')
    const command = send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }
    expect(command.input).toEqual({ Bucket: 'bucket-teste', Key: 'stockiq/products/p1/a.jpg' })
  })

  it('gera URL pré-assinada local (sem rede) com a validade configurada', async () => {
    useS3()
    const send = jest.spyOn(S3Client.prototype, 'send')
    const url = new URL(await storage.getObjectUrl('stockiq/products/p1/a.jpg'))
    expect(url.hostname).toContain('bucket-teste')
    expect(url.pathname).toBe('/stockiq/products/p1/a.jpg')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900')
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('falha com 503 quando faltam variáveis, listando quais', async () => {
    useS3()
    process.env.S3_BUCKET = ''
    process.env.S3_SECRET_ACCESS_KEY = ''
    const err = await storage.putObject('stockiq/products/p/a.jpg', JPEG, 'image/jpeg').catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(503)
    expect(err.message).toContain('S3_BUCKET')
    expect(err.message).toContain('S3_SECRET_ACCESS_KEY')
  })

  it('pagina a listagem', async () => {
    useS3()
    const t = new Date('2026-01-01')
    jest.spyOn(S3Client.prototype, 'send')
      .mockResolvedValueOnce({ Contents: [{ Key: 'stockiq/products/a.jpg', LastModified: t }], IsTruncated: true, NextContinuationToken: 'tok' } as never)
      .mockResolvedValueOnce({ Contents: [{ Key: 'stockiq/products/b.jpg', LastModified: t }], IsTruncated: false } as never)
    const listed = await storage.listObjects('stockiq/products/')
    expect(listed.map((o) => o.key)).toEqual(['stockiq/products/a.jpg', 'stockiq/products/b.jpg'])
  })
})

describe('resolveImageUrl', () => {
  it('prefere a foto enviada; cai para a URL externa; devolve null sem nada', async () => {
    useLocal()
    expect(await storage.resolveImageUrl(null, 'https://exemplo.com/a.jpg')).toBe('https://exemplo.com/a.jpg')
    expect(await storage.resolveImageUrl(null, null)).toBeNull()
    expect(await storage.resolveImageUrl('stockiq/products/p/a.jpg', 'https://exemplo.com/a.jpg')).toContain('http://api.test/api/files/')
  })

  it('não derruba a resposta se não conseguir assinar: usa a URL externa', async () => {
    useLocal()
    process.env.STORAGE_SIGNING_SECRET = ''
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(await storage.resolveImageUrl('stockiq/products/p/a.jpg', 'https://exemplo.com/a.jpg')).toBe('https://exemplo.com/a.jpg')
  })
})

describe('findOrphans', () => {
  it('só devolve objetos sem referência e fora da carência', () => {
    const now = new Date('2026-10-19T12:00:00Z')
    const old = new Date('2026-10-01T00:00:00Z')
    const fresh = new Date('2026-10-18T00:00:00Z')
    const objects = [
      { key: 'k/usada.jpg', lastModified: old },
      { key: 'k/orfa-antiga.jpg', lastModified: old },
      { key: 'k/orfa-recente.jpg', lastModified: fresh },
    ]
    const orphans = storage.findOrphans(objects, new Set(['k/usada.jpg']), 7, now)
    expect(orphans.map((o) => o.key)).toEqual(['k/orfa-antiga.jpg'])
  })
})
