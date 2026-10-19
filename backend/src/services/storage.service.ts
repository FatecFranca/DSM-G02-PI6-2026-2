import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { AppError } from '../middleware/error.middleware'

/**
 * Armazenamento de arquivos (fotos de produto).
 *
 * Dois drivers, escolhidos por STORAGE_DRIVER:
 *  - `s3`    → AWS S3 (ou compatível, via S3_ENDPOINT). O bucket pode ser privado: a API devolve URLs assinadas temporárias.
 *  - `local` → pasta em disco (STORAGE_LOCAL_DIR), servida por /api/files com URL assinada (HMAC). Útil em desenvolvimento.
 *
 * O banco guarda só a *chave* do objeto; a URL pública é gerada a cada resposta.
 */

export type StorageDriverName = 's3' | 'local'

export interface StoredObject {
  key: string
  lastModified: Date
}

interface StorageConfig {
  driver: StorageDriverName
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Só para credenciais temporárias (ex.: AWS Academy / STS). */
  sessionToken?: string
  endpoint?: string
  forcePathStyle: boolean
  localDir: string
  signingSecret: string
  keyPrefix: string
  urlTtlSeconds: number
  maxImageBytes: number
  orphanGraceDays: number
  publicApiUrl: string
}

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Lida a cada chamada para que testes (e reinícios de config) enxerguem o ambiente atual. */
export function getStorageConfig(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const prefix = (env.STORAGE_KEY_PREFIX ?? 'stockiq/').replace(/^\/+/, '')
  return {
    driver: env.STORAGE_DRIVER === 's3' ? 's3' : 'local',
    bucket: env.S3_BUCKET ?? '',
    region: env.S3_REGION ?? '',
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    sessionToken: env.S3_SESSION_TOKEN || undefined,
    endpoint: env.S3_ENDPOINT || undefined,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    localDir: path.resolve(env.STORAGE_LOCAL_DIR || 'storage-data'),
    signingSecret: env.STORAGE_SIGNING_SECRET ?? '',
    keyPrefix: prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix,
    urlTtlSeconds: num(env.STORAGE_URL_TTL_SECONDS, 3600),
    maxImageBytes: num(env.STORAGE_MAX_IMAGE_MB, 5) * 1024 * 1024,
    orphanGraceDays: num(env.STORAGE_ORPHAN_GRACE_DAYS, 7),
    publicApiUrl: (env.API_PUBLIC_URL || `http://localhost:${env.PORT ?? 3001}`).replace(/\/+$/, ''),
  }
}

export const maxImageBytes = (): number => getStorageConfig().maxImageBytes

// ── Tipos de imagem aceitos ─────────────────────────────────────────────────

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(EXT_BY_MIME).map(([m, e]) => [e, m]))

export interface DetectedImage {
  mime: string
  ext: string
}

/**
 * Descobre o tipo real pelos primeiros bytes (magic numbers), ignorando o que o cliente declarou.
 * SVG fica de fora de propósito: pode conter script.
 */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (isJpeg) return { mime: 'image/jpeg', ext: 'jpg' }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (buffer.length > 8 && png.every((byte, i) => buffer[i] === byte)) return { mime: 'image/png', ext: 'png' }

  const head = buffer.subarray(0, 6).toString('latin1')
  if (head === 'GIF87a' || head === 'GIF89a') return { mime: 'image/gif', ext: 'gif' }

  const isWebp = buffer.length > 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF'
    && buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  if (isWebp) return { mime: 'image/webp', ext: 'webp' }

  return null
}

export function mimeFromKey(key: string): string {
  return MIME_BY_EXT[path.extname(key).slice(1).toLowerCase()] ?? 'application/octet-stream'
}

export function buildProductImageKey(productId: string, ext: string): string {
  return `${getStorageConfig().keyPrefix}products/${productId}/${crypto.randomUUID()}.${ext}`
}

/** Só chaves geradas por esta API (dentro do prefixo configurado) podem ser lidas/apagadas. */
function assertSafeKey(key: string): void {
  const { keyPrefix } = getStorageConfig()
  const unsafe = !key.startsWith(keyPrefix) || key.includes('..') || key.includes('\\') || key.includes('\0')
  if (unsafe) throw new AppError('Invalid storage key', 400)
}

// ── Driver S3 ───────────────────────────────────────────────────────────────

let s3Client: { signature: string; client: S3Client } | undefined

function getS3(cfg: StorageConfig): S3Client {
  const missing = [
    !cfg.bucket && 'S3_BUCKET',
    !cfg.region && 'S3_REGION',
    !cfg.accessKeyId && 'S3_ACCESS_KEY_ID',
    !cfg.secretAccessKey && 'S3_SECRET_ACCESS_KEY',
  ].filter(Boolean)
  if (missing.length) throw new AppError(`Storage not configured: set ${missing.join(', ')}`, 503)

  const signature = [cfg.region, cfg.accessKeyId, cfg.sessionToken, cfg.endpoint, cfg.forcePathStyle].join('|')
  if (s3Client?.signature !== signature) {
    s3Client = {
      signature,
      client: new S3Client({
        region: cfg.region,
        endpoint: cfg.endpoint,
        forcePathStyle: cfg.forcePathStyle,
        credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, sessionToken: cfg.sessionToken },
      }),
    }
  }
  return s3Client.client
}

// ── Driver local (URL assinada com HMAC) ────────────────────────────────────

function localPath(cfg: StorageConfig, key: string): string {
  assertSafeKey(key)
  const full = path.resolve(cfg.localDir, key)
  if (!full.startsWith(cfg.localDir + path.sep)) throw new AppError('Invalid storage key', 400)
  return full
}

function requireSigningSecret(cfg: StorageConfig): string {
  if (!cfg.signingSecret) throw new AppError('Storage not configured: set STORAGE_SIGNING_SECRET', 503)
  return cfg.signingSecret
}

function signature(secret: string, key: string, expires: number): string {
  return crypto.createHmac('sha256', secret).update(`${key}\n${expires}`).digest('hex')
}

/** Confere a assinatura/validade de uma URL do driver local. */
export function verifyLocalSignature(key: string, expires: number, sig: string): boolean {
  const cfg = getStorageConfig()
  if (!cfg.signingSecret || !Number.isFinite(expires) || expires * 1000 < Date.now()) return false
  const expected = Buffer.from(signature(cfg.signingSecret, key, expires))
  const received = Buffer.from(sig)
  return expected.length === received.length && crypto.timingSafeEqual(expected, received)
}

export async function readLocalObject(key: string): Promise<{ body: Buffer; contentType: string } | null> {
  const cfg = getStorageConfig()
  if (cfg.driver !== 'local') return null
  try {
    return { body: await fs.readFile(localPath(cfg, key)), contentType: mimeFromKey(key) }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

// ── API pública ─────────────────────────────────────────────────────────────

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  assertSafeKey(key)
  const cfg = getStorageConfig()
  if (cfg.driver === 's3') {
    await getS3(cfg).send(new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentDisposition: 'inline',
      // A chave é única por envio (UUID), então o conteúdo nunca muda: pode ser cacheado.
      CacheControl: 'private, max-age=31536000, immutable',
    }))
    return
  }
  requireSigningSecret(cfg)
  const target = localPath(cfg, key)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, body)
}

export async function deleteObject(key: string): Promise<void> {
  assertSafeKey(key)
  const cfg = getStorageConfig()
  if (cfg.driver === 's3') {
    await getS3(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }))
    return
  }
  await fs.rm(localPath(cfg, key), { force: true })
}

/** Apagar é limpeza: uma falha aqui não deve derrubar a requisição, só ficar no log (e o job de órfãos pega depois). */
export async function deleteObjectQuietly(key: string | null | undefined): Promise<void> {
  if (!key) return
  try {
    await deleteObject(key)
  } catch (err) {
    console.error(`Storage: failed to delete "${key}":`, err instanceof Error ? err.message : err)
  }
}

/** URL temporária para exibir o objeto (S3 pré-assinada ou /api/files assinada). */
export async function getObjectUrl(key: string): Promise<string> {
  assertSafeKey(key)
  const cfg = getStorageConfig()
  if (cfg.driver === 's3') {
    const client = getS3(cfg)
    return getSignedUrl(client, new GetObjectCommand({ Bucket: cfg.bucket, Key: key }), { expiresIn: cfg.urlTtlSeconds })
  }
  const secret = requireSigningSecret(cfg)
  const expires = Math.floor(Date.now() / 1000) + cfg.urlTtlSeconds
  const query = new URLSearchParams({ exp: String(expires), sig: signature(secret, key, expires) })
  return `${cfg.publicApiUrl}/api/files/${key.split('/').map(encodeURIComponent).join('/')}?${query}`
}

/** Resolve a URL exibida de um produto: foto enviada (chave) tem prioridade sobre uma URL externa antiga. */
export async function resolveImageUrl(
  imageKey: string | null | undefined,
  imageUrl: string | null | undefined,
): Promise<string | null> {
  if (!imageKey) return imageUrl ?? null
  try {
    return await getObjectUrl(imageKey)
  } catch (err) {
    console.error('Storage: failed to sign image URL:', err instanceof Error ? err.message : err)
    return imageUrl ?? null
  }
}

export async function listObjects(prefix: string): Promise<StoredObject[]> {
  const cfg = getStorageConfig()
  if (cfg.driver === 's3') {
    const client = getS3(cfg)
    const found: StoredObject[] = []
    let token: string | undefined
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: cfg.bucket, Prefix: prefix, ContinuationToken: token }))
      for (const item of page.Contents ?? []) {
        if (item.Key && item.LastModified) found.push({ key: item.Key, lastModified: item.LastModified })
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined
    } while (token)
    return found
  }

  const found: StoredObject[] = []
  const walk = async (dir: string): Promise<void> => {
    let entries: import('fs').Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else found.push({ key: path.relative(cfg.localDir, full).split(path.sep).join('/'), lastModified: (await fs.stat(full)).mtime })
    }
  }
  await walk(path.join(cfg.localDir, prefix))
  return found.filter((object) => object.key.startsWith(prefix))
}

/**
 * Objetos em products/ que nenhum produto referencia e já passaram do prazo de carência
 * (o prazo evita apagar um upload que acabou de chegar e ainda está sendo gravado no banco).
 */
export function findOrphans(
  objects: StoredObject[],
  referencedKeys: Set<string>,
  graceDays: number,
  now: Date = new Date(),
): StoredObject[] {
  const limit = now.getTime() - graceDays * 24 * 60 * 60 * 1000
  return objects.filter((object) => !referencedKeys.has(object.key) && object.lastModified.getTime() < limit)
}

export const productImagePrefix = (): string => `${getStorageConfig().keyPrefix}products/`

/** Só para testes: descarta o cliente S3 em cache. */
export function resetStorageForTests(): void {
  s3Client = undefined
}
