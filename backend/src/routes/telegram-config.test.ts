import { describe, it, expect } from 'vitest';
import {
  isValidMiniAppUrl,
  getValidMiniAppUrl,
  getMiniAppOrigin,
  buildTelegramConfig,
} from '../services/telegram-config.js';

// Route-level tests for /config, /diagnostics and /set-menu-button would need
// the full DB + JWT auth stack (authMiddleware queries Prisma), so the pure
// guard rails those routes rely on — HTTPS validation and the public config
// shape — are unit-tested here. The routes' admin guard itself reuses the
// same authMiddleware + requireAdmin chain as the existing /set-webhook route.

describe('isValidMiniAppUrl (set-menu-button HTTPS validation)', () => {
  it('accepts plain HTTPS URLs', () => {
    expect(isValidMiniAppUrl('https://tradingbeast.ecomex.cloud')).toBe(true);
    expect(isValidMiniAppUrl('https://example.com/app?x=1')).toBe(true);
  });
  it('rejects non-HTTPS URLs', () => {
    expect(isValidMiniAppUrl('http://tradingbeast.ecomex.cloud')).toBe(false);
    expect(isValidMiniAppUrl('ftp://example.com/app')).toBe(false);
  });
  it('rejects URLs with embedded credentials', () => {
    expect(isValidMiniAppUrl('https://user:pass@example.com/app')).toBe(false);
    expect(isValidMiniAppUrl('https://user@example.com/app')).toBe(false);
  });
  it('rejects missing, empty and malformed values', () => {
    expect(isValidMiniAppUrl(undefined)).toBe(false);
    expect(isValidMiniAppUrl(null)).toBe(false);
    expect(isValidMiniAppUrl('')).toBe(false);
    expect(isValidMiniAppUrl('   ')).toBe(false);
    expect(isValidMiniAppUrl('not a url')).toBe(false);
    expect(isValidMiniAppUrl(42)).toBe(false);
  });
});

describe('buildTelegramConfig (GET /api/telegram/config shape)', () => {
  it('returns nulls and miniAppConfigured=false when nothing is configured', () => {
    expect(buildTelegramConfig({})).toEqual({
      botUsername: null,
      miniAppUrl: null,
      miniAppConfigured: false,
      webhookPath: '/api/telegram/webhook',
    });
  });
  it('returns the bot username and normalized Mini App URL when configured', () => {
    expect(
      buildTelegramConfig({
        TELEGRAM_BOT_USERNAME: 'TradingBeastBot',
        TELEGRAM_MINI_APP_URL: 'https://tradingbeast.ecomex.cloud',
      })
    ).toEqual({
      botUsername: 'TradingBeastBot',
      miniAppUrl: 'https://tradingbeast.ecomex.cloud/',
      miniAppConfigured: true,
      webhookPath: '/api/telegram/webhook',
    });
  });
  it('treats a non-HTTPS Mini App URL as not configured', () => {
    const config = buildTelegramConfig({ TELEGRAM_MINI_APP_URL: 'http://example.com/app' });
    expect(config.miniAppUrl).toBeNull();
    expect(config.miniAppConfigured).toBe(false);
  });
  it('never exposes token or webhook secret values', () => {
    const config = buildTelegramConfig({
      TELEGRAM_BOT_USERNAME: 'TradingBeastBot',
      TELEGRAM_MINI_APP_URL: 'https://tradingbeast.ecomex.cloud',
      TELEGRAM_BOT_TOKEN: 'secret-token-value',
      TELEGRAM_WEBHOOK_SECRET: 'secret-webhook-value',
    } as Record<string, string>);
    const serialized = JSON.stringify(config);
    expect(serialized).not.toContain('secret-token-value');
    expect(serialized).not.toContain('secret-webhook-value');
    expect(Object.keys(config).sort()).toEqual(
      ['botUsername', 'miniAppConfigured', 'miniAppUrl', 'webhookPath'].sort()
    );
  });
});

describe('getValidMiniAppUrl / getMiniAppOrigin (CORS allowlist source)', () => {
  it('returns the normalized URL and its origin for a valid HTTPS URL', () => {
    const env = { TELEGRAM_MINI_APP_URL: 'https://tradingbeast.ecomex.cloud/app' };
    expect(getValidMiniAppUrl(env)).toBe('https://tradingbeast.ecomex.cloud/app');
    expect(getMiniAppOrigin(env)).toBe('https://tradingbeast.ecomex.cloud');
  });
  it('returns null for missing or invalid URLs', () => {
    expect(getValidMiniAppUrl({})).toBeNull();
    expect(getMiniAppOrigin({})).toBeNull();
    expect(getMiniAppOrigin({ TELEGRAM_MINI_APP_URL: 'http://example.com' })).toBeNull();
    expect(getMiniAppOrigin({ TELEGRAM_MINI_APP_URL: 'https://u:p@example.com' })).toBeNull();
  });
});
