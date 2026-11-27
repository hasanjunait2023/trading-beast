import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../services/api';
import type {
  TelegramPublicConfig,
  TelegramDiagnostics,
  TelegramWebhookInfo
} from '../services/api';
import {
  Send, RefreshCw, Bot, Webhook, MenuSquare, Settings2,
  CheckCircle, AlertCircle, XCircle, Play, Link2
} from 'lucide-react';

function errorInfo(error: unknown): { status?: number; message: string } {
  const err = error as {
    response?: { status?: number; data?: { error?: string; description?: string } };
    message?: string;
  };
  return {
    status: err?.response?.status,
    message:
      err?.response?.data?.error ||
      err?.response?.data?.description ||
      err?.message ||
      'Request failed'
  };
}

function SetBadge({ set, setLabel = 'Set', unsetLabel = 'Not set' }: { set: boolean; setLabel?: string; unsetLabel?: string }) {
  return set ? (
    <span className="badge badge-approved">{setLabel}</span>
  ) : (
    <span className="badge badge-rejected">{unsetLabel}</span>
  );
}

function Feedback({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${
        ok
          ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
          : 'bg-red-900/30 border-red-500/30 text-red-300'
      }`}
    >
      {ok ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
      <span>{text}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 bg-[var(--color-bg)] rounded-lg">
      <span className="text-sm text-[var(--color-text-muted)] flex-shrink-0">{label}</span>
      <span className="font-medium text-right break-all min-w-0">{children}</span>
    </div>
  );
}

export default function Telegram() {
  // Public config
  const [config, setConfig] = useState<TelegramPublicConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

  // Diagnostics
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');

  // Menu button form
  const [menuUrl, setMenuUrl] = useState('');
  const [menuText, setMenuText] = useState('Open App');
  const [menuSubmitting, setMenuSubmitting] = useState(false);
  const [menuFeedback, setMenuFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // Webhook
  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError('');
    try {
      const res = await adminApi.telegramConfig();
      if (res.data.success) {
        const data = res.data.data as TelegramPublicConfig;
        setConfig(data);
        if (data.miniAppUrl) setMenuUrl((prev) => prev || data.miniAppUrl || '');
      } else {
        setConfigError(res.data.error || 'Failed to load Telegram config');
      }
    } catch (error) {
      setConfigError(errorInfo(error).message);
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadWebhookInfo = useCallback(async () => {
    setWebhookLoading(true);
    setWebhookError('');
    try {
      const res = await adminApi.telegramWebhookInfo();
      // Backend wraps the raw Telegram response: data = { ok, result }
      const raw = res.data.data;
      const info = (raw?.result ?? raw) as TelegramWebhookInfo | undefined;
      if (info && typeof info === 'object') {
        setWebhookInfo(info);
      } else {
        setWebhookError('Webhook info unavailable');
      }
    } catch (error) {
      const { status, message } = errorInfo(error);
      setWebhookError(
        status === 503 || /token/i.test(message)
          ? 'Bot token not configured on the server'
          : `Failed to load webhook info: ${message}`
      );
    } finally {
      setWebhookLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadWebhookInfo();
  }, [loadConfig, loadWebhookInfo]);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError('');
    try {
      const res = await adminApi.telegramDiagnostics();
      if (res.data.success) {
        setDiagnostics(res.data.data as TelegramDiagnostics);
      } else {
        setDiagError(res.data.error || 'Diagnostics failed');
      }
    } catch (error) {
      const { status, message } = errorInfo(error);
      if (status === 503) {
        setDiagError('Bot token not configured on the server. Set TELEGRAM_BOT_TOKEN in the backend environment and restart the backend.');
      } else if (status === 502) {
        setDiagError('Telegram API could not be reached or rejected the request. Check the bot token and server connectivity, then try again.');
      } else {
        setDiagError(message);
      }
    } finally {
      setDiagLoading(false);
    }
  };

  const submitMenuButton = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenuSubmitting(true);
    setMenuFeedback(null);
    try {
      const res = await adminApi.setTelegramMenuButton(menuUrl.trim() || undefined, menuText.trim() || undefined);
      if (res.data.success) {
        const verified = res.data.data?.menuButton;
        setMenuFeedback({
          ok: true,
          text: `Menu button set & verified${verified?.web_app?.url ? `: ${verified.web_app.url}` : ''}`
        });
        if (diagnostics) void runDiagnostics();
      } else {
        setMenuFeedback({ ok: false, text: res.data.error || 'Failed to set menu button' });
      }
    } catch (error) {
      const { status, message } = errorInfo(error);
      setMenuFeedback({
        ok: false,
        text:
          status === 400
            ? `Invalid menu button settings: ${message}`
            : status === 503
              ? 'Bot token not configured on the server'
              : status === 502
                ? 'Telegram rejected or could not verify the menu button. Check the URL is public HTTPS and try again.'
                : message
      });
    } finally {
      setMenuSubmitting(false);
    }
  };

  const submitWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSubmitting(true);
    setWebhookFeedback(null);
    try {
      const res = await adminApi.setTelegramWebhook(webhookUrl.trim());
      if (res.data.success) {
        setWebhookFeedback({ ok: true, text: 'Webhook updated. Loading the current webhook info…' });
        void loadWebhookInfo();
      } else {
        const description = res.data.data?.description as string | undefined;
        setWebhookFeedback({ ok: false, text: description || res.data.error || 'Telegram rejected the webhook URL' });
      }
    } catch (error) {
      const { status, message } = errorInfo(error);
      setWebhookFeedback({
        ok: false,
        text:
          status === 503
            ? 'Webhook secret (or bot token) not configured on the server'
            : status === 400
              ? `Invalid webhook request: ${message}`
              : `Failed to set webhook: ${message}`
      });
    } finally {
      setWebhookSubmitting(false);
    }
  };

  const presenceRows = diagnostics
    ? [
        { label: 'Bot token (TELEGRAM_BOT_TOKEN)', set: diagnostics.config.botTokenSet },
        { label: 'Webhook secret (TELEGRAM_WEBHOOK_SECRET)', set: diagnostics.config.webhookSecretSet },
        { label: 'Mini App URL (TELEGRAM_MINI_APP_URL)', set: diagnostics.config.miniAppUrlSet },
        { label: 'Admin IDs (ADMIN_TELEGRAM_IDS)', set: diagnostics.config.adminIdsSet }
      ]
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Send className="w-6 h-6 text-[var(--color-accent)]" />
            Telegram
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Bot configuration, Mini App menu button, webhook and live diagnostics. Secret values are never shown — only whether they are set.
          </p>
        </div>
        <button onClick={() => { void loadConfig(); void loadWebhookInfo(); }} className="btn btn-secondary btn-sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Config card */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-[var(--color-accent)]" />
          Configuration
        </h2>
        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : configError ? (
          <Feedback ok={false} text={`Failed to load Telegram config: ${configError}`} />
        ) : config ? (
          <div className="space-y-3">
            <Row label="Bot username">
              {config.botUsername ? `@${config.botUsername.replace(/^@/, '')}` : '—'}
            </Row>
            <Row label="Mini App">
              <span className="inline-flex items-center gap-2 flex-wrap justify-end">
                {config.miniAppUrl ? (
                  <a
                    href={config.miniAppUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-accent)] hover:underline font-mono text-sm"
                  >
                    {config.miniAppUrl}
                  </a>
                ) : (
                  <span>—</span>
                )}
                <SetBadge set={config.miniAppConfigured} setLabel="Configured" unsetLabel="Not configured" />
              </span>
            </Row>
            <Row label="Webhook path">
              <span className="font-mono text-sm">{config.webhookPath}</span>
            </Row>
          </div>
        ) : null}
      </div>

      {/* Diagnostics card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-medium flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--color-accent)]" />
            Diagnostics
          </h2>
          <button onClick={runDiagnostics} disabled={diagLoading} className="btn btn-primary btn-sm">
            {diagLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                Running…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run diagnostics
              </>
            )}
          </button>
        </div>

        {diagError && <Feedback ok={false} text={diagError} />}

        {!diagnostics && !diagError && !diagLoading && (
          <p className="text-sm text-[var(--color-text-muted)]">
            Run diagnostics to check the live bot, its webhook, the chat menu button and which server settings are present.
          </p>
        )}
        {diagLoading && !diagnostics && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        )}

        {diagnostics && (
          <div className="space-y-6">
            <div className="grid lg:grid-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Bot</h3>
                <Row label="Name">{diagnostics.bot.first_name || '—'}</Row>
                <Row label="Username">
                  {diagnostics.bot.username ? `@${diagnostics.bot.username}` : '—'}
                </Row>
                <Row label="Bot ID">
                  <span className="font-mono text-sm">{diagnostics.bot.id}</span>
                </Row>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Menu button (live)</h3>
                <Row label="Type">
                  <span className="font-mono text-sm">{diagnostics.menuButton.type}</span>
                </Row>
                {diagnostics.menuButton.text && <Row label="Text">{diagnostics.menuButton.text}</Row>}
                {diagnostics.menuButton.web_app?.url && (
                  <Row label="Web App URL">
                    <span className="font-mono text-sm">{diagnostics.menuButton.web_app.url}</span>
                  </Row>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Webhook (live)</h3>
              <Row label="URL">
                {diagnostics.webhook.url ? (
                  <span className="font-mono text-sm">{diagnostics.webhook.url}</span>
                ) : (
                  <span className="inline-flex items-center gap-2">Not set <XCircle className="w-4 h-4 text-[var(--color-danger)]" /></span>
                )}
              </Row>
              <Row label="Pending updates">{diagnostics.webhook.pending_update_count}</Row>
              {diagnostics.webhook.last_error_message && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Last webhook error
                    {diagnostics.webhook.last_error_date
                      ? ` — ${new Date(diagnostics.webhook.last_error_date * 1000).toLocaleString()}`
                      : ''}
                  </p>
                  <p className="mt-1 break-all">{diagnostics.webhook.last_error_message}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                Server settings — presence only
              </h3>
              {presenceRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 p-3 bg-[var(--color-bg)] rounded-lg">
                  <span className="text-sm font-mono">{row.label}</span>
                  <SetBadge set={row.set} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Menu button card */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <MenuSquare className="w-5 h-5 text-[var(--color-accent)]" />
          Chat Menu Button (Mini App)
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Sets the persistent menu button next to the message input in the bot chat, and verifies it with Telegram afterwards.
        </p>
        <form onSubmit={submitMenuButton} className="space-y-4">
          <div className="grid sm:grid-2 gap-4">
            <div>
              <label className="label" htmlFor="menu-url">Mini App URL (HTTPS)</label>
              <input
                id="menu-url"
                className="input"
                type="url"
                placeholder="https://tradingbeast.ecomex.cloud"
                value={menuUrl}
                onChange={(e) => setMenuUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="menu-text">Button text</label>
              <input
                id="menu-text"
                className="input"
                type="text"
                maxLength={64}
                placeholder="Open App"
                value={menuText}
                onChange={(e) => setMenuText(e.target.value)}
              />
            </div>
          </div>
          {menuFeedback && <Feedback ok={menuFeedback.ok} text={menuFeedback.text} />}
          <button type="submit" disabled={menuSubmitting} className="btn btn-primary">
            {menuSubmitting ? 'Setting…' : 'Set & verify menu button'}
          </button>
        </form>
      </div>

      {/* Webhook card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-medium flex items-center gap-2">
            <Webhook className="w-5 h-5 text-[var(--color-accent)]" />
            Webhook
          </h2>
          <button onClick={loadWebhookInfo} disabled={webhookLoading} className="btn btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${webhookLoading ? 'animate-spin' : ''}`} />
            Load current webhook info
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {webhookLoading && !webhookInfo ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          ) : webhookError ? (
            <Feedback ok={false} text={webhookError} />
          ) : webhookInfo ? (
            <>
              <Row label="Current URL">
                {webhookInfo.url ? (
                  <span className="font-mono text-sm">{webhookInfo.url}</span>
                ) : (
                  'Not set'
                )}
              </Row>
              <Row label="Pending updates">{webhookInfo.pending_update_count}</Row>
              {webhookInfo.last_error_message && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Last webhook error
                    {webhookInfo.last_error_date
                      ? ` — ${new Date(webhookInfo.last_error_date * 1000).toLocaleString()}`
                      : ''}
                  </p>
                  <p className="mt-1 break-all">{webhookInfo.last_error_message}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">No webhook info loaded yet.</p>
          )}
        </div>

        <form onSubmit={submitWebhook} className="space-y-4">
          <div>
            <label className="label" htmlFor="webhook-url">
              <span className="inline-flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> New webhook URL</span>
            </label>
            <input
              id="webhook-url"
              className="input"
              type="url"
              required
              placeholder="https://your-domain/api/telegram/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Must be a public HTTPS URL ending in the webhook path shown in Configuration. The server sends its configured webhook secret with the registration.
            </p>
          </div>
          {webhookFeedback && <Feedback ok={webhookFeedback.ok} text={webhookFeedback.text} />}
          <button type="submit" disabled={webhookSubmitting || !webhookUrl.trim()} className="btn btn-primary">
            {webhookSubmitting ? 'Setting…' : 'Set webhook'}
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        Changes here act on the live bot immediately. The BotFather Main Mini App (short name) is configured separately in @BotFather.
      </p>
    </div>
  );
}
