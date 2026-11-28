// Thin fetch-based API client (replaces axios to meet the ≤200 KB initial-JS
// budget). Same contract as before: base URL from VITE_API_URL, falling back
// to the relative /api path (Vite dev proxy → http://localhost:3000). JWT in
// localStorage 'token', user object in localStorage 'user'.
//
// Every call resolves to `{ data: <envelope>, status }` where the envelope is
// the server's `{ success, data, error?, details?, meta? }` shape. HTTP errors
// reject with ApiError carrying the status code and the server's error text,
// so callers can branch on 402 / 409 / 429 / 503 (handoff §4).

const API_BASE =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

export const UNAUTHORIZED_EVENT = 'tb-unauthorized';

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  meta?: { page?: number; limit?: number; [key: string]: unknown };
}

export interface ApiResponse<T = unknown> {
  data: ApiEnvelope<T>;
  status: number;
}

export class ApiError extends Error {
  status: number;
  envelope?: ApiEnvelope;

  constructor(status: number, message: string, envelope?: ApiEnvelope) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.envelope = envelope;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('token');
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Network-level failure (offline, DNS, timeout): status 0 marks it as
    // ambiguous — callers must not assume the request never reached the server.
    throw new ApiError(0, 'Network request failed');
  }

  let envelope: ApiEnvelope<T> | undefined;
  try {
    envelope = (await res.json()) as ApiEnvelope<T>;
  } catch {
    envelope = undefined;
  }

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // The Mini App has no /login route — let the auth provider react.
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!res.ok || !envelope?.success) {
    throw new ApiError(
      res.status,
      envelope?.error || `Request failed (${res.status})`,
      envelope,
    );
  }
  return { data: envelope, status: res.status };
}

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  tier: 'FREE' | 'PRO' | 'ELITE';
  trialEndsAt?: string;
  referralCode: string;
  watchlist: string[];
  languageCode: string;
  isTrialActive: boolean;
  isProActive: boolean;
  subscription?: { tier: string; status: string; expiresAt: string } | null;
  recentPayments?: Payment[];
  referralCount?: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  createdAt: string;
}

export interface CreditsData {
  balance: number;
  dailyGrant: number;
  radarCost: number;
}

export interface ReferralEntry {
  id: string;
  status: string;
  createdAt: string;
  referred?: { firstName?: string; username?: string; telegramId?: string };
}

export interface TelegramConfig {
  botUsername?: string;
  miniAppUrl?: string;
  miniAppConfigured?: boolean;
  webhookPath?: string;
}

export const authApi = {
  telegramLogin: (data: { initData: string; referralCode?: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/telegram', data),
  codeLogin: (code: string) =>
    request<{ token: string; user: User }>('POST', '/auth/code', { code }),
  refresh: () => request<{ token: string }>('POST', '/auth/refresh'),
  logout: () => request('POST', '/auth/logout'),
  logoutAll: () => request('POST', '/auth/logout-all'),
};

export const userApi = {
  me: () => request<User>('GET', '/user/me'),
  credits: () => request<CreditsData>('GET', '/user/credits'),
  updateWatchlist: (watchlist: string[]) =>
    request<{ watchlist: string[] }>('PATCH', '/user/watchlist', { watchlist }),
  getPayments: () => request<Payment[]>('GET', '/user/payments'),
  getReferrals: (page = 1, limit = 20) =>
    request<ReferralEntry[]>('GET', `/user/referrals?page=${page}&limit=${limit}`),
};

export const analysisApi = {
  /**
   * Paid Radar run. The caller owns the idempotency key: ONE key is minted
   * per user intent and reused verbatim for the explicit retry of that same
   * intent (handoff §4). This function never generates a key itself.
   * NOTE: there is deliberately no GET /analysis/focus/:session reader —
   * the backend answers 405 and the handoff forbids using it.
   */
  runFocus: (
    payload: { session?: string; watchlist?: string[] },
    idempotencyKey: string,
  ) =>
    request<unknown>('POST', '/analysis/focus', payload, {
      'Idempotency-Key': idempotencyKey,
    }),
  getPairs: () => request<string[]>('GET', '/analysis/pairs'),
  getSessions: () => request<unknown>('GET', '/analysis/sessions'),
};

export const telegramApi = {
  // Public bot config endpoint. May be unavailable — callers must catch and
  // fall back to VITE_BOT_USERNAME / VITE_TELEGRAM_BOT_USERNAME.
  config: () => request<TelegramConfig>('GET', '/telegram/config'),
};
