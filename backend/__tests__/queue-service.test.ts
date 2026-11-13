import { QueueClient } from '@azure/storage-queue'
import { AppError } from '../src/middleware/error.middleware'
import * as queue from '../src/services/queue.service'

function useLocal() {
  process.env.QUEUE_DRIVER = 'local'
  process.env.QUEUE_VISIBILITY_TIMEOUT_SECONDS = '120'
  process.env.QUEUE_MAX_RECEIVES = '3'
}

// Cadeia de conexão fictícia (chave em base64 válida): nenhuma chamada de rede é feita, o QueueClient é mockado.
const CONNECTION_STRING =
  'DefaultEndpointsProtocol=https;AccountName=contateste;AccountKey=c2VncmVkbw==;EndpointSuffix=core.windows.net'

function useAzure() {
  process.env.QUEUE_DRIVER = 'azure'
  process.env.AZURE_STORAGE_CONNECTION_STRING = CONNECTION_STRING
  process.env.AZURE_QUEUE_NAME = 'fila-teste'
  delete process.env.AZURE_POISON_QUEUE_NAME
}

function mockAzure(overrides: Partial<Record<'send' | 'receive' | 'delete', jest.Mock>> = {}) {
  const create = jest.spyOn(QueueClient.prototype, 'createIfNotExists').mockResolvedValue({ succeeded: true } as never)
  const send = overrides.send ?? jest.fn().mockResolvedValue({ messageId: 'm-1' })
  const receive = overrides.receive ?? jest.fn().mockResolvedValue({ receivedMessageItems: [] })
  const del = overrides.delete ?? jest.fn().mockResolvedValue({})
  // Registra também em qual fila (pelo nome) cada chamada caiu.
  jest.spyOn(QueueClient.prototype, 'sendMessage').mockImplementation(function (this: QueueClient, text: string) { return send(this.name, text) } as never)
  jest.spyOn(QueueClient.prototype, 'receiveMessages').mockImplementation(function (this: QueueClient, options: unknown) { return receive(this.name, options) } as never)
  jest.spyOn(QueueClient.prototype, 'deleteMessage').mockImplementation(function (this: QueueClient, id: string, pop: string) { return del(this.name, id, pop) } as never)
  return { create, send, receive, delete: del }
}

beforeEach(() => {
  queue.resetQueueForTests()
  useLocal()
})
afterEach(() => jest.restoreAllMocks())

describe('driver local', () => {
  it('envia, recebe e apaga', async () => {
    await queue.sendMessage({ a: 1 })
    expect(queue.localQueueState()).toEqual({ waiting: 1, inFlight: 0, dead: 0 })

    const [message] = await queue.receiveMessages({ max: 1 })
    expect(JSON.parse(message.body)).toEqual({ a: 1 })
    expect(message.receiveCount).toBe(1)
    expect(queue.localQueueState()).toEqual({ waiting: 0, inFlight: 1, dead: 0 })

    await queue.deleteMessage(message.receiptHandle)
    expect(queue.localQueueState()).toEqual({ waiting: 0, inFlight: 0, dead: 0 })
  })

  it('não entrega de novo enquanto a mensagem está em processamento', async () => {
    await queue.sendMessage({ a: 1 })
    expect(await queue.receiveMessages({ max: 5 })).toHaveLength(1)
    expect(await queue.receiveMessages({ max: 5 })).toHaveLength(0)
  })

  it('reentrega depois do prazo de visibilidade e conta as tentativas', async () => {
    await queue.sendMessage({ a: 1 })
    const first = await queue.receiveMessages()
    const now = Date.now()
    jest.spyOn(Date, 'now').mockReturnValue(now + 121_000)
    const second = await queue.receiveMessages()
    expect(second).toHaveLength(1)
    expect(second[0].id).toBe(first[0].id)
    expect(second[0].receiveCount).toBe(2)
  })

  it('manda para a "DLQ" quando estoura QUEUE_MAX_RECEIVES', async () => {
    await queue.sendMessage({ a: 1 })
    let now = Date.now()
    for (let i = 0; i < 3; i++) {
      expect(await queue.receiveMessages()).toHaveLength(1)
      now += 121_000
      jest.spyOn(Date, 'now').mockReturnValue(now)
    }
    expect(await queue.receiveMessages()).toHaveLength(0)
    expect(queue.localQueueState()).toEqual({ waiting: 0, inFlight: 0, dead: 1 })
  })

  it('long polling devolve vazio ao fim da espera', async () => {
    const started = Date.now()
    expect(await queue.receiveMessages({ waitSeconds: 0 })).toEqual([])
    expect(Date.now() - started).toBeLessThan(500)
  })
})

describe('driver Azure Queue Storage', () => {
  beforeEach(useAzure)

  it('cria a fila e a poison queue no primeiro uso e envia o corpo em JSON', async () => {
    const mocks = mockAzure()
    expect(await queue.sendMessage({ inventoryId: 'i1' })).toBe('m-1')
    expect(await queue.sendMessage({ inventoryId: 'i2' })).toBe('m-1')
    expect(mocks.create).toHaveBeenCalledTimes(2) // principal + poison, só uma vez
    expect(mocks.send).toHaveBeenNthCalledWith(1, 'fila-teste', '{"inventoryId":"i1"}')
  })

  it('recebe com visibilidade configurada e devolve a contagem de entregas', async () => {
    const mocks = mockAzure({
      receive: jest.fn().mockResolvedValue({
        receivedMessageItems: [{ messageId: 'm-1', popReceipt: 'pop/+=', messageText: '{"x":1}', dequeueCount: 2 }],
      }),
    })
    const messages = await queue.receiveMessages({ max: 50, waitSeconds: 0 })
    expect(messages).toEqual([{ id: 'm-1', body: '{"x":1}', receiptHandle: 'm-1:pop/+=', receiveCount: 2 }])
    expect(mocks.receive).toHaveBeenCalledWith('fila-teste', { numberOfMessages: 32, visibilityTimeout: 120 })
  })

  it('espera (polling) até a mensagem chegar ou o tempo acabar', async () => {
    const receive = jest.fn()
      .mockResolvedValueOnce({ receivedMessageItems: [] })
      .mockResolvedValueOnce({ receivedMessageItems: [{ messageId: 'm-2', popReceipt: 'p', messageText: '{}', dequeueCount: 1 }] })
    mockAzure({ receive })
    const messages = await queue.receiveMessages({ waitSeconds: 5 })
    expect(messages.map((m) => m.id)).toEqual(['m-2'])
    expect(receive).toHaveBeenCalledTimes(2)

    mockAzure({ receive: jest.fn().mockResolvedValue({ receivedMessageItems: [] }) })
    expect(await queue.receiveMessages({ waitSeconds: 0 })).toEqual([])
  })

  it('move para a poison queue a mensagem que passou de QUEUE_MAX_RECEIVES', async () => {
    const mocks = mockAzure({
      receive: jest.fn().mockResolvedValue({
        receivedMessageItems: [
          { messageId: 'velha', popReceipt: 'p1', messageText: '{"old":1}', dequeueCount: 4 },
          { messageId: 'nova', popReceipt: 'p2', messageText: '{"new":1}', dequeueCount: 3 },
        ],
      }),
    })
    const messages = await queue.receiveMessages({ max: 5 })
    expect(messages.map((m) => m.id)).toEqual(['nova']) // 3 de 3 ainda é entregue
    expect(mocks.send).toHaveBeenCalledWith('fila-teste-poison', '{"old":1}')
    expect(mocks.delete).toHaveBeenCalledWith('fila-teste', 'velha', 'p1')
  })

  it('apaga pelo recibo (messageId + popReceipt)', async () => {
    const mocks = mockAzure()
    await queue.deleteMessage('m-9:pop/com:dois-pontos==')
    expect(mocks.delete).toHaveBeenCalledWith('fila-teste', 'm-9', 'pop/com:dois-pontos==')
    await expect(queue.deleteMessage('sem-separador')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('503 quando faltam a cadeia de conexão ou ela é inválida', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = ''
    const err = await queue.sendMessage({}).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.statusCode).toBe(503)
    expect(err.message).toContain('AZURE_STORAGE_CONNECTION_STRING')

    queue.resetQueueForTests()
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'isso-nao-e-uma-cadeia'
    await expect(queue.sendMessage({})).rejects.toMatchObject({ statusCode: 503 })
  })

  it('tenta criar as filas de novo depois de uma falha', async () => {
    const create = jest.spyOn(QueueClient.prototype, 'createIfNotExists')
      .mockRejectedValueOnce(new Error('rede fora'))
      .mockResolvedValue({ succeeded: true } as never)
    jest.spyOn(QueueClient.prototype, 'sendMessage').mockResolvedValue({ messageId: 'm-3' } as never)
    await expect(queue.sendMessage({})).rejects.toThrow('rede fora')
    expect(await queue.sendMessage({})).toBe('m-3')
    expect(create.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('usa <fila>-poison por padrão e aceita um nome próprio', () => {
    expect(queue.getQueueConfig()).toMatchObject({ driver: 'azure', queueName: 'fila-teste', poisonQueueName: 'fila-teste-poison' })
    process.env.AZURE_POISON_QUEUE_NAME = 'mortas'
    expect(queue.getQueueConfig().poisonQueueName).toBe('mortas')
  })
})
