import { Request, Response, NextFunction } from 'express'
import { prisma } from '../prisma/client'

const MODEL_BY_ENTITY: Record<string, string> = {
  Product: 'product',
  Category: 'category',
  Brand: 'brand',
  Supplier: 'supplier',
  Customer: 'customer',
  User: 'user',
  Lot: 'lot',
  WarehouseAddress: 'warehouseAddress',
  InventoryCount: 'inventoryCount',
  InventoryCountItem: 'inventoryCountItem',
}

const SENSITIVE_FIELDS = ['password']

function sanitize(value: unknown): object | undefined {
  if (!value || typeof value !== 'object') return undefined
  const copy = JSON.parse(JSON.stringify(value)) as Record<string, unknown>
  for (const field of SENSITIVE_FIELDS) delete copy[field]
  return copy
}

/** Reads the record as it was before an UPDATE/DELETE handler changes it. */
async function loadBefore(entity: string, action: string, id: unknown): Promise<object | undefined> {
  const model = MODEL_BY_ENTITY[entity]
  const itemId = typeof id === 'string' ? id : undefined
  if (!model || !itemId || action === 'CREATE') return undefined
  try {
    const delegate = (prisma as unknown as Record<string, { findUnique: (a: unknown) => Promise<unknown> }>)[model]
    return sanitize(await delegate.findUnique({ where: { id: itemId } }))
  } catch {
    return undefined
  }
}

export function audit(entity: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Captured before the handler runs; resolved when the response is audited.
    const beforePromise = loadBefore(entity, action, req.params.itemId ?? req.params.id)
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
      const newValue = sanitize(responseBody)

      const userId = req.user.sub
      const ip = req.ip ?? 'unknown'

      void beforePromise
        .then((oldValue) => prisma.auditLog.create({
          data: {
            action,
            entity,
            entityId,
            entityName: nameFromBefore(entityName, entityId, oldValue),
            oldValue,
            newValue,
            ip,
            userId,
          },
        }))
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

/** For deletes the response is empty, so fall back to the name of the removed record. */
function nameFromBefore(current: string, entityId: string, before?: object): string {
  if (current !== entityId || !before) return current
  const record = before as Record<string, unknown>
  const candidate = record.name ?? record.tradeName ?? record.internalCode ?? record.code ?? record.lotNumber
  return typeof candidate === 'string' ? candidate : current
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
