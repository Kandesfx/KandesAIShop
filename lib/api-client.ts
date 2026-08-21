/**
 * Client HTTP helper cho admin UI.
 * Tự gắn credentials (cookie session).
 */

interface ApiSuccess<T> {
  ok: true
  data: T
}
interface ApiErrorBody {
  ok: false
  error: { code: string; message: string; fields?: { field: string; message: string }[] }
}
type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody

export class ApiError extends Error {
  code: string
  fields?: { field: string; message: string }[]
  constructor(message: string, code: string, fields?: { field: string; message: string }[]) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.fields = fields
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      ...init,
    })
  } catch (e) {
    throw new ApiError(
      'Không kết nối được server. Kiểm tra mạng.',
      'NETWORK_ERROR'
    )
  }

  let json: ApiResponse<T>
  try {
    json = (await res.json()) as ApiResponse<T>
  } catch {
    throw new ApiError(`Server trả về response không hợp lệ (${res.status})`, 'INVALID_RESPONSE')
  }

  if (!json.ok) {
    throw new ApiError(json.error.message, json.error.code, json.error.fields)
  }
  return json.data
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
}
