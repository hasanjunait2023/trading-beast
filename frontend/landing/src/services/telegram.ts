import { useEffect, useState } from 'react';

/**
 * Telegram links for the landing page.
 *
 * Source of truth is the backend's public config endpoint
 * (Phase B: GET {VITE_API_URL}/telegram/config ->
 * { success, data: { botUsername, miniAppUrl, miniAppConfigured, webhookPath } }),
 * which never exposes secrets. When VITE_API_URL is unset we skip the fetch
 * entirely; when the fetch is unavailable we fall back to the build-time
 * VITE_BOT_USERNAME. If neither yields a bot username, CTAs must fall back to
 * in-page anchors ('#pricing' / '#docs') — never to '/dashboard' or '/login',
 * which are dead relative links on the landing domain.
 */
export interface TelegramLinks {
  /** Bot username without '@', or null when unknown. */
  botUsername: string | null;
  /** https://t.me/<username>, or null when the bot is unknown. */
  botUrl: string | null;
  /** Public Mini App URL from the backend config, or null. */
  miniAppUrl: string | null;
  /** Primary CTA target: the bot link when known, else the pricing anchor. */
  primaryHref: string;
  /** True when primaryHref points at Telegram (render target=_blank). */
  isTelegram: boolean;
}

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const API_URL = env.VITE_API_URL?.replace(/\/+$/, '') || null;
const ENV_BOT_USERNAME = env.VITE_BOT_USERNAME?.replace(/^@/, '').trim() || null;

function toBotUrl(username: string | null): string | null {
  return username ? `https://t.me/${username}` : null;
}

function buildLinks(botUsername: string | null, miniAppUrl: string | null): TelegramLinks {
  const botUrl = toBotUrl(botUsername);
  return {
    botUsername,
    botUrl,
    miniAppUrl,
    primaryHref: botUrl ?? '#pricing',
    isTelegram: Boolean(botUrl),
  };
}

interface TelegramConfigResponse {
  success?: boolean;
  data?: {
    botUsername?: string | null;
    miniAppUrl?: string | null;
  };
}

let configPromise: Promise<{ botUsername: string | null; miniAppUrl: string | null }> | null = null;

function loadTelegramConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      if (API_URL) {
        try {
          const res = await fetch(`${API_URL}/telegram/config`);
          if (res.ok) {
            const json = (await res.json()) as TelegramConfigResponse;
            const botUsername = json.data?.botUsername?.replace(/^@/, '').trim() || null;
            if (botUsername || json.data?.miniAppUrl) {
              return { botUsername, miniAppUrl: json.data?.miniAppUrl ?? null };
            }
          }
        } catch {
          // Backend unreachable — fall through to the env fallback below.
        }
      }
      return { botUsername: ENV_BOT_USERNAME, miniAppUrl: null };
    })();
  }
  return configPromise;
}

/**
 * Reactive Telegram links: starts from the build-time VITE_BOT_USERNAME (so a
 * configured site renders the right CTA immediately) and upgrades to the
 * backend config once it loads.
 */
export function useTelegramLinks(): TelegramLinks {
  const [links, setLinks] = useState<TelegramLinks>(() => buildLinks(ENV_BOT_USERNAME, null));

  useEffect(() => {
    let cancelled = false;
    loadTelegramConfig().then(({ botUsername, miniAppUrl }) => {
      if (!cancelled) setLinks(buildLinks(botUsername, miniAppUrl));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return links;
}

/** Props to spread on an external Telegram CTA anchor (empty for in-page anchors). */
export function telegramLinkProps(links: TelegramLinks): { target?: string; rel?: string } {
  return links.isTelegram ? { target: '_blank', rel: 'noreferrer' } : {};
}
