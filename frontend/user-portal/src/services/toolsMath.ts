/**
 * Pure-math helpers for the Risk Tools page (B5). These mirror the backend
 * services/tools.ts helpers exactly. Every input is typed by the user —
 * no market data, no contract metadata, nothing fetched — so the results
 * are computed entirely client-side.
 */

export interface RiskRewardResult {
  /** Price distance from entry to stop (the "1R" unit), in price units. */
  risk: number;
  /** Price distance from entry to target, in price units. */
  reward: number;
  /** reward / risk — e.g. 2 means the target pays 2× the amount risked. */
  ratio: number;
  direction: 'LONG' | 'SHORT';
}

export type RiskRewardError =
  | 'INCOMPLETE'
  | 'STOP_EQUALS_ENTRY'
  | 'TARGET_EQUALS_ENTRY'
  | 'SAME_SIDE';

export function computeRiskReward(
  entry: number,
  stop: number,
  target: number,
): { result: RiskRewardResult } | { error: RiskRewardError } {
  if (![entry, stop, target].every(Number.isFinite)) return { error: 'INCOMPLETE' };
  if (stop === entry) return { error: 'STOP_EQUALS_ENTRY' };
  if (target === entry) return { error: 'TARGET_EQUALS_ENTRY' };
  const riskSide = Math.sign(entry - stop);
  const rewardSide = Math.sign(target - entry);
  if (riskSide !== rewardSide) return { error: 'SAME_SIDE' };
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return {
    result: {
      risk,
      reward,
      ratio: reward / risk,
      direction: rewardSide > 0 ? 'LONG' : 'SHORT',
    },
  };
}

/**
 * Percentage gain required to recover a loss of `lossPct` percent.
 * Returns null outside 0 ≤ lossPct < 100 (a 100% loss is unrecoverable).
 */
export function computeRecoveryPct(lossPct: number): number | null {
  if (!Number.isFinite(lossPct) || lossPct < 0 || lossPct >= 100) return null;
  return (lossPct / (100 - lossPct)) * 100;
}
