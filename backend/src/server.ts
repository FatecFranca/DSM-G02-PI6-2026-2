import app from './app'
import { prisma } from './prisma/client'
import { getQueueConfig } from './services/queue.service'
import { startInventoryWorker } from './workers/inventory.worker'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  await prisma.$connect()
  console.log('Database connected')

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Swagger docs at http://localhost:${PORT}/docs`)
  })

  // Por padrão a própria API consome a fila (prático em desenvolvimento). Em produção, use `npm run worker`
  // em outro processo e QUEUE_WORKER=off aqui.
  const worker = getQueueConfig().worker === 'embedded' ? startInventoryWorker() : null
  const shutdown = () => {
    server.close()
    void (worker?.stop() ?? Promise.resolve()).finally(() => process.exit(0))
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  void prisma.$disconnect()
  process.exit(1)
})
