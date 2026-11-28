import axios from 'axios';

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AdminUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  tier: 'FREE' | 'PRO' | 'ELITE';
  trialEndsAt?: string;
  referralCode: string;
  createdAt: string;
  lastActiveAt?: string;
  activeSubscription?: { tier: string; status: string; expiresAt: string } | null;
  paymentCount: number;
  referralCount: number;
}

export interface Payment {
  id: string;
  userId: string;
  user: { telegramId: string; username?: string; firstName?: string; tier: string };
  amount: number;
  currency: string;
  method: string;
  transactionId: string;
  screenshotUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface Metrics {
  users: { total: number; new30d: number; new7d: number };
  tiers: { free: number; pro: number; elite: number; trial: number };
  revenue: {
    /** Null when approved revenue spans multiple currencies — use byCurrency. */
    total: number | null;
    currency: string | null;
    byCurrency: { currency: string; amount: number }[];
    pendingPayments: number;
    approved30d: number;
  };
  referrals: { total: number; active: number };
  activation: { rate: number };
  trialConversion: { converted: number };
}

export interface Operations {
  telegram: { pending: number; failed: number };
  expiredRuns: number;
}

export interface CreditReconciliation {
  consistent: boolean;
  truncated: boolean;
  discrepancies: { userId: string; balance: string | null; ledger: string; difference: string }[];
}

/** Full user record from GET /admin/users/:id (subscriptions/payments/referrals included). */
export interface AdminUserDetail {
  id: string;
  telegramId: string;
  username?: string | null;
  firstName?: string | null;
  tier: string;
  trialEndsAt?: string | null;
  referralCode: string;
  createdAt: string;
  lastActiveAt?: string | null;
  subscriptions?: { id: string; tier: string; status: string; startsAt: string; expiresAt: string; createdAt: string }[];
  payments?: Payment[];
  referrals?: { id: string; status: string; createdAt: string; referred?: { firstName?: string | null; username?: string | null; telegramId: string } }[];
}

export interface TelegramPublicConfig {
  botUsername: string | null;
  miniAppUrl: string | null;
  miniAppConfigured: boolean;
  webhookPath: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface TelegramChatMenuButton {
  type: string;
  text?: string;
  web_app?: { url: string };
}

export interface TelegramDiagnostics {
  bot: TelegramBotInfo;
  webhook: TelegramWebhookInfo;
  menuButton: TelegramChatMenuButton;
  config: {
    botTokenSet: boolean;
    webhookSecretSet: boolean;
    miniAppUrlSet: boolean;
    adminIdsSet: boolean;
  };
}

export const adminApi = {
  login: (code: string) => api.post('/auth/code', { code }),

  getUsers: (params?: { page?: number; limit?: number; tier?: string; search?: string }) =>
    api.get('/admin/users', { params }),

  getUser: (id: string) => api.get(`/admin/users/${id}`),

  updateUserTier: (id: string, tier: string, expiresAt?: string) =>
    api.patch(`/admin/users/${id}/tier`, { tier, expiresAt }),

  getPendingPayments: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/payments/pending', { params }),

  verifyPayment: (paymentId: string, action: 'APPROVE' | 'REJECT', tier?: string, durationDays?: number) =>
    api.post('/admin/payments/verify', { paymentId, action, tier, durationDays }),

  getMetrics: () => api.get('/admin/metrics'),

  getOperations: () => api.get('/admin/operations'),

  getCreditReconciliation: () => api.get('/admin/credits/reconciliation'),

  getAnalysisSessions: () => api.get('/analysis/sessions'),

  triggerAnalysis: () => api.post('/admin/analysis/trigger'),

  telegramConfig: () => api.get('/telegram/config'),

  telegramDiagnostics: () => api.get('/telegram/diagnostics'),

  setTelegramMenuButton: (url?: string, text?: string) =>
    api.post('/telegram/set-menu-button', {
      ...(url ? { url } : {}),
      ...(text ? { text } : {})
    }),

  telegramWebhookInfo: () => api.get('/telegram/webhook-info'),

  setTelegramWebhook: (url: string) => api.post('/telegram/set-webhook', { url })
};

export default api;