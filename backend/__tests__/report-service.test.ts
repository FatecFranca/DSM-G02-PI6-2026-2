import { prisma } from '../src/prisma/client'
import { getAbcReport } from '../src/services/report.service'

jest.mock('../src/prisma/client', () => ({
  prisma: {
    movement: { groupBy: jest.fn() },
    product: { findMany: jest.fn().mockResolvedValue([]) },
  },
}))

const mockGroupBy = prisma.movement.groupBy as jest.Mock

describe('ABC report', () => {
  afterEach(() => jest.clearAllMocks())

  it('classifies products with no movement value in class C', async () => {
    mockGroupBy.mockResolvedValue([
      { productId: 'product-1', _sum: { totalValue: 0 } },
      { productId: 'product-2', _sum: { totalValue: 0 } },
    ])

    const report = await getAbcReport()

    expect(report.summary.totalValue).toBe(0)
    expect(report.A).toHaveLength(0)
    expect(report.B).toHaveLength(0)
    expect(report.C).toHaveLength(2)
    expect(report.C.map((item) => item.accumulatedPercentage)).toEqual([0, 0])
  })
})
