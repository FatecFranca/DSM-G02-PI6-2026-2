import { Request, Response, NextFunction } from 'express'
import * as simulationService from '../services/simulation.service'

/**
 * @swagger
 * /api/simulation/status:
 *   get:
 *     summary: Status of the sales simulation service
 *     description: Informa se o serviço Python dos modelos do notebook está fora do ar, treinando ou pronto. Nunca retorna erro de serviço indisponível.
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: Service status
 */
export async function status(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await simulationService.getStatus())
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/simulation/model:
 *   get:
 *     summary: Models, metrics and options of the sales simulation
 *     description: >
 *       Modelos de regressão do notebook (Regressão Linear e Random Forest, com SelectKBest e RFE) e um modelo complementar,
 *       com R², MAE e RMSE no conjunto de teste, atributos selecionados, importâncias, lojas, famílias e faixas de promoção.
 *     tags: [Simulation]
 *     responses:
 *       200:
 *         description: Model information
 *       503:
 *         description: Simulation service offline or still training
 */
export async function model(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await simulationService.getModelInfo())
  } catch (err) {
    next(err)
  }
}

/**
 * @swagger
 * /api/simulation/predict:
 *   post:
 *     summary: Predict daily sales for what-if scenarios
 *     description: >
 *       Cada cenário (loja, família, data, itens em promoção, petróleo) devolve a venda diária prevista por modelo, em unidades.
 *       Os modelos do notebook usam loja, família e faixa de promoção; só o modelo complementar `rf_full` varia com a data e o petróleo.
 *     tags: [Simulation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scenarios]
 *             properties:
 *               scenarios:
 *                 type: array
 *                 maxItems: 400
 *                 items:
 *                   type: object
 *                   required: [store, family, date]
 *                   properties:
 *                     store: { type: integer, example: 1 }
 *                     family: { type: string, example: GROCERY I }
 *                     date: { type: string, example: '2017-08-20' }
 *                     onpromotion: { type: integer, example: 4 }
 *                     oil: { type: number, example: 47.2 }
 *               models: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: One prediction object (model id → units) per scenario, in order
 *       503:
 *         description: Simulation service offline or still training
 */
export async function predict(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json(await simulationService.predict(req.body))
  } catch (err) {
    next(err)
  }
}
