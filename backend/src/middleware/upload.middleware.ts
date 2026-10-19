import { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { AppError } from './error.middleware'
import { IMAGE_MIME_TYPES, maxImageBytes } from '../services/storage.service'

/**
 * Recebe uma única imagem no campo multipart `image`, mantida em memória (limite de tamanho em STORAGE_MAX_IMAGE_MB).
 * Aqui só se filtra o tipo declarado pelo cliente; a checagem real (magic bytes) é feita no serviço, que é quem grava.
 */
export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  const limit = maxImageBytes()
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limit, files: 1, fields: 0 },
    fileFilter: (_req, file, cb) => {
      if ((IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) cb(null, true)
      else cb(new AppError('Only JPEG, PNG, WebP or GIF images are allowed', 415))
    },
  }).single('image')

  parser(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(`Image must be at most ${Math.round(limit / 1024 / 1024)} MB`, 413))
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Send exactly one file in the "image" field', 400))
      }
      return next(new AppError(`Invalid upload: ${err.message}`, 400))
    }
    if (err) return next(err)
    if (!req.file) return next(new AppError('No image sent (multipart field "image")', 400))
    next()
  })
}
