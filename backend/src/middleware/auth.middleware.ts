import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma/client'
import { AppError } from './error.middleware'

export interface JwtPayload {
  sub: string
  email: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError('Missing or invalid token', 401))
    return
  }

  const token = authHeader.slice(7)
  let payload: string | jwt.JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!)
  } catch {
    next(new AppError('Invalid or expired token', 401))
    return
  }

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string'
  ) {
    next(new AppError('Invalid or expired token', 401))
    return
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    })
    if (!user || user.status !== 'active') {
      next(new AppError('Account is not active', 401))
      return
    }
    if (user.role !== payload.role) {
      next(new AppError('Permissions changed; please sign in again', 401))
      return
    }

    req.user = { sub: user.id, email: user.email, role: user.role }
    next()
  } catch (err) {
    next(err)
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Unauthorized', 401))
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: insufficient permissions', 403))
    }
    next()
  }
}

export function authorizeUserRoleChange(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError('Unauthorized', 401))
    if (req.user.role === 'admin') return next()

    const requestedRole = req.body?.role
    if (requestedRole !== undefined && !allowedRoles.includes(requestedRole)) {
      return next(new AppError('Forbidden: insufficient permissions to assign this role', 403))
    }
    next()
  }
}

/** Only admins may modify admin accounts (supervisors manage everyone else). */
export async function protectAdminAccounts(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) return next(new AppError('Unauthorized', 401))
  if (req.user.role === 'admin') return next()
  try {
    const target = await prisma.user.findUnique({ where: { id: req.params.id as string }, select: { role: true } })
    if (target?.role === 'admin') {
      return next(new AppError('Forbidden: only admins can modify admin accounts', 403))
    }
    next()
  } catch (err) {
    next(err)
  }
}
