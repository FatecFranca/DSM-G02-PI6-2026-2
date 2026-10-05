import { Prisma } from '@prisma/client'
import { prisma } from '../src/prisma/client'

/**
 * Deletes test users together with the rows that reference them
 * (audit logs are written automatically by the API on every write).
 */
export async function deleteUsers(args: { where: Prisma.UserWhereInput }): Promise<void> {
  // Audit rows are written after the response is sent; let in-flight inserts land first.
  await new Promise((resolve) => setTimeout(resolve, 300))
  const users = await prisma.user.findMany({ where: args.where, select: { id: true } })
  const ids = users.map((u) => u.id)
  if (ids.length === 0) return
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } })
  await prisma.movement.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })
}
