import crypto from 'crypto'
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs'
import { AppError } from '../middleware/error.middleware'

/**
 * Mensageria (fila de processamento assíncrono).
 *
 * Dois drivers, escolhidos por QUEUE_DRIVER:
 *  - `sqs`   → Amazon SQS (fila padrão + DLQ configurada na própria fila, ver scripts/setup-queues.ts).
 *  - `local` → fila em memória do processo, com visibilidade/reentrega/DLQ simuladas. Só desenvolvimento e testes:
 *              as mensagens se perdem se o processo reiniciar.
 *
 * A entrega é *pelo menos uma vez*: o consumidor precisa ser idempotente e só apagar a mensagem depois de processar.
 */

export type QueueDriverName = 'sqs' | 'local'

export interface QueueMessage {
  id: string
  body: string
  /** Token para apagar a mensagem depois de processada. */
  receiptHandle: string
  /** Quantas vezes a mensagem já foi entregue (inclui esta). */
  receiveCount: number
}

export interface QueueConfig {
  driver: QueueDriverName
  queueUrl: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Só para credenciais temporárias (ex.: AWS Academy / STS). */
  sessionToken?: string
  endpoint?: string
  visibilityTimeoutSeconds: number
  maxReceives: number
  worker: 'embedded' | 'off'
}

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getQueueConfig(env: NodeJS.ProcessEnv = process.env): QueueConfig {
  return {
    driver: env.QUEUE_DRIVER === 'sqs' ? 'sqs' : 'local',
    queueUrl: env.SQS_INVENTORY_QUEUE_URL ?? '',
    // Mesmas credenciais/região do S3 por padrão (um único usuário IAM), com opção de separar.
    region: env.SQS_REGION || env.S3_REGION || '',
    accessKeyId: env.SQS_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: env.SQS_SECRET_ACCESS_KEY || env.S3_SECRET_ACCESS_KEY || '',
    sessionToken: env.SQS_SESSION_TOKEN || env.S3_SESSION_TOKEN || undefined,
    endpoint: env.SQS_ENDPOINT || undefined,
    visibilityTimeoutSeconds: num(env.QUEUE_VISIBILITY_TIMEOUT_SECONDS, 120),
    maxReceives: num(env.QUEUE_MAX_RECEIVES, 3),
    worker: env.QUEUE_WORKER === 'off' ? 'off' : 'embedded',
  }
}

// ── Driver SQS ──────────────────────────────────────────────────────────────

let sqsClient: { signature: string; client: SQSClient } | undefined

export function createSqsClient(cfg: Pick<QueueConfig, 'region' | 'accessKeyId' | 'secretAccessKey' | 'sessionToken' | 'endpoint'>): SQSClient {
  const missing = [
    !cfg.region && 'SQS_REGION (ou S3_REGION)',
    !cfg.accessKeyId && 'SQS_ACCESS_KEY_ID (ou S3_ACCESS_KEY_ID)',
    !cfg.secretAccessKey && 'SQS_SECRET_ACCESS_KEY (ou S3_SECRET_ACCESS_KEY)',
  ].filter(Boolean)
  if (missing.length) throw new AppError(`Queue not configured: set ${missing.join(', ')}`, 503)
  return new SQSClient({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, sessionToken: cfg.sessionToken },
  })
}

function getSqs(cfg: QueueConfig): SQSClient {
  if (!cfg.queueUrl) throw new AppError('Queue not configured: set SQS_INVENTORY_QUEUE_URL', 503)
  const signature = [cfg.region, cfg.accessKeyId, cfg.sessionToken, cfg.endpoint].join('|')
  if (sqsClient?.signature !== signature) sqsClient = { signature, client: createSqsClient(cfg) }
  return sqsClient.client
}

// ── Driver local (em memória) ───────────────────────────────────────────────

interface LocalEntry {
  id: string
  body: string
  receiveCount: number
  receipt?: string
  invisibleUntil: number
}

const local = {
  messages: [] as LocalEntry[],
  dead: [] as LocalEntry[],
}

/** Mensagens cujo prazo de visibilidade venceu voltam à fila; as que estouraram as tentativas vão para a "DLQ". */
function localRequeueExpired(cfg: QueueConfig): void {
  const now = Date.now()
  for (const entry of [...local.messages]) {
    if (entry.receipt && entry.invisibleUntil <= now) {
      entry.receipt = undefined
      if (entry.receiveCount >= cfg.maxReceives) {
        local.messages.splice(local.messages.indexOf(entry), 1)
        local.dead.push(entry)
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ── API pública ─────────────────────────────────────────────────────────────

export async function sendMessage(body: object): Promise<string> {
  const cfg = getQueueConfig()
  const payload = JSON.stringify(body)
  if (cfg.driver === 'sqs') {
    const result = await getSqs(cfg).send(new SendMessageCommand({ QueueUrl: cfg.queueUrl, MessageBody: payload }))
    return result.MessageId ?? ''
  }
  const entry: LocalEntry = { id: crypto.randomUUID(), body: payload, receiveCount: 0, invisibleUntil: 0 }
  local.messages.push(entry)
  return entry.id
}

export async function receiveMessages(options: { max?: number; waitSeconds?: number } = {}): Promise<QueueMessage[]> {
  const cfg = getQueueConfig()
  const max = Math.min(Math.max(options.max ?? 1, 1), 10)
  const waitSeconds = Math.min(Math.max(options.waitSeconds ?? 0, 0), 20)

  if (cfg.driver === 'sqs') {
    const result = await getSqs(cfg).send(new ReceiveMessageCommand({
      QueueUrl: cfg.queueUrl,
      MaxNumberOfMessages: max,
      WaitTimeSeconds: waitSeconds,
      VisibilityTimeout: cfg.visibilityTimeoutSeconds,
      MessageSystemAttributeNames: ['ApproximateReceiveCount'],
    }))
    return (result.Messages ?? []).map((m) => ({
      id: m.MessageId ?? '',
      body: m.Body ?? '',
      receiptHandle: m.ReceiptHandle ?? '',
      receiveCount: Number(m.Attributes?.ApproximateReceiveCount ?? 1),
    }))
  }

  const deadline = Date.now() + waitSeconds * 1000
  for (;;) {
    localRequeueExpired(cfg)
    const ready = local.messages.filter((entry) => !entry.receipt).slice(0, max)
    if (ready.length > 0 || Date.now() >= deadline) {
      return ready.map((entry) => {
        entry.receiveCount += 1
        entry.receipt = crypto.randomUUID()
        entry.invisibleUntil = Date.now() + cfg.visibilityTimeoutSeconds * 1000
        return { id: entry.id, body: entry.body, receiptHandle: entry.receipt, receiveCount: entry.receiveCount }
      })
    }
    await sleep(50)
  }
}

export async function deleteMessage(receiptHandle: string): Promise<void> {
  const cfg = getQueueConfig()
  if (cfg.driver === 'sqs') {
    await getSqs(cfg).send(new DeleteMessageCommand({ QueueUrl: cfg.queueUrl, ReceiptHandle: receiptHandle }))
    return
  }
  const index = local.messages.findIndex((entry) => entry.receipt === receiptHandle)
  if (index >= 0) local.messages.splice(index, 1)
}

/** Só para testes e diagnóstico do driver local. */
export function localQueueState(): { waiting: number; inFlight: number; dead: number } {
  return {
    waiting: local.messages.filter((entry) => !entry.receipt).length,
    inFlight: local.messages.filter((entry) => entry.receipt).length,
    dead: local.dead.length,
  }
}

/** Só para testes: zera o driver local e descarta o cliente SQS em cache. */
export function resetQueueForTests(): void {
  local.messages = []
  local.dead = []
  sqsClient = undefined
}
