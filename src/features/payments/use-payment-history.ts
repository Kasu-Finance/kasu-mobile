import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type { PaymentHistoryItem } from './types';

/**
 * Reads the signed-in user's payment-request history from kasu-backend
 * (`GET /mobile/payments/history?userAddress=`).
 *
 * The endpoint may still be HTTP 501 during rollout — TanStack surfaces that as
 * an `error`/empty state, which the screen renders gracefully. Only fetches
 * once an `address` is available.
 */
export function usePaymentHistory(address: string | null) {
  return useQuery<PaymentHistoryItem[]>({
    queryKey: ['payment-history', address?.toLowerCase()],
    enabled: !!address,
    queryFn: async () => {
      const res = await api.get<PaymentHistoryItem[]>('/mobile/payments/history', {
        params: { userAddress: address },
      });
      // Defensive: tolerate a non-array body (e.g. an error envelope).
      return Array.isArray(res.data) ? res.data : [];
    },
  });
}
