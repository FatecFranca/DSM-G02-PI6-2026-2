import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateMovementInput, MovementQuery } from '../schemas/movement.schema'

const INCLUDE = {
  product: { select: { id: true, name: true, internalCode: true } },
  supplier: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  fromAddress: { select: { id: true, code: true } },
  toAddress: { select: { id: true, code: true } },
}

export async function findAll(query: MovementQuery) {
  const { page, limit, type, productId, search, from, to } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (type?.length === 1) where.type = type[0]
  else if (type?.length) where.type = { in: type }
  if (productId) where.productId = productId
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { lotNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { internalCode: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const [movements, total] = await Promise.all([
    prisma.movement.findMany({
      where,
      skip,
      take: limit,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.movement.count({ where }),
  ])

  return { data: movements, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const movement = await prisma.movement.findUnique({ where: { id }, include: INCLUDE })
  if (!movement) throw new AppError('Movement not found', 404)
  return movement
}

export async function create(data: CreateMovementInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: data.productId },
      include: {
        warehouseAddresses: { where: { status: 'occupied' } },
        lots: { where: { quantity: { gt: 0 } } },
      },
    })
    if (!product) throw new AppError('Product not found', 404)

    const transfer = data.type === 'transfer'
    const inventory = data.type === 'inventory'
    const adjustment = data.type === 'adjustment'
    const increasesStock =
      data.type === 'entry' || (adjustment && data.adjustmentDirection === 'increase')
    const decreasesStock =
      data.type === 'exit' || data.type === 'loss' || (adjustment && data.adjustmentDirection === 'decrease')
    const targetStock = inventory ? data.quantity : undefined
    const stockDelta = inventory
      ? data.quantity - product.currentStock
      : increasesStock
        ? data.quantity
        : decreasesStock
          ? -data.quantity
          : 0

    if (transfer && (!data.fromAddressId || !data.toAddressId)) {
      throw new AppError('Transfers require source and destination addresses', 400)
    }
    if (product.warehouseAddresses.length > 0) {
      const addressMovementRequiresSource = decreasesStock || transfer || inventory
      const addressMovementRequiresDestination = increasesStock || transfer
      if (addressMovementRequiresSource && !data.fromAddressId) {
        throw new AppError('A source address is required for this product movement', 400)
      }
      if (addressMovementRequiresDestination && !data.toAddressId) {
        throw new AppError('A destination address is required for this product movement', 400)
      }
      if (inventory && product.warehouseAddresses.length !== 1) {
        throw new AppError('Inventory counts for products in multiple addresses must be recorded as adjustments', 400)
      }
    }

    let lotNumber = data.lotNumber
    const sourceAddress = data.fromAddressId
      ? await tx.warehouseAddress.findUnique({ where: { id: data.fromAddressId } })
      : null
    const destinationAddress = data.toAddressId
      ? await tx.warehouseAddress.findUnique({ where: { id: data.toAddressId } })
      : null
    if (transfer && !sourceAddress) throw new AppError('Source address not found', 404)
    if (transfer && !destinationAddress) throw new AppError('Destination address not found', 404)
    if (transfer && sourceAddress?.lotNumber) {
      if (lotNumber && lotNumber !== sourceAddress.lotNumber) {
        throw new AppError('The selected lot does not match the source address', 400)
      }
      lotNumber = sourceAddress.lotNumber
    }

    if (product.lots.length > 0 && !lotNumber) {
      throw new AppError('A lot number is required for products tracked by lot', 400)
    }
    if (inventory && product.lots.length > 1) {
      throw new AppError('Inventory counts for products in multiple lots must be recorded as adjustments', 400)
    }
    let lot = lotNumber ? await tx.lot.findUnique({ where: { lotNumber } }) : null
    if (lot && lot.productId !== product.id) {
      throw new AppError('Lot does not belong to this product', 400)
    }
    if (lotNumber && !lot && !increasesStock) {
      throw new AppError('Lot not found', 404)
    }
    if (lotNumber && !lot && increasesStock) {
      if (
        !data.supplierId ||
        !data.manufacturingDate ||
        !data.expirationDate ||
        !destinationAddress
      ) {
        throw new AppError(
          'Creating a lot through a movement requires supplier, manufacturing/expiration dates, and destination address',
          400,
        )
      }
    }
    if (transfer && lot && lot.quantity !== data.quantity) {
      throw new AppError('A lot can only be transferred as a whole because it has a single address', 400)
    }
    if (transfer && lot && sourceAddress && lot.address !== sourceAddress.code) {
      throw new AppError('Lot address does not match the source address', 400)
    }
    if (lot && increasesStock && destinationAddress && lot.address !== destinationAddress.code) {
      throw new AppError('A lot cannot occupy multiple addresses; use a transfer to relocate it', 400)
    }
    if (lot && decreasesStock && sourceAddress && lot.address !== sourceAddress.code) {
      throw new AppError('Lot address does not match the source address', 400)
    }
    if (lotNumber && increasesStock && !destinationAddress) {
      throw new AppError('A destination address is required for lot-tracked entries and adjustments', 400)
    }
    if (lotNumber && (decreasesStock || inventory) && !sourceAddress) {
      throw new AppError('A source address is required for lot-tracked stock reductions and inventory counts', 400)
    }

    if (increasesStock && data.toAddressId) {
      await changeAddressQuantity(
        tx,
        data.toAddressId,
        product.id,
        lotNumber,
        data.quantity,
      )
    } else if (decreasesStock && data.fromAddressId) {
      await changeAddressQuantity(
        tx,
        data.fromAddressId,
        product.id,
        lotNumber,
        -data.quantity,
      )
    } else if (transfer) {
      await changeAddressQuantity(tx, data.fromAddressId!, product.id, lotNumber, -data.quantity)
      await changeAddressQuantity(tx, data.toAddressId!, product.id, lotNumber, data.quantity)
    } else if (inventory && data.fromAddressId) {
      await setAddressQuantity(tx, data.fromAddressId, product.id, lotNumber, data.quantity)
    }

    if (lot && !transfer && lotNumber) {
      if (inventory) {
        await setLotQuantity(tx, lot.id, lot.quantity, data.quantity)
      } else if (stockDelta !== 0) {
        await changeLotQuantity(tx, lot.id, lot.quantity, stockDelta)
      }
    } else if (lotNumber && !lot && increasesStock && destinationAddress) {
      lot = await tx.lot.create({
        data: {
          lotNumber,
          productId: product.id,
          supplierId: data.supplierId!,
          quantity: data.quantity,
          manufacturingDate: new Date(data.manufacturingDate!),
          expirationDate: new Date(data.expirationDate!),
          address: destinationAddress.code,
        },
      })
    } else if (transfer && lot && destinationAddress) {
      const updated = await tx.lot.updateMany({
        where: { id: lot.id, quantity: lot.quantity, address: sourceAddress!.code },
        data: { address: destinationAddress.code },
      })
      if (updated.count === 0) {
        throw new AppError('Lot location changed concurrently; retry the transfer', 409)
      }
    }

    if (stockDelta !== 0 || inventory) {
      if (inventory) {
        const updated = await tx.product.updateMany({
          where: { id: product.id, currentStock: product.currentStock },
          data: { currentStock: targetStock! },
        })
        if (updated.count === 0) {
          throw new AppError('Stock changed while inventory was being recorded; retry the operation', 409)
        }
      } else if (stockDelta > 0) {
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: { increment: stockDelta } },
        })
      } else {
        const updated = await tx.product.updateMany({
          where: { id: product.id, currentStock: { gte: -stockDelta } },
          data: { currentStock: { decrement: -stockDelta } },
        })
        if (updated.count === 0) {
          const current = await tx.product.findUnique({
            where: { id: product.id },
            select: { currentStock: true },
          })
          throw new AppError(
            `Insufficient stock. Available: ${current?.currentStock ?? 0}, Requested: ${-stockDelta}`,
            400,
          )
        }
      }
    }

    return tx.movement.create({
      data: {
        type: data.type,
        productId: data.productId,
        quantity: data.quantity,
        unitCost: data.unitCost ?? 0,
        totalValue: data.quantity * (data.unitCost ?? 0),
        invoiceNumber: data.invoiceNumber,
        lotNumber,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        exitReason: data.exitReason,
        notes: data.notes,
        supplierId: data.supplierId,
        customerId: data.customerId,
        customerName: data.customerName,
        fromAddressId: data.fromAddressId,
        toAddressId: data.toAddressId,
        userId,
      },
      include: INCLUDE,
    })
  })
}

async function changeAddressQuantity(
  tx: Prisma.TransactionClient,
  addressId: string,
  productId: string,
  lotNumber: string | undefined,
  delta: number,
) {
  const address = await tx.warehouseAddress.findUnique({ where: { id: addressId } })
  if (!address) throw new AppError('Address not found', 404)
  if (delta > 0) {
    if (address.status === 'blocked' || address.status === 'reserved') {
      throw new AppError('Cannot place stock in a blocked or reserved address', 400)
    }
    if (address.productId && address.productId !== productId) {
      throw new AppError('Address already contains a different product', 400)
    }
    if (address.lotNumber && lotNumber && address.lotNumber !== lotNumber) {
      throw new AppError('Address already contains a different lot', 400)
    }
  } else if (
    address.status !== 'occupied' ||
    address.productId !== productId ||
    (lotNumber && address.lotNumber !== lotNumber) ||
    (address.quantity ?? 0) < -delta
  ) {
    throw new AppError('Insufficient stock at the source address', 400)
  }

  const currentQuantity = address.quantity ?? 0
  const nextQuantity = currentQuantity + delta
  const changed = await tx.warehouseAddress.updateMany({
    where: {
      id: addressId,
      quantity: address.quantity,
      productId: address.productId,
      lotNumber: address.lotNumber,
      status: address.status,
    },
    data: {
      quantity: nextQuantity,
      status: nextQuantity > 0 ? 'occupied' : 'free',
      productId: nextQuantity > 0 ? productId : null,
      lotNumber: nextQuantity > 0 ? lotNumber ?? address.lotNumber : null,
    },
  })
  if (changed.count === 0) {
    throw new AppError('Address stock changed concurrently; retry the movement', 409)
  }
}

async function setAddressQuantity(
  tx: Prisma.TransactionClient,
  addressId: string,
  productId: string,
  lotNumber: string | undefined,
  quantity: number,
) {
  const address = await tx.warehouseAddress.findUnique({ where: { id: addressId } })
  if (!address) throw new AppError('Address not found', 404)
  if (address.status === 'blocked' || address.status === 'reserved' || address.productId !== productId) {
    throw new AppError('Inventory address does not contain this product or is unavailable', 400)
  }
  const changed = await tx.warehouseAddress.updateMany({
    where: {
      id: addressId,
      quantity: address.quantity,
      productId: address.productId,
      lotNumber: address.lotNumber,
      status: address.status,
    },
    data: {
      quantity,
      status: quantity > 0 ? 'occupied' : 'free',
      productId: quantity > 0 ? productId : null,
      lotNumber: quantity > 0 ? lotNumber ?? address.lotNumber : null,
    },
  })
  if (changed.count === 0) {
    throw new AppError('Address stock changed concurrently; retry the inventory count', 409)
  }
}

async function changeLotQuantity(
  tx: Prisma.TransactionClient,
  lotId: string,
  currentQuantity: number,
  delta: number,
) {
  const nextQuantity = currentQuantity + delta
  if (nextQuantity < 0) throw new AppError('Insufficient lot quantity', 400)
  const changed = await tx.lot.updateMany({
    where: { id: lotId, quantity: currentQuantity },
    data: { quantity: nextQuantity },
  })
  if (changed.count === 0) throw new AppError('Lot quantity changed concurrently; retry the movement', 409)
}

async function setLotQuantity(
  tx: Prisma.TransactionClient,
  lotId: string,
  currentQuantity: number,
  quantity: number,
) {
  const changed = await tx.lot.updateMany({
    where: { id: lotId, quantity: currentQuantity },
    data: { quantity },
  })
  if (changed.count === 0) throw new AppError('Lot quantity changed concurrently; retry the inventory count', 409)
}
