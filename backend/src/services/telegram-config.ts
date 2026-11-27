// Pure, testable helpers for Telegram Mini App configuration.
// No secrets are handled here — only presence/validity of public config.

export interface TelegramPublicConfig {
  botUsername: string | null;
  miniAppUrl: string | null;
  miniAppConfigured: boolean;
  webhookPath: string;
}

type EnvLike = Record<string, string | undefined>;

/**
 * A Mini App URL is valid only when it parses, uses HTTPS and carries no
 * embedded credentials — mirrors backend/scripts/configure-telegram-menu.mjs.
 */
export function isValidMiniAppUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** Returns the normalized (href) Mini App URL when valid, otherwise null. */
export function getValidMiniAppUrl(env: EnvLike = process.env): string | null {
  const raw = env.TELEGRAM_MINI_APP_URL;
  if (!isValidMiniAppUrl(raw)) return null;
  return new URL(raw as string).href;
}

/** Origin of the configured Mini App URL (for the CORS allowlist), or null. */
export function getMiniAppOrigin(env: EnvLike = process.env): string | null {
  const valid = getValidMiniAppUrl(env);
  return valid ? new URL(valid).origin : null;
}

/** Public config shape served by GET /api/telegram/config — never secrets. */
export function buildTelegramConfig(env: EnvLike = process.env): TelegramPublicConfig {
  const miniAppUrl = getValidMiniAppUrl(env);
  return {
    botUsername: env.TELEGRAM_BOT_USERNAME || null,
    miniAppUrl,
    miniAppConfigured: miniAppUrl !== null,
    webhookPath: '/api/telegram/webhook',
  };
}
