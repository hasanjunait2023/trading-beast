import { useCallback, useEffect, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { CheckIcon } from '@shared/components/icons';
import { plansApi, ApiError, type SessionPlanData } from '../services/api';
import type { Tab } from '../App';

const SESSIONS = ['Asian', 'London', 'New York'] as const;

/**
 * Plan tab (reference tab bar; study 09 layout lands with R3). Shows the
 * server-side SessionPlan for the chosen session: status, checklist
 * (toggles save via PATCH with optimistic-concurrency version), pinned
 * scan, invalidation and risk notes. No plan → honest empty state with a
 * create action. Nothing here spends credits.
 */
export default function Plan({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const [session, setSession] = useState<string>('London');
  const [plan, setPlan] = useState<SessionPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plansApi.current(session);
      setPlan(res.data.data ?? null);
      setError('');
    } catch {
      setError('Could not load your plan. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await plansApi.create(session);
      if (res.data.data) setPlan(res.data.data);
    } catch (err) {
      // 409 PLAN_EXISTS carries the existing plan in the envelope data.
      if (err instanceof ApiError && err.status === 409 && err.envelope?.data) {
        setPlan(err.envelope.data as SessionPlanData);
      } else {
        setError('Could not create a plan. Please try again.');
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!plan || saving) return;
    const checklist = plan.checklist.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
    setSaving(true);
    try {
      const res = await plansApi.update(plan.id, { checklist, version: plan.version });
      if (res.data.data) setPlan(res.data.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Version conflict: reload the server's copy rather than guessing.
        await load();
      } else {
        setError('Could not save the checklist change. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 px-4">
      <Brand size={32} />
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Session Plan</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your saved plan for the session — checklist, invalidation and risk notes.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Session">
        {SESSIONS.map((s) => (
          <button key={s} type="button" aria-pressed={session === s} onClick={() => setSession(s)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold border ${session === s ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] border-transparent' : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'}`}>
            {s}
          </button>
        ))}
      </div>

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
            message="Create a plan to pin a scan and track your pre-session checklist."
            action={
              <Button onClick={() => void create()} loading={creating}>
                Create {session} plan
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">{error}</p>}
          <Card className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">{plan.session} · {plan.planDate}</h2>
              <span className="inline-flex rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[11px] font-bold tracking-wider text-[var(--color-accent)]">
                {plan.status}
              </span>
            </div>
            {plan.pinnedRunId ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                A Radar scan is pinned to this plan.{' '}
                <button type="button" className="font-semibold text-[var(--color-link)] underline" onClick={() => goToTab('markets')}>
                  Open Markets
                </button>
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">No scan pinned yet — pin one from Markets after a run.</p>
            )}
            {plan.invalidation && (
              <p className="text-sm"><span className="font-semibold">Invalidation:</span> {plan.invalidation}</p>
            )}
            {plan.riskNotes && (
              <p className="text-sm"><span className="font-semibold">Risk notes:</span> {plan.riskNotes}</p>
            )}
          </Card>

          <Card className="space-y-1">
            <h2 className="text-base font-bold">Checklist</h2>
            {plan.checklist.length === 0 ? (
              <p className="py-2 text-sm text-[var(--color-text-muted)]">
                No checklist items yet. Items you add in the web portal appear here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border-soft)]">
                {plan.checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void toggleItem(item.id)}
                      className="flex min-h-[48px] w-full items-center gap-3 py-2 text-left"
                      aria-pressed={item.done}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                          item.done
                            ? 'border-transparent text-white'
                            : 'border-[var(--color-border-strong)] text-transparent'
                        }`}
                        style={item.done ? { background: 'var(--gradient-primary-action)' } : undefined}
                      >
                        <CheckIcon size={15} />
                      </span>
                      <span className={`text-[15px] ${item.done ? 'text-[var(--color-text-muted)] line-through' : ''}`}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
