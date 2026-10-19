import { Request, Response, NextFunction } from 'express'
import * as visionService from '../services/vision.service'

/**
 * @swagger
 * /api/ai/identify-product:
 *   post:
 *     summary: Identify a product from a photo (OpenAI vision)
 *     description: >
 *       Envia a foto (multipart/form-data, campo `image`; JPEG, PNG, WebP ou GIF até STORAGE_MAX_IMAGE_MB) a um modelo de
 *       visão e devolve nome, categoria, marca e descrição sugeridos — já casados com as categorias/marcas do catálogo —
 *       além de produtos parecidos já cadastrados. Exige `OPENAI_API_KEY` no servidor. Limitada a 30 chamadas por 10 minutos por IP.
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Identification result
 *       400:
 *         description: No file sent
 *       413:
 *         description: Image too large
 *       415:
 *         description: Not a supported image
 *       429:
 *         description: Rate limit (this API or the AI provider)
 *       502:
 *         description: AI provider failed or answered unexpectedly
 *       503:
 *         description: AI not configured or the key was rejected
 */
export async function identifyProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await visionService.identifyProduct(req.file!.buffer))
  } catch (err) {
    next(err)
  }
}
