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
import { useProfileStore } from '../store/profile';
import { getReferralCodeFromStartParam, isTelegram } from '../telegram';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** True when the app was opened inside Telegram with valid initData. */
  inTelegram: boolean;
  /** Sign in with Telegram initData, a one-time code, or both (portal flow). */
  login: (data: { initData?: string; code?: string; referralCode?: string }) => Promise<void>;
  /** Sign in with the account email + password set during onboarding. */
  loginWithPassword: (email: string, password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setWatchlistLocal: (watchlist: string[]) => void;
  /** POST /auth/logout (best effort) + clear all account-scoped state. */
  logout: () => void;
  /** POST /auth/logout-all (best effort) + clear all account-scoped state. */
  logoutAll: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function persist(token: string, user: User) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const inTelegram = isTelegram();

  const clearSession = useCallback(() => {
    // Clear ALL account-scoped state on logout / identity change / 401.
    useRadarStore.getState().clearAll();
    useProfileStore.getState().reset();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
          // Refresh token (single attempt, as before).
          const res = await authApi.refresh();
          if (!cancelled && res.data.success && res.data.data?.token) {
            localStorage.setItem('token', res.data.data.token);
            setToken(res.data.data.token);
          }
        } catch {
          if (!cancelled) clearSession();
        }
      }
      if (!cancelled) setIsLoading(false);
    };
    void initAuth();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [clearSession]);

  /** Shared session adoption for every sign-in route (code, Telegram,
   *  password): identity changes drop the previous account's Radar cache. */
  const applySession = useCallback((nextToken: string, nextUser: User) => {
    try {
      const prev = localStorage.getItem('user');
      const prevId = prev ? (JSON.parse(prev) as User).id : null;
      if (prevId && prevId !== nextUser.id) {
        useRadarStore.getState().clearAll();
        useProfileStore.getState().reset();
      }
    } catch {
      /* cached user unreadable — nothing to reconcile */
    }
    persist(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (data: { initData?: string; code?: string; referralCode?: string }) => {
      const res = data.code
        ? await authApi.codeLogin(data.code)
        : await authApi.telegramLogin({
            initData: data.initData || '',
            referralCode: data.referralCode ?? getReferralCodeFromStartParam(),
          });
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Login failed');
      }
      applySession(res.data.data.token, res.data.data.user);
    },
    [applySession],
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.passwordLogin(email, password);
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.error || 'Login failed');
      }
      applySession(res.data.data.token, res.data.data.user);
    },
    [applySession],
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await userApi.me();
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
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

  const logout = useCallback(() => {
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
        login,
        loginWithPassword,
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
