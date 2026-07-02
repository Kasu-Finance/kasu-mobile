import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
import { queryClient } from '@/lib/query/query-client';

import {
  cardKeys,
  type CardTopupRequest,
  type CardTopupResponse,
} from './types';

type TopupInput = {
  userAddress: string;
  /** Human-entered amount (e.g. "25.00"). */
  amount: string;
};

/**
 * `POST /mobile/card/topup` — tops up the Immersve card-funding balance.
 *
 * Sandbox (simulator funding channel): the backend executes the deposit and
 * returns `{ mode: 'simulator', accepted: true }` — one tap, no on-chain tx.
 *
 * Live (universal EVM channel on Base): the backend returns
 * `{ mode: 'onchain', depositAddress }` — the app must send a plain USDC
 * `transfer` from the user's wallet to that Funds Storage address (spend
 * attribution is by sender address). Wiring that transfer is W5 in
 * docs/mobile-neobank-concept-plan.md; until then the UI surfaces the address.
 */
export function useCardTopup() {
  return useMutation({
    mutationFn: async (input: TopupInput): Promise<CardTopupResponse> => {
      const body: CardTopupRequest = {
        userAddress: input.userAddress,
        amount: input.amount,
      };
      const res = await api.post<CardTopupResponse>('/mobile/card/topup', body);
      return res.data;
    },
    onSettled: (_data, _err, variables) => {
      // Refresh status (balance/last4 may have changed) after a top-up attempt.
      void queryClient.invalidateQueries({
        queryKey: cardKeys.status(variables.userAddress),
      });
    },
  });
}
