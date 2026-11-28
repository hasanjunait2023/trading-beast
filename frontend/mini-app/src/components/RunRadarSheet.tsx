import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet } from '@shared/components/Sheet';
import { Button } from '@shared/components/Button';
import { analysisApi, userApi, ApiError, type CreditsData } from '../services/api';
import { adaptFocusResult, type RadarResultView } from '@shared/radar/adapter';
import { haptics } from '../telegram';
import type { RadarScope } from '../store/radarStore';

/**
 * Run Radar confirmation (handoff §4 + study 22). Opening this sheet NEVER
 * posts: it only reads fresh credits. The paid POST happens solely on the
 * explicit Confirm tap, with ONE idempotency key minted for that intent.
 * Retries of the same intent (429 / 503 / ambiguous network failure) reuse
 * the SAME key and payload, and only ever happen on an explicit user tap —
 * never automatically.
 */

type Phase =
  | 'confirm'
  | 'running'
  | 'success'
  | 'insufficient' // 402
  | 'rateLimited' // 429
  | 'unavailable' // 503
  | 'conflict' // 409
  | 'ambiguous' // network failure — outcome unknown
  | 'error';

interface Intent {
  key: string;
  payload: { session?: string; watchlist?: string[] };
}

export interface RunRadarSheetProps {
  open: boolean;
  session: string;
  scope: RadarScope;
  /** Saved watchlist, sent when scope = 'watchlist'. */
  watchlist: string[];
  onClose: () => void;
  onSuccess: (result: RadarResultView) => void;
  onOpenCredits: () => void;
}

export function RunRadarSheet({
  open,
  session,
  scope,
  watchlist,
  onClose,
  onSuccess,
  onOpenCredits,
}: RunRadarSheetProps) {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [creditsError, setCreditsError] = useState('');
  const [phase, setPhase] = useState<Phase>('confirm');
  const [errorText, setErrorText] = useState('');
  const intentRef = useRef<Intent | null>(null);

  const refreshCredits = useCallback(async () => {
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
      setCreditsError('');
    } catch {
      setCreditsError('Could not load your balance. Check your connection.');
    }
  }, []);

  // Opening the sheet is a READ-ONLY action: fetch fresh server cost/balance.
  useEffect(() => {
    if (!open) return;
    intentRef.current = null;
    setPhase('confirm');
    setErrorText('');
    void refreshCredits();
  }, [open, refreshCredits]);

  const execute = useCallback(
    async (intent: Intent) => {
      setPhase('running');
      setErrorText('');
      try {
        const res = await analysisApi.runFocus(intent.payload, intent.key);
        const view = adaptFocusResult(res.data.data as Parameters<typeof adaptFocusResult>[0]);
        onSuccess(view);
        haptics.notification('success');
        setPhase('success');
      } catch (err) {
        haptics.notification('error');
        const status = err instanceof ApiError ? err.status : -1;
        setErrorText(err instanceof Error ? err.message : 'Radar run failed.');
        if (status === 402) setPhase('insufficient');
        else if (status === 429) setPhase('rateLimited');
        else if (status === 503) setPhase('unavailable');
        else if (status === 409) setPhase('conflict');
        else if (status === 0) setPhase('ambiguous');
        else setPhase('error');
      } finally {
        // Balance is reconciled from the server after completion AND failure.
        void refreshCredits();
      }
    },
    [onSuccess, refreshCredits],
  );

  const confirm = useCallback(() => {
    if (intentRef.current) return; // one intent per confirmation session
    // Payload is fixed for the intent: watchlist scope sends the saved list;
    // "all" sends an explicit empty array (omitted would inherit the saved
    // list server-side — see backend runAnalysisForUser).
    const payload =
      scope === 'watchlist'
        ? { session, watchlist }
        : { session, watchlist: [] as string[] };
    const intent: Intent = { key: crypto.randomUUID(), payload };
    intentRef.current = intent;
    haptics.impact('medium');
    void execute(intent);
  }, [execute, scope, session, watchlist]);

  const retrySameIntent = useCallback(() => {
    const intent = intentRef.current;
    if (!intent) return;
    void execute(intent); // SAME key, SAME payload — explicit user recovery.
  }, [execute]);

  const running = phase === 'running';
  const balance = credits?.balance ?? null;
  const cost = credits?.radarCost ?? null;
  const remaining = balance !== null && cost !== null ? balance - cost : null;

  const footer =
    phase === 'success' ? (
      <Button onClick={onClose}>View results</Button>
    ) : phase === 'insufficient' ? (
      <>
        <Button
          onClick={() => {
            onClose();
            onOpenCredits();
          }}
        >
          Go to Credits
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </>
    ) : phase === 'rateLimited' || phase === 'unavailable' || phase === 'ambiguous' || phase === 'error' ? (
      <>
        <Button onClick={retrySameIntent}>Retry with the same request</Button>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </>
    ) : phase === 'conflict' ? (
      <Button onClick={onClose}>Done</Button>
    ) : (
      <>
        <Button loading={running} disabled={running || credits === null} onClick={confirm}>
          {cost !== null ? `Confirm run · ${cost} credits` : 'Confirm run'}
        </Button>
        <Button variant="ghost" disabled={running} onClick={onClose}>
          Cancel
        </Button>
      </>
    );

  return (
    <Sheet
      open={open}
      onClose={running ? () => undefined : onClose}
      title="Run Radar"
      footer={footer}
    >
      <div className="space-y-3">
        <dl className="space-y-2">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Session</dt>
            <dd className="font-semibold">{session}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Scope</dt>
            <dd className="font-semibold">
              {scope === 'watchlist' ? `My watchlist (${watchlist.length} pairs)` : 'All markets'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Run cost</dt>
            <dd className="tnum font-semibold">{cost !== null ? `${cost} credits` : '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Current balance</dt>
            <dd className="tnum font-semibold">{balance !== null ? `${balance} credits` : '—'}</dd>
          </div>
          {remaining !== null && phase === 'confirm' && (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Balance after run</dt>
              <dd className="tnum font-semibold">{remaining} credits</dd>
            </div>
          )}
        </dl>

        {creditsError && (
          <p role="alert" className="text-[var(--color-danger)]">
            {creditsError}{' '}
            <button type="button" className="underline" onClick={() => void refreshCredits()}>
              Retry
            </button>
          </p>
        )}

        <p className="text-[var(--color-text-muted)]">
          Viewing results, changing filters or switching sessions costs zero — only this
          confirmed run spends credits.
        </p>

        {phase === 'running' && <p role="status">Scanning… keep this sheet open.</p>}
        {phase === 'success' && (
          <p role="status" className="font-semibold text-[var(--color-success)]">
            Scan complete — your results are updated below.
          </p>
        )}
        {phase === 'insufficient' && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3">
            <p className="font-semibold text-[var(--color-danger)]">Not enough credits</p>
            <p className="mt-1">
              This run costs {cost ?? '—'} credits and your balance is {balance ?? '—'}. Credits
              are granted daily — see the Credits tab for your balance, daily grant and scan cost.
            </p>
          </div>
        )}
        {phase === 'rateLimited' && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3">
            <p className="font-semibold">Too many requests</p>
            <p className="mt-1">
              Please wait a moment, then retry. Retrying reuses the same request, so you cannot be
              charged twice for this run.
            </p>
          </div>
        )}
        {phase === 'unavailable' && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3">
            <p className="font-semibold">Radar unavailable</p>
            <p className="mt-1">
              Market data is unavailable right now. Your previous scan (if any) is unchanged. You
              can retry with the same request.
            </p>
          </div>
        )}
        {phase === 'conflict' && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3">
            <p className="font-semibold">Already submitted</p>
            <p className="mt-1">
              This request was already submitted, or it no longer matches its original input, so
              it was not run again. Your balance above has been refreshed from the server.
            </p>
          </div>
        )}
        {phase === 'ambiguous' && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3">
            <p className="font-semibold">Connection lost — outcome unknown</p>
            <p className="mt-1">
              The request may or may not have reached the server. Use “Retry with the same
              request” to recover safely: the server replays the original run instead of charging
              again. Starting a brand-new run is only possible after closing this sheet.
            </p>
          </div>
        )}
        {phase === 'error' && (
          <p role="alert" className="text-[var(--color-danger)]">
            {errorText || 'Radar run failed.'} You can retry with the same request.
          </p>
        )}
      </div>
    </Sheet>
  );
}
