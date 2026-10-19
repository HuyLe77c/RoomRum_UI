import type { Session } from '../types'

const SESSION_KEY = 'roomrum-session'

export function getSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Session | null } catch { return null }
}
export function setSession(session: Session | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else sessionStorage.removeItem(SESSION_KEY)
  window.dispatchEvent(new Event('roomrum-session'))
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getSession()?.token
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (response.status === 204) return undefined as T
  const envelope = await response.json().catch(() => null) as { success?: boolean; message?: string; data?: T } | null
  if (!response.ok || envelope?.success === false) throw new ApiError(envelope?.message || `Yêu cầu không thành công (${response.status}).`, response.status)
  return envelope?.data as T
}

export function json(method: string, body: unknown): RequestInit { return { method, body: JSON.stringify(body) } }
export function query(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.set(key, String(value)) })
  return search.toString()
}
