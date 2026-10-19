import { SQSClient } from '@aws-sdk/client-sqs'
import { AppError } from '../src/middleware/error.middleware'
import * as queue from '../src/services/queue.service'

function useLocal() {
  process.env.QUEUE_DRIVER = 'local'
  process.env.QUEUE_VISIBILITY_TIMEOUT_SECONDS = '120'
  process.env.QUEUE_MAX_RECEIVES = '3'
}

function useSqs() {
  process.env.QUEUE_DRIVER = 'sqs'
  process.env.SQS_INVENTORY_QUEUE_URL = 'https://sqs.us-east-2.amazonaws.com/123456789012/stockiq-inventory'
  process.env.S3_REGION = 'us-east-2'
  process.env.S3_ACCESS_KEY_ID = 'AKIATESTE'
  process.env.S3_SECRET_ACCESS_KEY = 'segredo'
  delete process.env.SQS_REGION
  delete process.env.SQS_ENDPOINT
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

describe('driver SQS', () => {
  it('envia o corpo em JSON para a fila configurada', async () => {
    useSqs()
    const send = jest.spyOn(SQSClient.prototype, 'send').mockResolvedValue({ MessageId: 'm-1' } as never)
    expect(await queue.sendMessage({ inventoryId: 'i1' })).toBe('m-1')
    const input = (send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }).input
    expect(input).toEqual({
      QueueUrl: 'https://sqs.us-east-2.amazonaws.com/123456789012/stockiq-inventory',
      MessageBody: '{"inventoryId":"i1"}',
    })
  })

  it('recebe com long polling, visibilidade e contagem de entregas', async () => {
    useSqs()
    const send = jest.spyOn(SQSClient.prototype, 'send').mockResolvedValue({
      Messages: [{ MessageId: 'm-1', Body: '{"x":1}', ReceiptHandle: 'rh-1', Attributes: { ApproximateReceiveCount: '2' } }],
    } as never)
    const messages = await queue.receiveMessages({ max: 50, waitSeconds: 30 })
    expect(messages).toEqual([{ id: 'm-1', body: '{"x":1}', receiptHandle: 'rh-1', receiveCount: 2 }])
    const input = (send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }).input
    expect(input).toMatchObject({ MaxNumberOfMessages: 10, WaitTimeSeconds: 20, VisibilityTimeout: 120 })
  })

  it('apaga pelo receipt handle', async () => {
    useSqs()
    const send = jest.spyOn(SQSClient.prototype, 'send').mockResolvedValue({} as never)
    await queue.deleteMessage('rh-9')
    expect((send.mock.calls[0][0] as unknown as { input: Record<string, unknown> }).input).toMatchObject({ ReceiptHandle: 'rh-9' })
  })

  it('503 quando faltam a URL da fila ou as credenciais', async () => {
    useSqs()
    process.env.SQS_INVENTORY_QUEUE_URL = ''
    await expect(queue.sendMessage({})).rejects.toMatchObject({ statusCode: 503 })

    useSqs()
    queue.resetQueueForTests()
    process.env.S3_ACCESS_KEY_ID = ''
    const err = await queue.sendMessage({}).catch((e) => e)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toContain('SQS_ACCESS_KEY_ID')
  })

  it('usa as credenciais do S3 como padrão e aceita SQS_* para separar', () => {
    useSqs()
    expect(queue.getQueueConfig()).toMatchObject({ region: 'us-east-2', accessKeyId: 'AKIATESTE' })
    process.env.SQS_REGION = 'sa-east-1'
    process.env.SQS_ACCESS_KEY_ID = 'OUTRA'
    expect(queue.getQueueConfig()).toMatchObject({ region: 'sa-east-1', accessKeyId: 'OUTRA' })
    delete process.env.SQS_ACCESS_KEY_ID
  })
})
