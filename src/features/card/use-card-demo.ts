import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';

import { cardKeys } from './types';

/**
 * Triggers a single sandbox-only simulated card purchase
 * (`POST /mobile/card/demo/simulate-purchase`). No-ops against live Immersve
 * (the backend guards it), so it is safe to leave wired.
 */
export function useSimulatePurchase() {
  return useMutation({
    mutationFn: async (userAddress: string) => {
      const res = await api.post<{ ok: boolean; merchant?: string }>(
        '/mobile/card/demo/simulate-purchase',
        { userAddress },
      );
      return res.data;
    },
    onSettled: (_d, _e, userAddress) => {
      void queryClient.invalidateQueries({
        queryKey: cardKeys.transactions(userAddress),
      });
    },
  });
}

/**
 * Once, when the card first becomes active with no transactions yet, seeds a
 * few realistic purchases so the activity feed looks alive. Sandbox-only via
 * the backend guard; runs a fixed number of times per mount.
 */
export function useSeedDemoSpend(
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
      for (let i = 0; i < 3 && !cancelled; i++) {
        try {
          const res = await api.post<{ ok: boolean }>(
            '/mobile/card/demo/simulate-purchase',
            { userAddress: address },
          );
          if (!res.data?.ok) break; // not sandbox / no active card — stop
        } catch {
          break;
        }
      }
      if (!cancelled) {
        void queryClient.invalidateQueries({
          queryKey: cardKeys.transactions(address),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, isActive, transactionCount, loadingTransactions]);
}
