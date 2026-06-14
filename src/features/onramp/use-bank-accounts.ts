import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import { wayexKeys } from './query-keys';
import type {
  WayexAddBankAccountRequest,
  WayexBankAccountAddResponse,
  WayexBankAccountListResponse,
  WayexExternalAccount,
} from './types';

/**
 * `GET /wayex/bank-accounts` — the user's registered fiat (bank) accounts.
 * Gated on `enabled` (session presence) like the identity query.
 */
export function useBankAccounts(enabled: boolean) {
  return useQuery({
    queryKey: wayexKeys.bankAccounts(),
    enabled,
    queryFn: async (): Promise<WayexExternalAccount[]> => {
      const res =
        await api.get<WayexBankAccountListResponse>('/wayex/bank-accounts');
      return res.data.externalAccounts ?? [];
    },
  });
}

/**
 * `POST /wayex/bank-accounts` — register a fiat account. The rail-specific
 * object (the nested `ACH` key) is forwarded verbatim alongside the common
 * `asset` / `network` / `nickname`. Invalidates the list on success.
 */
export function useAddBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: WayexAddBankAccountRequest,
    ): Promise<WayexBankAccountAddResponse> => {
      const res = await api.post<WayexBankAccountAddResponse>(
        '/wayex/bank-accounts',
        input,
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: wayexKeys.bankAccounts() });
    },
  });
}
