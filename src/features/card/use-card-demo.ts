import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';

import { cardKeys } from './types';

/** Starting demo balance loaded onto a fresh card so purchases can authorize. */
const DEMO_TOPUP = '500';

async function ensureFunded(userAddress: string): Promise<void> {
  // On a fresh simulator card the funding prerequisite is a simulator deposit,
  // so this loads a starting balance. On an already-funded card it's a no-op
  // (returns onchain mode, accepted:false) — harmless.
  try {
    await api.post('/mobile/card/topup', { userAddress, amount: DEMO_TOPUP });
  } catch {
    /* best-effort */
  }
}

async function simulateOne(
  userAddress: string,
  notify = true,
): Promise<boolean> {
  try {
    const res = await api.post<{ ok: boolean }>(
      '/mobile/card/demo/simulate-purchase',
      { userAddress, notify },
    );
    return Boolean(res.data?.ok);
  } catch {
    return false;
  }
}

/**
 * Adds one sample card purchase — funding the card first if needed (a purchase
 * can't authorize against a $0 balance). Sandbox-only via the backend guard.
 */
export function useSimulatePurchase() {
  return useMutation({
    mutationFn: async (userAddress: string) => {
      let ok = await simulateOne(userAddress);
      if (!ok) {
        // Likely insufficient balance — fund and retry once.
        await ensureFunded(userAddress);
        ok = await simulateOne(userAddress);
      }
      return { ok };
    },
    onSettled: (_d, _e, userAddress) => {
      void queryClient.invalidateQueries({ queryKey: cardKeys.transactions(userAddress) });
      void queryClient.invalidateQueries({ queryKey: cardKeys.status(userAddress) });
    },
  });
}

/**
 * Once, when the card first becomes active with no transactions, gives it a
 * realistic look: loads a starting balance, then seeds a few purchases. This
 * is what makes the card feel real in the demo — a funded card with a spending
 * history rather than an empty $0 card. Sandbox-only (backend guard).
 */
export function useSeedDemoCard(
  address: string | null | undefined,
  isActive: boolean,
  transactionCount: number,
  loadingTransactions: boolean,
) {
  const seeded = useRef(false);

  useEffect(() => {
    if (!address || !isActive || loadingTransactions) return;
    if (transactionCount > 0) {
      seeded.current = true; // already has spending — nothing to seed
      return;
    }
    if (seeded.current) return;
    seeded.current = true;

    let cancelled = false;
    (async () => {
      await ensureFunded(address);
      for (let i = 0; i < 3 && !cancelled; i++) {
        // notify:false — seeding history on card setup shouldn't push 3 alerts.
        const ok = await simulateOne(address, false);
        if (!ok) break; // not sandbox / no active card — stop
      }
      if (!cancelled) {
        void queryClient.invalidateQueries({ queryKey: cardKeys.transactions(address) });
        void queryClient.invalidateQueries({ queryKey: cardKeys.status(address) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isActive, transactionCount, loadingTransactions]);
}
