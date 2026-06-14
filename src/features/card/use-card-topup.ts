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
 * `POST /mobile/card/topup` — funds the Gnosis Pay card from the user's wallet.
 *
 * v1: the backend owns the money movement (server-side settlement or a
 * sandbox accept). We just submit the amount and surface `txHash` / `accepted`,
 * then invalidate status so any balance/last4 changes are picked up.
 *
 * TODO(on-chain top-up): the production path may move the on-chain transfer
 * client-side — sign + send a USDC transfer (exact-amount ERC20 approval, never
 * unlimited) from the Privy embedded wallet (`useEthersSigner`) to the Gnosis
 * Pay Safe / card-funding address, then POST the resulting `txHash` here for
 * the backend to confirm. The funding address + token/decimals + chain come
 * from the backend onboarding response and are not wired up yet.
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
