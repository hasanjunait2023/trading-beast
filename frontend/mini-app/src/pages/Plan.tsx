import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { FlagTile } from '@shared/components/PairFlags';
import { StatusPill } from '@shared/components/StatusPill';
import { Input, Textarea } from '@shared/components/FormField';
import { CheckIcon, CrosshairIcon, ShieldCheckIcon, XIcon } from '@shared/components/icons';
import { adaptSessions, nextOpening, type SessionsOverviewView } from '@shared/radar/adapter';
import {
  analysisApi,
  plansApi,
  ApiError,
  type PlanChecklistItem,
  type SessionPlanData,
} from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore } from '../store/radarStore';
import { useMarketsUi } from '../store/marketsUi';
import { fmtSessionRange } from '../utils/sessionFormat';
import type { Tab } from '../App';

const SESSIONS = ['Asian', 'London', 'New York'] as const;

/**
 * Plan tab (reference 09). Server-side SessionPlan for the chosen
 * session: gradient plan hero with the next session + plan status,
 * shortlist from the latest stored Radar result, pre-session checklist
 * with progress, invalidation and risk notes. Edits are a local draft —
 * nothing is written until "Save Plan" (PATCH with optimistic-
 * concurrency version; a 409 reloads the server copy). This screen
 * never spends credits.
 */
export default function Plan({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);

  const [session, setSession] = useState<string>('London');
  const [plan, setPlan] = useState<SessionPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);

  // Local draft (separate from `plan` so a conflict never loses edits).
  const [checklist, setChecklist] = useState<PlanChecklistItem[]>([]);
  const [invalidation, setInvalidation] = useState('');
  const [riskNotes, setRiskNotes] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [newItem, setNewItem] = useState('');

  const applyPlan = useCallback((p: SessionPlanData | null) => {
    setPlan(p);
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
      const res = await plansApi.current(session);
      applyPlan(res.data.data ?? null);
      setError('');
    } catch {
      setError('Could not load your plan. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [session, applyPlan]);

  useEffect(() => { void load(); }, [load]);

  // Free sessions read for the hero's next-session card.
  useEffect(() => {
    let cancelled = false;
    analysisApi
      .getSessions()
      .then((res) => {
        if (!cancelled) {
          setOverview(adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]));
        }
      })
      .catch(() => { /* hero simply omits the next-session card */ });
    return () => { cancelled = true; };
  }, []);

  // GET-only history hydration so the shortlist can show the last run.
  useEffect(() => { if (userId) void hydrateLatestRadar(userId); }, [userId]);

  const stored = useMemo(() => {
    const prefix = `${userId}::${session}::`;
    const keys = Object.keys(results).filter((k) => k.startsWith(prefix));
    if (keys.length === 0) return undefined;
    if (lastKey && keys.includes(lastKey)) return results[lastKey];
    return results[keys[keys.length - 1]];
  }, [results, lastKey, userId, session]);

  const nextOpen = overview ? nextOpening(overview) : null;
  const planStatusLabel = !plan ? 'Not created' : status === 'READY' ? 'Ready' : 'Draft saved';
  const doneCount = checklist.filter((i) => i.done).length;

  const create = async () => {
    setCreating(true);
    try {
      const res = await plansApi.create(session);
      if (res.data.data) applyPlan(res.data.data);
    } catch (err) {
      // 409 PLAN_EXISTS carries the existing plan in the envelope data.
      if (err instanceof ApiError && err.status === 409 && err.envelope?.data) {
        applyPlan(err.envelope.data as SessionPlanData);
      } else {
        setError('Could not create a plan. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!plan || saving) return;
    setSaving(true);
    setSavedNote('');
    try {
      const res = await plansApi.update(plan.id, {
        checklist,
        invalidation: invalidation.trim() ? invalidation : null,
        riskNotes: riskNotes.trim() ? riskNotes : null,
        status,
        version: plan.version,
      });
      if (res.data.data) applyPlan(res.data.data);
      setSavedNote('Plan saved.');
      setError('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Version conflict: reload the server's copy rather than guessing.
        await load();
        setError('This plan changed elsewhere — the latest version has been loaded.');
      } else {
        setError('Could not save the plan. Your draft is still here — try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const label = newItem.trim();
    if (!label) return;
    setChecklist((prev) => [...prev, { id: `item-${Date.now()}-${prev.length}`, label, done: false }]);
    setNewItem('');
  };

  const openPair = (pairCode: string) => {
    if (!stored) return;
    const ui = useMarketsUi.getState();
    ui.setSession(stored.session);
    ui.setScope(stored.scope === 'all' ? 'all' : 'watchlist');
    ui.setSelectedPairCode(pairCode);
    goToTab('markets');
  };

  return (
    <div className="space-y-4 px-4">
      <Brand size={32} />
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Session Plan</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your focused plan for the {session} session.
        </p>
      </div>

      {/* Plan hero (reference 09). */}
      <section
        aria-label={`${session} session plan`}
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-4 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.45) 0%, rgba(3,40,28,0.1) 60%, rgba(3,40,28,0) 85%)',
          }}
        />
        <div className="relative">
          <p className="text-[12px] font-bold tracking-[0.22em] text-[var(--color-hero-text-soft)]">
            {session.toUpperCase()} SESSION
          </p>
          <h2 className="mt-1.5 text-[30px] leading-none font-extrabold tracking-tight">
            Trade the plan.
          </h2>
          <p className="mt-2 text-[14.5px] leading-snug text-white/90">
            Turn the latest Radar shortlist into a focused plan for this session.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {nextOpen && (
              <span className="tnum inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-[13px] font-semibold">
                Next session · {nextOpen.session} ·{' '}
                {fmtSessionRange(nextOpen.startMs, nextOpen.endMs, nextOpen.zone)}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-mint-wash)] px-3.5 py-2 text-[13px] font-bold text-[var(--color-text)]">
              Plan status · {planStatusLabel}
            </span>
          </div>
        </div>
      </section>

      {/* Session segmented control. */}
      <div className="flex rounded-full bg-[var(--color-control-track)] p-1" role="group" aria-label="Session">
        {SESSIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={session === s}
            onClick={() => setSession(s)}
            className={`min-h-[44px] flex-1 rounded-full px-2 text-[14.5px] font-bold transition-colors ${
              session === s ? 'text-white shadow-[var(--shadow-sm)]' : 'text-[var(--color-text)]'
            }`}
            style={session === s ? { background: 'var(--gradient-primary-action)' } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Shortlist from the latest stored Radar result — never a paid run. */}
      <section aria-label="Shortlist" className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[21px] font-extrabold tracking-tight">Shortlist</h2>
            <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
              From the latest Radar result.
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-[var(--color-link)] underline underline-offset-4"
            onClick={() => goToTab('markets')}
          >
            Edit Shortlist
          </button>
        </div>
        {stored && stored.focus.length > 0 ? (
          <div className="divide-y divide-[var(--color-border-soft)] rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-card-soft)]">
            {stored.focus.map((p) => (
              <button
                key={p.pair}
                type="button"
                onClick={() => openPair(p.pair)}
                className="flex min-h-[70px] w-full items-center gap-3.5 py-3 text-left"
                aria-label={`${p.displayName}, ${p.status}, score ${p.score}`}
              >
                <FlagTile pair={p.pair} base={p.base} quote={p.quote} kind={p.kind} name={p.displayName} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16.5px] font-bold">{p.displayName}</span>
                  {p.stale && (
                    <span className="block text-[12px] font-semibold text-[var(--color-warning)]">
                      Stale data
                    </span>
                  )}
                </span>
                <StatusPill status={p.status} />
                <span className="tnum w-9 text-right text-[21px] font-extrabold">{p.score}</span>
              </button>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">
              No scan yet for the {session} session — your shortlist appears here after a
              Radar run. This page never starts a paid run.
            </p>
          </Card>
        )}
      </section>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading plan">
          <Skeleton height={90} />
          <Skeleton height={160} />
        </div>
      ) : error && !plan ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !plan ? (
        <Card>
          <EmptyState
            title={`No ${session} plan yet`}
            message="Create a plan to track your pre-session checklist, invalidation and risk notes."
            action={
              <Button onClick={() => void create()} loading={creating}>
                Create {session} plan
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {error && (
            <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <Card className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <h2 className="text-[18px] font-extrabold tracking-tight">Pre-Session Checklist</h2>
              <div className="flex gap-1.5" role="group" aria-label="Plan status">
                {(['DRAFT', 'READY'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                    className={`min-h-[34px] rounded-full border px-3 text-[12.5px] font-bold ${
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
              <p className="py-1 text-sm text-[var(--color-text-muted)]">
                No checklist items yet. Add the checks you run before trading this session.
              </p>
            ) : (
              <>
                <ul className="divide-y divide-[var(--color-border-soft)]">
                  {checklist.map((item) => (
                    <li key={item.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-pressed={item.done}
                        aria-label={`Mark “${item.label}” ${item.done ? 'not done' : 'done'}`}
                        onClick={() =>
                          setChecklist((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)),
                          )
                        }
                        className="flex min-h-[50px] flex-1 items-center gap-3 py-1.5 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border ${
                            item.done
                              ? 'border-transparent text-white'
                              : 'border-[var(--color-border-strong)] text-transparent'
                          }`}
                          style={item.done ? { background: 'var(--gradient-primary-action)' } : undefined}
                        >
                          <CheckIcon size={16} />
                        </span>
                        <span className={`text-[15px] font-medium ${item.done ? 'text-[var(--color-text-muted)] line-through' : ''}`}>
                          {item.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove “${item.label}”`}
                        onClick={() => setChecklist((prev) => prev.filter((i) => i.id !== item.id))}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)]"
                      >
                        <XIcon size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="pt-1.5">
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-[var(--color-mint-wash)]"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={checklist.length}
                    aria-valuenow={doneCount}
                    aria-label="Checklist progress"
                  >
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${(doneCount / checklist.length) * 100}%`,
                        background: 'var(--gradient-primary-action)',
                      }}
                    />
                  </div>
                  <p className="tnum mt-1.5 text-[13px] text-[var(--color-text-muted)]">
                    {doneCount} of {checklist.length} complete
                  </p>
                </div>
              </>
            )}
            <div className="flex gap-2 pt-1">
              <div className="flex-1">
                <Input
                  aria-label="Add checklist item"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                  placeholder="Add a checklist item"
                  className="rounded-[var(--radius-input)]"
                />
              </div>
              <Button variant="secondary" onClick={addItem} disabled={!newItem.trim()}>
                Add
              </Button>
            </div>
          </Card>

          <Card className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
                <CrosshairIcon size={23} />
              </span>
              <h2 className="text-[16.5px] font-extrabold tracking-tight">Invalidation</h2>
            </div>
            <Textarea
              aria-label="Invalidation"
              value={invalidation}
              onChange={(e) => setInvalidation(e.target.value)}
              rows={2}
              placeholder="Add what would make you skip or exit a setup."
              className="rounded-[var(--radius-input)] border-transparent bg-[var(--color-mint-panel)]"
            />
          </Card>

          <Card className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
                <ShieldCheckIcon size={23} />
              </span>
              <h2 className="text-[16.5px] font-extrabold tracking-tight">Risk Notes</h2>
            </div>
            <Textarea
              aria-label="Risk notes"
              value={riskNotes}
              onChange={(e) => setRiskNotes(e.target.value)}
              rows={2}
              placeholder="e.g. 2% max daily risk. No trades during red-folder news."
              className="rounded-[var(--radius-input)] border-transparent bg-[var(--color-mint-panel)]"
            />
          </Card>

          <Button
            size="lg"
            className="min-h-[56px] w-full rounded-full text-[17px]"
            style={{ background: 'var(--gradient-primary-action)' }}
            loading={saving}
            disabled={saving}
            onClick={() => void save()}
          >
            Save Plan
          </Button>
          {savedNote && (
            <p role="status" className="text-center text-sm font-semibold text-[var(--color-success)]">
              {savedNote}
            </p>
          )}
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            {plan.session} · {plan.planDate} · Saving is explicit — edits stay on this screen
            until you press Save Plan.
          </p>
        </>
      )}
    </div>
  );
}
