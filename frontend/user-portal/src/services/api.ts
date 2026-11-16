import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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

export interface FocusResult {
  session: string;
  timestamp: string;
  scope: string;
  focus: AnalyzedPair[];
  watch: AnalyzedPair[];
  avoid: AnalyzedPair[];
  warnings: string[];
  marketClosed: boolean;
  closedAssets: string[];
  skippedCount: number;
  orReady: boolean;
}

export interface AnalyzedPair {
  kind: 'fx' | 'asset';
  name: string;
  icon: string;
  dec: number;
  group?: string;
  sessions?: string[] | null;
  pair: string;
  base?: string;
  quote?: string;
  live: number;
  p15: number;
  e20: number;
  e50: number;
  rsi: number;
  er: number;
  net: number;
  act: number;
  atr15: number;
  adrPct: number | null;
  pdh: number | null;
  pdl: number | null;
  div: 'BULLISH' | 'BEARISH' | null;
  orHave: boolean;
  orHigh: number | null;
  orLow: number | null;
  stale: boolean;
  bias: 'BUY' | 'SELL' | null;
  cnt: number;
  d4: number;
  d1: number;
  d15: number;
  score: number;
  orConfirmed: boolean;
  orLive: boolean;
  obstacle: number | null;
  roomATR: number | null;
  cramped: boolean;
  stretched: boolean;
  divAgainst: boolean;
  extended: boolean;
  win4: number;
  win1: number;
  win15: number;
  ts4: number;
  ts1: number;
  ts15: number;
}

export const authApi = {
  telegramLogin: (data: { telegramId: string; username?: string; firstName?: string; lastName?: string; languageCode?: string; referralCode?: string }) =>
    api.post('/auth/telegram', data),
  refresh: () => api.post('/auth/refresh')
};

export const userApi = {
  me: () => api.get('/user/me'),
  updateWatchlist: (watchlist: string[]) => api.patch('/user/watchlist', { watchlist }),
  submitPayment: (data: { amount: number; currency: string; method: string; transactionId: string; screenshotUrl?: string }) =>
    api.post('/user/payment', data),
  getPayments: () => api.get('/user/payments'),
  getReferrals: () => api.get('/user/referrals')
};

export const analysisApi = {
  getFocus: (session?: string, watchlist?: string[]) =>
    api.post('/analysis/focus', { session, watchlist }),
  getCachedFocus: (session: string) =>
    api.get(`/analysis/focus/${session}`),
  getPairs: () => api.get('/analysis/pairs')
};

export default api;