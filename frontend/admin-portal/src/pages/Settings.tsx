import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../services/api';
import type { TelegramPublicConfig, TelegramDiagnostics, TelegramWebhookInfo } from '../services/api';
import {
  Settings as SettingsIcon, RefreshCw, Send, ClipboardCheck, Info,
  CheckCircle, XCircle, AlertCircle, ArrowRight, CreditCard
} from 'lucide-react';

function errorMessage(error: unknown): string {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || 'Request failed';
}

function SetBadge({ set, setLabel = 'Set', unsetLabel = 'Not set' }: { set: boolean; setLabel?: string; unsetLabel?: string }) {
  return set ? (
    <span className="badge badge-approved">{setLabel}</span>
  ) : (
    <span className="badge badge-rejected">{unsetLabel}</span>
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

export default function Settings() {
  const [config, setConfig] = useState<TelegramPublicConfig | null>(null);
  const [configError, setConfigError] = useState('');

  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [webhookError, setWebhookError] = useState('');

  const [diagnostics, setDiagnostics] = useState<TelegramDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');

  const loadConfig = useCallback(async () => {
    setConfigError('');
    try {
      const res = await adminApi.telegramConfig();
      if (res.data.success) setConfig(res.data.data as TelegramPublicConfig);
      else setConfigError(res.data.error || 'Failed to load config');
    } catch (error) {
      setConfigError(errorMessage(error));
    }
  }, []);

  const loadWebhookInfo = useCallback(async () => {
    setWebhookError('');
    try {
      const res = await adminApi.telegramWebhookInfo();
      const raw = res.data.data;
      const info = (raw?.result ?? raw) as TelegramWebhookInfo | undefined;
      if (info && typeof info === 'object') setWebhookInfo(info);
      else setWebhookError('Webhook info unavailable');
    } catch (error) {
      setWebhookError(errorMessage(error));
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagError('');
    try {
      const res = await adminApi.telegramDiagnostics();
      if (res.data.success) setDiagnostics(res.data.data as TelegramDiagnostics);
      else setDiagError(res.data.error || 'Diagnostics failed');
    } catch (error) {
      const err = error as { response?: { status?: number } };
      setDiagError(
        err?.response?.status === 503
          ? 'Bot token not configured on the server (TELEGRAM_BOT_TOKEN missing).'
          : errorMessage(error)
      );
    } finally {
      setDiagLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadWebhookInfo();
    void runDiagnostics();
  }, [loadConfig, loadWebhookInfo, runDiagnostics]);

  const refreshAll = () => {
    void loadConfig();
    void loadWebhookInfo();
    void runDiagnostics();
  };

  const readiness = diagnostics
    ? [
        { label: 'Bot token', env: 'TELEGRAM_BOT_TOKEN', ok: diagnostics.config.botTokenSet, detail: 'Required for every Telegram feature' },
        { label: 'Webhook secret', env: 'TELEGRAM_WEBHOOK_SECRET', ok: diagnostics.config.webhookSecretSet, detail: 'Verifies incoming webhook calls are really from Telegram' },
        { label: 'Mini App URL', env: 'TELEGRAM_MINI_APP_URL', ok: diagnostics.config.miniAppUrlSet, detail: 'Public HTTPS URL of the Telegram Mini App' },
        { label: 'Admin Telegram IDs', env: 'ADMIN_TELEGRAM_IDS', ok: diagnostics.config.adminIdsSet, detail: 'Telegram accounts allowed to use this admin portal' },
        { label: 'Bot reachable', env: null, ok: Boolean(diagnostics.bot?.id), detail: diagnostics.bot?.username ? `Responding as @${diagnostics.bot.username}` : 'Telegram API answered the diagnostics check' },
        { label: 'Webhook registered', env: null, ok: Boolean(diagnostics.webhook?.url), detail: diagnostics.webhook?.url || 'No webhook URL is registered with Telegram' }
      ]
    : [];

  const readyCount = readiness.filter((r) => r.ok).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-[var(--color-text-muted)]">Business configuration status — read-only</p>
        </div>
        <button onClick={refreshAll} disabled={diagLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${diagLoading ? 'animate-spin' : ''}`} />
          Refresh status
        </button>
      </div>

      {/* How configuration works */}
      <div className="card flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-text-muted)]">
          This page is a status view, not a settings form. Configuration lives in the server’s environment
          (<span className="font-mono text-[var(--color-text)]">.env</span>) and changes take effect through a
          restart or deploy — secret values are never shown here, only whether they are set. Live Telegram
          actions (menu button, webhook) are performed on the{' '}
          <Link to="/telegram" className="text-[var(--color-accent)] hover:underline">Telegram page</Link>.
        </p>
      </div>

      <div className="grid lg:grid-2 gap-6">
        {/* Telegram configuration status */}
        <div className="card">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-[var(--color-accent)]" />
            Telegram Configuration
          </h2>
          {configError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border bg-red-900/30 border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Failed to load Telegram config: {configError}</span>
            </div>
          ) : !config ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          ) : (
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
              <Row label="Live webhook URL">
                {webhookError ? (
                  <span className="text-[var(--color-text-muted)] text-sm">Unavailable ({webhookError})</span>
                ) : webhookInfo ? (
                  webhookInfo.url ? (
                    <span className="font-mono text-sm">{webhookInfo.url}</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Not set <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
                    </span>
                  )
                ) : (
                  '…'
                )}
              </Row>
              {webhookInfo && (
                <Row label="Pending Telegram updates">{webhookInfo.pending_update_count}</Row>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Link to="/telegram" className="btn btn-secondary btn-sm gap-1">
              Open Telegram tools <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Environment readiness checklist */}
        <div className="card">
          <h2 className="font-medium mb-1 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[var(--color-accent)]" />
            Environment Readiness
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Derived from live diagnostics — presence of each setting, never its value.
          </p>

          {diagError ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border bg-red-900/30 border-red-500/30 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{diagError}</span>
            </div>
          ) : diagLoading && !diagnostics ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
            </div>
          ) : diagnostics ? (
            <>
              <p className="text-sm mb-3">
                <span className="font-display font-bold">{readyCount} of {readiness.length}</span>{' '}
                <span className="text-[var(--color-text-muted)]">checks passing</span>
              </p>
              <div className="space-y-2">
                {readiness.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
                    {item.ok ? (
                      <CheckCircle className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {item.label}
                        {item.env && <span className="font-mono text-xs text-[var(--color-text-muted)] ml-2">{item.env}</span>}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)] break-all">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              {diagnostics.menuButton && (
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  Chat menu button: <span className="font-mono text-[var(--color-text)]">{diagnostics.menuButton.type}</span>
                  {diagnostics.menuButton.web_app?.url && (
                    <> → <span className="font-mono break-all">{diagnostics.menuButton.web_app.url}</span></>
                  )}
                </p>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Payments configuration note */}
      <div className="card">
        <h2 className="font-medium mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-[var(--color-accent)]" />
          Payments
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Payments are manual: users submit a payment with a transaction ID (methods in use: bKash, Nagad,
          USDT, Stripe, manual), and an admin verifies it on the{' '}
          <Link to="/payments" className="text-[var(--color-accent)] hover:underline">Payments page</Link>{' '}
          before the tier is activated. There is no payment-gateway configuration in this portal. Per the
          approved credit model, digital purchases inside Telegram itself must use Telegram Stars — no
          external payment offers are made inside the bot.
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <SettingsIcon className="w-4 h-4" />
          To change any server setting: edit the backend <span className="font-mono text-[var(--color-text)]">.env</span>,
          restart or redeploy the backend, then re-check this page.
        </div>
      </div>
    </motion.div>
  );
}
