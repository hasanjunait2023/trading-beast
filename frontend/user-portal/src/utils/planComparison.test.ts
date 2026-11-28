import { describe, expect, it } from 'vitest';
import { buildComparison } from './planComparison';
import { PLAN_OFFERINGS } from '../pages/membershipCatalog';

describe('buildComparison', () => {
  const rows = buildComparison(PLAN_OFFERINGS);
  const byFeature = new Map(rows.map((r) => [r.feature, r.included]));

  it('excludes the "Everything in X" roll-up lines from the rows', () => {
    expect(rows.some((r) => r.feature.startsWith('Everything in'))).toBe(false);
  });

  it('marks Free features as included in every tier via roll-up', () => {
    expect(byFeature.get('Credits never expire')).toEqual([true, true, true]);
    expect(byFeature.get('Custom watchlist')).toEqual([true, true, true]);
  });

  it('marks Pro features as Pro + Elite only', () => {
    expect(byFeature.get('Advanced alerts')).toEqual([false, true, true]);
    expect(byFeature.get('Trading journal')).toEqual([false, true, true]);
  });

  it('marks Elite features as Elite only', () => {
    expect(byFeature.get('AI-assisted analysis features')).toEqual([false, false, true]);
    expect(byFeature.get('Full strategy suite')).toEqual([false, false, true]);
  });

  it('has one inclusion flag per offering, in catalog order', () => {
    for (const row of rows) expect(row.included).toHaveLength(PLAN_OFFERINGS.length);
  });
});
