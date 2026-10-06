import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { getItem, setItem } from './storage'

const TOKEN_KEY = 'stockiq_token'
const URL_KEY = 'stockiq_api_url'
const API_PORT = 3001

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Descobre a URL padrão da API:
 *  1. EXPO_PUBLIC_API_URL, se definida;
 *  2. no Expo Go, o IP da máquina que serve o bundle (mesma rede Wi‑Fi do celular);
 *  3. emulador Android → 10.0.2.2; web → host da página; iOS simulator → localhost.
 */
export function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL
  const hostUri = Constants.expoConfig?.hostUri
  const host = hostUri?.split(':')[0]
  if (Platform.OS === 'web') return `http://${globalThis.location?.hostname ?? 'localhost'}:${API_PORT}/api`
  if (host && !host.includes('exp.direct')) return `http://${host}:${API_PORT}/api`
  return `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${API_PORT}/api`
}

let apiUrl = defaultApiUrl()
let token: string | null = null
let onUnauthorized: (() => void) | null = null

export const getApiUrl = () => apiUrl
export const getToken = () => token

export async function loadStoredSession(): Promise<string | null> {
  const [storedUrl, storedToken] = await Promise.all([getItem(URL_KEY), getItem(TOKEN_KEY)])
  if (storedUrl) apiUrl = storedUrl
  token = storedToken
  return token
}

export async function setApiUrl(url: string | null): Promise<void> {
  apiUrl = url?.trim().replace(/\/+$/, '') || defaultApiUrl()
  await setItem(URL_KEY, url ? apiUrl : null)
}

export async function setToken(value: string | null): Promise<void> {
  token = value
  await setItem(TOKEN_KEY, value)
}

/** Registrado pelo AuthProvider: chamado quando a API responde 401 (token expirado). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

type Params = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Params
  timeoutMs?: number
}

function buildQuery(params?: Params): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') search.append(k, String(v))
  const s = search.toString()
  return s ? `?${s}` : ''
}

async function request<T>(path: string, { method = 'GET', body, params, timeoutMs = 20000 }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(`${apiUrl}${path}${buildQuery(params)}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    const aborted = (err as Error).name === 'AbortError'
    throw new ApiError(aborted ? 'O servidor demorou para responder.' : `Não foi possível conectar ao servidor (${apiUrl}). Verifique a rede e o endereço da API.`, 0)
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return undefined as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized?.()
    throw new ApiError(data?.message || data?.error || res.statusText || 'Erro na requisição', res.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, params?: Params) => request<T>(path, { params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

/** Percorre todas as páginas de um endpoint paginado (a API limita `limit` a 100). */
export async function fetchAll<T>(path: string, params: Params = {}): Promise<T[]> {
  const out: T[] = []
  let page = 1
  let totalPages = 1
  do {
    const res = await api.get<{ data: T[]; totalPages: number }>(path, { ...params, page, limit: 100 })
    out.push(...res.data)
    totalPages = res.totalPages
    page++
  } while (page <= totalPages)
  return out
}

export const errorMessage = (err: unknown, fallback = 'Não foi possível concluir a operação') =>
  err instanceof ApiError ? err.message : fallback
