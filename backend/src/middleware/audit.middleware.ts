import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma/client'

export function audit(entity: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)
    let auditStarted = false

    const sendAudited = (body: unknown, send: () => Response): Response => {
      if (!req.user || res.statusCode >= 300 || auditStarted) return send()
      auditStarted = true

      const responseBody =
        typeof body === 'string'
          ? parseJson(body)
          : body && typeof body === 'object' && !Buffer.isBuffer(body)
            ? (body as Record<string, unknown>)
            : undefined
      const routeId = req.params.id
      const entityId =
        (typeof routeId === 'string' ? routeId : undefined) ??
        (typeof responseBody?.id === 'string' ? responseBody.id : 'unknown')
      const entityName =
        (typeof responseBody?.name === 'string' && responseBody.name) ||
        (typeof responseBody?.internalCode === 'string' && responseBody.internalCode) ||
        entityId
      const newValue = responseBody
        ? (JSON.parse(JSON.stringify(responseBody)) as object)
        : undefined

      void prisma.auditLog
        .create({
          data: {
            action,
            entity,
            entityId,
            entityName,
            newValue,
            ip: req.ip ?? 'unknown',
            userId: req.user.sub,
          },
        })
        .then(send)
        .catch(next)
      return res
    }

    res.json = function (body: unknown): Response {
      return sendAudited(body, () => originalJson(body))
    }
    res.send = function (body?: unknown): Response {
      return sendAudited(body, () => originalSend(body))
    }
    next()
  }
}

function parseJson(value: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}
