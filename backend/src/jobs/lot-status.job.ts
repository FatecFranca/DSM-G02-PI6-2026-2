import { syncLotStatuses } from '../services/lot.service'

/**
 * Job periódico que mantém o status dos lotes (`valid`, `expiring`, `expired`) em dia com a data de validade.
 *
 * Sem ele o status só era corrigido quando alguém consultava lotes ou o dashboard; agora ele é atualizado em segundo
 * plano ao subir a API/worker e a cada `LOT_STATUS_INTERVAL_MINUTES` (padrão 60). É idempotente, então várias
 * instâncias rodando ao mesmo tempo não causam problema. `quarantine` é manual e nunca é alterado.
 *
 * Desligue com `LOT_STATUS_JOB=off`.
 */

export interface LotStatusJob {
  stop: () => void
}

const intervalMs = (): number => {
  const minutes = Number(process.env.LOT_STATUS_INTERVAL_MINUTES)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60_000
}

export function startLotStatusJob(): LotStatusJob {
  if (process.env.LOT_STATUS_JOB === 'off') return { stop: () => undefined }

  let running = false
  const tick = async () => {
    if (running) return // uma execução lenta não se sobrepõe à próxima
    running = true
    try {
      const changed = await syncLotStatuses()
      const total = changed.expired + changed.expiring + changed.valid
      if (total > 0) {
        console.log(`[lot-status] ${changed.expired} vencido(s), ${changed.expiring} a vencer, ${changed.valid} voltaram a válido`)
      }
    } catch (err) {
      console.error('[lot-status] falha ao atualizar status dos lotes:', err instanceof Error ? err.message : err)
    } finally {
      running = false
    }
  }

  void tick()
  const timer = setInterval(() => void tick(), intervalMs())
  timer.unref() // não impede o processo de encerrar
  return { stop: () => clearInterval(timer) }
}
