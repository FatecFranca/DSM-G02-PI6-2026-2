const syncLotStatuses = jest.fn()
jest.mock('../src/services/lot.service', () => ({ syncLotStatuses: (...a: unknown[]) => syncLotStatuses(...a) }))

import { startLotStatusJob } from '../src/jobs/lot-status.job'

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

beforeEach(() => {
  jest.useFakeTimers()
  syncLotStatuses.mockReset()
  syncLotStatuses.mockResolvedValue({ expired: 0, expiring: 0, valid: 0 })
  delete process.env.LOT_STATUS_JOB
  delete process.env.LOT_STATUS_INTERVAL_MINUTES
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks() })

describe('lot status job', () => {
  it('roda ao iniciar e a cada intervalo (60 min por padrão)', async () => {
    const job = startLotStatusJob()
    await flush()
    expect(syncLotStatuses).toHaveBeenCalledTimes(1)

    await jest.advanceTimersByTimeAsync(59 * 60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(2)
    job.stop()
  })

  it('respeita LOT_STATUS_INTERVAL_MINUTES', async () => {
    process.env.LOT_STATUS_INTERVAL_MINUTES = '5'
    const job = startLotStatusJob()
    await flush()
    await jest.advanceTimersByTimeAsync(5 * 60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(2)
    job.stop()
  })

  it('para de executar depois de stop()', async () => {
    const job = startLotStatusJob()
    await flush()
    job.stop()
    await jest.advanceTimersByTimeAsync(3 * 60 * 60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(1)
  })

  it('LOT_STATUS_JOB=off não executa nada', async () => {
    process.env.LOT_STATUS_JOB = 'off'
    startLotStatusJob()
    await jest.advanceTimersByTimeAsync(2 * 60 * 60_000)
    expect(syncLotStatuses).not.toHaveBeenCalled()
  })

  it('não deixa uma falha derrubar o job: registra e tenta de novo no próximo ciclo', async () => {
    syncLotStatuses.mockRejectedValueOnce(new Error('banco fora do ar'))
    const job = startLotStatusJob()
    await flush()
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('[lot-status]'), 'banco fora do ar')
    await jest.advanceTimersByTimeAsync(60 * 60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(2)
    job.stop()
  })

  it('não sobrepõe execuções lentas', async () => {
    let finish: () => void = () => undefined
    syncLotStatuses.mockImplementation(() => new Promise((resolve) => { finish = () => resolve({ expired: 1, expiring: 0, valid: 0 }) }))
    const job = startLotStatusJob()
    await flush()
    await jest.advanceTimersByTimeAsync(60 * 60_000) // ainda na primeira execução
    expect(syncLotStatuses).toHaveBeenCalledTimes(1)
    finish()
    await flush()
    await jest.advanceTimersByTimeAsync(60 * 60_000)
    expect(syncLotStatuses).toHaveBeenCalledTimes(2)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('1 vencido'))
    job.stop()
  })
})
