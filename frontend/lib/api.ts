const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
const TOKEN_KEY = 'wms_token'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined | null>
}

function buildQuery(params?: RequestOptions['params']): string {
  if (!params) return ''
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (entries.length === 0) return ''
  const search = new URLSearchParams()
  for (const [key, value] of entries) search.append(key, String(value))
  return `?${search.toString()}`
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options
  const token = getToken()

  const res = await fetch(`${API_URL}${path}${buildQuery(params)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return undefined as T

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      setToken(null)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    const message = data?.message || data?.error || res.statusText || 'Erro na requisição'
    throw new ApiError(message, res.status)
  }

  return data as T
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
