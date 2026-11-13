import 'dotenv/config'
import { createAzureQueues, ensureAzureQueues, getQueueConfig } from '../src/services/queue.service'

/**
 * Cria (se não existirem) a fila de inventário e a "poison queue" no Azure Queue Storage. Idempotente.
 *
 *   npm run queues:setup
 *
 * Usa AZURE_STORAGE_CONNECTION_STRING (chave da conta de armazenamento), AZURE_QUEUE_NAME (padrão "stockiq-inventory")
 * e AZURE_POISON_QUEUE_NAME (padrão "<fila>-poison"). A própria aplicação também cria as filas no primeiro uso,
 * então este script serve para provisionar/conferir antes de subir a API e o worker.
 */

async function main() {
  const cfg = getQueueConfig()
  const queues = createAzureQueues(cfg)
  await ensureAzureQueues(queues)
  const [main, poison] = await Promise.all([queues.main.getProperties(), queues.poison.getProperties()])

  console.log(`Fila principal: ${queues.main.url} (${main.approximateMessagesCount ?? 0} mensagens)`)
  console.log(`Poison queue:   ${queues.poison.url} (${poison.approximateMessagesCount ?? 0} mensagens)`)
  console.log('\nGaranta no backend/.env:\n')
  console.log('QUEUE_DRIVER=azure')
  console.log(`AZURE_QUEUE_NAME=${cfg.queueName}`)
  console.log('AZURE_STORAGE_CONNECTION_STRING=<cadeia de conexão da conta>')
}

main().catch((err) => {
  console.error('Falha ao configurar as filas:', err instanceof Error ? `${err.name}: ${err.message}` : err)
  process.exitCode = 1
})
