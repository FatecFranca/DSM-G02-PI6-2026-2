import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/prisma/client'
import * as queue from '../src/services/queue.service'
import { processInventoryJob } from '../src/services/inventory-processing.service'
import { startInventoryWorker } from '../src/workers/inventory.worker'
import { deleteUsers } from './helpers'

/**
 * Fluxo completo com banco real: concluir o inventário → mensagem na fila → worker ajusta o estoque.
 * (Fila local em memória; o driver SQS é coberto por queue-sqs-integration.test.ts.)
 */
const EMAIL = 'test-admin-inventory-async@example.com'
const SKU = 'JEST-INVQ'

let token = ''
let adminId = ''
let inventoryId = ''
const productIds: Record<string, string> = {}

const auth = () => ({ Authorization: `Bearer ${token}` })
const stock = async (key: string) => (await prisma.product.findUniqueOrThrow({ where: { id: productIds[key] } })).currentStock
const job = async () => prisma.inventoryCount.findUniqueOrThrow({ where: { id: inventoryId } })

async function runWorkerUntilSettled() {
  const worker = startInventoryWorker()
  try {
    const started = Date.now()
    for (;;) {
      const { jobStatus } = await job()
      if (jobStatus !== 'pending' && jobStatus !== 'processing') return
      if (Date.now() - started > 10_000) throw new Error(`worker não concluiu (jobStatus=${jobStatus})`)
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  } finally {
    await worker.stop()
  }
}

beforeAll(async () => {
  process.env.QUEUE_DRIVER = 'local'
  queue.resetQueueForTests()
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
  await prisma.$connect()

  const admin = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: {
      name: 'Admin Inventory Async',
      email: EMAIL,
      password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      role: 'admin',
      department: 'TI',
      status: 'active',
    },
  })
  adminId = admin.id
  token = (await request(app).post('/api/auth/login').send({ email: EMAIL, password: 'password' })).body.token

  const category = await prisma.category.create({ data: { name: 'Cat Inv Async', slug: 'cat-inv-async', color: '#000000' } })
  const brand = await prisma.brand.create({ data: { name: 'Brand Inv Async', slug: 'brand-inv-async' } })
  const supplier = await prisma.supplier.create({
    data: { name: 'Sup Inv Async', tradeName: 'SIA', cnpj: '98.765.432/0001-10', email: 's@t.com', phone: '1', contactName: 'C', category: 'X', city: 'SP', state: 'SP' },
  })

  const make = (key: string, currentStock: number) => prisma.product.create({
    data: {
      name: `Produto ${key}`, internalCode: `${SKU}-${key}`, sku: `${SKU}-${key}`, barcode: `${SKU}${key}`,
      unit: 'UN', purchasePrice: 1, salePrice: 2, currentStock,
      categoryId: category.id, brandId: brand.id, supplierId: supplier.id,
    },
  }).then((p) => { productIds[key] = p.id })

  await make('A', 10) // contado 7  → ajuste -3
  await make('B', 5)  // contado 9  → ajuste +4
  await make('C', 8)  // contado 6  → 2 endereços: ajuste manual
  await make('D', 4)  // contado 4  → sem divergência
  const address = (code: string, quantity: number) => prisma.warehouseAddress.create({
    data: { code, aisle: 'Z', street: '1', shelf: '1', level: '1', position: code, capacity: 100, occupied: quantity, status: 'occupied', quantity, productId: productIds.C },
  })
  await address('JEST-INVQ-1', 5)
  await address('JEST-INVQ-2', 3)
})

afterAll(async () => {
  jest.restoreAllMocks()
  await prisma.inventoryCount.deleteMany({ where: { name: 'Inventário Async Jest' } })
  await prisma.warehouseAddress.deleteMany({ where: { code: { startsWith: 'JEST-INVQ' } } })
  const ids = Object.values(productIds)
  await prisma.movement.deleteMany({ where: { productId: { in: ids } } })
  await prisma.product.deleteMany({ where: { id: { in: ids } } })
  await prisma.supplier.deleteMany({ where: { cnpj: '98.765.432/0001-10' } })
  await prisma.brand.deleteMany({ where: { slug: 'brand-inv-async' } })
  await prisma.category.deleteMany({ where: { slug: 'cat-inv-async' } })
  await deleteUsers({ where: { email: EMAIL } })
  await prisma.$disconnect()
})

describe('inventário com ajuste de estoque assíncrono', () => {
  it('conclui o inventário respondendo na hora, sem tocar no estoque (o ajuste vai para a fila)', async () => {
    const created = await request(app).post('/api/inventory').set(auth()).send({
      name: 'Inventário Async Jest', type: 'partial', startDate: new Date().toISOString(), responsibleId: adminId,
      productIds: Object.values(productIds),
    })
    expect(created.status).toBe(201)
    inventoryId = created.body.id

    expect((await request(app).patch(`/api/inventory/${inventoryId}`).set(auth()).send({ status: 'in_progress' })).status).toBe(200)

    const items = (await request(app).get(`/api/inventory/${inventoryId}`).set(auth())).body.items as Array<{ id: string; product: { id: string } }>
    const counted: Record<string, number> = { A: 7, B: 9, C: 6, D: 4 }
    for (const [key, qty] of Object.entries(counted)) {
      const item = items.find((i) => i.product.id === productIds[key])!
      const res = await request(app).post(`/api/inventory/${inventoryId}/items/${item.id}/count`).set(auth()).send({ countedQuantity: qty })
      expect(res.status).toBe(200)
    }

    expect((await request(app).patch(`/api/inventory/${inventoryId}`).set(auth()).send({ status: 'review' })).status).toBe(200)
    const done = await request(app).patch(`/api/inventory/${inventoryId}`).set(auth()).send({ status: 'completed' })

    expect(done.status).toBe(200)
    expect(done.body).toMatchObject({ status: 'completed', jobStatus: 'pending', adjustedItems: 0, failedItems: 0, divergences: 3 })
    expect(await stock('A')).toBe(10) // ainda não ajustado
    expect(queue.localQueueState().waiting).toBe(1)
  })

  it('o worker consome a mensagem, ajusta o estoque e deixa o produto de vários endereços como pendência manual', async () => {
    await runWorkerUntilSettled()

    expect(await stock('A')).toBe(7)
    expect(await stock('B')).toBe(9)
    expect(await stock('C')).toBe(8) // intacto: 2 endereços exigem ajuste manual
    expect(await stock('D')).toBe(4)

    expect(await job()).toMatchObject({ jobStatus: 'partial', adjustedItems: 2, failedItems: 1 })
    expect((await job()).jobFinishedAt).not.toBeNull()

    const movements = await prisma.movement.findMany({ where: { productId: { in: Object.values(productIds) }, type: 'inventory' } })
    expect(movements).toHaveLength(2)
    expect(movements.every((m) => m.userId === adminId && (m.notes ?? '').includes('Inventário Async Jest'))).toBe(true)

    const items = await prisma.inventoryCountItem.findMany({ where: { inventoryCountId: inventoryId } })
    const byProduct = (key: string) => items.find((i) => i.productId === productIds[key])!
    expect(byProduct('A').adjustedAt).not.toBeNull()
    expect(byProduct('C').adjustedAt).toBeNull()
    expect(byProduct('C').adjustmentError).toContain('vários endereços')
    expect(byProduct('D').adjustedAt).toBeNull() // sem divergência: nada a ajustar
  })

  it('é idempotente: reprocessar não duplica ajustes já feitos', async () => {
    await prisma.inventoryCount.update({ where: { id: inventoryId }, data: { jobStatus: 'pending' } }) // simula reentrega da mesma mensagem
    await processInventoryJob(inventoryId, adminId)

    expect(await prisma.movement.count({ where: { productId: { in: Object.values(productIds) }, type: 'inventory' } })).toBe(2)
    expect(await stock('A')).toBe(7)
    expect((await job()).jobStatus).toBe('partial')
  })

  it('reprocessar pela API depois de resolver a pendência conclui o job', async () => {
    // Resolve a pendência manual: o produto C passa a ter um único endereço.
    await prisma.warehouseAddress.updateMany({ where: { code: 'JEST-INVQ-2' }, data: { status: 'free', productId: null, quantity: 0, occupied: 0 } })
    await prisma.warehouseAddress.updateMany({ where: { code: 'JEST-INVQ-1' }, data: { quantity: 8, occupied: 8 } })

    const res = await request(app).post(`/api/inventory/${inventoryId}/reprocess`).set(auth())
    expect(res.status).toBe(200)
    expect(res.body.jobStatus).toBe('pending')

    await runWorkerUntilSettled()

    expect(await stock('C')).toBe(6)
    expect(await job()).toMatchObject({ jobStatus: 'completed', adjustedItems: 3, failedItems: 0, jobError: null })
    expect(await prisma.movement.count({ where: { productId: { in: Object.values(productIds) }, type: 'inventory' } })).toBe(3)

    // Concluído: não há mais o que reprocessar.
    expect((await request(app).post(`/api/inventory/${inventoryId}/reprocess`).set(auth())).status).toBe(409)
  })
})
