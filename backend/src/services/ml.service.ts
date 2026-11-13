/**
 * Client for the demand-forecasting service (ml-service, routes under /wms: set ML_SERVICE_URL=http://localhost:8100/wms).
 *
 * The ML service is optional: when `ML_SERVICE_URL` is unset, unreachable or returns an
 * error, forecasts fall back to a moving average computed here, so the rest of the API
 * (analytics, purchase suggestions) keeps working and reports which source was used.
 */

export interface HistoryPoint {
  date: string // YYYY-MM-DD
  quantity: number
}

export interface SeriesInput {
  id: string
  history: HistoryPoint[]
}

export interface DayForecast {
  date: string
  mean: number
  low: number
  high: number
}

export interface SeriesForecast {
  id: string
  /** rf/gbm = trained model · mean = short history · baseline = ML service unavailable */
  method: 'rf' | 'gbm' | 'mean' | 'baseline'
  historyDays: number
  daily: DayForecast[]
}

export interface BacktestScore {
  rmsle: number
  wape: number
  vies_pct: number
  wape_categoria?: number
  r2?: number | null
  mae?: number
  rmse?: number
}

/** Extra metadata of the WMS model (ml-service /wms): features that matter and the compared methods. */
export interface ModelDetails {
  algorithm?: string
  level?: string
  productsModelled?: number
  productsTotal?: number
  importance: { feature: string; label: string; weight: number }[]
  compared: { id: string; name: string; score: BacktestScore }[]
}

export interface ModelInfo {
  source: 'ml' | 'baseline'
  /** Why the baseline was used (only when source = baseline). */
  reason?: string
  version?: string
  trainedOn?: string
  savedAt?: string
  dataRange?: [string, string]
  details?: ModelDetails
  backtest?: {
    horizonDays: number
    testOrigins: string[]
    model: BacktestScore
    baseline: BacktestScore
    baselineName: string
    intervalCoverage: number
  }
}

export interface ForecastResult {
  model: ModelInfo
  forecasts: Map<string, SeriesForecast>
}

const BASELINE_NAME = 'media_mesmo_dia_8sem'
const MODEL_INFO_TTL_MS = 5 * 60_000

let cachedInfo: { info: ModelInfo; at: number } | null = null

const mlUrl = () => process.env.ML_SERVICE_URL?.replace(/\/$/, '')
const timeoutMs = () => Number(process.env.ML_TIMEOUT_MS ?? 8000)

export const mlEnabled = () => !!mlUrl()

async function callMl<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs())
  try {
    const res = await fetch(`${mlUrl()}${path}`, { ...init, signal: controller.signal })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`ML service responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

interface RawModelInfo {
  package_version?: string
  trained_on?: string
  saved_at?: string
  data_range?: [string, string]
  algorithm?: string
  products_modelled?: number
  products_total?: number
  importance?: { feature: string; label: string; weight: number }[]
  backtest?: {
    nivel?: string
    regressao_linear?: BacktestScore
    modelo_rf?: BacktestScore
    modelo_gbm?: BacktestScore
    [key: string]: unknown
    cobertura_intervalo?: number
    origens_teste?: string[]
    horizonte_dias?: number
  }
}

function summarizeModel(raw: RawModelInfo): ModelInfo {
  const bt = raw.backtest
  const baseline = bt?.[BASELINE_NAME] as BacktestScore | undefined
  const scored = bt?.modelo_rf ?? bt?.modelo_gbm
  return {
    source: 'ml',
    version: raw.package_version,
    trainedOn: raw.trained_on,
    savedAt: raw.saved_at,
    dataRange: raw.data_range,
    details: scored && baseline
      ? {
          algorithm: raw.algorithm,
          level: bt?.nivel,
          productsModelled: raw.products_modelled,
          productsTotal: raw.products_total,
          importance: raw.importance ?? [],
          compared: [
            { id: 'rf', name: 'Random Forest', score: scored },
            ...(bt?.regressao_linear ? [{ id: 'linear', name: 'Regressão Linear', score: bt.regressao_linear }] : []),
            { id: 'baseline', name: 'Média do mesmo dia da semana', score: baseline },
          ],
        }
      : undefined,
    backtest:
      bt && scored && baseline
        ? {
            horizonDays: bt.horizonte_dias ?? 14,
            testOrigins: bt.origens_teste ?? [],
            model: scored,
            baseline,
            baselineName: BASELINE_NAME,
            intervalCoverage: bt.cobertura_intervalo ?? 0,
          }
        : undefined,
  }
}

/** Model metadata for the UI; never throws. */
export async function getModelInfo(): Promise<ModelInfo> {
  if (!mlEnabled()) return { source: 'baseline', reason: 'ML_SERVICE_URL não configurada' }
  if (cachedInfo && Date.now() - cachedInfo.at < MODEL_INFO_TTL_MS) return cachedInfo.info
  try {
    const info = summarizeModel(await callMl<RawModelInfo>('/model'))
    cachedInfo = { info, at: Date.now() }
    return info
  } catch (err) {
    return { source: 'baseline', reason: `Serviço de ML indisponível (${(err as Error).message})` }
  }
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Fallback: flat forecast equal to the mean of the last 28 days, with a ±50% band. */
export function baselineForecast(series: SeriesInput[], asOf: string, horizon: number): SeriesForecast[] {
  const from = addDays(asOf, -27)
  return series.map((s) => {
    const total = s.history.filter((h) => h.date >= from && h.date <= asOf).reduce((a, h) => a + h.quantity, 0)
    const mean = total / 28
    return {
      id: s.id,
      method: 'baseline' as const,
      historyDays: s.history.length,
      daily: Array.from({ length: horizon }, (_, i) => ({
        date: addDays(asOf, i + 1),
        mean: round(mean),
        low: round(mean * 0.5),
        high: round(mean * 1.5),
      })),
    }
  })
}

const round = (n: number) => Math.round(n * 1000) / 1000

/**
 * Forecasts daily demand for every series, `horizon` days after `asOf` (the last full day).
 * Uses the ML service when available, otherwise the moving-average baseline.
 */
export async function forecastDemand(series: SeriesInput[], asOf: string, horizon: number): Promise<ForecastResult> {
  if (series.length === 0) return { model: await getModelInfo(), forecasts: new Map() }

  if (mlEnabled()) {
    try {
      const body = await callMl<{ forecasts: (SeriesForecast & { historyDays: number })[] }>('/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asOf, horizon, series }),
      })
      const model = await getModelInfo()
      return { model, forecasts: new Map(body.forecasts.map((f) => [f.id, f])) }
    } catch (err) {
      const reason = `Serviço de ML indisponível (${(err as Error).message}); usando média móvel`
      console.warn(`[ml] ${reason}`)
      return { model: { source: 'baseline', reason }, forecasts: toMap(baselineForecast(series, asOf, horizon)) }
    }
  }
  return {
    model: { source: 'baseline', reason: 'ML_SERVICE_URL não configurada; usando média móvel' },
    forecasts: toMap(baselineForecast(series, asOf, horizon)),
  }
}

const toMap = (list: SeriesForecast[]) => new Map(list.map((f) => [f.id, f]))

/** Test helper: drops the cached model metadata. */
export function resetModelInfoCache(): void {
  cachedInfo = null
}
