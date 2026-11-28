import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, Textarea, FormField } from '@shared/components/FormField';
import { PairRow } from '@shared/components/PairRow';
import { ScoreEvidence } from '@shared/components/ScoreEvidence';
import { DataFreshness } from '@shared/components/DataFreshness';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { useAuth } from '../hooks/useAuth';
import {
  userApi,
  ApiError,
  type SessionPlan,
  type ChecklistItem,
} from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useRadarStore } from '../store/radarStore';
import { usePrefsStore, KNOWN_SESSIONS, type KnownSession } from '../store/prefs';
import type { RadarResultView } from '@shared/radar/adapter';

/**
 * Session Plan (study 09). Owner-scoped plan API (handoff §5): one draft per
 * session per day, saved explicitly, with optimistic-concurrency versioning.
 * On a 409 VERSION_CONFLICT the local draft stays on screen untouched and
 * the server copy is shown alongside with a reload action — neither copy is
 * silently overwritten. The shortlist is the latest STORED/hydrated Radar
 * result for the session; this page never runs a paid scan. The event feed
 * has no calendar contract yet, so events honestly read "Unknown".
 */
export default function Plan() {
  const { user } = useAuth();
  const toast = useToast();
  const userId = user?.id ?? '';
  const preferred = usePrefsStore((s) => s.preferredSessions);
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);

  // Plan date is today (UTC) — displayed honestly on the page.
  const planDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [session, setSession] = useState<KnownSession>(preferred[0] ?? 'London');

  const [plan, setPlan] = useState<SessionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<SessionPlan | null>(null);
  const [pinNote, setPinNote] = useState('');

  // Local draft (kept separate from `plan` so a conflict never loses it).
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [invalidation, setInvalidation] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'READY'>('DRAFT');
  const [newItem, setNewItem] = useState('');

  const applyPlan = useCallback((p: SessionPlan | null) => {
    setPlan(p);
    setConflict(null);
    if (p) {
      setChecklist(p.checklist);
      setInvalidation(p.invalidation ?? '');
      setRiskNotes(p.riskNotes ?? '');
      setStatus(p.status);
    } else {
      setChecklist([]);
      setInvalidation('');
      setRiskNotes('');
      setStatus('DRAFT');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getCurrentPlan(session, planDate);
      applyPlan(res.data.data ?? null);
      setLoadError('');
    } catch {
      setLoadError('Could not load your plan for this session. Your saved plan is safe — try again.');
    } finally {
      setLoading(false);
    }
  }, [session, planDate, applyPlan]);

  useEffect(() => {
    void load();
  }, [load]);

  // GET-only history hydration so the shortlist can show the last server run.
  useEffect(() => {
    if (userId) void hydrateLatestRadar(userId);
  }, [userId]);

  // Latest stored/hydrated result for the selected session (any scope).
  const stored: RadarResultView | undefined = useMemo(() => {
    const prefix = `${userId}::${session}::`;
    const keys = Object.keys(results).filter((k) => k.startsWith(prefix));
    if (keys.length === 0) return undefined;
    if (lastKey && keys.includes(lastKey)) return results[lastKey];
    return results[keys[keys.length - 1]];
  }, [results, lastKey, userId, session]);

  const createDraft = async () => {
    setCreating(true);
    try {
      const res = await userApi.createPlan(session, planDate);
      if (res.data.data) applyPlan(res.data.data);
    } catch (err) {
      // 409 PLAN_EXISTS carries the existing plan in `data` — adopt it.
      if (err instanceof ApiError && err.status === 409 && err.envelope?.data) {
        applyPlan(err.envelope.data as SessionPlan);
        toast.info('A draft already existed for this session — it has been loaded.');
      } else {
        toast.error('Could not create the draft plan. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleConflictOrError = (err: unknown, fallback: string) => {
    if (
      err instanceof ApiError &&
      err.status === 409 &&
      err.envelope?.error === 'VERSION_CONFLICT' &&
      err.envelope.current
    ) {
      // Keep the local draft exactly as-is; show the server copy separately.
      setConflict(err.envelope.current);
    } else if (err instanceof ApiError && err.status === 400) {
      toast.error(err.message);
    } else {
      toast.error(fallback);
    }
  };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await userApi.updatePlan(plan.id, {
        checklist,
        invalidation: invalidation.trim() ? invalidation : null,
        riskNotes: riskNotes.trim() ? riskNotes : null,
        status,
        version: plan.version,
      });
      if (res.data.data) applyPlan(res.data.data);
      toast.success('Plan saved.');
    } catch (err) {
      handleConflictOrError(err, 'Could not save the plan. Your draft is still here — try again.');
    } finally {
      setSaving(false);
    }
  };

  const pinResult = async (runId: string | null) => {
    if (!plan) return;
    setSaving(true);
    try {
      // Send the current draft along so pinning never discards unsaved edits.
      const res = await userApi.updatePlan(plan.id, {
        checklist,
        invalidation: invalidation.trim() ? invalidation : null,
        riskNotes: riskNotes.trim() ? riskNotes : null,
        status,
        pinnedRunId: runId,
        version: plan.version,
      });
      if (res.data.data) applyPlan(res.data.data);
      setPinNote(runId ? 'Result pinned to this plan.' : 'Pinned result removed.');
    } catch (err) {
      handleConflictOrError(err, 'Could not update the pinned result. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onPinClick = () => {
    if (!stored) return;
    if (!plan) {
      setPinNote('Create the draft plan first, then pin this result to it.');
      return;
    }
    if (!stored.runId) {
      setPinNote(
        'This result is only in this browser’s memory and has no server run ID. Only a completed server run (for example one loaded from your run history) can be pinned.',
      );
      return;
    }
    void pinResult(stored.runId);
  };

  const addItem = () => {
    const label = newItem.trim();
    if (!label) return;
    setChecklist((prev) => [
      ...prev,
      { id: `item-${Date.now()}-${prev.length}`, label, done: false },
    ]);
    setNewItem('');
  };

  const topPair = stored?.focus[0];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Session Plan"
        subtitle={`Plan for ${planDate} (UTC) — one draft per session, saved to your account.`}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Session">
          {KNOWN_SESSIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={session === s}
              onClick={() => setSession(s)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${
                session === s
                  ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}
            >
              {s}
            </button>
          ))}
          {plan && (
            <span
              className={`ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                status === 'READY'
                  ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                  : 'bg-[var(--color-warning-bg)] text-[var(--color-text)]'
              }`}
            >
              {status === 'READY' ? 'READY' : 'DRAFT'} · v{plan.version}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Today&apos;s events: <strong>Unknown</strong> — no economic calendar feed is
          connected yet, so event risk cannot be shown here.
        </p>
      </Card>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading plan">
          <Skeleton height={120} />
          <Skeleton height={160} />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : (
        <>
          {/* Shortlist from the stored/hydrated Radar result — never a paid run. */}
          <section aria-label="Shortlist" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Shortlist · {session}</h2>
              {stored && <DataFreshness timestamp={stored.timestampMs} label="Scanned" />}
            </div>
            {stored ? (
              <>
                {stored.focus.length === 0 ? (
                  <Card>
                    <EmptyState
                      title="No focus pairs in the stored scan"
                      message="The latest stored scan for this session returned no Focus pairs. Open Markets to review the full result."
                    />
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {stored.focus.map((p) => (
                      <PairRow
                        key={p.pair}
                        pair={p.displayName}
                        status={p.status}
                        bias={p.bias}
                        score={p.score}
                        freshness={
                          p.stale ? (
                            <span className="font-semibold text-[var(--color-warning)]">Stale data</span>
                          ) : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                {topPair && (
                  <ScoreEvidence
                    score={topPair.score}
                    timestamp={stored.timestampMs}
                    title={`Top pair evidence · ${topPair.displayName}`}
                    evidence={[
                      ...(topPair.rsi !== null
                        ? [{ label: 'RSI', value: String(topPair.rsi) }]
                        : []),
                      ...(topPair.atr15 !== null
                        ? [{ label: 'ATR (15m)', value: String(topPair.atr15) }]
                        : []),
                      ...(topPair.adrPct !== null
                        ? [{ label: 'ADR %', value: String(topPair.adrPct) }]
                        : []),
                      {
                        label: 'Opening range',
                        value: topPair.orConfirmed
                          ? 'Confirmed'
                          : topPair.orHave
                            ? 'Formed, unconfirmed'
                            : 'Not formed',
                      },
                    ]}
                  />
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {plan?.pinnedRunId && stored.runId === plan.pinnedRunId ? (
                    <>
                      <span className="text-sm font-semibold">This result is pinned to the plan.</span>
                      <Button variant="secondary" disabled={saving} onClick={() => void pinResult(null)}>
                        Unpin
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" disabled={saving} onClick={onPinClick}>
                      Pin this result
                    </Button>
                  )}
                  {plan?.pinnedRunId && stored.runId !== plan.pinnedRunId && (
                    <span className="tnum text-sm text-[var(--color-text-muted)]">
                      Pinned run: {plan.pinnedRunId}
                    </span>
                  )}
                </div>
                {pinNote && <p className="text-sm text-[var(--color-text-muted)]">{pinNote}</p>}
              </>
            ) : (
              <Card>
                <EmptyState
                  title="No scan yet"
                  message={`No stored Radar result for the ${session} session yet. Run a scan from Markets — this page never starts a paid run.`}
                  action={
                    <Link
                      to="/app/markets"
                      className="font-semibold text-[var(--color-link)] underline"
                    >
                      Open Markets
                    </Link>
                  }
                />
              </Card>
            )}
          </section>

          {/* Plan editor */}
          {!plan ? (
            <Card className="space-y-3">
              <h2 className="font-bold">No draft for {session} today</h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                Create a draft to add a checklist, invalidation and risk notes for this
                session. It is saved to your account and can be marked Ready when done.
              </p>
              <Button loading={creating} disabled={creating} onClick={() => void createDraft()}>
                Create draft plan
              </Button>
              {pinNote && <p className="text-sm text-[var(--color-text-muted)]">{pinNote}</p>}
            </Card>
          ) : (
            <>
              {conflict && (
                <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-4 text-sm">
                  <p className="font-bold">This plan changed on the server</p>
                  <p className="mt-1">
                    Someone (or another device) saved version {conflict.version} after you
                    loaded version {plan.version}. Your draft above/below is untouched —
                    nothing was overwritten. The server copy has {conflict.checklist.length}{' '}
                    checklist item{conflict.checklist.length === 1 ? '' : 's'}, status{' '}
                    {conflict.status}
                    {conflict.riskNotes ? `, risk notes: “${conflict.riskNotes}”` : ''}
                    {conflict.invalidation ? `, invalidation: “${conflict.invalidation}”` : ''}.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-3"
                    onClick={() => applyPlan(conflict)}
                  >
                    Reload server version (discards my draft edits)
                  </Button>
                </div>
              )}

              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">Checklist</h2>
                  <div className="flex gap-2" role="group" aria-label="Plan status">
                    {(['DRAFT', 'READY'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-pressed={status === s}
                        onClick={() => setStatus(s)}
                        className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold ${
                          status === s
                            ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {s === 'DRAFT' ? 'Draft' : 'Ready'}
                      </button>
                    ))}
                  </div>
                </div>
                {checklist.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No checklist items yet. Add the checks you run before trading this session.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.done}
                          aria-label={`Mark “${item.label}” done`}
                          onChange={() =>
                            setChecklist((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
                            )
                          }
                          className="h-5 w-5 shrink-0"
                        />
                        <span
                          className={`flex-1 text-sm ${item.done ? 'text-[var(--color-text-muted)] line-through' : ''}`}
                        >
                          {item.label}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove “${item.label}”`}
                          onClick={() =>
                            setChecklist((prev) => prev.filter((i) => i.id !== item.id))
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FormField label="Add checklist item">
                      <Input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem();
                          }
                        }}
                        placeholder="e.g. Confirm opening range"
                      />
                    </FormField>
                  </div>
                  <Button variant="secondary" className="self-end" onClick={addItem} disabled={!newItem.trim()}>
                    Add
                  </Button>
                </div>
              </Card>

              <Card className="space-y-3">
                <FormField label="Invalidation">
                  <Textarea
                    value={invalidation}
                    onChange={(e) => setInvalidation(e.target.value)}
                    rows={3}
                    placeholder="What would make this plan wrong? e.g. price closes back inside the opening range…"
                  />
                </FormField>
                <FormField label="Risk notes">
                  <Textarea
                    value={riskNotes}
                    onChange={(e) => setRiskNotes(e.target.value)}
                    rows={3}
                    placeholder="Position sizing, news risk, anything to be careful about…"
                  />
                </FormField>
              </Card>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="lg" className="flex-1" loading={saving} disabled={saving} onClick={() => void save()}>
                  Save plan
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Saving is explicit — edits stay on this screen until you press Save plan.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
