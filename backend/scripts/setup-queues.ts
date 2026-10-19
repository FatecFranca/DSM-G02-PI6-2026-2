import 'dotenv/config'
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  SetQueueAttributesCommand,
  SQSClient,
} from '@aws-sdk/client-sqs'
import { createSqsClient, getQueueConfig } from '../src/services/queue.service'

/**
 * Cria (ou atualiza) a fila de inventário e sua DLQ no SQS. Idempotente: pode rodar quantas vezes precisar.
 *
 *   npm run queues:setup
 *
 * Recursos criados (prefixo configurável em SQS_QUEUE_PREFIX, padrão "stockiq"):
 *   <prefixo>-inventory       fila principal (long polling, redrive para a DLQ após QUEUE_MAX_RECEIVES entregas)
 *   <prefixo>-inventory-dlq   mensagens que falharam em todas as tentativas (retenção de 14 dias)
 *
 * Permissões IAM necessárias para este script: sqs:CreateQueue, sqs:GetQueueUrl, sqs:GetQueueAttributes, sqs:SetQueueAttributes.
 * A aplicação em si só precisa de sqs:SendMessage, sqs:ReceiveMessage, sqs:DeleteMessage e sqs:GetQueueAttributes.
 */

async function ensureQueue(client: SQSClient, name: string, attributes: Record<string, string>): Promise<string> {
  try {
    const created = await client.send(new CreateQueueCommand({ QueueName: name, Attributes: attributes }))
    return created.QueueUrl as string
  } catch (err) {
    // Já existe com outros atributos: reaproveita e ajusta.
    if ((err as { name?: string }).name !== 'QueueNameExists') throw err
    const existing = await client.send(new GetQueueUrlCommand({ QueueName: name }))
    await client.send(new SetQueueAttributesCommand({ QueueUrl: existing.QueueUrl, Attributes: attributes }))
    return existing.QueueUrl as string
  }
}

async function main() {
  const cfg = getQueueConfig()
  const client = createSqsClient(cfg)
  const prefix = process.env.SQS_QUEUE_PREFIX || 'stockiq'

  const dlqUrl = await ensureQueue(client, `${prefix}-inventory-dlq`, {
    MessageRetentionPeriod: String(14 * 24 * 60 * 60),
  })
  const dlqArn = (await client.send(new GetQueueAttributesCommand({ QueueUrl: dlqUrl, AttributeNames: ['QueueArn'] }))).Attributes?.QueueArn
  if (!dlqArn) throw new Error('Não foi possível obter o ARN da DLQ')

  const queueUrl = await ensureQueue(client, `${prefix}-inventory`, {
    VisibilityTimeout: String(cfg.visibilityTimeoutSeconds),
    ReceiveMessageWaitTimeSeconds: '10',
    MessageRetentionPeriod: String(4 * 24 * 60 * 60),
    RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: cfg.maxReceives }),
  })

  console.log(`Fila principal: ${queueUrl}`)
  console.log(`DLQ:            ${dlqUrl}`)
  console.log('\nAdicione ao backend/.env:\n')
  console.log('QUEUE_DRIVER=sqs')
  console.log(`SQS_INVENTORY_QUEUE_URL=${queueUrl}`)
}

main().catch((err) => {
  console.error('Falha ao configurar as filas:', err instanceof Error ? `${err.name}: ${err.message}` : err)
  process.exitCode = 1
})
