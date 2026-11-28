/**
 * Risk Tools availability + pure-math helpers (B5, handoff §3 row 10 / §5).
 *
 * Per-tool verdicts, decided from first principles against what the repo
 * actually defines:
 *
 * - position-size: position size in lots = risk amount / (stop distance ×
 *   value per unit of price movement). That value depends on the
 *   instrument's contract size and tick value, plus conversion into the
 *   account currency. The engine defines NONE of that metadata
 *   (buildPairs() carries only label/kind/decimals/Yahoo symbol), and the
 *   handoff forbids generic lot defaults → UNAVAILABLE.
 * - pip-value: a pip's monetary value is tick value scaled by size, again
 *   requiring contract metadata and a conversion rate → UNAVAILABLE.
 * - margin: required margin = contract size × lots × price × margin rate,
 *   converted to account currency. Contract size, broker leverage/margin
 *   rate and conversion are all undefined → UNAVAILABLE.
 * - risk-reward: pure price arithmetic on three user-typed prices
 *   (entry, stop, target). No contract metadata, no market data →
 *   AVAILABLE, computed client-side from user inputs only.
 * - recovery: recovery-after-loss % is pure arithmetic on one user-typed
 *   number (the loss percentage): gain needed = loss / (100 − loss).
 *   No journal or market data required → AVAILABLE, client-side only.
 */

export type ToolId = 'position-size' | 'pip-value' | 'margin' | 'risk-reward' | 'recovery';

export interface ToolStatus {
  id: ToolId;
  available: boolean;
  /** Machine-readable reason code; null when the tool is available. */
  reason: string | null;
  /** Metadata fields whose absence blocks the tool; empty when available. */
  missing: string[];
}

const MISSING_CONTRACT_METADATA = 'MISSING_CONTRACT_METADATA';

export function getToolsStatus(): { tools: ToolStatus[] } {
  return {
    tools: [
      {
        id: 'position-size',
        available: false,
        reason: MISSING_CONTRACT_METADATA,
        missing: ['contractSize', 'tickValue'],
      },
      {
        id: 'pip-value',
        available: false,
        reason: MISSING_CONTRACT_METADATA,
        missing: ['tickValue', 'tickSize', 'conversionRate'],
      },
      {
        id: 'margin',
        available: false,
        reason: MISSING_CONTRACT_METADATA,
        missing: ['contractSize', 'marginRate', 'conversionRate'],
      },
      { id: 'risk-reward', available: true, reason: null, missing: [] },
      { id: 'recovery', available: true, reason: null, missing: [] },
    ],
  };
}

// --- Pure-math helpers (mirrored client-side in the portal Tools page) ---

export interface RiskRewardResult {
  /** Price distance from entry to stop (the "1R" unit), in price units. */
  risk: number;
  /** Price distance from entry to target, in price units. */
  reward: number;
  /** reward / risk — e.g. 2 means the target pays 2× the amount risked. */
  ratio: number;
  direction: 'LONG' | 'SHORT';
}

/**
 * Risk:reward from user-typed prices only. Returns null for any invalid
 * combination: non-finite inputs, stop == entry (zero risk — ratio would
 * divide by zero), or stop/target on the same side of entry (the target
 * would not reward the direction the stop risks).
 */
export function computeRiskReward(
  entry: number,
  stop: number,
  target: number,
): RiskRewardResult | null {
  if (![entry, stop, target].every(Number.isFinite)) return null;
  if (stop === entry || target === entry) return null;
  const riskSide = Math.sign(entry - stop);
  const rewardSide = Math.sign(target - entry);
  if (riskSide !== rewardSide) return null;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return {
    risk,
    reward,
    ratio: reward / risk,
    direction: rewardSide > 0 ? 'LONG' : 'SHORT',
  };
}

/**
 * Percentage gain required to recover a loss of `lossPct` percent:
 * after losing L%, the remaining capital must grow by L / (100 − L).
 * Returns null outside 0 ≤ lossPct < 100 (a 100% loss is unrecoverable).
 */
export function computeRecoveryPct(lossPct: number): number | null {
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct >= 100) return null;
  return (lossPct / (100 - lossPct)) * 100;
}
