// Typed, null-safe wrapper over the Telegram WebApp JS API
// (https://telegram.org/js/telegram-web-app.js), trimmed to what the
// user portal needs: detection, ready/expand init, start_param referral
// capture, and the Telegram color scheme. Every function is safe to call
// outside Telegram (plain browser) — it becomes a no-op / fallback there.
// Adapted from frontend/mini-app/src/telegram.ts.

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: { id: number; type: string; title?: string; username?: string };
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date?: number;
  hash?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready(): void;
  expand(): void;
  close(): void;
  onEvent(eventType: string, cb: () => void): void;
  offEvent(eventType: string, cb: () => void): void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * True when the portal is actually running inside Telegram — either signed
 * initData is present, or Telegram injected a user via initDataUnsafe.
 * (The bare telegram-web-app.js script also creates window.Telegram in a
 * plain browser, with empty initData and no user — that is NOT Telegram.)
 */
export function isTelegram(): boolean {
  const wa = getWebApp();
  if (!wa) return false;
  return wa.initData.length > 0 || !!wa.initDataUnsafe?.user;
}

export function getInitData(): string {
  return getWebApp()?.initData ?? '';
}

export function getInitDataUnsafe(): TelegramInitDataUnsafe {
  return getWebApp()?.initDataUnsafe ?? {};
}

export function getTelegramUser(): TelegramUser | undefined {
  return getInitDataUnsafe().user;
}

export function getStartParam(): string {
  return getInitDataUnsafe().start_param ?? '';
}

export function getColorScheme(): 'light' | 'dark' {
  return getWebApp()?.colorScheme ?? 'dark';
}

/**
 * Referral code from the Telegram deep link: opening the bot/app with
 * `?start=ref_<CODE>` surfaces here as start_param = "ref_<CODE>".
 */
export function getReferralCodeFromStartParam(): string | undefined {
  const sp = getStartParam().trim();
  if (!sp) return undefined;
  if (sp.startsWith('ref_')) {
    const code = sp.slice(4).trim();
    return code || undefined;
  }
  return undefined;
}

/**
 * Referral code from the page URL: `?ref=<CODE>` (a bare `ref_<CODE>` value
 * is also accepted, matching the Telegram deep-link shape).
 */
export function getReferralCodeFromQuery(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search).get('ref')?.trim();
  if (!raw) return undefined;
  const code = raw.startsWith('ref_') ? raw.slice(4).trim() : raw;
  return code || undefined;
}

/**
 * The referral code to prefill the login form with, if any.
 * Telegram start_param wins over the ?ref= query param.
 */
export function getInitialReferralCode(): string | undefined {
  return getReferralCodeFromStartParam() ?? getReferralCodeFromQuery();
}

let initialized = false;

/**
 * Call once before first render. Safe outside Telegram.
 * Inside Telegram: tells the client the app is ready, expands the viewport,
 * and marks the document with the `in-telegram` class + the Telegram color
 * scheme so chrome/CSS can adapt.
 */
export function initTelegram(): void {
  if (initialized) return;
  initialized = true;
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
  } catch {
    /* older clients */
  }
  try {
    wa.expand();
  } catch {
    /* noop */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.tgColorScheme = wa.colorScheme;
    if (isTelegram()) {
      document.documentElement.classList.add('in-telegram');
      document.body?.classList.add('in-telegram');
    }
  }
}
