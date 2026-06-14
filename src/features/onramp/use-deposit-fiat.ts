import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api/client';

import type {
  WayexDepositFiatRequest,
  WayexDepositFiatResponse,
} from './types';

type DepositFiatInput = {
  /** Fiat currency. Defaults to USD (v1 corridor). */
  asset?: string;
  /** Fiat rail. Defaults to ACH. */
  network?: string;
  /** Crypto destination wallet that receives the converted funds. */
  destinationAddress: string;
};

/**
 * `POST /wayex/deposit-fiat` — on-ramp. Returns rail-specific bank wire
 * instructions (`{ id, reference, ...bankFields }`). `destinationAsset` /
 * `destinationNetwork` default server-side to USDC / BASE. Requires an open
 * session (the `api` client auto-attaches `x-wayex-session`).
 */
export function useDepositFiat() {
  return useMutation({
    mutationFn: async (
      input: DepositFiatInput,
    ): Promise<WayexDepositFiatResponse> => {
      const body: WayexDepositFiatRequest = {
        asset: input.asset ?? 'USD',
        network: input.network ?? 'ACH',
        destinationAddress: input.destinationAddress,
      };
      const res = await api.post<WayexDepositFiatResponse>(
        '/wayex/deposit-fiat',
        body,
      );
      return res.data;
    },
  });
}
