import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, Select, FormField } from '@shared/components/FormField';
import { Sheet } from '@shared/components/Sheet';
import { Modal } from '@shared/components/Modal';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import {
  userApi,
  ApiError,
  type AlertRule,
  type AlertsStatus,
  type UserPreferences,
} from '../services/api';

/**
 * Alerts (study 13). Owner-scoped alert rules with Telegram delivery via the
 * server outbox. HONEST SCOPE: the only rule type that exists is
 * "Session start" — it is the only trigger the server can actually evaluate
 * today (session boundaries from the session clock, checked every minute).
 * Other alert types are shown as unavailable, never as creatable options.
 * Toggles only show their new state after the server confirms the save
 * (handoff row 13).
 */

const SESSIONS = ['Asian', 'London', 'New York'] as const;

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Toggle({
  checked,
  busy,
  label,
  onChange,
}: {
  checked: boolean;
  busy?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Alerts() {
  const toast = useToast();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [status, setStatus] = useState<AlertsStatus | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Quiet-hours editor (local form state, saved explicitly).
  const [quietEnabled, setQuietEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('06:00');
  const [quietSaving, setQuietSaving] = useState(false);

  // Per-rule busy flags + create/delete UI state.
  const [busyRule, setBusyRule] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newSession, setNewSession] = useState<string>('London');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, prefsRes] = await Promise.all([
        userApi.getAlerts(),
        userApi.getPreferences(),
      ]);
      if (alertsRes.data.data) {
        setRules(alertsRes.data.data.rules);
        setStatus(alertsRes.data.data.status);
      }
      if (prefsRes.data.data) {
        const p = prefsRes.data.data;
        setPrefs(p);
        setQuietEnabled(p.quietHoursEnabled);
        setQuietStart(p.quietStart ?? '22:00');
        setQuietEnd(p.quietEnd ?? '06:00');
      }
      setLoadError('');
    } catch {
      setLoadError('Could not load your alerts. Your saved rules are safe — try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleRule = async (rule: AlertRule, next: boolean) => {
    setBusyRule(rule.id);
    try {
      const res = await userApi.updateAlert(rule.id, next);
      // Server confirmation first — only then does the toggle state change.
      if (res.data.data) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? res.data.data! : r)));
      }
      toast.success(next ? 'Alert turned on.' : 'Alert turned off.');
    } catch {
      toast.error('Could not update the alert. It was left unchanged.');
    } finally {
      setBusyRule(null);
    }
  };

  const createRule = async () => {
    setCreating(true);
    try {
      const res = await userApi.createAlert(newSession);
      if (res.data.data) {
        setRules((prev) => [...prev, res.data.data!]);
      }
      toast.success('Alert created.');
      setSheetOpen(false);
    } catch (err) {
      // 409: the rule already exists — adopt the server's copy and say so.
      if (err instanceof ApiError && err.status === 409) {
        const existing = err.envelope?.data as AlertRule | undefined;
        if (existing) {
          setRules((prev) =>
            prev.some((r) => r.id === existing.id) ? prev : [...prev, existing],
          );
        }
        toast.info('That alert already exists — it is shown in your list.');
        setSheetOpen(false);
      } else {
        toast.error('Could not create the alert. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userApi.deleteAlert(deleteTarget.id);
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success('Alert deleted.');
      setDeleteTarget(null);
    } catch {
      toast.error('Could not delete the alert. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const saveQuietHours = async () => {
    if (quietEnabled && (!quietStart || !quietEnd)) {
      toast.error('Set both a quiet-hours start and end time.');
      return;
    }
    setQuietSaving(true);
    try {
      const res = await userApi.updatePreferences({
        quietHoursEnabled: quietEnabled,
        quietStart: quietStart || null,
        quietEnd: quietEnd || null,
      });
      if (res.data.data) {
        setPrefs(res.data.data);
        setQuietEnabled(res.data.data.quietHoursEnabled);
        setQuietStart(res.data.data.quietStart ?? '22:00');
        setQuietEnd(res.data.data.quietEnd ?? '06:00');
      }
      toast.success('Quiet hours saved.');
    } catch {
      toast.error('Could not save quiet hours. Please try again.');
    } finally {
      setQuietSaving(false);
    }
  };

  const effectiveZone = prefs?.timezone ?? 'UTC';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Alerts"
        subtitle="Session-start alerts delivered to your Telegram. Checked every minute. Session-start alerts only for now — price alerts are not available yet."
        actions={<Button onClick={() => setSheetOpen(true)}>Create Alert</Button>}
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading alerts">
          <Skeleton height={96} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : (
        <>
          {/* Delivery status — straight from the server status payload. */}
          <Card>
            <h2 className="text-[15px] font-semibold">Delivery status</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-[var(--color-text-muted)]">Telegram account</dt>
                <dd className="font-medium">
                  {status?.telegramLinked ? 'Linked' : 'Not linked — sign in via Telegram to receive alerts'}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-[var(--color-text-muted)]">Bot delivery</dt>
                <dd className="font-medium">{status?.botConfigured ? 'Configured' : 'Not configured'}</dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-[var(--color-text-muted)]">Evaluator</dt>
                <dd className="font-medium">{status?.evaluator ?? 'SESSION_START only'}</dd>
              </div>
            </dl>
            {status && !status.botConfigured && (
              <p
                role="alert"
                className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] px-3 py-2 text-sm"
              >
                Delivery is not configured on the server, so alerts cannot be sent yet. Your rules are saved and will be evaluated once delivery is configured.
              </p>
            )}
          </Card>

          {/* Rules */}
          {rules.length === 0 ? (
            <Card>
              <EmptyState
                title="No alerts yet"
                message="No alerts yet — create a session-start alert and TradingBeast will message you on Telegram when that session opens."
                action={<Button onClick={() => setSheetOpen(true)}>Create Alert</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{rule.session} session</p>
                      <p className="text-[13px] text-[var(--color-text-muted)]">
                        Session start
                        {rule.lastTriggeredAt
                          ? ` · Last sent ${fmtWhen(rule.lastTriggeredAt)}`
                          : ' · Not sent yet'}
                      </p>
                    </div>
                    <Toggle
                      checked={rule.enabled}
                      busy={busyRule === rule.id}
                      label={`${rule.enabled ? 'Disable' : 'Enable'} ${rule.session} session-start alert`}
                      onChange={(next) => void toggleRule(rule, next)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyRule === rule.id}
                      onClick={() => setDeleteTarget(rule)}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Quiet hours */}
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-semibold">Quiet hours</h2>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  Alerts are held while quiet hours are active, in your account timezone ({effectiveZone}
                  {prefs?.timezone ? '' : ' — no account timezone set, UTC is used'}).
                </p>
              </div>
              <Toggle
                checked={quietEnabled}
                label="Enable quiet hours"
                onChange={setQuietEnabled}
              />
            </div>
            {quietEnabled && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="min-w-[140px] flex-1">
                  <FormField label="Quiet from">
                    <Input type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
                  </FormField>
                </div>
                <div className="min-w-[140px] flex-1">
                  <FormField label="Quiet until">
                    <Input type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
                  </FormField>
                </div>
              </div>
            )}
            <div className="mt-3">
              <Button variant="secondary" disabled={quietSaving} onClick={() => void saveQuietHours()}>
                {quietSaving ? 'Saving…' : 'Save quiet hours'}
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Create Alert sheet: type is fixed — only Session start can fire. */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Create Alert"
        footer={
          <Button disabled={creating} onClick={() => void createRule()}>
            {creating ? 'Creating…' : 'Create alert'}
          </Button>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium">Alert type</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm font-medium">
                <span>Session start</span>
                <span className="text-[12px] font-semibold">Selected</span>
              </div>
              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] opacity-70"
              >
                <span>Price alert</span>
                <span className="text-[12px] font-semibold">Not available yet</span>
              </div>
              <div
                aria-disabled="true"
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] opacity-70"
              >
                <span>Indicator alert</span>
                <span className="text-[12px] font-semibold">Not available yet</span>
              </div>
            </div>
          </div>
          <FormField label="Session">
            <Select value={newSession} onChange={(e) => setNewSession(e.target.value)}>
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormField>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            You will get one Telegram message when the {newSession} session starts, unless quiet hours are active.
          </p>
        </div>
      </Sheet>

      {/* Delete confirmation */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete alert"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          Delete the session-start alert for the {deleteTarget?.session} session? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
