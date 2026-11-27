// Typed, null-safe wrapper over the Telegram WebApp JS API
// (https://telegram.org/js/telegram-web-app.js). Every function is safe to
// call outside Telegram (plain browser) — it simply becomes a no-op /
// returns a fallback value there.

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

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

export interface TelegramMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText(text: string): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }): void;
}

export interface TelegramBackButton {
  isVisible: boolean;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
  show(): void;
  hide(): void;
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
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
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  MainButton: TelegramMainButton;
  BackButton: TelegramBackButton;
  HapticFeedback: TelegramHapticFeedback;
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  onEvent(eventType: string, cb: () => void): void;
  offEvent(eventType: string, cb: () => void): void;
  sendData(data: string): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  showAlert(message: string, cb?: () => void): void;
  showConfirm(message: string, cb?: (confirmed: boolean) => void): void;
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

export function isTelegram(): boolean {
  const wa = getWebApp();
  return !!wa && wa.initData.length > 0;
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

/** Deep links arrive as `?start=ref_<CODE>` → start_param = "ref_<CODE>". */
export function getReferralCodeFromStartParam(): string | undefined {
  const sp = getStartParam();
  if (!sp) return undefined;
  if (sp.startsWith('ref_')) {
    const code = sp.slice(4).trim();
    return code || undefined;
  }
  return undefined;
}

export function getColorScheme(): 'light' | 'dark' {
  return getWebApp()?.colorScheme ?? 'dark';
}

const THEME_VAR_MAP: Record<string, string> = {
  bg_color: '--tg-theme-bg-color',
  text_color: '--tg-theme-text-color',
  hint_color: '--tg-theme-hint-color',
  link_color: '--tg-theme-link-color',
  button_color: '--tg-theme-button-color',
  button_text_color: '--tg-theme-button-text-color',
  secondary_bg_color: '--tg-theme-secondary-bg-color',
  header_bg_color: '--tg-theme-header-bg-color',
  accent_text_color: '--tg-theme-accent-text-color',
  section_bg_color: '--tg-theme-section-bg-color',
  section_header_text_color: '--tg-theme-section-header-text-color',
  subtitle_text_color: '--tg-theme-subtitle-text-color',
  destructive_text_color: '--tg-theme-destructive-text-color',
};

/** Apply themeParams as CSS variables on :root. Brand theme stays the fallback. */
export function applyThemeParams(): void {
  const wa = getWebApp();
  if (!wa || typeof document === 'undefined') return;
  const root = document.documentElement;
  const params = wa.themeParams ?? {};
  (Object.keys(THEME_VAR_MAP) as (keyof TelegramThemeParams)[]).forEach((key) => {
    const value = params[key];
    if (value) root.style.setProperty(THEME_VAR_MAP[key], value);
  });
  root.dataset.tgColorScheme = wa.colorScheme;
  // Safe-area / viewport height helpers for CSS.
  if (wa.viewportStableHeight) {
    root.style.setProperty('--tg-viewport-stable-height', `${wa.viewportStableHeight}px`);
  }
  root.style.setProperty(
    '--tg-safe-area-inset-bottom',
    'var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))'
  );
}

let themeListenerBound = false;

/** Call once on app mount. Safe outside Telegram. */
export function initTelegram(): void {
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
  applyThemeParams();
  if (!themeListenerBound && typeof wa.onEvent === 'function') {
    themeListenerBound = true;
    wa.onEvent('themeChanged', applyThemeParams);
    wa.onEvent('viewportChanged', applyThemeParams);
  }
}

export const haptics = {
  impact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
    try {
      getWebApp()?.HapticFeedback?.impactOccurred(style);
    } catch {
      /* noop */
    }
  },
  notification(type: 'error' | 'success' | 'warning'): void {
    try {
      getWebApp()?.HapticFeedback?.notificationOccurred(type);
    } catch {
      /* noop */
    }
  },
  selection(): void {
    try {
      getWebApp()?.HapticFeedback?.selectionChanged();
    } catch {
      /* noop */
    }
  },
};

export const mainButton = {
  setText(text: string): void {
    getWebApp()?.MainButton?.setText(text);
  },
  show(): void {
    getWebApp()?.MainButton?.show();
  },
  hide(): void {
    getWebApp()?.MainButton?.hide();
  },
  enable(): void {
    getWebApp()?.MainButton?.enable();
  },
  disable(): void {
    getWebApp()?.MainButton?.disable();
  },
  showProgress(): void {
    getWebApp()?.MainButton?.showProgress(true);
  },
  hideProgress(): void {
    getWebApp()?.MainButton?.hideProgress();
  },
  configure(opts: { text: string; visible: boolean; active: boolean; progress?: boolean }): void {
    const mb = getWebApp()?.MainButton;
    if (!mb) return;
    mb.setText(opts.text);
    if (opts.progress) mb.showProgress(true);
    else mb.hideProgress();
    if (opts.active) mb.enable();
    else mb.disable();
    if (opts.visible) mb.show();
    else mb.hide();
  },
  onClick(cb: () => void): void {
    getWebApp()?.MainButton?.onClick(cb);
  },
  offClick(cb: () => void): void {
    getWebApp()?.MainButton?.offClick(cb);
  },
};

export const backButton = {
  show(): void {
    getWebApp()?.BackButton?.show();
  },
  hide(): void {
    getWebApp()?.BackButton?.hide();
  },
  onClick(cb: () => void): void {
    getWebApp()?.BackButton?.onClick(cb);
  },
  offClick(cb: () => void): void {
    getWebApp()?.BackButton?.offClick(cb);
  },
};

export function openTelegramLink(url: string): void {
  const wa = getWebApp();
  if (wa) {
    try {
      wa.openTelegramLink(url);
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openLink(url: string): void {
  const wa = getWebApp();
  if (wa) {
    try {
      wa.openLink(url);
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Share a link through Telegram's native share sheet URL. */
export function shareViaTelegram(url: string, text?: string): void {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}${
    text ? `&text=${encodeURIComponent(text)}` : ''
  }`;
  openTelegramLink(shareUrl);
}
