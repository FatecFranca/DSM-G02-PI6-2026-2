import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      message: 'Validation error',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'A record with these values already exists' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ message: 'A referenced record does not exist or is still in use' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Record not found' })
      return
    }
  }

  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2024')
  ) {
    console.error('Database unavailable:', err.message)
    res.status(503).json({ message: 'Database service is temporarily unavailable' })
    return
  }

  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
}
