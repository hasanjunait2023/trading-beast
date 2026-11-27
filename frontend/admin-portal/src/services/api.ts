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
  revenue: { total: number; pendingPayments: number; approved30d: number };
  referrals: { total: number; active: number };
  activation: { rate: number };
  trialConversion: { converted: number };
}

export const adminApi = {
  login: (code: string) => api.post('/auth/code', { code }),

  getUsers: (params?: { page?: number; limit?: number; tier?: string; search?: string }) =>
    api.get('/admin/users', { params }),

  getUser: (id: string) => api.get(`/admin/users/${id}`),

  updateUserTier: (id: string, tier: string, expiresAt?: string) =>
    api.patch(`/admin/users/${id}/tier`, { tier, expiresAt }),

  getPendingPayments: () => api.get('/admin/payments/pending'),

  verifyPayment: (paymentId: string, action: 'APPROVE' | 'REJECT', tier?: string, durationDays?: number) =>
    api.post('/admin/payments/verify', { paymentId, action, tier, durationDays }),

  getMetrics: () => api.get('/admin/metrics'),

  triggerAnalysis: () => api.post('/admin/analysis/trigger')
};

export default api;