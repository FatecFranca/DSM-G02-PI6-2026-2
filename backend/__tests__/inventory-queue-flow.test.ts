const dispatchInventoryJob = jest.fn()
const markJobFailed = jest.fn()
jest.mock('../src/services/inventory-processing.service', () => ({
  dispatchInventoryJob: (...a: unknown[]) => dispatchInventoryJob(...a),
  markJobFailed: (...a: unknown[]) => markJobFailed(...a),
}))

const prismaMock = {
  $transaction: jest.fn(),
  inventoryCount: { findUnique: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
}
jest.mock('../src/prisma/client', () => ({ prisma: prismaMock }))

import { reprocess, update } from '../src/services/inventory.service'

function mockReviewTx(status = 'review') {
  const tx = {
    inventoryCount: {
      findUnique: jest.fn().mockResolvedValue({ id: 'inv-1', status, responsibleId: 'resp-1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'completed', jobStatus: 'pending' }),
    },
    inventoryCountItem: { findMany: jest.fn().mockResolvedValue([{ countedQuantity: 1 }]) },
  }
  prismaMock.$transaction.mockImplementation((cb: (t: typeof tx) => unknown) => cb(tx))
  return tx
}

beforeEach(() => {
  jest.clearAllMocks()
  dispatchInventoryJob.mockResolvedValue(undefined)
  markJobFailed.mockResolvedValue(undefined)
  prismaMock.inventoryCount.findUniqueOrThrow.mockResolvedValue({ id: 'inv-1', status: 'completed', jobStatus: 'pending' })
})

describe('concluir inventário enfileira o ajuste', () => {
  it('grava jobStatus=pending na transação e publica na fila depois (com o usuário que concluiu)', async () => {
    const tx = mockReviewTx()
    const order: string[] = []
    tx.inventoryCount.updateMany.mockImplementation(async () => { order.push('commit-data'); return { count: 1 } })
    dispatchInventoryJob.mockImplementation(async () => { order.push('dispatch') })

    await update('inv-1', { status: 'completed' }, 'user-7')

    expect(tx.inventoryCount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'completed', jobStatus: 'pending', adjustedItems: 0, failedItems: 0 }),
    }))
    expect(dispatchInventoryJob).toHaveBeenCalledWith('inv-1', 'user-7')
    expect(order).toEqual(['commit-data', 'dispatch'])
  })

  it('sem usuário informado, usa o responsável pelo inventário', async () => {
    mockReviewTx()
    await update('inv-1', { status: 'completed' })
    expect(dispatchInventoryJob).toHaveBeenCalledWith('inv-1', 'resp-1')
  })

  it('se a fila estiver fora do ar a conclusão fica salva e o job vira failed (reprocessável)', async () => {
    mockReviewTx()
    dispatchInventoryJob.mockRejectedValue(new Error('SQS indisponível'))
    await expect(update('inv-1', { status: 'completed' }, 'user-7')).resolves.toBeDefined()
    expect(markJobFailed).toHaveBeenCalledWith('inv-1', expect.stringContaining('SQS indisponível'))
  })

  it('outras transições não enfileiram nada', async () => {
    const tx = mockReviewTx('in_progress')
    await update('inv-1', { status: 'review' }, 'user-7')
    expect(dispatchInventoryJob).not.toHaveBeenCalled()
    expect(tx.inventoryCount.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'review' } }))
  })
})

describe('reprocess', () => {
  const count = (over: Record<string, unknown> = {}) => ({
    id: 'inv-1', status: 'completed', jobStatus: 'failed', jobQueuedAt: new Date(), ...over,
  })

  it('reenvia jobs failed/partial', async () => {
    for (const jobStatus of ['failed', 'partial']) {
      jest.clearAllMocks()
      prismaMock.inventoryCount.findUnique.mockResolvedValue(count({ jobStatus }))
      prismaMock.inventoryCount.updateMany.mockResolvedValue({ count: 1 })
      prismaMock.inventoryCount.findUniqueOrThrow.mockResolvedValue({ id: 'inv-1' })
      await reprocess('inv-1', 'user-1')
      expect(prismaMock.inventoryCount.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'inv-1', jobStatus }, data: expect.objectContaining({ jobStatus: 'pending' }),
      }))
      expect(dispatchInventoryJob).toHaveBeenCalledWith('inv-1', 'user-1')
    }
  })

  it('recusa job em andamento recente, concluído, inventário aberto ou sem processamento assíncrono', async () => {
    const recusados = [
      count({ jobStatus: 'processing' }),
      count({ jobStatus: 'pending' }),
      count({ jobStatus: 'completed' }),
      count({ status: 'review', jobStatus: null }),
      count({ jobStatus: null }),
    ]
    for (const row of recusados) {
      prismaMock.inventoryCount.findUnique.mockResolvedValue(row)
      await expect(reprocess('inv-1', 'user-1')).rejects.toMatchObject({ statusCode: 409 })
    }
    expect(dispatchInventoryJob).not.toHaveBeenCalled()
  })

  it('permite reenviar job travado há mais de 15 minutos', async () => {
    prismaMock.inventoryCount.findUnique.mockResolvedValue(count({ jobStatus: 'processing', jobQueuedAt: new Date(Date.now() - 16 * 60 * 1000) }))
    prismaMock.inventoryCount.updateMany.mockResolvedValue({ count: 1 })
    await reprocess('inv-1', 'user-1')
    expect(dispatchInventoryJob).toHaveBeenCalled()
  })

  it('404 se não existe; 409 se outra requisição reenviou ao mesmo tempo; 503 se a fila cair', async () => {
    prismaMock.inventoryCount.findUnique.mockResolvedValueOnce(null)
    await expect(reprocess('x', 'u')).rejects.toMatchObject({ statusCode: 404 })

    prismaMock.inventoryCount.findUnique.mockResolvedValue(count())
    prismaMock.inventoryCount.updateMany.mockResolvedValueOnce({ count: 0 })
    await expect(reprocess('inv-1', 'u')).rejects.toMatchObject({ statusCode: 409 })

    prismaMock.inventoryCount.updateMany.mockResolvedValueOnce({ count: 1 })
    dispatchInventoryJob.mockRejectedValueOnce(new Error('fora do ar'))
    await expect(reprocess('inv-1', 'u')).rejects.toMatchObject({ statusCode: 503 })
    expect(markJobFailed).toHaveBeenCalled()
  })
})
