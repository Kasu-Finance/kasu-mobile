import type { UserRequest } from '@kasufinance/kasu-sdk';
import { useQuery } from '@tanstack/react-query';

import { useSdk } from '@/lib/sdk/use-sdk';

/**
 * Reads a wallet's on-chain Kasu transaction history (deposits, withdrawals,
 * cancellations) via the SDK portfolio facade.
 *
 * Read-only / demo friendly: only the `viewAddress` is required (no signer).
 * The facade may legitimately return an empty array (fresh address) — the
 * Activity screen falls back to a stubbed feed in that case so the tab still
 * looks alive.
 */
export function useTransactionHistory(address: string | null) {
  const { kasu, chainId } = useSdk();

  return useQuery<UserRequest[]>({
    queryKey: ['activity', 'tx-history', chainId, address?.toLowerCase() ?? ''],
    enabled: Boolean(kasu && address),
    // `getTransactionHistory` is typed to a 0x-prefixed string.
    queryFn: () => kasu!.portfolio.getTransactionHistory(address as `0x${string}`),
    staleTime: 30 * 1000,
  });
}
