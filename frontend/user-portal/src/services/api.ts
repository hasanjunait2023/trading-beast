// Fetch-based API client for the TradingBeast web portal (Z2).
// Same contract as the Mini App client: base URL from VITE_API_URL, falling
// back to the relative /api path (Vite dev proxy → http://localhost:3000).
// JWT in localStorage 'token', user object in localStorage 'user'.
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
  /** Present on a 409 VERSION_CONFLICT plan update: the server's plan copy. */
  current?: SessionPlan;
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
    // Let the auth provider clear account-scoped state and route to /login.
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
  /** Integer amount in the currency's minor units. */
  amount: number;
  currency: string;
  method: string;
  status: string; // PENDING | APPROVED | REJECTED | EXPIRED
  transactionId?: string | null;
  screenshotUrl?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreditsData {
  balance: number;
  dailyGrant: number;
  radarCost: number;
}

/**
 * Onboarding profile (Onboarding + Conversion chapter). Served by
 * GET /user/profile; the endpoint is deployed alongside this UI, so every
 * caller must degrade gracefully on 404 (see store/profile.ts).
 */
export interface UserProfile {
  email: string | null;
  phone: string | null;
  profileCompleted: boolean;
  hasPassword: boolean;
}

export interface ReferralEntry {
  id: string;
  status: string;
  createdAt: string;
  referred?: { firstName?: string; username?: string; telegramId?: string };
}

export interface RadarRunPayload {
  runId: string;
  session: string | null;
  scope: string | null;
  completedAt: string | null;
  startedAt: string;
  result: unknown;
}

export interface UserPreferences {
  timezone: string | null;
  preferredSessions: string[];
  quietHoursEnabled: boolean;
  /** "HH:MM" 24h in the account timezone, or null. */
  quietStart: string | null;
  quietEnd: string | null;
}

export interface AlertRule {
  id: string;
  /** Only 'SESSION_START' exists — the only type the evaluator can fire. */
  type: string;
  session: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertsStatus {
  telegramLinked: boolean;
  botConfigured: boolean;
  /** Server-stated evaluator scope, e.g. "SESSION_START only". */
  evaluator: string;
}

export interface AlertsData {
  rules: AlertRule[];
  status: AlertsStatus;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SessionPlan {
  id: string;
  session: string;
  /** YYYY-MM-DD */
  planDate: string;
  status: 'DRAFT' | 'READY';
  pinnedRunId: string | null;
  checklist: ChecklistItem[];
  invalidation: string | null;
  riskNotes: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanPatch {
  checklist?: ChecklistItem[];
  invalidation?: string | null;
  riskNotes?: string | null;
  status?: 'DRAFT' | 'READY';
  pinnedRunId?: string | null;
  /** Required: the version the edits are based on (optimistic concurrency). */
  version: number;
}

export interface TelegramConfig {
  botUsername?: string;
  miniAppUrl?: string;
  miniAppConfigured?: boolean;
  webhookPath?: string;
}

export interface JournalTrade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt: string | null;
  isClosed: boolean;
  /** Decimal strings from the API — precision preserved; parse only to display. */
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  stopPrice: string | null;
  fees: string;
  currency: string;
  initialRiskAmount: string | null;
  notes: string | null;
  tags: string[];
  /** Decimal string for closed trades, else null. */
  pnl: string | null;
  /** Decimal string when P&L and initial risk are defined, else null. */
  rMultiple: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalSummaryByCurrency {
  currency: string;
  totalPnl: string;
  rSum: string;
  rCount: number;
}

export interface JournalSummary {
  closedCount: number;
  openCount: number;
  byCurrency: JournalSummaryByCurrency[];
}

export interface JournalListResult {
  trades: JournalTrade[];
  total: number;
  summary: JournalSummary | null;
}

/** Decimal fields are strings so precision survives until the server. */
export interface JournalTradeInput {
  symbol: string;
  side: 'LONG' | 'SHORT';
  openedAt: string;
  closedAt?: string | null;
  quantity: string;
  entryPrice: string;
  exitPrice?: string | null;
  stopPrice?: string | null;
  fees?: string;
  currency?: string;
  initialRiskAmount?: string | null;
  notes?: string | null;
  tags?: string[];
}

export type PaymentMethod = 'BKASH' | 'NAGAD' | 'USDT';

export type ToolId = 'position-size' | 'pip-value' | 'margin' | 'risk-reward' | 'recovery';

export interface ToolStatus {
  id: ToolId;
  available: boolean;
  /** Machine-readable reason code from the server; null when available. */
  reason: string | null;
  /** Metadata fields whose absence blocks the tool. */
  missing: string[];
}

export interface ToolsStatusData {
  tools: ToolStatus[];
}

export interface Instrument {
  pair: string;
  code: string;
  kind: 'fx' | 'asset';
  name: string;
  decimals: number;
  yahoo: string;
  base?: string;
  quote?: string;
  group?: string;
  sessions?: string[] | null;
}

export const authApi = {
  telegramLogin: (data: { initData: string; referralCode?: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/telegram', data),
  codeLogin: (code: string) =>
    request<{ token: string; user: User }>('POST', '/auth/code', { code }),
  /** Email + password sign-in; same JWT session shape as code login. */
  passwordLogin: (email: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/password-login', {
      email,
      password,
    }),
  refresh: () => request<{ token: string }>('POST', '/auth/refresh'),
  logout: () => request('POST', '/auth/logout'),
  logoutAll: () => request('POST', '/auth/logout-all'),
};

export const userApi = {
  me: () => request<User>('GET', '/user/me'),
  // Onboarding profile. 404 = endpoint not deployed yet — callers treat
  // that as "no gate" rather than an error worth surfacing.
  getProfile: () => request<UserProfile>('GET', '/user/profile'),
  completeProfile: (data: { email: string; phone: string; password?: string }) =>
    request<UserProfile>('POST', '/user/profile/complete', data),
  credits: () => request<CreditsData>('GET', '/user/credits'),
  updateWatchlist: (watchlist: string[]) =>
    request<{ watchlist: string[] }>('PATCH', '/user/watchlist', { watchlist }),
  submitPayment: (data: {
    amount: number; // integer minor units
    currency: string;
    method: PaymentMethod;
    transactionId: string;
    screenshotUrl?: string;
  }) =>
    request<{ paymentId: string; status: string; message: string }>(
      'POST',
      '/user/payment',
      data,
    ),
  getPayments: (page = 1, limit = 20) =>
    request<Payment[]>('GET', `/user/payments?page=${page}&limit=${limit}`),
  getReferrals: (page = 1, limit = 20) =>
    request<ReferralEntry[]>('GET', `/user/referrals?page=${page}&limit=${limit}`),
  // Server preferences (account-level timezone + preferred sessions + quiet hours).
  getPreferences: () => request<UserPreferences>('GET', '/user/preferences'),
  updatePreferences: (data: {
    timezone?: string | null;
    preferredSessions?: string[];
    quietHoursEnabled?: boolean;
    quietStart?: string | null;
    quietEnd?: string | null;
  }) => request<UserPreferences>('PUT', '/user/preferences', data),
  // Alerts (owner-scoped SESSION_START rules + delivery status).
  getAlerts: () => request<AlertsData>('GET', '/user/alerts'),
  createAlert: (session: string) =>
    request<AlertRule>('POST', '/user/alerts', { type: 'SESSION_START', session }),
  updateAlert: (id: string, enabled: boolean) =>
    request<AlertRule>('PATCH', `/user/alerts/${encodeURIComponent(id)}`, { enabled }),
  deleteAlert: (id: string) =>
    request<{ deleted: boolean }>('DELETE', `/user/alerts/${encodeURIComponent(id)}`),
  // Session plans (owner-scoped; PATCH uses optimistic-concurrency version).
  getPlans: (date: string) =>
    request<SessionPlan[]>('GET', `/user/plans?date=${encodeURIComponent(date)}`),
  getCurrentPlan: (session: string, date: string) =>
    request<SessionPlan | null>(
      'GET',
      `/user/plans/current?session=${encodeURIComponent(session)}&date=${encodeURIComponent(date)}`,
    ),
  createPlan: (session: string, planDate: string) =>
    request<SessionPlan>('POST', '/user/plans', { session, planDate }),
  updatePlan: (id: string, patch: PlanPatch) =>
    request<SessionPlan>('PATCH', `/user/plans/${encodeURIComponent(id)}`, patch),
  // Trade journal (owner-scoped; summary arrives in meta.summary).
  getJournal: async (params: { page?: number; limit?: number; from?: string; to?: string } = {}): Promise<JournalListResult> => {
    const q = new URLSearchParams();
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const res = await request<JournalTrade[]>('GET', `/user/journal?${q.toString()}`);
    return {
      trades: res.data.data ?? [],
      total: typeof res.data.meta?.total === 'number' ? res.data.meta.total : (res.data.data ?? []).length,
      summary: (res.data.meta?.summary as JournalSummary | undefined) ?? null,
    };
  },
  getJournalTrade: (id: string) =>
    request<JournalTrade>('GET', `/user/journal/${encodeURIComponent(id)}`),
  createJournalTrade: (data: JournalTradeInput) =>
    request<JournalTrade>('POST', '/user/journal', data),
  updateJournalTrade: (id: string, patch: Partial<JournalTradeInput>) =>
    request<JournalTrade>('PATCH', `/user/journal/${encodeURIComponent(id)}`, patch),
  deleteJournalTrade: (id: string) =>
    request<{ deleted: boolean }>('DELETE', `/user/journal/${encodeURIComponent(id)}`),
  // Risk Tools availability (per-tool reasons come from the server — the
  // Tools page renders them verbatim rather than hard-coding why a tool is
  // unavailable).
  getToolsStatus: () => request<ToolsStatusData>('GET', '/user/tools/status'),
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
  // Instrument catalog derived from the engine definitions (B5). Carries
  // only fields the engine defines — no contract metadata exists.
  getInstruments: () => request<Instrument[]>('GET', '/analysis/instruments'),
  getSessions: () => request<unknown>('GET', '/analysis/sessions'),
  // Read-only run history (zero credits). Payloads are mapped RadarRuns:
  // { runId, session, scope, completedAt, startedAt, result } where result
  // is the stored raw FocusResult.
  getLatestRun: () => request<RadarRunPayload | null>('GET', '/analysis/runs/latest'),
  getRuns: (page = 1, limit = 20) =>
    request<RadarRunPayload[]>('GET', `/analysis/runs?page=${page}&limit=${limit}`),
  getRun: (id: string) =>
    request<RadarRunPayload>('GET', `/analysis/runs/${encodeURIComponent(id)}`),
};

export const telegramApi = {
  // Public bot config endpoint. May be unavailable — callers must catch and
  // fall back to VITE_BOT_USERNAME / VITE_TELEGRAM_BOT_USERNAME.
  config: () => request<TelegramConfig>('GET', '/telegram/config'),
};

export default request;
