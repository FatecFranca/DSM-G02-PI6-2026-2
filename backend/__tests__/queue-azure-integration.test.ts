import crypto from 'crypto'
import { QueueServiceClient } from '@azure/storage-queue'
import * as queue from '../src/services/queue.service'

/**
 * Teste de integração do driver Azure contra um servidor de verdade (emulador Azurite ou uma conta de teste).
 * Opcional: só roda se AZURE_TEST_CONNECTION_STRING estiver definido, por exemplo com o Azurite:
 *
 *   docker run -d --rm -p 127.0.0.1:10001:10001 mcr.microsoft.com/azure-storage/azurite azurite-queue --queueHost 0.0.0.0 --skipApiVersionCheck
 *   AZURE_TEST_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;" \
 *     npm test -- queue-azure-integration
 *
 * Usa filas com nome aleatório e apaga tudo no fim; nunca toca na fila de produção.
 */
const connectionString = process.env.AZURE_TEST_CONNECTION_STRING
const suite = connectionString ? describe : describe.skip

suite('driver Azure contra Azure Queue Storage real/emulado', () => {
  jest.setTimeout(60_000)
  const name = `jest-${crypto.randomUUID().slice(0, 8)}`

  beforeAll(() => {
    Object.assign(process.env, {
      QUEUE_DRIVER: 'azure',
      AZURE_STORAGE_CONNECTION_STRING: connectionString,
      AZURE_QUEUE_NAME: name,
      QUEUE_VISIBILITY_TIMEOUT_SECONDS: '1',
      QUEUE_MAX_RECEIVES: '2',
    })
    delete process.env.AZURE_POISON_QUEUE_NAME
    queue.resetQueueForTests()
  })

  afterAll(async () => {
    const service = QueueServiceClient.fromConnectionString(connectionString as string)
    await Promise.all([name, `${name}-poison`].map((q) => service.deleteQueue(q).catch(() => undefined)))
  })

  it('envia, recebe e apaga uma mensagem', async () => {
    await queue.sendMessage({ inventoryId: 'inv-1' })
    const [message] = await queue.receiveMessages({ max: 1, waitSeconds: 3 })
    expect(JSON.parse(message.body)).toEqual({ inventoryId: 'inv-1' })
    expect(message.receiveCount).toBe(1)
    await queue.deleteMessage(message.receiptHandle)
    expect(await queue.receiveMessages({ max: 1, waitSeconds: 1 })).toHaveLength(0)
  })

  it('reentrega quando não é apagada e, estourando as tentativas, vai para a poison queue', async () => {
    await queue.sendMessage({ inventoryId: 'inv-2' })

    const first = await queue.receiveMessages({ max: 1, waitSeconds: 3 })
    expect(first[0].receiveCount).toBe(1) // não apaga: simula falha no processamento

    const second = await queue.receiveMessages({ max: 1, waitSeconds: 5 })
    expect(second[0].id).toBe(first[0].id)
    expect(second[0].receiveCount).toBe(2)

    // 3ª leitura: passou de QUEUE_MAX_RECEIVES, então o driver não entrega e move para a poison queue.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(await queue.receiveMessages({ max: 1, waitSeconds: 1 })).toHaveLength(0)
    const poison = QueueServiceClient.fromConnectionString(connectionString as string).getQueueClient(`${name}-poison`)
    const dead = await poison.receiveMessages({ numberOfMessages: 1 })
    expect(JSON.parse(dead.receivedMessageItems[0]?.messageText ?? '{}')).toEqual({ inventoryId: 'inv-2' })
  })
})
