import type { PlanOffering } from '../pages/membershipCatalog';

/**
 * Feature-comparison table builder for the Membership page. Rows are the
 * union of the catalog's real feature strings (minus the "Everything in X"
 * roll-up lines); a plan includes a feature when its own list names it or
 * when it rolls up a lower tier that does. Nothing is invented here — if
 * the catalog does not say it, the table does not show it.
 */

export interface ComparisonRow {
  feature: string;
  /** One boolean per offering, in catalog order. */
  included: boolean[];
}

const EVERYTHING_IN = /^Everything in (.+)$/;

/** Tier rank by catalog order (FREE < PRO < ELITE in PLAN_OFFERINGS). */
export function buildComparison(offerings: PlanOffering[]): ComparisonRow[] {
  const byName = new Map(offerings.map((p) => [p.name, p]));

  // Resolve each plan's effective feature set, following "Everything in X".
  const effective = new Map<string, Set<string>>();
  const resolve = (plan: PlanOffering, seen: Set<string>): Set<string> => {
    const cached = effective.get(plan.id);
    if (cached) return cached;
    const set = new Set<string>();
    for (const feature of plan.features) {
      const rollup = EVERYTHING_IN.exec(feature);
      if (rollup) {
        const lower = byName.get(rollup[1]);
        if (lower && !seen.has(lower.id)) {
          seen.add(lower.id);
          for (const f of resolve(lower, seen)) set.add(f);
        }
      } else {
        set.add(feature);
      }
    }
    effective.set(plan.id, set);
    return set;
  };
  for (const plan of offerings) resolve(plan, new Set([plan.id]));

  const features: string[] = [];
  for (const plan of offerings) {
    for (const feature of plan.features) {
      if (!EVERYTHING_IN.test(feature) && !features.includes(feature)) {
        features.push(feature);
      }
    }
  }

  return features.map((feature) => ({
    feature,
    included: offerings.map((plan) => effective.get(plan.id)?.has(feature) ?? false),
  }));
}
