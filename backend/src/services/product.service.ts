import { Prisma } from '@prisma/client'
import { prisma } from '../prisma/client'
import { AppError } from '../middleware/error.middleware'
import { CreateProductInput, ProductQuery, UpdateProductInput } from '../schemas/product.schema'

function stockStatus(current: number, min: number): string {
  if (current === 0) return 'out'
  if (current <= min * 0.5) return 'critical'
  if (current <= min) return 'low'
  return 'ok'
}

const INCLUDE = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
}

function mapProduct<T extends { purchasePrice: Prisma.Decimal | number; salePrice: Prisma.Decimal | number }>(product: T) {
  return {
    ...product,
    purchasePrice: Number(product.purchasePrice),
    salePrice: Number(product.salePrice),
  }
}

export async function findAll(query: ProductQuery) {
  const { page, limit, search, categoryId, brandId, status, stockStatus: ss } = query
  const skip = (page - 1) * limit

  if (ss) {
    const conditions: Prisma.Sql[] = []
    if (search) {
      conditions.push(Prisma.sql`(
        position(lower(${search}) in lower("name")) > 0 OR
        position(lower(${search}) in lower("internalCode")) > 0 OR
        position(lower(${search}) in lower("sku")) > 0 OR
        position(lower(${search}) in lower("barcode")) > 0
      )`)
    }
    if (categoryId) conditions.push(Prisma.sql`"categoryId" = ${categoryId}`)
    if (brandId) conditions.push(Prisma.sql`"brandId" = ${brandId}`)
    if (status) conditions.push(Prisma.sql`"status" = ${status}::"ProductStatus"`)
    if (ss === 'out') conditions.push(Prisma.sql`"currentStock" = 0`)
    if (ss === 'critical') {
      conditions.push(Prisma.sql`"currentStock" > 0 AND "minStock" > 0 AND "currentStock" * 2 <= "minStock"`)
    }
    if (ss === 'low') {
      conditions.push(Prisma.sql`"currentStock" > 0 AND "minStock" > 0 AND "currentStock" * 2 > "minStock" AND "currentStock" <= "minStock"`)
    }
    if (ss === 'ok') conditions.push(Prisma.sql`"currentStock" > "minStock"`)
    const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    const [matchingIds, [{ total }]] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "products"
        ${whereSql}
        ORDER BY "createdAt" DESC, "id" ASC
        LIMIT ${limit} OFFSET ${skip}
      `),
      prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS "total" FROM "products" ${whereSql}
      `),
    ])
    const products = matchingIds.length
      ? await prisma.product.findMany({
          where: { id: { in: matchingIds.map(({ id }) => id) } },
          include: INCLUDE,
        })
      : []
    const productsById = new Map(products.map((product) => [product.id, product]))
    const data = matchingIds.flatMap(({ id }) => {
      const product = productsById.get(id)
      return product
        ? [{ ...mapProduct(product), stockStatus: stockStatus(product.currentStock, product.minStock) }]
        : []
    })

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  const where: Record<string, unknown> = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { internalCode: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (categoryId) where.categoryId = categoryId
  if (brandId) where.brandId = brandId
  if (status) where.status = status

  const products = await prisma.product.findMany({
    where,
    skip,
    take: limit,
    include: INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  const total = await prisma.product.count({ where })

  const mapped = products.map((p) => ({
    ...mapProduct(p),
    stockStatus: stockStatus(p.currentStock, p.minStock),
  }))

  return { data: mapped, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function findById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      ...INCLUDE,
      warehouseAddresses: {
        where: { status: 'occupied' },
        select: { id: true, code: true, quantity: true, lotNumber: true },
      },
      lots: {
        where: { quantity: { gt: 0 }, status: { in: ['valid', 'expiring'] } },
        select: { id: true, lotNumber: true, quantity: true },
        orderBy: { expirationDate: 'asc' },
      },
    },
  })
  if (!product) throw new AppError('Product not found', 404)
  return { ...mapProduct(product), stockStatus: stockStatus(product.currentStock, product.minStock) }
}

export async function create(data: CreateProductInput) {
  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } })
  if (existingSku) throw new AppError('SKU already in use', 409)

  const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } })
  if (existingBarcode) throw new AppError('Barcode already in use', 409)

  const product = await prisma.product.create({
    data: {
      name: data.name,
      internalCode: data.internalCode,
      sku: data.sku,
      barcode: data.barcode,
      unit: data.unit,
      weight: data.weight ?? 0,
      width: data.width ?? 0,
      height: data.height ?? 0,
      depth: data.depth ?? 0,
      description: data.description,
      purchasePrice: data.purchasePrice,
      salePrice: data.salePrice,
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? 0,
      status: data.status ?? 'active',
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      brandId: data.brandId,
      supplierId: data.supplierId,
    },
    include: INCLUDE,
  })

  return { ...mapProduct(product), stockStatus: stockStatus(product.currentStock, product.minStock) }
}

export async function update(id: string, data: UpdateProductInput) {
  await findById(id)
  const product = await prisma.product.update({ where: { id }, data, include: INCLUDE })
  return { ...mapProduct(product), stockStatus: stockStatus(product.currentStock, product.minStock) }
}

export async function remove(id: string) {
  await findById(id)
  await prisma.product.delete({ where: { id } })
}

export async function findByCode(code: string) {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { barcode: code },
        { sku: code },
        { internalCode: code },
      ],
    },
    include: {
      ...INCLUDE,
      warehouseAddresses: {
        where: { status: 'occupied' },
        select: { id: true, code: true, quantity: true, lotNumber: true },
      },
      lots: {
        where: { status: { in: ['valid', 'expiring'] } },
        select: { id: true, lotNumber: true, quantity: true, expirationDate: true, status: true },
        orderBy: { expirationDate: 'asc' },
      },
    },
  })

  if (!product) throw new AppError('Product not found for this code', 404)
  return { ...product, stockStatus: stockStatus(product.currentStock, product.minStock) }
}
