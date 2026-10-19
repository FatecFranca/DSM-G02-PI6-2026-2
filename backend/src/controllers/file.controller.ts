import { Request, Response, NextFunction } from 'express'
import { getStorageConfig, readLocalObject, verifyLocalSignature } from '../services/storage.service'

/**
 * @swagger
 * /api/files/*:
 *   get:
 *     summary: Download a stored file (local storage driver only)
 *     description: >
 *       Serve arquivos do driver `local` (desenvolvimento) por URL assinada com validade (`exp`, `sig`).
 *       Com STORAGE_DRIVER=s3 as fotos são servidas direto pelo S3 e esta rota responde 404.
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: exp
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: sig
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: File content
 *       403:
 *         description: Invalid or expired link
 *       404:
 *         description: File not found
 */
export async function serve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cfg = getStorageConfig()
    if (cfg.driver !== 'local') {
      res.status(404).json({ message: 'File not found' })
      return
    }
    const key = String((req.params as Record<string, string>)[0] ?? '')
    if (!verifyLocalSignature(key, Number(req.query.exp), String(req.query.sig ?? ''))) {
      res.status(403).json({ message: 'Invalid or expired link' })
      return
    }
    const file = await readLocalObject(key)
    if (!file) {
      res.status(404).json({ message: 'File not found' })
      return
    }
    res.set({
      'Content-Type': file.contentType,
      'Cache-Control': 'private, max-age=300',
      // A imagem é carregada pelo frontend em outra origem; o helmet bloquearia por padrão.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    })
    res.send(file.body)
  } catch (err) {
    next(err)
  }
}
