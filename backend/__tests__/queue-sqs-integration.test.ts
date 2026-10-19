import crypto from 'crypto'
import { CreateQueueCommand, DeleteQueueCommand, GetQueueAttributesCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs'
import * as queue from '../src/services/queue.service'

/**
 * Teste de integração do driver SQS contra um servidor SQS de verdade (ElasticMQ ou LocalStack). Opcional:
 * só roda se SQS_TEST_ENDPOINT estiver definido, por exemplo
 *
 *   docker run -d --rm -p 127.0.0.1:9324:9324 softwaremill/elasticmq-native
 *   SQS_TEST_ENDPOINT=http://127.0.0.1:9324 npm test -- queue-sqs-integration
 */
const endpoint = process.env.SQS_TEST_ENDPOINT
const suite = endpoint ? describe : describe.skip

suite('driver SQS contra servidor SQS real', () => {
  jest.setTimeout(30_000)
  const name = `jest-${crypto.randomUUID().slice(0, 8)}`
  let queueUrl = ''
  let dlqUrl = ''
  const client = () => queue.createSqsClient(queue.getQueueConfig())

  beforeAll(async () => {
    Object.assign(process.env, {
      QUEUE_DRIVER: 'sqs',
      SQS_ENDPOINT: endpoint,
      SQS_REGION: 'us-east-2',
      SQS_ACCESS_KEY_ID: 'local',
      SQS_SECRET_ACCESS_KEY: 'local',
      QUEUE_VISIBILITY_TIMEOUT_SECONDS: '1',
      QUEUE_MAX_RECEIVES: '2',
    })
    const sqs = client()
    dlqUrl = (await sqs.send(new CreateQueueCommand({ QueueName: `${name}-dlq` }))).QueueUrl as string
    const dlqArn = (await sqs.send(new GetQueueAttributesCommand({ QueueUrl: dlqUrl, AttributeNames: ['QueueArn'] }))).Attributes?.QueueArn
    queueUrl = (await sqs.send(new CreateQueueCommand({
      QueueName: name,
      Attributes: { VisibilityTimeout: '1', RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: 2 }) },
    }))).QueueUrl as string
    // O driver lê a fila da configuração; o ElasticMQ devolve a URL com o host que respondeu.
    process.env.SQS_INVENTORY_QUEUE_URL = queueUrl
    queue.resetQueueForTests()
  })

  afterAll(async () => {
    const sqs = client()
    await Promise.all([queueUrl, dlqUrl].filter(Boolean).map((url) => sqs.send(new DeleteQueueCommand({ QueueUrl: url }))))
  })

  it('envia, recebe e apaga uma mensagem', async () => {
    await queue.sendMessage({ inventoryId: 'inv-1' })
    const [message] = await queue.receiveMessages({ max: 1, waitSeconds: 2 })
    expect(JSON.parse(message.body)).toEqual({ inventoryId: 'inv-1' })
    expect(message.receiveCount).toBe(1)
    await queue.deleteMessage(message.receiptHandle)
    expect(await queue.receiveMessages({ max: 1, waitSeconds: 1 })).toHaveLength(0)
  })

  it('reentrega quando não é apagada e, estourando as tentativas, vai para a DLQ', async () => {
    await queue.sendMessage({ inventoryId: 'inv-2' })

    const first = await queue.receiveMessages({ max: 1, waitSeconds: 2 })
    expect(first[0].receiveCount).toBe(1) // não apaga: simula falha no processamento

    const second = await queue.receiveMessages({ max: 1, waitSeconds: 3 })
    expect(second[0].id).toBe(first[0].id)
    expect(second[0].receiveCount).toBe(2)

    // 3ª tentativa: a fila principal já não entrega; a mensagem foi para a DLQ.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(await queue.receiveMessages({ max: 1, waitSeconds: 1 })).toHaveLength(0)
    const dead = await client().send(new ReceiveMessageCommand({ QueueUrl: dlqUrl, MaxNumberOfMessages: 1, WaitTimeSeconds: 2 }))
    expect(JSON.parse(dead.Messages?.[0]?.Body ?? '{}')).toEqual({ inventoryId: 'inv-2' })
  })
})
