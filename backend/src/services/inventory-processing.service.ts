import { z } from 'zod'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { createWithin } from './movement.service'
import { sendMessage } from './queue.service'

/**
 * Ajuste de estoque de um inventário concluído, feito de forma assíncrona.
 *
 * Fluxo: a API conclui o inventário e publica uma mensagem na fila; o worker (src/workers/inventory.worker.ts) chama
 * `processInventoryJob`, que grava uma movimentação `inventory` para cada item com divergência (o estoque passa a ser a
 * quantidade contada). Assim a requisição HTTP responde na hora e o trabalho pesado sai do caminho da API.
 *
 * Como a fila entrega "pelo menos uma vez", tudo aqui é idempotente: cada item só é ajustado se `adjustedAt` ainda for nulo,
 * e essa marca é gravada na MESMA transação da movimentação. Reprocessar não duplica ajustes.
 */

export const inventoryMessageSchema = z.object({
  type: z.literal('inventory.process'),
  inventoryId: z.string().min(1),
  requestedById: z.string().min(1),
  requestedAt: z.string().optional(),
})
export type InventoryMessage = z.infer<typeof inventoryMessageSchema>

export type ProcessingOutcome = 'skipped' | 'completed' | 'partial'

export interface ProcessingSummary {
  outcome: ProcessingOutcome
  adjusted: number
  failed: number
}

const batchSize = (): number => {
  const parsed = Number(process.env.INVENTORY_BATCH_SIZE)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 25
}

/** Publica o pedido de processamento. Lança erro se a fila estiver indisponível. */
export async function dispatchInventoryJob(inventoryId: string, requestedById: string): Promise<void> {
  const message: InventoryMessage = {
    type: 'inventory.process',
    inventoryId,
    requestedById,
    requestedAt: new Date().toISOString(),
  }
  await sendMessage(message)
}

/** Registra que o job não pôde seguir (fila indisponível, tentativas esgotadas...). Só afeta jobs ainda em andamento. */
export async function markJobFailed(inventoryId: string, reason: string): Promise<void> {
  await prisma.inventoryCount.updateMany({
    where: { id: inventoryId, jobStatus: { in: ['pending', 'processing'] } },
    data: { jobStatus: 'failed', jobError: reason.slice(0, 500), jobFinishedAt: new Date() },
  })
}

type ItemResult = 'adjusted' | 'already' | 'failed'

async function adjustItem(itemId: string, inventoryName: string, inventoryId: string, userId: string): Promise<ItemResult> {
  try {
    return await prisma.$transaction(async (tx): Promise<ItemResult> => {
      // "Reivindica" o item na própria transação: se outro worker (ou uma reentrega) já ajustou, não faz nada.
      const claimed = await tx.inventoryCountItem.updateMany({
        where: { id: itemId, adjustedAt: null },
        data: { adjustedAt: new Date(), adjustmentError: null },
      })
      if (claimed.count === 0) return 'already'

      const item = await tx.inventoryCountItem.findUniqueOrThrow({ where: { id: itemId } })
      if (item.countedQuantity === null) return 'already'

      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: {
          warehouseAddresses: { where: { status: 'occupied' }, select: { id: true } },
          lots: { where: { quantity: { gt: 0 } }, select: { lotNumber: true } },
        },
      })
      if (!product) throw new AppError('Produto não encontrado', 404)
      if (product.warehouseAddresses.length > 1) {
        throw new AppError('Produto em vários endereços: registre o ajuste manualmente por endereço', 409)
      }
      if (product.lots.length > 1) {
        throw new AppError('Produto em vários lotes: registre o ajuste manualmente por lote', 409)
      }

      await createWithin(tx, {
        type: 'inventory',
        productId: item.productId,
        quantity: item.countedQuantity,
        unitCost: 0,
        notes: `Ajuste do inventário "${inventoryName}" (${inventoryId})`,
        fromAddressId: product.warehouseAddresses[0]?.id,
        lotNumber: product.lots[0]?.lotNumber,
      }, userId)
      return 'adjusted'
    })
  } catch (err) {
    // Erro de regra de negócio: a transação foi desfeita; só registramos o motivo para o usuário decidir.
    // Qualquer outro erro (banco fora do ar etc.) sobe, a mensagem volta para a fila e é tentada de novo.
    if (err instanceof AppError) {
      await prisma.inventoryCountItem.update({ where: { id: itemId }, data: { adjustmentError: err.message.slice(0, 300) } })
      return 'failed'
    }
    throw err
  }
}

async function refreshCounters(inventoryId: string): Promise<{ adjusted: number; failed: number }> {
  const [adjusted, failed] = await Promise.all([
    prisma.inventoryCountItem.count({ where: { inventoryCountId: inventoryId, adjustedAt: { not: null } } }),
    prisma.inventoryCountItem.count({ where: { inventoryCountId: inventoryId, adjustedAt: null, adjustmentError: { not: null } } }),
  ])
  await prisma.inventoryCount.updateMany({ where: { id: inventoryId }, data: { adjustedItems: adjusted, failedItems: failed } })
  return { adjusted, failed }
}

export async function processInventoryJob(inventoryId: string, requestedById: string): Promise<ProcessingSummary> {
  // Só segue se o inventário está concluído e com job pendente/em andamento (em andamento = reentrega após queda do worker).
  const claimed = await prisma.inventoryCount.updateMany({
    where: { id: inventoryId, status: 'completed', jobStatus: { in: ['pending', 'processing'] } },
    data: { jobStatus: 'processing', jobError: null },
  })
  if (claimed.count === 0) return { outcome: 'skipped', adjusted: 0, failed: 0 }

  const inventory = await prisma.inventoryCount.findUniqueOrThrow({ where: { id: inventoryId }, select: { name: true } })
  const pending = await prisma.inventoryCountItem.findMany({
    where: { inventoryCountId: inventoryId, countedQuantity: { not: null }, discrepancy: { not: 0 }, adjustedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  const size = batchSize()
  for (let start = 0; start < pending.length; start += size) {
    for (const { id } of pending.slice(start, start + size)) {
      await adjustItem(id, inventory.name, inventoryId, requestedById)
    }
    await refreshCounters(inventoryId) // o frontend acompanha este progresso
  }

  const { adjusted, failed } = await refreshCounters(inventoryId)
  const outcome: ProcessingOutcome = failed === 0 ? 'completed' : 'partial'
  await prisma.inventoryCount.updateMany({
    where: { id: inventoryId },
    data: { jobStatus: outcome, jobFinishedAt: new Date(), jobError: failed ? `${failed} item(ns) precisam de ajuste manual` : null },
  })
  return { outcome, adjusted, failed }
}
