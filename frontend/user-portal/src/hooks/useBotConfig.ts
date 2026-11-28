import { useEffect, useState } from 'react';
import { telegramApi } from '../services/api';

/**
 * Resolves the configured Telegram bot username: the public
 * GET /telegram/config endpoint first, then the build-time
 * VITE_BOT_USERNAME / VITE_TELEGRAM_BOT_USERNAME env fallback (same order as
 * the Mini App). Returns '' when nothing is configured — callers must then
 * OMIT bot links rather than linking to an unconfigured destination.
 */
const ENV_BOT_USERNAME =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_BOT_USERNAME ||
  (import.meta as { env?: Record<string, string | undefined> }).env
    ?.VITE_TELEGRAM_BOT_USERNAME ||
  '';

let cached: string | null = null;
let inflight: Promise<string> | null = null;

function resolveBotUsername(): Promise<string> {
  if (cached !== null) return Promise.resolve(cached);
  if (!inflight) {
    inflight = telegramApi
      .config()
      .then((res) => {
        const name = res.data.data?.botUsername || ENV_BOT_USERNAME;
        cached = name === 'your_bot' ? '' : name;
        return cached;
      })
      .catch(() => {
        cached = ENV_BOT_USERNAME === 'your_bot' ? '' : ENV_BOT_USERNAME;
        return cached;
      });
  }
  return inflight;
}

export function useBotUsername(): string {
  const [name, setName] = useState<string>(cached ?? ENV_BOT_USERNAME);
  useEffect(() => {
    let alive = true;
    void resolveBotUsername().then((n) => {
      if (alive) setName(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  return name;
}

export function botUrl(botUsername: string): string {
  return botUsername ? `https://t.me/${botUsername}` : '';
}

export function referralUrl(botUsername: string, code: string): string {
  return botUsername && code ? `https://t.me/${botUsername}?start=ref_${code}` : '';
}
