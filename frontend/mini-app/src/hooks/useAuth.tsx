import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { User, authApi, userApi, UNAUTHORIZED_EVENT } from '../services/api';
import { useRadarStore } from '../store/radarStore';
import {
  getInitData,
  getReferralCodeFromStartParam,
  isTelegram,
} from '../telegram';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** True when the app was opened inside Telegram with valid initData. */
  inTelegram: boolean;
  /** Last auto/code login error, for the fallback screen. */
  authError: string;
  loginWithCode: (code: string) => Promise<void>;
  retryTelegramLogin: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setWatchlistLocal: (watchlist: string[]) => void;
  logout: () => void;
  logoutAll: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persist(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const inTelegram = isTelegram();

  const applyLoginResponse = useCallback((res: {
    data: { success: boolean; data?: { token: string; user: User }; error?: string };
  }) => {
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Login failed');
    }
    // Identity change: drop any Radar results stored for the previous account.
    try {
      const prev = localStorage.getItem('user');
      const prevId = prev ? (JSON.parse(prev) as User).id : null;
      if (prevId && prevId !== res.data.data.user.id) {
        useRadarStore.getState().clearAll();
      }
    } catch {
      /* cached user unreadable — nothing to reconcile */
    }
    persist(res.data.data.token, res.data.data.user);
    setToken(res.data.data.token);
    setUser(res.data.data.user);
  }, []);

  const telegramLogin = useCallback(async () => {
    const initData = getInitData();
    if (!initData) throw new Error('No Telegram initData available');
    const referralCode = getReferralCodeFromStartParam();
    const res = await authApi.telegramLogin({
      initData,
      referralCode,
    });
    applyLoginResponse(res);
  }, [applyLoginResponse]);

  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
          const res = await authApi.refresh();
          if (!cancelled && res.data.success && res.data.data?.token) {
            localStorage.setItem('token', res.data.data.token);
            setToken(res.data.data.token);
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!cancelled) {
            setToken(null);
            setUser(null);
          }
        }
      }
      // Auto-login inside Telegram when there is no valid stored session.
      if (!cancelled && !localStorage.getItem('token') && isTelegram()) {
        try {
          await telegramLogin();
          setAuthError('');
        } catch (err) {
          if (!cancelled) {
            setAuthError(
              err instanceof Error
                ? err.message
                : 'Telegram login failed. Reopen the app from the bot.'
            );
          }
        }
      }
      if (!cancelled) setIsLoading(false);
    };
    void initAuth();
    return () => {
      cancelled = true;
    };
  }, [telegramLogin]);

  useEffect(() => {
    const onUnauthorized = () => {
      // 401: account-scoped state (incl. stored Radar results) is cleared.
      useRadarStore.getState().clearAll();
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const loginWithCode = useCallback(
    async (code: string) => {
      const res = await authApi.codeLogin(code.trim());
      applyLoginResponse(res);
      setAuthError('');
    },
    [applyLoginResponse]
  );

  const retryTelegramLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      await telegramLogin();
      setAuthError('');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Telegram login failed'
      );
    } finally {
      setIsLoading(false);
    }
  }, [telegramLogin]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await userApi.me();
      if (res.data.success) {
        setUser(res.data.data as User);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch {
      /* keep cached user */
    }
  }, []);

  const setWatchlistLocal = useCallback((watchlist: string[]) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, watchlist };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    // Clear ALL account-scoped state on logout / identity change.
    useRadarStore.getState().clearAll();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    // Best-effort server sign-out; local state is cleared regardless.
    void authApi.logout().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const logoutAll = useCallback(() => {
    void authApi.logoutAll().catch(() => undefined);
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        inTelegram,
        authError,
        loginWithCode,
        retryTelegramLogin,
        refreshUser,
        setWatchlistLocal,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
