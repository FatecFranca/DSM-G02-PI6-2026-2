const processInventoryJob = jest.fn()
const markJobFailed = jest.fn()
jest.mock('../src/services/inventory-processing.service', () => ({
  ...jest.requireActual('../src/services/inventory-processing.service'),
  processInventoryJob: (...a: unknown[]) => processInventoryJob(...a),
  markJobFailed: (...a: unknown[]) => markJobFailed(...a),
}))
jest.mock('../src/prisma/client', () => ({ prisma: {} }))

import * as queue from '../src/services/queue.service'
import { handleMessage, startInventoryWorker } from '../src/workers/inventory.worker'

const body = JSON.stringify({ type: 'inventory.process', inventoryId: 'inv-1', requestedById: 'user-1' })
const message = (over: Record<string, unknown> = {}) => ({ id: 'm1', body, receiptHandle: 'rh1', receiveCount: 1, ...over })

beforeEach(() => {
  jest.clearAllMocks()
  queue.resetQueueForTests()
  process.env.QUEUE_DRIVER = 'local'
  process.env.QUEUE_MAX_RECEIVES = '3'
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
  markJobFailed.mockResolvedValue(undefined)
})
afterEach(() => jest.restoreAllMocks())

describe('handleMessage', () => {
  it('processa e apaga a mensagem', async () => {
    processInventoryJob.mockResolvedValue({ outcome: 'completed', adjusted: 3, failed: 0 })
    const del = jest.spyOn(queue, 'deleteMessage').mockResolvedValue()
    expect(await handleMessage(message())).toBe('done')
    expect(processInventoryJob).toHaveBeenCalledWith('inv-1', 'user-1')
    expect(del).toHaveBeenCalledWith('rh1')
  })

  it('descarta mensagem inválida sem processar (não trava a fila)', async () => {
    const del = jest.spyOn(queue, 'deleteMessage').mockResolvedValue()
    expect(await handleMessage(message({ body: '{"lixo":true}' }))).toBe('dropped')
    expect(await handleMessage(message({ body: 'não é json' }))).toBe('dropped')
    expect(processInventoryJob).not.toHaveBeenCalled()
    expect(del).toHaveBeenCalledTimes(2)
  })

  it('em caso de erro NÃO apaga a mensagem (volta para a fila) e ainda não marca falha', async () => {
    processInventoryJob.mockRejectedValue(new Error('banco fora do ar'))
    const del = jest.spyOn(queue, 'deleteMessage').mockResolvedValue()
    expect(await handleMessage(message({ receiveCount: 1 }), 3)).toBe('retry')
    expect(del).not.toHaveBeenCalled()
    expect(markJobFailed).not.toHaveBeenCalled()
  })

  it('na última tentativa marca o job como failed para o usuário ver', async () => {
    processInventoryJob.mockRejectedValue(new Error('banco fora do ar'))
    expect(await handleMessage(message({ receiveCount: 3 }), 3)).toBe('retry')
    expect(markJobFailed).toHaveBeenCalledWith('inv-1', expect.stringContaining('banco fora do ar'))
  })
})

describe('startInventoryWorker (fila local ponta a ponta)', () => {
  it('consome a mensagem publicada e para de forma limpa', async () => {
    processInventoryJob.mockResolvedValue({ outcome: 'completed', adjusted: 1, failed: 0 })
    const worker = startInventoryWorker()
    await queue.sendMessage({ type: 'inventory.process', inventoryId: 'inv-9', requestedById: 'user-9' })

    const started = Date.now()
    while (processInventoryJob.mock.calls.length === 0 && Date.now() - started < 4000) {
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    await worker.stop()

    expect(processInventoryJob).toHaveBeenCalledWith('inv-9', 'user-9')
    expect(queue.localQueueState()).toEqual({ waiting: 0, inFlight: 0, dead: 0 })
  })
})
