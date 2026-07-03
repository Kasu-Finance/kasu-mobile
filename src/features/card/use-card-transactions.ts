import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import { cardKeys, type CardTransactionItem } from './types';

/**
 * Reads the wallet's card transactions from `GET /mobile/card/transactions`.
 * Returns an empty list (never throws) when the user has no card yet or the
 * backend is unreachable, so it can be merged into the activity feed safely.
 */
export function useCardTransactions(address: string | null | undefined) {
  return useQuery<CardTransactionItem[]>({
    queryKey: address
      ? cardKeys.transactions(address)
      : ['mobile', 'card', 'transactions', 'noop'],
    enabled: Boolean(address),
    staleTime: 20_000,
    queryFn: async () => {
      try {
        const res = await api.get<{ items?: CardTransactionItem[] }>(
          '/mobile/card/transactions',
          { params: { userAddress: (address as string).toLowerCase() } },
        );
        return res.data?.items ?? [];
      } catch {
        return [];
      }
    },
  });
}
