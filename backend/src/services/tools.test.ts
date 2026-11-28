import { describe, it, expect } from 'vitest';
import { getToolsStatus, computeRiskReward, computeRecoveryPct } from './tools.js';

describe('tools status (B5)', () => {
  const { tools } = getToolsStatus();
  const byId = new Map(tools.map((t) => [t.id, t]));

  it('reports all five tools', () => {
    expect(tools.map((t) => t.id)).toEqual([
      'position-size', 'pip-value', 'margin', 'risk-reward', 'recovery',
    ]);
  });

  it('contract-dependent tools are unavailable with explicit missing metadata', () => {
    expect(byId.get('position-size')).toEqual({
      id: 'position-size',
      available: false,
      reason: 'MISSING_CONTRACT_METADATA',
      missing: ['contractSize', 'tickValue'],
    });
    expect(byId.get('pip-value')?.available).toBe(false);
    expect(byId.get('pip-value')?.reason).toBe('MISSING_CONTRACT_METADATA');
    expect(byId.get('pip-value')?.missing).toContain('tickValue');
    expect(byId.get('margin')?.available).toBe(false);
    expect(byId.get('margin')?.reason).toBe('MISSING_CONTRACT_METADATA');
    expect(byId.get('margin')?.missing).toContain('contractSize');
  });

  it('pure-math tools are available with no reason and nothing missing', () => {
    for (const id of ['risk-reward', 'recovery'] as const) {
      expect(byId.get(id)).toEqual({ id, available: true, reason: null, missing: [] });
    }
  });
});

describe('computeRiskReward', () => {
  it('computes a long 1:2', () => {
    const r = computeRiskReward(100, 95, 110);
    expect(r).toMatchObject({ risk: 5, reward: 10, ratio: 2, direction: 'LONG' });
  });

  it('computes a short', () => {
    const r = computeRiskReward(100, 104, 92);
    expect(r).toMatchObject({ risk: 4, reward: 8, ratio: 2, direction: 'SHORT' });
  });

  it('stop == entry is invalid (zero risk)', () => {
    expect(computeRiskReward(100, 100, 110)).toBeNull();
  });

  it('target == entry is invalid (zero reward)', () => {
    expect(computeRiskReward(100, 95, 100)).toBeNull();
  });

  it('stop and target on the same side of entry is invalid', () => {
    expect(computeRiskReward(100, 105, 110)).toBeNull();
    expect(computeRiskReward(100, 95, 90)).toBeNull();
  });

  it('non-finite inputs are invalid', () => {
    expect(computeRiskReward(NaN, 95, 110)).toBeNull();
    expect(computeRiskReward(100, Infinity, 110)).toBeNull();
  });
});

describe('computeRecoveryPct', () => {
  it('a 50% loss needs a 100% gain', () => {
    expect(computeRecoveryPct(50)).toBe(100);
  });

  it('a 20% loss needs a 25% gain', () => {
    expect(computeRecoveryPct(20)).toBe(25);
  });

  it('zero loss needs zero gain', () => {
    expect(computeRecoveryPct(0)).toBe(0);
  });

  it('100% (or more) loss is unrecoverable; negatives invalid', () => {
    expect(computeRecoveryPct(100)).toBeNull();
    expect(computeRecoveryPct(150)).toBeNull();
    expect(computeRecoveryPct(-5)).toBeNull();
    expect(computeRecoveryPct(NaN)).toBeNull();
  });
});
