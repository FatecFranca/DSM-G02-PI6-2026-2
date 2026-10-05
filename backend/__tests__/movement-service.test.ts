import { prisma } from '../src/prisma/client'
import { createMovementSchema } from '../src/schemas/movement.schema'
import { create } from '../src/services/movement.service'

jest.mock('../src/prisma/client', () => ({
  prisma: { $transaction: jest.fn() },
}))

const mockTransaction = prisma.$transaction as jest.Mock
const PRODUCT_ID = `c${'1'.repeat(24)}`

function mockTx(overrides: Record<string, unknown> = {}) {
  const tx = {
    product: {
      findUnique: jest.fn().mockResolvedValue({
        id: PRODUCT_ID,
        currentStock: 10,
        warehouseAddresses: [],
        lots: [],
      }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    movement: { create: jest.fn().mockResolvedValue({ id: 'movement-id' }) },
    warehouseAddress: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    lot: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    ...overrides,
  }
  mockTransaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) =>
    callback(tx),
  )
  return tx
}

const baseMovement = {
  productId: PRODUCT_ID,
  quantity: 3,
  unitCost: 4,
}

describe('movement service stock rules', () => {
  afterEach(() => jest.clearAllMocks())

  it('records transfers without reducing total product stock', async () => {
    const tx = mockTx()
    const source = {
      id: 'source-id', code: 'A-01', status: 'occupied', quantity: 5,
      productId: PRODUCT_ID, lotNumber: null,
    }
    const destination = {
      id: 'destination-id', code: 'B-01', status: 'free', quantity: null,
      productId: null, lotNumber: null,
    }
    tx.warehouseAddress.findUnique
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(destination)
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(destination)

    await create({
      ...baseMovement,
      type: 'transfer',
      fromAddressId: 'source-id',
      toAddressId: 'destination-id',
    }, 'user-id')

    expect(tx.product.update).not.toHaveBeenCalled()
    expect(tx.product.updateMany).not.toHaveBeenCalled()
    expect(tx.warehouseAddress.updateMany).toHaveBeenCalledTimes(2)
    expect(tx.warehouseAddress.updateMany.mock.calls[0][0].data.quantity).toBe(2)
    expect(tx.warehouseAddress.updateMany.mock.calls[1][0].data.quantity).toBe(3)
  })

  it('uses an atomic conditional update for stock reductions', async () => {
    const tx = mockTx()

    await create({ ...baseMovement, type: 'exit' }, 'user-id')

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, currentStock: { gte: 3 } },
      data: { currentStock: { decrement: 3 } },
    })
  })

  it('rejects a concurrent reduction when the remaining stock is insufficient', async () => {
    const tx = mockTx()
    tx.product.findUnique
      .mockResolvedValueOnce({
        id: PRODUCT_ID,
        currentStock: 10,
        warehouseAddresses: [],
        lots: [],
      })
      .mockResolvedValueOnce({ currentStock: 2 })
    tx.product.updateMany.mockResolvedValue({ count: 0 })

    await expect(create({ ...baseMovement, type: 'exit' }, 'user-id')).rejects.toMatchObject({
      message: 'Insufficient stock. Available: 2, Requested: 3',
      statusCode: 400,
    })
  })

  it('treats an inventory quantity as the counted target, including zero', async () => {
    const tx = mockTx()
    const parsed = createMovementSchema.parse({
      ...baseMovement,
      type: 'inventory',
      quantity: 0,
    })

    await create(parsed, 'user-id')

    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, currentStock: 10 },
      data: { currentStock: 0 },
    })
  })

  it('requires an explicit direction for stock adjustments', () => {
    expect(createMovementSchema.safeParse({ ...baseMovement, type: 'adjustment' }).success).toBe(false)
    expect(createMovementSchema.safeParse({
      ...baseMovement,
      type: 'adjustment',
      adjustmentDirection: 'decrease',
    }).success).toBe(true)
  })

  it('requires two distinct addresses for transfers', () => {
    const sameAddress = createMovementSchema.safeParse({
      ...baseMovement,
      type: 'transfer',
      fromAddressId: `c${'1'.repeat(24)}`,
      toAddressId: `c${'1'.repeat(24)}`,
    })
    expect(sameAddress.success).toBe(false)
  })
})
