import crypto from 'crypto'
import { QueueClient, QueueServiceClient } from '@azure/storage-queue'
import { AppError } from '../middleware/error.middleware'

/**
 * Mensageria (fila de processamento assíncrono).
 *
 * Dois drivers, escolhidos por QUEUE_DRIVER:
 *  - `azure` → Azure Queue Storage (fila + "poison queue" `<fila>-poison` para as mensagens que esgotaram as tentativas,
 *              ver scripts/setup-queues.ts). O Azure não tem DLQ nativa nem long polling: ambos são feitos aqui.
 *  - `local` → fila em memória do processo, com visibilidade/reentrega/DLQ simuladas. Só desenvolvimento e testes:
 *              as mensagens se perdem se o processo reiniciar.
 *
 * A entrega é *pelo menos uma vez*: o consumidor precisa ser idempotente e só apagar a mensagem depois de processar.
 */

export type QueueDriverName = 'azure' | 'local'

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
  /** Cadeia de conexão da conta de armazenamento do Azure (AZURE_STORAGE_CONNECTION_STRING). */
  connectionString: string
  queueName: string
  /** Fila para onde vão as mensagens que estouraram `maxReceives`. */
  poisonQueueName: string
  visibilityTimeoutSeconds: number
  maxReceives: number
  worker: 'embedded' | 'off'
}

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getQueueConfig(env: NodeJS.ProcessEnv = process.env): QueueConfig {
  const queueName = env.AZURE_QUEUE_NAME || 'stockiq-inventory'
  return {
    driver: env.QUEUE_DRIVER === 'azure' ? 'azure' : 'local',
    connectionString: env.AZURE_STORAGE_CONNECTION_STRING ?? '',
    queueName,
    poisonQueueName: env.AZURE_POISON_QUEUE_NAME || `${queueName}-poison`,
    visibilityTimeoutSeconds: num(env.QUEUE_VISIBILITY_TIMEOUT_SECONDS, 120),
    maxReceives: num(env.QUEUE_MAX_RECEIVES, 3),
    worker: env.QUEUE_WORKER === 'off' ? 'off' : 'embedded',
  }
}

// ── Driver Azure Queue Storage ──────────────────────────────────────────────

interface AzureQueues {
  signature: string
  main: QueueClient
  poison: QueueClient
  ready: Promise<void>
}

let azure: AzureQueues | undefined

export function createAzureQueues(cfg: Pick<QueueConfig, 'connectionString' | 'queueName' | 'poisonQueueName'>): { main: QueueClient; poison: QueueClient } {
  if (!cfg.connectionString) throw new AppError('Queue not configured: set AZURE_STORAGE_CONNECTION_STRING', 503)
  let service: QueueServiceClient
  try {
    service = QueueServiceClient.fromConnectionString(cfg.connectionString)
  } catch {
    throw new AppError('Queue not configured: AZURE_STORAGE_CONNECTION_STRING is invalid', 503)
  }
  return { main: service.getQueueClient(cfg.queueName), poison: service.getQueueClient(cfg.poisonQueueName) }
}

/** Cria as filas na primeira utilização (idempotente), para a aplicação funcionar sem passo manual de setup. */
export async function ensureAzureQueues(queues: { main: QueueClient; poison: QueueClient }): Promise<void> {
  await Promise.all([queues.main.createIfNotExists(), queues.poison.createIfNotExists()])
}

async function getAzure(cfg: QueueConfig): Promise<AzureQueues> {
  const signature = [cfg.connectionString, cfg.queueName, cfg.poisonQueueName].join('|')
  if (azure?.signature !== signature) {
    const queues = createAzureQueues(cfg)
    const ready = ensureAzureQueues(queues)
    // Se a criação falhar (rede/credencial), a próxima chamada tenta de novo em vez de ficar com a falha em cache.
    ready.catch(() => { if (azure?.ready === ready) azure = undefined })
    azure = { signature, ...queues, ready }
  }
  const current = azure
  await current.ready
  return current
}

/** O recibo do Azure é o par (messageId, popReceipt); o `messageId` é um GUID, então o primeiro ":" separa os dois. */
const toReceipt = (messageId: string, popReceipt: string) => `${messageId}:${popReceipt}`
function fromReceipt(receiptHandle: string): { messageId: string; popReceipt: string } {
  const index = receiptHandle.indexOf(':')
  if (index <= 0) throw new AppError('Invalid queue receipt', 400)
  return { messageId: receiptHandle.slice(0, index), popReceipt: receiptHandle.slice(index + 1) }
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
  if (cfg.driver === 'azure') {
    const { main } = await getAzure(cfg)
    const result = await main.sendMessage(payload)
    return result.messageId
  }
  const entry: LocalEntry = { id: crypto.randomUUID(), body: payload, receiveCount: 0, invisibleUntil: 0 }
  local.messages.push(entry)
  return entry.id
}

export async function receiveMessages(options: { max?: number; waitSeconds?: number } = {}): Promise<QueueMessage[]> {
  const cfg = getQueueConfig()
  const max = Math.min(Math.max(options.max ?? 1, 1), 32)
  const waitSeconds = Math.min(Math.max(options.waitSeconds ?? 0, 0), 20)

  if (cfg.driver === 'azure') {
    const { main, poison } = await getAzure(cfg)
    // Azure Queue Storage não tem long polling: consulta a cada segundo até chegar mensagem ou acabar a espera.
    const deadline = Date.now() + waitSeconds * 1000
    for (;;) {
      const result = await main.receiveMessages({ numberOfMessages: max, visibilityTimeout: cfg.visibilityTimeoutSeconds })
      const ready: QueueMessage[] = []
      for (const m of result.receivedMessageItems) {
        if (m.dequeueCount > cfg.maxReceives) {
          // Já foi entregue `maxReceives` vezes sem sucesso: vai para a "poison queue" (equivalente à DLQ).
          await poison.sendMessage(m.messageText)
          await main.deleteMessage(m.messageId, m.popReceipt)
          continue
        }
        ready.push({ id: m.messageId, body: m.messageText, receiptHandle: toReceipt(m.messageId, m.popReceipt), receiveCount: m.dequeueCount })
      }
      if (ready.length > 0 || Date.now() >= deadline) return ready
      await sleep(Math.min(1000, Math.max(deadline - Date.now(), 0)))
    }
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
  if (cfg.driver === 'azure') {
    const { messageId, popReceipt } = fromReceipt(receiptHandle)
    await (await getAzure(cfg)).main.deleteMessage(messageId, popReceipt)
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

/** Só para testes: zera o driver local e descarta o cliente Azure em cache. */
export function resetQueueForTests(): void {
  local.messages = []
  local.dead = []
  azure = undefined
}
