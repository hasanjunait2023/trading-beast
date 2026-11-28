import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@shared/components/Card';
import { PageHeader } from '@shared/components/PageHeader';
import { Tabs } from '@shared/components/Tabs';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { UnavailableState } from '@shared/components/UnavailableState';
import { userApi, type ToolId, type ToolStatus } from '../services/api';
import {
  computeRiskReward,
  computeRecoveryPct,
  type RiskRewardError,
} from '../services/toolsMath';

/**
 * Risk Tools (study 10). Availability is decided by the server
 * (GET /user/tools/status): tools that need contract metadata (contract
 * size, tick value, margin rate, conversion rates) are UNAVAILABLE because
 * that metadata does not exist in the engine — the page renders the
 * server's reason verbatim, with no generic lot defaults. The two tools
 * that are pure arithmetic on user-typed numbers (Risk:Reward and
 * Recovery) ship as working calculators: all computation happens in the
 * browser from the numbers the user types; no market data is involved.
 */

const TOOL_LABELS: Record<ToolId, string> = {
  'position-size': 'Position Size',
  'pip-value': 'Pip Value',
  margin: 'Margin',
  'risk-reward': 'Risk : Reward',
  recovery: 'Recovery',
};

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function parseInput(raw: string): number {
  return raw.trim() === '' ? NaN : Number(raw);
}

const RR_ERROR_TEXT: Record<RiskRewardError, string> = {
  INCOMPLETE: 'Enter entry, stop and target prices to see the ratio.',
  STOP_EQUALS_ENTRY: 'Stop must differ from entry — with zero distance the risk is zero and the ratio is undefined.',
  TARGET_EQUALS_ENTRY: 'Target must differ from entry — with zero distance there is no reward.',
  SAME_SIDE: 'Stop and target must be on opposite sides of entry: the stop below and target above for a long, or the reverse for a short.',
};

function RiskRewardCalculator() {
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [target, setTarget] = useState('');

  const outcome = useMemo(
    () => computeRiskReward(parseInput(entry), parseInput(stop), parseInput(target)),
    [entry, stop, target],
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        Pure price arithmetic on the three prices you type — no market data
        or contract metadata is used.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Entry price">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="e.g. 1.0850"
          />
        </FormField>
        <FormField label="Stop price">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            placeholder="e.g. 1.0800"
          />
        </FormField>
        <FormField label="Target price">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 1.0950"
          />
        </FormField>
      </div>
      {'result' in outcome ? (
        <dl className="grid gap-3 sm:grid-cols-4" aria-live="polite">
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <dt className="text-[12px] text-[var(--color-text-muted)]">Direction</dt>
            <dd className="text-[15px] font-semibold">
              {outcome.result.direction === 'LONG' ? 'Long' : 'Short'}
            </dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <dt className="text-[12px] text-[var(--color-text-muted)]">Risk (entry → stop)</dt>
            <dd className="text-[15px] font-semibold tabular-nums">
              {fmt(outcome.result.risk, 4)} price units
            </dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <dt className="text-[12px] text-[var(--color-text-muted)]">Reward (entry → target)</dt>
            <dd className="text-[15px] font-semibold tabular-nums">
              {fmt(outcome.result.reward, 4)} price units
            </dd>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2">
            <dt className="text-[12px] text-[var(--color-text-muted)]">Reward : Risk</dt>
            <dd className="text-[15px] font-semibold tabular-nums">
              {fmt(outcome.result.ratio)} : 1
            </dd>
          </div>
        </dl>
      ) : (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {RR_ERROR_TEXT[outcome.error]}
        </p>
      )}
    </div>
  );
}

function RecoveryCalculator() {
  const [loss, setLoss] = useState('');
  const lossPct = parseInput(loss);
  const gain = computeRecoveryPct(lossPct);
  const invalid = loss.trim() !== '' && gain === null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--color-text-muted)]">
        After a loss, your remaining capital must grow by more than the loss
        percentage to get back to break-even. Pure arithmetic on the number
        you type.
      </p>
      <div className="max-w-xs">
        <FormField label="Loss (% of account)">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            value={loss}
            onChange={(e) => setLoss(e.target.value)}
            placeholder="e.g. 20"
          />
        </FormField>
      </div>
      {invalid ? (
        <p role="alert" className="text-sm text-[var(--color-text-muted)]">
          Enter a loss between 0% and 100%. A loss of 100% leaves no capital
          to recover with.
        </p>
      ) : gain !== null && loss.trim() !== '' ? (
        <div
          className="max-w-xs rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2"
          aria-live="polite"
        >
          <p className="text-[12px] text-[var(--color-text-muted)]">Gain needed to break even</p>
          <p className="text-[15px] font-semibold tabular-nums">{fmt(gain)}%</p>
        </div>
      ) : (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          Enter a loss percentage to see the gain needed to recover it.
        </p>
      )}
    </div>
  );
}

export default function Tools() {
  const [tools, setTools] = useState<ToolStatus[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeId, setActiveId] = useState<ToolId>('risk-reward');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getToolsStatus();
      const list = res.data.data?.tools ?? [];
      setTools(list);
      // Land on the first available tool rather than an unavailable tab.
      const firstAvailable = list.find((t) => t.available);
      if (firstAvailable) setActiveId(firstAvailable.id);
      setLoadError('');
    } catch {
      setLoadError('Could not load the risk tools. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const active = tools?.find((t) => t.id === activeId) ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Risk Tools"
        subtitle="Calculators that only need your own numbers work right here. Tools that need broker contract metadata stay unavailable until that metadata exists — no default lot sizes are assumed."
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading risk tools">
          <Skeleton height={48} />
          <Skeleton height={200} />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : tools ? (
        <>
          <Tabs
            ariaLabel="Risk tools"
            tabs={tools.map((t) => ({ id: t.id, label: TOOL_LABELS[t.id] }))}
            activeId={activeId}
            onChange={(id) => setActiveId(id as ToolId)}
          />
          {active && (
            <Card>
              <div
                role="tabpanel"
                id={`tabpanel-${active.id}`}
                aria-labelledby={`tab-${active.id}`}
              >
                {active.available ? (
                  active.id === 'risk-reward' ? (
                    <RiskRewardCalculator />
                  ) : active.id === 'recovery' ? (
                    <RecoveryCalculator />
                  ) : (
                    // Defensive: the server marked a tool available that this
                    // build has no calculator for — say so, never fake one.
                    <UnavailableState
                      title={`${TOOL_LABELS[active.id]} unavailable`}
                      reason="This tool is marked available by the server but has no calculator in this version of the app."
                    />
                  )
                ) : (
                  <UnavailableState
                    title={`${TOOL_LABELS[active.id]} unavailable`}
                    reason={
                      active.missing.length > 0
                        ? `Reason: ${active.reason ?? 'UNAVAILABLE'}. Missing metadata: ${active.missing.join(', ')}. This tool will be enabled once that contract metadata is available — no default values are assumed.`
                        : `Reason: ${active.reason ?? 'UNAVAILABLE'}.`
                    }
                  />
                )}
              </div>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
