import { prisma } from '../src/prisma/client'
import { getAllAlerts, markAlertAsRead } from '../src/services/alert.service'
import { deleteUsers } from './helpers'

/** O sino de alertas avisa quando o ajuste de estoque de um inventário falha ou fica com pendências. */
const EMAIL = 'test-alerts-inventory@example.com'
let userId = ''
const created: string[] = []

const makeInventory = (name: string, data: Record<string, unknown>) =>
  prisma.inventoryCount.create({
    data: { name, type: 'full', status: 'completed', startDate: new Date(), responsibleId: userId, ...data },
  }).then((inv) => { created.push(inv.id); return inv })

beforeAll(async () => {
  await prisma.$connect()
  userId = (await prisma.user.upsert({
    where: { email: EMAIL }, update: {},
    create: { name: 'Alerts Inv', email: EMAIL, password: 'x', role: 'admin', department: 'TI', status: 'active' },
  })).id
})

afterAll(async () => {
  await prisma.inventoryCount.deleteMany({ where: { id: { in: created } } })
  await deleteUsers({ where: { email: EMAIL } })
  await prisma.$disconnect()
})

const inventoryAlerts = async () => (await getAllAlerts(userId)).alerts.filter((a) => a.category === 'inventory')

describe('alertas de inventário no sino', () => {
  it('ajuste falhou → alerta crítico; com pendências → alerta de atenção; concluído/em andamento → nada', async () => {
    const failed = await makeInventory('Inv falhou', { jobStatus: 'failed', jobError: 'Falha após 3 tentativas: banco fora do ar' })
    const partial = await makeInventory('Inv parcial', { jobStatus: 'partial', adjustedItems: 4, failedItems: 2 })
    await makeInventory('Inv ok', { jobStatus: 'completed', adjustedItems: 6 })
    await makeInventory('Inv andando', { jobStatus: 'processing' })
    await makeInventory('Inv antigo', {}) // sem job (anterior ao recurso)

    const alerts = await inventoryAlerts()
    expect(alerts).toHaveLength(2)

    const f = alerts.find((a) => a.id.startsWith(`inventory-job-${failed.id}-failed`))!
    expect(f).toMatchObject({ type: 'critical', category: 'inventory', read: false })
    expect(f.title).toContain('Ajuste de estoque falhou: Inv falhou')
    expect(f.desc).toContain('banco fora do ar')

    const p = alerts.find((a) => a.id.startsWith(`inventory-job-${partial.id}-partial`))!
    expect(p).toMatchObject({ type: 'warning', category: 'inventory' })
    expect(p.desc).toContain('2 item(ns)')
    expect(p.desc).toContain('4 já ajustados')
  })

  it('marcar como lido persiste por usuário e conta nos não lidos', async () => {
    const before = await getAllAlerts(userId)
    const target = before.alerts.find((a) => a.category === 'inventory')!
    await markAlertAsRead(userId, target.id)

    const after = await getAllAlerts(userId)
    expect(after.alerts.find((a) => a.id === target.id)?.read).toBe(true)
    expect(after.unread).toBe(before.unread - 1)
  })

  it('quando o estado muda (falhou → parcial), a chave muda e o aviso volta como não lido', async () => {
    const inv = await makeInventory('Inv muda', { jobStatus: 'failed', jobError: 'x' })
    const failedAlert = (await inventoryAlerts()).find((a) => a.id.includes(inv.id))!
    await markAlertAsRead(userId, failedAlert.id)

    await prisma.inventoryCount.update({ where: { id: inv.id }, data: { jobStatus: 'partial', failedItems: 1 } })
    const now = (await inventoryAlerts()).filter((a) => a.id.includes(inv.id))
    expect(now).toHaveLength(1)
    expect(now[0].id).not.toBe(failedAlert.id)
    expect(now[0].read).toBe(false)
  })
})
