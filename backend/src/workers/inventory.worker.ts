import { deleteMessage, getQueueConfig, QueueMessage, receiveMessages } from '../services/queue.service'
import { inventoryMessageSchema, markJobFailed, processInventoryJob } from '../services/inventory-processing.service'

/**
 * Consumidor da fila de inventário (long polling).
 *
 * Regras de entrega:
 *  - a mensagem só é apagada DEPOIS de processar com sucesso;
 *  - se der erro, ela não é apagada: reaparece após o prazo de visibilidade e é tentada de novo (o processamento é idempotente);
 *  - ao esgotar as tentativas (QUEUE_MAX_RECEIVES), o job é marcado como `failed` para o usuário ver, e a fila
 *    move a mensagem para a DLQ (redrive configurado na própria fila SQS);
 *  - mensagem com formato inválido ("veneno") é descartada para não travar a fila.
 */

export type HandleResult = 'done' | 'retry' | 'dropped'

const log = (message: string) => console.log(`[inventory-worker] ${message}`)

export async function handleMessage(message: QueueMessage, maxReceives = getQueueConfig().maxReceives): Promise<HandleResult> {
  let parsed
  try {
    parsed = inventoryMessageSchema.parse(JSON.parse(message.body))
  } catch {
    console.error(`[inventory-worker] descartando mensagem inválida ${message.id}`)
    await deleteMessage(message.receiptHandle)
    return 'dropped'
  }

  try {
    const summary = await processInventoryJob(parsed.inventoryId, parsed.requestedById)
    log(`inventário ${parsed.inventoryId}: ${summary.outcome} (ajustados ${summary.adjusted}, com pendência ${summary.failed})`)
    await deleteMessage(message.receiptHandle)
    return 'done'
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    console.error(`[inventory-worker] erro no inventário ${parsed.inventoryId} (tentativa ${message.receiveCount}/${maxReceives}): ${reason}`)
    if (message.receiveCount >= maxReceives) {
      await markJobFailed(parsed.inventoryId, `Falha após ${message.receiveCount} tentativas: ${reason}`).catch(() => undefined)
    }
    return 'retry'
  }
}

export function startInventoryWorker(): { stop: () => Promise<void> } {
  const cfg = getQueueConfig()
  const waitSeconds = cfg.driver === 'sqs' ? 10 : 1
  let running = true

  const loop = (async () => {
    log(`iniciado (driver ${cfg.driver})`)
    while (running) {
      try {
        const messages = await receiveMessages({ max: 5, waitSeconds })
        for (const message of messages) await handleMessage(message, cfg.maxReceives)
      } catch (err) {
        // Falha de rede/credencial ao falar com a fila: espera um pouco e tenta de novo sem derrubar o processo.
        console.error(`[inventory-worker] erro ao consultar a fila: ${err instanceof Error ? err.message : err}`)
        await new Promise((resolve) => setTimeout(resolve, 5000))
      }
    }
    log('parado')
  })()

  return {
    stop: async () => {
      running = false
      await loop
    },
  }
}
