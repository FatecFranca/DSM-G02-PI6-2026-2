import 'dotenv/config'
import { prisma } from '../src/prisma/client'
import {
  deleteObject,
  findOrphans,
  getStorageConfig,
  listObjects,
  productImagePrefix,
} from '../src/services/storage.service'

/**
 * Apaga do storage as fotos de produto que nenhum produto referencia (ex.: o processo caiu entre o upload e a gravação no banco).
 * Só considera objetos mais velhos que STORAGE_ORPHAN_GRACE_DAYS. Use --dry-run para apenas listar.
 *
 *   npm run storage:cleanup -- --dry-run
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const cfg = getStorageConfig()
  const prefix = productImagePrefix()

  const [objects, products] = await Promise.all([
    listObjects(prefix),
    prisma.product.findMany({ where: { imageKey: { not: null } }, select: { imageKey: true } }),
  ])
  const referenced = new Set(products.map((p) => p.imageKey as string))
  const orphans = findOrphans(objects, referenced, cfg.orphanGraceDays)

  console.log(`Driver: ${cfg.driver} · prefixo: ${prefix} · carência: ${cfg.orphanGraceDays} dia(s)`)
  console.log(`${objects.length} objeto(s) no storage, ${referenced.size} referenciado(s), ${orphans.length} órfão(s).`)

  for (const orphan of orphans) {
    console.log(`${dryRun ? '[dry-run] ' : ''}${orphan.key} (${orphan.lastModified.toISOString()})`)
    if (!dryRun) await deleteObject(orphan.key)
  }
  if (!dryRun && orphans.length) console.log('Órfãos removidos.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
