import { AppError } from '../middleware/error.middleware'
import { PredictInput } from '../schemas/simulation.schema'

/**
 * Simulação de vendas: ponte para o serviço Python em /ml-service, que serve os modelos de regressão do notebook
 * (`machine-learning/Previsao_Vendas.ipynb`). O backend valida a entrada, exige autenticação e traduz as falhas do serviço
 * em erros HTTP claros; os modelos em si ficam no serviço.
 *
 * Variáveis: SALES_MODEL_URL (padrão http://localhost:8100) e SALES_MODEL_TIMEOUT_MS (padrão 20000).
 * Observação: é independente de ML_SERVICE_URL, que é o contrato de previsão por série do analytics.
 */

const baseUrl = () => (process.env.SALES_MODEL_URL?.trim() || 'http://localhost:8100').replace(/\/+$/, '')
const timeoutMs = () => {
  const value = Number(process.env.SALES_MODEL_TIMEOUT_MS)
  return Number.isFinite(value) && value > 0 ? value : 20_000
}

export interface SimulationStatus {
  available: boolean
  status: 'offline' | 'loading' | 'training' | 'ready' | 'error'
  message: string
  trainedAt: string | null
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs())
  let response: Response
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, signal: controller.signal })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new AppError('Simulation service timed out', 504)
    throw new AppError('Simulation service unavailable (start it with: npm run ml:service)', 503)
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: unknown } | null
    const detail = typeof body?.detail === 'string' ? body.detail : undefined
    if (response.status === 503) throw new AppError(detail ?? 'Simulation models are not ready yet', 503)
    if (response.status === 422) throw new AppError(detail ?? 'Invalid simulation scenario', 422)
    throw new AppError(`Simulation service error (${response.status})`, 502)
  }
  return response.json() as Promise<T>
}

/** Nunca falha: a tela usa isto para mostrar se o serviço está no ar, treinando ou fora. */
export async function getStatus(): Promise<SimulationStatus> {
  try {
    const health = await request<{ status: SimulationStatus['status']; ready: boolean; message: string; trainedAt: string | null }>('/health')
    return { available: health.ready, status: health.status, message: health.message, trainedAt: health.trainedAt }
  } catch (err) {
    return { available: false, status: 'offline', message: err instanceof AppError ? err.message : 'Simulation service unavailable', trainedAt: null }
  }
}

export const getModelInfo = () => request<Record<string, unknown>>('/model')

export const predict = (input: PredictInput) =>
  request<{ predictions: Record<string, number>[] }>('/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
