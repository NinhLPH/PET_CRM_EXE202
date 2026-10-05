import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  errors: ApiErrorBody['errors'];
  currentQuote?: ApiErrorBody['currentQuote'];
  constructor(status: number, code: string, message: string, errors: ApiErrorBody['errors'] = [], currentQuote?: ApiErrorBody['currentQuote']) {
    super(message);
    this.name = 'ApiError';
    this.status = status; this.code = code; this.errors = errors; this.currentQuote = currentQuote;
  }
}

const origin = (import.meta.env.VITE_API_ORIGIN || (import.meta.env.DEV ? 'http://localhost:3000' : '')).replace(/\/$/, '');
export const query = (values: Record<string, string | number | boolean | undefined | null>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') params.set(key, String(value)); });
  return params.size ? `?${params}` : '';
};

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), 30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout.signal]) : timeout.signal;
  try {
    const response = await fetch(`${origin}${path}`, {
      ...options,
      signal,
      credentials: 'include',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    const raw = await response.text();
    let body: unknown;
    let validJson = true;
    try { body = JSON.parse(raw); } catch { validJson = false; }
    if (!response.ok) {
      const data = (body && typeof body === 'object' ? body : {}) as ApiErrorBody;
      if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('petcare:session-expired'));
      throw new ApiError(response.status, data.code || `HTTP_${response.status}`, typeof data.message === 'string' ? data.message : 'Yêu cầu không thành công', data.errors, data.currentQuote);
    }
    if (!validJson && response.status !== 204) throw new ApiError(response.status, 'INVALID_RESPONSE', 'Máy chủ trả dữ liệu không hợp lệ. Vui lòng thử lại.');
    return body as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    if (timeout.signal.aborted) throw new ApiError(0, 'TIMEOUT', 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ. Vui lòng thử lại.');
  } finally {
    window.clearTimeout(timer);
  }
}

export function send<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown, headers?: HeadersInit) {
  return request<T>(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), headers });
}

export function errorText(error: unknown): string { return error instanceof Error ? error.message : typeof error === 'string' && error ? error : 'Có lỗi xảy ra. Vui lòng thử lại.'; }
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries((Array.isArray(error.errors) ? error.errors : []).filter(item => typeof item.field === 'string' && Array.isArray(item.messages)).map(item => [item.field, item.messages.join(', ')]));
}
