import 'dotenv/config'
import { prisma } from './prisma/client'
import { startInventoryWorker } from './workers/inventory.worker'

/**
 * Processo dedicado ao consumo das filas (`npm run worker`). Em produção, rode-o separado da API e
 * defina QUEUE_WORKER=off nela: o processamento pesado não compete com as requisições HTTP.
 */
async function main() {
  await prisma.$connect()
  const worker = startInventoryWorker()

  const shutdown = async (signal: string) => {
    console.log(`${signal} recebido, encerrando o worker...`)
    await worker.stop()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('Fatal error:', err)
  void prisma.$disconnect()
  process.exit(1)
})
