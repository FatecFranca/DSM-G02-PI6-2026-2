import { AppError } from '../src/middleware/error.middleware'

const prismaMock = {
  $transaction: jest.fn(),
  inventoryCount: { updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
  inventoryCountItem: { findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
}
jest.mock('../src/prisma/client', () => ({ prisma: prismaMock }))

const createWithin = jest.fn()
jest.mock('../src/services/movement.service', () => ({ createWithin: (...a: unknown[]) => createWithin(...a) }))

const sendMessage = jest.fn()
jest.mock('../src/services/queue.service', () => ({ sendMessage: (...a: unknown[]) => sendMessage(...a) }))

import { dispatchInventoryJob, markJobFailed, processInventoryJob } from '../src/services/inventory-processing.service'

/** Cliente de transação simulado: `itemClaims` diz se cada item ainda estava sem ajuste. */
function mockTransactions(products: Record<string, unknown>, claims: Record<string, boolean> = {}) {
  const tx = {
    inventoryCountItem: {
      updateMany: jest.fn(async ({ where }: { where: { id: string } }) => ({ count: claims[where.id] === false ? 0 : 1 })),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        productId: `prod-${where.id}`,
        countedQuantity: 7,
      })),
    },
    product: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => products[where.id] ?? null) },
  }
  prismaMock.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx))
  return tx
}

const product = (over: Record<string, unknown> = {}) => ({ warehouseAddresses: [], lots: [], ...over })

beforeEach(() => {
  jest.clearAllMocks()
  delete process.env.INVENTORY_BATCH_SIZE
  prismaMock.inventoryCount.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.inventoryCount.findUniqueOrThrow.mockResolvedValue({ name: 'Geral Outubro' })
  prismaMock.inventoryCountItem.count.mockResolvedValue(0)
  createWithin.mockResolvedValue({})
})

describe('dispatchInventoryJob', () => {
  it('publica a mensagem com tipo, inventário e solicitante', async () => {
    await dispatchInventoryJob('inv-1', 'user-1')
    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'inventory.process', inventoryId: 'inv-1', requestedById: 'user-1' }))
  })
})

describe('markJobFailed', () => {
  it('só altera jobs ainda em andamento', async () => {
    await markJobFailed('inv-1', 'motivo')
    expect(prismaMock.inventoryCount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'inv-1', jobStatus: { in: ['pending', 'processing'] } },
      data: expect.objectContaining({ jobStatus: 'failed', jobError: 'motivo' }),
    }))
  })
})

describe('processInventoryJob', () => {
  it('ignora quando o inventário não está pendente (reentrega de job já concluído)', async () => {
    prismaMock.inventoryCount.updateMany.mockResolvedValueOnce({ count: 0 })
    expect(await processInventoryJob('inv-1', 'user-1')).toEqual({ outcome: 'skipped', adjusted: 0, failed: 0 })
    expect(prismaMock.inventoryCountItem.findMany).not.toHaveBeenCalled()
    expect(createWithin).not.toHaveBeenCalled()
  })

  it('ajusta cada item com divergência como movimentação de inventário e conclui', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    mockTransactions({
      'prod-a': product({ warehouseAddresses: [{ id: 'addr-1' }], lots: [{ lotNumber: 'L-1' }] }),
      'prod-b': product(),
    })
    prismaMock.inventoryCountItem.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0) // refresh do lote
      .mockResolvedValueOnce(2).mockResolvedValueOnce(0) // refresh final

    const summary = await processInventoryJob('inv-1', 'user-1')

    expect(summary).toEqual({ outcome: 'completed', adjusted: 2, failed: 0 })
    expect(createWithin).toHaveBeenCalledTimes(2)
    expect(createWithin.mock.calls[0][1]).toMatchObject({
      type: 'inventory', productId: 'prod-a', quantity: 7, fromAddressId: 'addr-1', lotNumber: 'L-1',
      notes: expect.stringContaining('Geral Outubro'),
    })
    expect(createWithin.mock.calls[0][2]).toBe('user-1')
    expect(createWithin.mock.calls[1][1]).toMatchObject({ productId: 'prod-b', fromAddressId: undefined, lotNumber: undefined })
    expect(prismaMock.inventoryCount.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ jobStatus: 'completed', jobError: null }),
    }))
  })

  it('só pega itens com divergência, contados e ainda sem ajuste', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([])
    await processInventoryJob('inv-1', 'user-1')
    expect(prismaMock.inventoryCountItem.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { inventoryCountId: 'inv-1', countedQuantity: { not: null }, discrepancy: { not: 0 }, adjustedAt: null },
    }))
  })

  it('é idempotente: item já reivindicado por outra execução não gera nova movimentação', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([{ id: 'a' }])
    mockTransactions({ 'prod-a': product() }, { a: false })
    await processInventoryJob('inv-1', 'user-1')
    expect(createWithin).not.toHaveBeenCalled()
  })

  it('produto em vários endereços/lotes vira pendência manual e o job termina como partial', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    mockTransactions({
      'prod-a': product({ warehouseAddresses: [{ id: 'x' }, { id: 'y' }] }),
      'prod-b': product({ lots: [{ lotNumber: 'L1' }, { lotNumber: 'L2' }] }),
    })
    prismaMock.inventoryCountItem.count.mockResolvedValue(0)
    prismaMock.inventoryCountItem.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(2)

    const summary = await processInventoryJob('inv-1', 'user-1')

    expect(summary.outcome).toBe('partial')
    expect(createWithin).not.toHaveBeenCalled()
    expect(prismaMock.inventoryCountItem.update).toHaveBeenCalledTimes(2)
    expect(prismaMock.inventoryCountItem.update.mock.calls[0][0].data.adjustmentError).toContain('vários endereços')
    expect(prismaMock.inventoryCountItem.update.mock.calls[1][0].data.adjustmentError).toContain('vários lotes')
  })

  it('erro de regra na movimentação (AppError) é registrado no item e não derruba o job', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([{ id: 'a' }])
    mockTransactions({ 'prod-a': product() })
    createWithin.mockRejectedValueOnce(new AppError('Stock changed while inventory was being recorded; retry the operation', 409))
    prismaMock.inventoryCountItem.count.mockResolvedValue(0)

    const summary = await processInventoryJob('inv-1', 'user-1')
    expect(prismaMock.inventoryCountItem.update).toHaveBeenCalledWith({ where: { id: 'a' }, data: { adjustmentError: expect.stringContaining('Stock changed') } })
    expect(summary.outcome).toBe('completed') // contadores simulados em 0; o estado vem dos counts
  })

  it('erro inesperado (ex.: banco fora do ar) sobe para a mensagem voltar à fila', async () => {
    prismaMock.inventoryCountItem.findMany.mockResolvedValue([{ id: 'a' }])
    mockTransactions({ 'prod-a': product() })
    createWithin.mockRejectedValueOnce(new Error('connection lost'))
    await expect(processInventoryJob('inv-1', 'user-1')).rejects.toThrow('connection lost')
    expect(prismaMock.inventoryCountItem.update).not.toHaveBeenCalled()
  })

  it('processa em lotes e atualiza o progresso a cada lote', async () => {
    process.env.INVENTORY_BATCH_SIZE = '2'
    prismaMock.inventoryCountItem.findMany.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((id) => ({ id })))
    mockTransactions(Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((id) => [`prod-${id}`, product()])))

    await processInventoryJob('inv-1', 'user-1')

    expect(createWithin).toHaveBeenCalledTimes(5)
    // 3 lotes (2+2+1) + atualização final = 4 gravações de contadores
    const counterWrites = prismaMock.inventoryCount.updateMany.mock.calls.filter(([arg]) => 'adjustedItems' in arg.data)
    expect(counterWrites).toHaveLength(4)
  })
})
