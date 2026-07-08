import { useMemo } from 'react';

import { useCardTransactions } from '@/features/card';
import type { CardTransactionItem } from '@/features/card';

/** Loyalty tiers (Plasma's Lite/Core → our Silver/Gold). */
export const TIER = 'Silver';
export const NEXT_TIER = 'Gold';
/** Points needed to reach the next tier. */
const NEXT_TIER_POINTS = 5_000;
/** Cashback: 2% on the first $500 of monthly spend, 0.1% after. */
export const MONTHLY_CAP = 500;
export const BASE_RATE = 0.02;
const REST_RATE = 0.001;
/** Referral rate (informational — no referrals wired yet). */
export const REFERRAL_RATE = 0.0025;

export interface RewardPayout {
  id: string;
  merchant: string;
  /** Unix seconds. */
  date: number;
  points: number;
  cashback: number;
}

export interface RewardsModel {
  tier: string;
  nextTier: string;
  points: number;
  pointsToNext: number;
  cashback: number;
  referrals: number;
  total: number;
  monthlySpend: number;
  monthlyCap: number;
  resetDate: string;
  payouts: RewardPayout[];
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** First day of next month, "Aug 1, 2026". */
function nextMonthReset(): string {
  const d = new Date();
  const m = d.getMonth();
  const year = m === 11 ? d.getFullYear() + 1 : d.getFullYear();
  const month = (m + 1) % 12;
  return `${MONTHS[month]} 1, ${year}`;
}

/** Pure derivation (module scope so the cap accumulator can mutate freely). */
function computeRewards(txns: CardTransactionItem[] | undefined): RewardsModel {
  const purchases = (txns ?? [])
    .filter((t) => Number(t.amount) > 0)
    .map((t) => ({
      id: t.id,
      merchant: t.merchantName || 'Card purchase',
      amount: Number(t.amount),
      date: t.createdAt ? Math.floor(new Date(t.createdAt).getTime() / 1000) : 0,
    }))
    .sort((a, b) => a.date - b.date); // oldest first, for the monthly cap

  let monthlySpend = 0;
  let cashback = 0;
  const payouts: RewardPayout[] = purchases.map((p) => {
    const atBase = Math.max(0, Math.min(p.amount, MONTHLY_CAP - monthlySpend));
    const rest = p.amount - atBase;
    const cb = atBase * BASE_RATE + rest * REST_RATE;
    monthlySpend += p.amount;
    cashback += cb;
    return { id: p.id, merchant: p.merchant, date: p.date, points: Math.round(p.amount), cashback: cb };
  });
  payouts.reverse(); // newest first for display

  const points = purchases.reduce((s, p) => s + p.amount, 0);
  const referrals = 0;
  return {
    tier: TIER,
    nextTier: NEXT_TIER,
    points,
    pointsToNext: Math.max(0, NEXT_TIER_POINTS - points),
    cashback,
    referrals,
    total: cashback + referrals,
    monthlySpend,
    monthlyCap: MONTHLY_CAP,
    resetDate: nextMonthReset(),
    payouts,
  };
}

/**
 * Derives the rewards model from the user's real card purchases (the demo
 * spend). Points = $1 spent → 1 point; cashback = 2% of the first $500 monthly
 * + 0.1% after; each purchase becomes a "Rewards Payout" row. Referrals are $0
 * (not wired). All fake-but-connected to actual purchases.
 */
export function useRewards(address: string | null | undefined): {
  data: RewardsModel;
  isLoading: boolean;
} {
  const { data: txns, isLoading } = useCardTransactions(address);
  const data = useMemo(() => computeRewards(txns), [txns]);
  return { data, isLoading };
}
