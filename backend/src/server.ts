import app from './app'
import { prisma } from './prisma/client'

const PORT = Number(process.env.PORT) || 3001

async function main() {
  try {
    await prisma.$connect()
    console.log('Database connected')
  } catch (err) {
    console.error('Database unavailable, starting server without a database connection:')
    console.error(err instanceof Error ? err.message : err)
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`Swagger docs at http://localhost:${PORT}/docs`)
  })
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
