import { prisma } from '../src/prisma/client'
import { recordItemCount, update } from '../src/services/inventory.service'

jest.mock('../src/prisma/client', () => ({
  prisma: { $transaction: jest.fn() },
}))

const mockTransaction = prisma.$transaction as jest.Mock

function transactionClient(overrides: Record<string, unknown> = {}) {
  const tx = {
    inventoryCount: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'inventory-id',
        status: 'in_progress',
      }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'inventory-id' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    inventoryCountItem: {
      findMany: jest.fn().mockResolvedValue([
        { countedQuantity: 3 },
        { countedQuantity: 0 },
      ]),
      findFirst: jest.fn().mockResolvedValue({
        id: 'item-id',
        expectedQuantity: 4,
        inventoryCountId: 'inventory-id',
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn()
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1),
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'item-id',
        countedQuantity: 3,
        discrepancy: -1,
      }),
    },
    ...overrides,
  }
  mockTransaction.mockImplementation(
    (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  )
  return tx
}

describe('inventory workflow', () => {
  afterEach(() => jest.clearAllMocks())

  it('does not allow completing before review', async () => {
    const tx = transactionClient()
    await expect(update('inventory-id', { status: 'completed' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Cannot transition inventory from in_progress to completed',
    })
    expect(tx.inventoryCount.updateMany).not.toHaveBeenCalled()
  })

  it('requires every item to be counted before review', async () => {
    const tx = transactionClient({
      inventoryCountItem: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn().mockResolvedValue([{ countedQuantity: 3 }, { countedQuantity: null }]),
      },
    })
    await expect(update('inventory-id', { status: 'review' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'All inventory items must be counted before review',
    })
    expect(tx.inventoryCount.updateMany).not.toHaveBeenCalled()
  })

  it('records the counted quantity, discrepancy, user, and reconciles inventory totals', async () => {
    const tx = transactionClient()
    await recordItemCount('inventory-id', 'item-id', 3, 'user-id')

    expect(tx.inventoryCountItem.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'item-id', inventoryCountId: 'inventory-id' },
      data: expect.objectContaining({
        countedQuantity: 3,
        discrepancy: -1,
        countedById: 'user-id',
      }),
    }))
    expect(tx.inventoryCount.updateMany).toHaveBeenCalledWith({
      where: { id: 'inventory-id', status: 'in_progress' },
      data: { countedItems: 2, divergences: 1 },
    })
  })
})
