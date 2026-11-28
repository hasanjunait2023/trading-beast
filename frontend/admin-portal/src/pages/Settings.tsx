import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type TelegramDiagnostics, type TelegramPublicConfig, type TelegramWebhookInfo } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { UnavailableState } from '@shared/components/UnavailableState';
import { errorMessage, errorStatus } from '../lib/format';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] px-3 py-2.5">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium break-all">{children}</span>
    </div>
  );
}

function CheckRow({ ok, label, env, detail }: { ok: boolean; label: string; env?: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] px-3 py-2.5">
      <span aria-hidden="true" className={`mt-0.5 font-bold ${ok ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{ok ? '✓' : '✕'}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}{env && <span className="ml-2 font-mono text-xs text-[var(--color-text-muted)]">{env}</span>}</p>
        <p className="text-sm break-all text-[var(--color-text-muted)]">{detail}</p>
      </div>
    </div>
  );
}

/**
 * Settings — honest read-only status. The admin API exposes no settings
 * mutation (no plan/price config, no feature flags, no bot-text editing),
 * so this page shows only what GET /telegram/config, /telegram/diagnostics
 * and /telegram/webhook-info actually report, and says plainly that
 * configuration changes happen in the server environment. Actions live on
 * the Telegram page.
 */
export default function Settings() {
  const [config, setConfig] = useState<TelegramPublicConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [webhookError, setWebhookError] = useState('');
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnostics | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError, setDiagError] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminApi.telegramConfig();
      if (res.data.success) { setConfig(res.data.data); setConfigError(''); }
    } catch (e) { setConfigError(errorMessage(e)); }
  }, []);

  const loadWebhookInfo = useCallback(async () => {
    try {
      const res = await adminApi.telegramWebhookInfo();
      const raw = res.data.data;
      const info = (raw?.result ?? raw) as TelegramWebhookInfo | undefined;
      if (info && typeof info === 'object') { setWebhookInfo(info); setWebhookError(''); }
      else setWebhookError('Webhook info unavailable');
    } catch (e) { setWebhookError(errorMessage(e)); }
  }, []);

  const runDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    try {
      const res = await adminApi.telegramDiagnostics();
      if (res.data.success) { setDiagnostics(res.data.data); setDiagError(''); }
    } catch (e) {
      setDiagError(errorStatus(e) === 503 ? 'Bot token not configured on the server (TELEGRAM_BOT_TOKEN missing).' : errorMessage(e));
    } finally { setDiagLoading(false); }
  }, []);

  useEffect(() => { void loadConfig(); void loadWebhookInfo(); void runDiagnostics(); }, [loadConfig, loadWebhookInfo, runDiagnostics]);

  const readiness = diagnostics ? [
    { label: 'Bot token', env: 'TELEGRAM_BOT_TOKEN', ok: diagnostics.config.botTokenSet, detail: 'Required for every Telegram feature' },
    { label: 'Webhook secret', env: 'TELEGRAM_WEBHOOK_SECRET', ok: diagnostics.config.webhookSecretSet, detail: 'Verifies incoming webhook calls are really from Telegram' },
    { label: 'Mini App URL', env: 'TELEGRAM_MINI_APP_URL', ok: diagnostics.config.miniAppUrlSet, detail: 'Public HTTPS URL of the Telegram Mini App' },
    { label: 'Admin Telegram IDs', env: 'ADMIN_TELEGRAM_IDS', ok: diagnostics.config.adminIdsSet, detail: 'Telegram accounts allowed to use this admin portal' },
    { label: 'Bot reachable', ok: Boolean(diagnostics.bot?.id), detail: diagnostics.bot?.username ? `Responding as @${diagnostics.bot.username}` : 'Telegram API answered the diagnostics check' },
    { label: 'Webhook registered', ok: Boolean(diagnostics.webhook?.url), detail: diagnostics.webhook?.url || 'No webhook URL is registered with Telegram' },
  ] : [];
  const readyCount = readiness.filter((r) => r.ok).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Configuration status — read-only. There is no settings API; values live in the server environment."
        actions={<Button variant="secondary" size="sm" loading={diagLoading} onClick={() => { void loadConfig(); void loadWebhookInfo(); void runDiagnostics(); }}>Refresh status</Button>}
      />

      <Card>
        <p className="text-sm text-[var(--color-text-muted)]">
          This page is a status view, not a settings form. Configuration lives in the server's environment
          (<span className="font-mono text-[var(--color-text)]">.env</span>) and changes take effect through a restart
          or deploy — secret values are never shown here, only whether they are set. Live Telegram actions
          (menu button, webhook) are performed on the{' '}
          <Link to="/telegram" className="font-medium text-[var(--color-link)] hover:underline">Telegram page</Link>.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Telegram configuration</h2>
          {configError ? (
            <ErrorState message={`Failed to load Telegram config: ${configError}`} onRetry={() => void loadConfig()} />
          ) : !config ? (
            <div className="space-y-3" role="status" aria-label="Loading configuration"><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></div>
          ) : (
            <div className="space-y-2">
              <Row label="Bot username">{config.botUsername ? `@${config.botUsername.replace(/^@/, '')}` : '—'}</Row>
              <Row label="Mini App">
                {config.miniAppUrl ? (
                  <a href={config.miniAppUrl} target="_blank" rel="noreferrer" className="font-mono text-xs text-[var(--color-link)] hover:underline">{config.miniAppUrl}</a>
                ) : '—'}
              </Row>
              <Row label="Mini App configured">{config.miniAppConfigured ? 'Configured' : 'Not configured'}</Row>
              <Row label="Webhook path"><span className="font-mono text-xs">{config.webhookPath}</span></Row>
              <Row label="Live webhook URL">{webhookError ? `Unavailable (${webhookError})` : webhookInfo ? (webhookInfo.url || 'Not set') : '…'}</Row>
              {webhookInfo && <Row label="Pending Telegram updates">{webhookInfo.pending_update_count}</Row>}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Link to="/telegram"><Button variant="secondary" size="sm">Open Telegram tools</Button></Link>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold">Environment readiness</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Derived from live diagnostics — presence of each setting, never its value.</p>
          {diagError ? (
            <ErrorState message={diagError} onRetry={() => void runDiagnostics()} />
          ) : diagLoading && !diagnostics ? (
            <div className="space-y-3" role="status" aria-label="Running diagnostics"><Skeleton height={32} /><Skeleton height={32} /></div>
          ) : diagnostics ? (
            <>
              <p className="mb-3 text-sm"><span className="tnum font-bold">{readyCount} of {readiness.length}</span> <span className="text-[var(--color-text-muted)]">checks passing</span></p>
              <div className="space-y-2">
                {readiness.map((item) => <CheckRow key={item.label} {...item} />)}
              </div>
              {diagnostics.menuButton && (
                <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                  Chat menu button: <span className="font-mono text-[var(--color-text)]">{diagnostics.menuButton.type}</span>
                  {diagnostics.menuButton.web_app?.url && <> → <span className="font-mono break-all">{diagnostics.menuButton.web_app.url}</span></>}
                </p>
              )}
            </>
          ) : null}
        </Card>
      </div>

      <Card>
        <h2 className="mb-2 font-semibold">Payments</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Payments are manual: users submit a payment with a transaction ID, and an admin verifies it on the{' '}
          <Link to="/payments" className="font-medium text-[var(--color-link)] hover:underline">Payments page</Link>{' '}
          before the tier is activated. There is no payment-gateway configuration in this portal, and approval
          additionally requires the server flag for legacy payment approval.
        </p>
      </Card>

      <Card>
        <UnavailableState
          title="Plan, price and feature-flag settings are not available"
          reason="The admin API has no endpoints for plan/price configuration, feature flags or bot texts, so no editable settings are offered here. To change a server setting: edit the backend .env, restart or redeploy the backend, then re-check this page."
        />
      </Card>
    </div>
  );
}
