import { useCallback, useEffect, useState } from 'react';
import { adminApi, type TelegramDiagnostics, type TelegramPublicConfig, type TelegramWebhookInfo } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { FormField, Input } from '@shared/components/FormField';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { errorMessage, errorStatus, formatDateTime } from '../lib/format';

function SetPill({ set, label }: { set: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${set ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
      {label}: {set ? 'Set' : 'Not set'}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)] px-3 py-2.5">
      <span className="shrink-0 text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium break-all">{children}</span>
    </div>
  );
}

/**
 * Telegram ops — behavior preserved from the previous page, rebuilt on the
 * Z0 kit: GET /telegram/config, GET /telegram/diagnostics,
 * GET /telegram/webhook-info, POST /telegram/set-webhook,
 * POST /telegram/set-menu-button (confirmed in a Modal). Secrets are never
 * shown — diagnostics only reports whether each is set.
 */
export default function Telegram() {
  const toast = useToast();
  const [config, setConfig] = useState<TelegramPublicConfig | null>(null);
  const [configError, setConfigError] = useState('');
  const [diagnostics, setDiagnostics] = useState<TelegramDiagnostics | null>(null);
  const [diagError, setDiagError] = useState('');
  const [diagLoading, setDiagLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<TelegramWebhookInfo | null>(null);
  const [webhookError, setWebhookError] = useState('');

  const [menuUrl, setMenuUrl] = useState('');
  const [menuText, setMenuText] = useState('Open App');
  const [menuConfirm, setMenuConfirm] = useState(false);
  const [menuSubmitting, setMenuSubmitting] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookConfirm, setWebhookConfirm] = useState(false);
  const [webhookSubmitting, setWebhookSubmitting] = useState(false);

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

  useEffect(() => {
    if (config?.miniAppUrl && !menuUrl) setMenuUrl(config.miniAppUrl);
    // seed once from config
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const submitMenuButton = async () => {
    setMenuSubmitting(true);
    try {
      const res = await adminApi.setTelegramMenuButton(menuUrl.trim() || undefined, menuText.trim() || undefined);
      if (res.data.success) {
        toast.success('Menu button updated and verified with Telegram.');
        setMenuConfirm(false);
        void runDiagnostics();
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to set the menu button.'));
    } finally { setMenuSubmitting(false); }
  };

  const submitWebhook = async () => {
    setWebhookSubmitting(true);
    try {
      const res = await adminApi.setTelegramWebhook(webhookUrl.trim());
      if (res.data.success) {
        toast.success('Webhook updated.');
        setWebhookConfirm(false);
        setWebhookUrl('');
        void loadWebhookInfo();
        void runDiagnostics();
      }
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to set the webhook.'));
    } finally { setWebhookSubmitting(false); }
  };

  const refreshAll = () => { void loadConfig(); void loadWebhookInfo(); void runDiagnostics(); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Telegram"
        subtitle="Bot configuration, menu button, webhook and live diagnostics. Secret values are never shown — only whether they are set."
        actions={<Button variant="secondary" size="sm" loading={diagLoading} onClick={refreshAll}>Refresh all</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Configuration</h2>
          {configError ? (
            <ErrorState message={`Failed to load Telegram config: ${configError}`} onRetry={() => void loadConfig()} />
          ) : !config ? (
            <div className="space-y-3" role="status" aria-label="Loading configuration"><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></div>
          ) : (
            <div className="space-y-2">
              <Row label="Bot username">{config.botUsername ? `@${config.botUsername.replace(/^@/, '')}` : '—'}</Row>
              <Row label="Mini App URL">{config.miniAppUrl ?? '—'}</Row>
              <Row label="Mini App configured"><SetPill set={config.miniAppConfigured} label="Mini App" /></Row>
              <Row label="Webhook path"><span className="font-mono text-xs">{config.webhookPath}</span></Row>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Live webhook (Telegram)</h2>
          {webhookError ? (
            <ErrorState message={`Webhook info unavailable: ${webhookError}`} onRetry={() => void loadWebhookInfo()} />
          ) : !webhookInfo ? (
            <div className="space-y-3" role="status" aria-label="Loading webhook info"><Skeleton height={32} /><Skeleton height={32} /></div>
          ) : (
            <div className="space-y-2">
              <Row label="Registered URL">{webhookInfo.url || 'Not set'}</Row>
              <Row label="Pending updates">{webhookInfo.pending_update_count}</Row>
              {webhookInfo.ip_address && <Row label="IP address">{webhookInfo.ip_address}</Row>}
              {webhookInfo.last_error_message && (
                <Row label="Last error">{webhookInfo.last_error_message}{webhookInfo.last_error_date ? ` (${formatDateTime(new Date(webhookInfo.last_error_date * 1000).toISOString())})` : ''}</Row>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Diagnostics</h2>
          <Button variant="secondary" size="sm" loading={diagLoading} onClick={() => void runDiagnostics()}>Run diagnostics</Button>
        </div>
        {diagError ? (
          <ErrorState message={diagError} onRetry={() => void runDiagnostics()} />
        ) : diagLoading && !diagnostics ? (
          <div className="space-y-3" role="status" aria-label="Running diagnostics"><Skeleton height={32} /><Skeleton height={32} /></div>
        ) : diagnostics ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <SetPill set={diagnostics.config.botTokenSet} label="Bot token" />
              <SetPill set={diagnostics.config.webhookSecretSet} label="Webhook secret" />
              <SetPill set={diagnostics.config.miniAppUrlSet} label="Mini App URL" />
              <SetPill set={diagnostics.config.adminIdsSet} label="Admin IDs" />
            </div>
            <div className="space-y-2">
              <Row label="Bot">{diagnostics.bot.first_name}{diagnostics.bot.username ? ` (@${diagnostics.bot.username})` : ''} · ID {diagnostics.bot.id}</Row>
              <Row label="Menu button">{diagnostics.menuButton.type}{diagnostics.menuButton.web_app?.url ? ` → ${diagnostics.menuButton.web_app.url}` : ''}{diagnostics.menuButton.text ? ` · “${diagnostics.menuButton.text}”` : ''}</Row>
              <Row label="Webhook pending updates">{diagnostics.webhook.pending_update_count}</Row>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">Chat menu button</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Sets the bot's Mini App menu button via the API. Leave the URL empty to use the server's configured Mini App URL.</p>
          <div className="space-y-3">
            <FormField label="Mini App URL (HTTPS)"><Input type="url" placeholder="https://…" value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} /></FormField>
            <FormField label="Button text" hint="Max 64 characters."><Input value={menuText} maxLength={64} onChange={(e) => setMenuText(e.target.value)} /></FormField>
            <Button onClick={() => setMenuConfirm(true)} disabled={!menuText.trim()}>Review & set menu button</Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">Webhook</h2>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Points Telegram's webhook at a new URL. The server attaches its secret automatically.</p>
          <div className="space-y-3">
            <FormField label="Webhook URL (HTTPS)"><Input type="url" placeholder="https://…/api/telegram/webhook" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} /></FormField>
            <Button variant="danger" onClick={() => setWebhookConfirm(true)} disabled={!webhookUrl.trim()}>Review & set webhook</Button>
          </div>
        </Card>
      </div>

      <Modal open={menuConfirm} onClose={() => setMenuConfirm(false)} title="Set chat menu button?"
        footer={<><Button variant="secondary" onClick={() => setMenuConfirm(false)}>Cancel</Button><Button loading={menuSubmitting} onClick={() => void submitMenuButton()}>Set menu button</Button></>}>
        <p>Telegram will show “{menuText.trim()}” opening <span className="font-mono text-xs break-all">{menuUrl.trim() || '(server-configured Mini App URL)'}</span>. The server verifies the change with Telegram before reporting success.</p>
      </Modal>

      <Modal open={webhookConfirm} onClose={() => setWebhookConfirm(false)} title="Change the webhook?"
        footer={<><Button variant="secondary" onClick={() => setWebhookConfirm(false)}>Cancel</Button><Button variant="danger" loading={webhookSubmitting} onClick={() => void submitWebhook()}>Set webhook</Button></>}>
        <p>Bot updates will be delivered to <span className="font-mono text-xs break-all">{webhookUrl.trim()}</span> instead of the current address. A wrong URL stops bot updates until it is fixed.</p>
      </Modal>
    </div>
  );
}
