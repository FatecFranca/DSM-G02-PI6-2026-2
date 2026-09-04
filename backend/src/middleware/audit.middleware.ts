import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma/client'

export function audit(entity: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res)

    res.json = function (body: unknown) {
      if (req.user && res.statusCode < 300) {
        const entityId =
          (req.params.id as string) ?? (body as Record<string, string>)?.id ?? 'unknown'
        const entityName =
          (body as Record<string, string>)?.name ??
          (body as Record<string, string>)?.internalCode ??
          entityId

        prisma.auditLog
          .create({
            data: {
              action,
              entity,
              entityId,
              entityName,
              newValue: action !== 'DELETE' ? (body as object) : undefined,
              ip: req.ip ?? 'unknown',
              userId: req.user!.sub,
            },
          })
          .catch(console.error)
      }
      return originalJson(body)
    }

    next()
  }
}
