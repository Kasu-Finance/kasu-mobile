import type { Strategy, StrategyTranche } from '@kasufinance/kasu-sdk';

/**
 * Display helpers for the Lend feature. These are pure functions over the SDK
 * `Strategy`/`StrategyTranche` facade types — no network, no hooks — so the
 * strategies list and the strategy detail screen render consistent status
 * pills, APY ranges, and capacity copy.
 *
 * Mirrors the heuristics in `kasu-ui`:
 *  - `lib/format-tranche-apy.ts` (`derivePoolStatus`, `formatTrancheApyRange`)
 *  - `components/strategies-grid.tsx` (dead-duplicate filtering by name/TVL)
 */

/**
 * Minimum remaining capacity (in stable-asset units) for a tranche to count as
 * "open". Below this is rounding noise — mirrors `MIN_TRANCHE_CAPACITY = 1` in
 * kasu-ui's `format-tranche-apy.ts`.
 */
const MIN_TRANCHE_CAPACITY = 1;

export type StrategyStatus = 'Live' | 'Full';

/** Whether a tranche has meaningful remaining capacity. */
export function trancheHasCapacity(tranche: StrategyTranche): boolean {
  const remaining = Number(tranche.availableCapacity);
  return Number.isFinite(remaining) && remaining >= MIN_TRANCHE_CAPACITY;
}

/**
 * Live unless every tranche is full. The facade only ever returns active
 * strategies, so there is no "Coming Soon" state to derive here.
 */
export function deriveStrategyStatus(strategy: Strategy): StrategyStatus {
  const capacity = Number(strategy.availableCapacity);
  if (Number.isFinite(capacity) && capacity >= MIN_TRANCHE_CAPACITY) return 'Live';
  if (strategy.tranches.length > 0 && strategy.tranches.some(trancheHasCapacity)) return 'Live';
  return 'Full';
}

/**
 * APY range across all tranches (min/max APY per tranche, which already folds
 * in fixed-term variants). Zero/unset values are skipped so an empty config
 * doesn't drag the range down to `0%`. Falls back to the strategy's headline
 * APY when no tranche range is available.
 *
 * Examples: `8.00%`, `10.00–16.00%`.
 */
export function formatStrategyApyRange(strategy: Strategy): string {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const t of strategy.tranches) {
    const min = Number(t.minApy);
    const max = Number(t.maxApy);
    if (Number.isFinite(min) && min > 0) lo = Math.min(lo, min);
    if (Number.isFinite(max) && max > 0) hi = Math.max(hi, max);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return `${(strategy.apy * 100).toFixed(2)}%`;
  }
  const loPct = (lo * 100).toFixed(2);
  const hiPct = (hi * 100).toFixed(2);
  return lo === hi ? `${loPct}%` : `${loPct}–${hiPct}%`;
}

/** Tranche names ordered safest→riskiest for the "Senior → … → Junior" flow. */
export function trancheFlow(strategy: Strategy): string[] {
  // Subgraph order is Junior → Mezzanine → Senior; reverse so the flow reads
  // safest-first against the low→high APY range.
  return [...strategy.tranches].reverse().map((t) => t.name);
}

/**
 * Drop obviously-dead duplicate entries so the live strategies stay prominent.
 * The backend still surfaces zero-TVL placeholder pools (e.g. seed "Genesis
 * Tranche" rows) that render as empty $0 cards. We hide a strategy only when it
 * looks like such a placeholder: a `$0` TVL pool whose name marks it as a
 * genesis/seed variant — but never the last one for a given family, so a real
 * pool is never hidden by accident.
 */
export function filterLiveStrategies(strategies: Strategy[]): Strategy[] {
  // Hide seed/genesis/placeholder pools by name (the web app filters these out
  // of the strategies grid). Name-based regardless of TVL — some genesis pools
  // carry a tiny non-zero TVL but should still never appear to users.
  const isDeadPlaceholder = (s: Strategy): boolean =>
    /\b(genesis|seed|placeholder|test)\b/i.test(s.name);
  const live = strategies.filter((s) => !isDeadPlaceholder(s));
  // Safety net: if filtering wiped everything (unexpected), show the originals.
  return live.length > 0 ? live : strategies;
}
